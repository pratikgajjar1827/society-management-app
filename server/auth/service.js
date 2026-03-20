const crypto = require('node:crypto');

const { db, getSnapshot } = require('../db/database');

const OTP_TTL_MINUTES = 10;
const SESSION_TTL_DAYS = 30;
const ACCOUNT_ROLES = new Set(['chairman', 'owner', 'tenant']);
const RESIDENT_JOIN_ROLES = new Set(['owner', 'tenant', 'committee']);
const AUTH_INTENTS = new Set(['signUp', 'signIn', 'auto']);

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

function nextId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000).toISOString();
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function cleanupExpiredRecords() {
  const now = nowIso();
  db.prepare("DELETE FROM authSessions WHERE expiresAt <= ?").run(now);
  db.prepare("UPDATE authChallenges SET status = 'expired' WHERE status = 'pending' AND expiresAt <= ?").run(now);
}

function runTransaction(callback) {
  db.exec('BEGIN');

  try {
    const result = callback();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function normalizeAuthChannel(channel) {
  if (channel === 'sms' || channel === 'phoneOtp' || channel === 'phone') {
    return 'sms';
  }

  if (channel === 'email' || channel === 'emailOtp') {
    return 'email';
  }

  throw new HttpError(400, 'Unsupported authentication channel. Use sms or email.');
}

function normalizeAuthIntent(intent) {
  if (!intent) {
    return 'auto';
  }

  if (AUTH_INTENTS.has(intent)) {
    return intent;
  }

  throw new HttpError(400, 'Unsupported authentication intent. Use signUp, signIn, or auto.');
}

function normalizePhoneNumber(value) {
  const digits = String(value ?? '').replace(/\D/g, '');

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }

  if (digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`;
  }

  throw new HttpError(400, 'Enter a valid mobile number in international or 10-digit Indian format.');
}

function normalizeEmail(value) {
  const normalized = String(value ?? '').trim().toLowerCase();

  if (!normalized || !normalized.includes('@') || normalized.startsWith('@') || normalized.endsWith('@')) {
    throw new HttpError(400, 'Enter a valid email address.');
  }

  return normalized;
}

function normalizeDestination(channel, destination) {
  return channel === 'sms' ? normalizePhoneNumber(destination) : normalizeEmail(destination);
}

function humanizeLocalPart(localPart) {
  return localPart
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function buildDisplayName(channel, destination) {
  if (channel === 'email') {
    const localPart = destination.split('@')[0];
    return humanizeLocalPart(localPart) || 'New Resident';
  }

  const digits = destination.replace(/\D/g, '');
  return `Resident ${digits.slice(-4)}`;
}

function getAvatarInitials(name) {
  const parts = name.split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
  return initials || 'NR';
}

function generateDevelopmentCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function parseStoredJson(value, fallback = []) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function getTwilioConfig() {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();
  const username =
    process.env.TWILIO_API_KEY?.trim() || process.env.TWILIO_ACCOUNT_SID?.trim();
  const password =
    process.env.TWILIO_API_KEY_SECRET?.trim() || process.env.TWILIO_AUTH_TOKEN?.trim();

  if (!serviceSid || !username || !password) {
    return null;
  }

  return { serviceSid, username, password };
}

async function parseTwilioResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return { message: text };
  }
}

async function sendTwilioRequest(path, body) {
  const config = getTwilioConfig();

  if (!config) {
    throw new HttpError(
      500,
      'Twilio Verify is not configured on the server. Set TWILIO_VERIFY_SERVICE_SID and credentials.',
    );
  }

  const response = await fetch(`https://verify.twilio.com/v2/Services/${config.serviceSid}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
  });

  const payload = await parseTwilioResponse(response);

  if (!response.ok) {
    throw new HttpError(
      502,
      payload.message || 'Twilio Verify request failed. Check the service configuration and destination.',
    );
  }

  return payload;
}

async function dispatchOtp(channel, destination) {
  const config = getTwilioConfig();

  if (!config) {
    return {
      provider: 'development',
      providerReference: null,
      code: generateDevelopmentCode(),
    };
  }

  const payload = await sendTwilioRequest('/Verifications', {
    to: destination,
    channel,
  });

  return {
    provider: 'twilio',
    providerReference: payload.sid ?? null,
    code: null,
  };
}

async function verifyProviderChallenge(challenge, code) {
  if (challenge.provider === 'development') {
    return challenge.code === code;
  }

  const payload = await sendTwilioRequest('/VerificationCheck', {
    to: challenge.destination,
    code,
  });

  return payload.status === 'approved' || payload.valid === true;
}

function getUserById(userId) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
}

function getUserProfile(userId) {
  return db.prepare('SELECT * FROM userProfiles WHERE userId = ?').get(userId);
}

function getIdentity(channel, destination) {
  return db.prepare('SELECT * FROM authIdentities WHERE channel = ? AND value = ?').get(channel, destination);
}

function getRegisteredSocietyNames(userId) {
  return db
    .prepare(
      `SELECT DISTINCT societies.name AS name
       FROM memberships
       INNER JOIN societies ON societies.id = memberships.societyId
       WHERE memberships.userId = ?
       ORDER BY societies.name COLLATE NOCASE ASC`,
    )
    .all(userId)
    .map((row) => row.name);
}

function formatNaturalList(items) {
  if (items.length <= 1) {
    return items[0] ?? '';
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function buildExistingAccountMessage(channel, userId) {
  const identityLabel = channel === 'sms' ? 'mobile number' : 'email address';
  const societyNames = getRegisteredSocietyNames(userId);

  if (societyNames.length === 0) {
    return `This ${identityLabel} is already registered. Use sign in instead.`;
  }

  const workspaceLabel = societyNames.length === 1 ? 'society' : 'societies';

  return `This ${identityLabel} is already registered with the ${workspaceLabel} ${formatNaturalList(
    societyNames,
  )}. Use sign in instead.`;
}

function hasAssignedChairman(excludedUserId = null) {
  const statement = excludedUserId
    ? db.prepare("SELECT COUNT(*) AS count FROM userProfiles WHERE preferredRole = 'chairman' AND userId != ?")
    : db.prepare("SELECT COUNT(*) AS count FROM userProfiles WHERE preferredRole = 'chairman'");
  const row = excludedUserId ? statement.get(excludedUserId) : statement.get();
  return Number(row?.count ?? 0) > 0;
}

function getMembershipCount(userId) {
  const row = db.prepare('SELECT COUNT(*) AS count FROM memberships WHERE userId = ?').get(userId);
  return Number(row?.count ?? 0);
}

function getUnit(unitId) {
  return db.prepare('SELECT * FROM units WHERE id = ?').get(unitId);
}

function syncUserContact(userId, channel, destination) {
  if (channel === 'sms') {
    db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(destination, userId);
    return;
  }

  db.prepare('UPDATE users SET email = ? WHERE id = ?').run(destination, userId);
}

function ensureUserProfileRow(userId, preferredRole = null) {
  const existing = getUserProfile(userId);
  const now = nowIso();

  if (existing) {
    db.prepare('UPDATE userProfiles SET updatedAt = ? WHERE userId = ?').run(now, userId);
    return existing;
  }

  db.prepare(
    'INSERT INTO userProfiles (userId, preferredRole, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
  ).run(userId, preferredRole, now, now);

  return getUserProfile(userId);
}

function ensureUserForIdentity(channel, destination) {
  const existingIdentity = getIdentity(channel, destination);
  const now = nowIso();

  if (existingIdentity) {
    runTransaction(() => {
      db.prepare('UPDATE authIdentities SET verifiedAt = ?, isPrimary = 1 WHERE id = ?').run(now, existingIdentity.id);
      syncUserContact(existingIdentity.userId, channel, destination);
      ensureUserProfileRow(existingIdentity.userId);
    });

    return existingIdentity.userId;
  }

  const userId = nextId('user');
  const displayName = buildDisplayName(channel, destination);
  const avatarInitials = getAvatarInitials(displayName);
  const placeholderPhone = channel === 'sms' ? destination : '';
  const placeholderEmail = channel === 'email' ? destination : '';

  runTransaction(() => {
    db.prepare(
      'INSERT INTO users (id, name, phone, email, avatarInitials) VALUES (?, ?, ?, ?, ?)',
    ).run(userId, displayName, placeholderPhone, placeholderEmail, avatarInitials);

    db.prepare(
      'INSERT INTO userProfiles (userId, preferredRole, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
    ).run(userId, null, now, now);

    db.prepare(
      'INSERT INTO authIdentities (id, userId, channel, value, isPrimary, verifiedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(nextId('identity'), userId, channel, destination, 1, now, now);
  });

  return userId;
}

function createSession(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  const createdAt = nowIso();
  const expiresAt = addDays(new Date(), SESSION_TTL_DAYS);

  db.prepare(
    'INSERT INTO authSessions (token, userId, expiresAt, createdAt) VALUES (?, ?, ?, ?)',
  ).run(token, userId, expiresAt, createdAt);

  return token;
}

function getOnboardingState(userId) {
  cleanupExpiredRecords();
  const preferredRole = getUserProfile(userId)?.preferredRole ?? null;
  const membershipsCount = getMembershipCount(userId);

  if (membershipsCount > 0) {
    return {
      preferredRole,
      membershipsCount,
      nextStep: 'workspaceSelection',
    };
  }

  return {
    preferredRole,
    membershipsCount,
    nextStep:
      preferredRole === 'chairman'
        ? 'createSociety'
        : preferredRole === 'owner' || preferredRole === 'tenant'
          ? 'joinSociety'
          : 'choosePortal',
  };
}

function buildAuthPayload(userId, sessionToken) {
  const user = getUserById(userId);

  if (!user) {
    throw new HttpError(404, 'Authenticated user was not found.');
  }

  return {
    currentUserId: userId,
    sessionToken,
    user,
    chairmanAssigned: hasAssignedChairman(),
    onboarding: getOnboardingState(userId),
    data: getSnapshot(),
  };
}

async function requestOtp(intentInput, channelInput, destinationInput) {
  cleanupExpiredRecords();
  const intent = normalizeAuthIntent(intentInput);
  const channel = normalizeAuthChannel(channelInput);
  const destination = normalizeDestination(channel, destinationInput);
  const existingIdentity = getIdentity(channel, destination);

  if (intent === 'signIn' && !existingIdentity) {
    throw new HttpError(404, 'No account found for this mobile number or email. Use sign up first.');
  }

  if (intent === 'signUp' && existingIdentity) {
    throw new HttpError(409, buildExistingAccountMessage(channel, existingIdentity.userId));
  }

  const providerResponse = await dispatchOtp(channel, destination);
  const challengeId = nextId('challenge');
  const createdAt = nowIso();
  const expiresAt = addMinutes(new Date(), OTP_TTL_MINUTES);

  runTransaction(() => {
    db.prepare(
      "UPDATE authChallenges SET status = 'superseded' WHERE channel = ? AND destination = ? AND status = 'pending'",
    ).run(channel, destination);

    db.prepare(
      'INSERT INTO authChallenges (id, channel, destination, provider, providerReference, code, status, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      challengeId,
      channel,
      destination,
      providerResponse.provider,
      providerResponse.providerReference,
      providerResponse.code,
      'pending',
      expiresAt,
      createdAt,
    );
  });

  return {
    challengeId,
    channel,
    destination,
    provider: providerResponse.provider,
    expiresAt,
    developmentCode: providerResponse.provider === 'development' ? providerResponse.code : undefined,
  };
}

async function verifyOtp(intentInput, challengeId, codeInput) {
  cleanupExpiredRecords();
  const intent = normalizeAuthIntent(intentInput);
  const code = String(codeInput ?? '').trim();

  if (!code) {
    throw new HttpError(400, 'Enter the OTP to continue.');
  }

  const challenge = db.prepare('SELECT * FROM authChallenges WHERE id = ?').get(challengeId);

  if (!challenge) {
    throw new HttpError(404, 'OTP request not found. Start again.');
  }

  if (challenge.status !== 'pending') {
    throw new HttpError(400, 'This OTP has already been used or expired. Request a fresh code.');
  }

  if (Date.parse(challenge.expiresAt) <= Date.now()) {
    db.prepare("UPDATE authChallenges SET status = 'expired' WHERE id = ?").run(challengeId);
    throw new HttpError(400, 'OTP expired. Request a fresh code.');
  }

  const isApproved = await verifyProviderChallenge(challenge, code);

  if (!isApproved) {
    throw new HttpError(400, 'OTP is incorrect. Check the code and try again.');
  }

  const existingIdentity = getIdentity(challenge.channel, challenge.destination);

  if (intent === 'signIn' && !existingIdentity) {
    throw new HttpError(404, 'No account found for this mobile number or email. Use sign up first.');
  }

  if (intent === 'signUp' && existingIdentity) {
    throw new HttpError(409, buildExistingAccountMessage(challenge.channel, existingIdentity.userId));
  }

  const userId =
    (intent === 'signIn' || intent === 'auto') && existingIdentity
      ? ensureUserForIdentity(existingIdentity.channel, existingIdentity.value)
      : ensureUserForIdentity(challenge.channel, challenge.destination);
  const sessionToken = createSession(userId);

  db.prepare("UPDATE authChallenges SET status = 'approved' WHERE id = ?").run(challengeId);

  return {
    ...buildAuthPayload(userId, sessionToken),
    verifiedChannel: challenge.channel,
    verifiedDestination: challenge.destination,
  };
}

function requireSession(sessionToken) {
  cleanupExpiredRecords();

  if (!sessionToken) {
    throw new HttpError(401, 'Missing session token.');
  }

  const session = db
    .prepare('SELECT token, userId, expiresAt, createdAt FROM authSessions WHERE token = ?')
    .get(sessionToken);

  if (!session) {
    throw new HttpError(401, 'Session is invalid or expired. Sign in again.');
  }

  if (Date.parse(session.expiresAt) <= Date.now()) {
    db.prepare('DELETE FROM authSessions WHERE token = ?').run(sessionToken);
    throw new HttpError(401, 'Session expired. Sign in again.');
  }

  return session.userId;
}

function setPreferredRole(userId, role) {
  if (!ACCOUNT_ROLES.has(role)) {
    throw new HttpError(400, 'Choose chairman, owner, or tenant.');
  }

  const now = nowIso();

  runTransaction(() => {
    const existing = getUserProfile(userId);

    if (existing) {
      db.prepare('UPDATE userProfiles SET preferredRole = ?, updatedAt = ? WHERE userId = ?').run(
        role,
        now,
        userId,
      );
      return;
    }

    db.prepare(
      'INSERT INTO userProfiles (userId, preferredRole, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
    ).run(userId, role, now, now);
  });

  return {
    currentUserId: userId,
    chairmanAssigned: hasAssignedChairman(),
    preferredRole: role,
    onboarding: getOnboardingState(userId),
    data: getSnapshot(),
  };
}

function selectSocietyForResident(userId, societyId, unitId, residentType) {
  const society = db.prepare('SELECT id, name FROM societies WHERE id = ?').get(societyId);

  if (!society) {
    throw new HttpError(404, 'Selected society was not found.');
  }

  if (!unitId) {
    throw new HttpError(400, 'Select the resident number or home before continuing.');
  }

  if (!RESIDENT_JOIN_ROLES.has(residentType)) {
    throw new HttpError(400, 'Choose owner, tenant, or society committee member.');
  }

  const unit = getUnit(unitId);

  if (!unit || unit.societyId !== societyId) {
    throw new HttpError(404, 'Selected resident number or home was not found in this society.');
  }

  const normalizedPreferredRole = residentType === 'tenant' ? 'tenant' : 'owner';
  const membershipRoles =
    residentType === 'committee' ? new Set(['owner', 'committee']) : new Set([residentType]);
  const occupancyCategory = residentType === 'tenant' ? 'tenant' : 'owner';

  runTransaction(() => {
    const now = nowIso();
    db.prepare(
      `INSERT INTO userProfiles (userId, preferredRole, createdAt, updatedAt)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(userId) DO UPDATE SET preferredRole = excluded.preferredRole, updatedAt = excluded.updatedAt`,
    ).run(userId, normalizedPreferredRole, now, now);

    const existingMembership = db
      .prepare('SELECT id, roles, unitIds FROM memberships WHERE userId = ? AND societyId = ?')
      .get(userId, societyId);

    if (existingMembership) {
      const roles = new Set(parseStoredJson(existingMembership.roles));
      const unitIds = new Set(parseStoredJson(existingMembership.unitIds));
      for (const role of membershipRoles) {
        roles.add(role);
      }
      unitIds.add(unitId);
      db.prepare('UPDATE memberships SET roles = ? WHERE id = ?').run(
        JSON.stringify([...roles]),
        existingMembership.id,
      );
      db.prepare('UPDATE memberships SET unitIds = ? WHERE id = ?').run(
        JSON.stringify([...unitIds]),
        existingMembership.id,
      );
    } else {
      const isPrimary = getMembershipCount(userId) === 0 ? 1 : 0;

      db.prepare(
        'INSERT INTO memberships (id, userId, societyId, roles, unitIds, isPrimary) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(
        nextId('membership'),
        userId,
        societyId,
        JSON.stringify([...membershipRoles]),
        JSON.stringify([unitId]),
        isPrimary,
      );
    }

    const existingOccupancy = db
      .prepare('SELECT id FROM occupancy WHERE societyId = ? AND unitId = ? AND userId = ? AND category = ?')
      .get(societyId, unitId, userId, occupancyCategory);

    if (!existingOccupancy) {
      db.prepare(
        'INSERT INTO occupancy (id, societyId, unitId, userId, category, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run(nextId('occupancy'), societyId, unitId, userId, occupancyCategory, now.slice(0, 10), null);
    }
  });

  return {
    currentUserId: userId,
    chairmanAssigned: hasAssignedChairman(),
    preferredRole: normalizedPreferredRole,
    societyId,
    onboarding: getOnboardingState(userId),
    data: getSnapshot(),
  };
}

function requireChairmanRole(userId) {
  const preferredRole = getUserProfile(userId)?.preferredRole ?? null;

  if (preferredRole !== 'chairman') {
    throw new HttpError(403, 'Only chairman accounts can create a new society workspace.');
  }

  return preferredRole;
}

module.exports = {
  HttpError,
  buildAuthPayload,
  getOnboardingState,
  hasAssignedChairman,
  normalizeAuthChannel,
  normalizeAuthIntent,
  requestOtp,
  requireChairmanRole,
  requireSession,
  selectSocietyForResident,
  setPreferredRole,
  verifyOtp,
};
