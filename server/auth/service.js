const crypto = require('node:crypto');

const { db, getSnapshot } = require('../db/database');

const OTP_TTL_MINUTES = 10;
const SESSION_TTL_DAYS = 30;
const ACCOUNT_ROLES = new Set(['chairman', 'owner', 'tenant']);

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

function getMembershipCount(userId) {
  const row = db.prepare('SELECT COUNT(*) AS count FROM memberships WHERE userId = ?').get(userId);
  return Number(row?.count ?? 0);
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

  if (!preferredRole) {
    return {
      preferredRole: null,
      membershipsCount,
      nextStep: 'chooseRole',
    };
  }

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
    nextStep: preferredRole === 'chairman' ? 'chairmanSetup' : 'societyEnrollment',
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
    onboarding: getOnboardingState(userId),
    data: getSnapshot(),
  };
}

async function requestOtp(channelInput, destinationInput) {
  cleanupExpiredRecords();
  const channel = normalizeAuthChannel(channelInput);
  const destination = normalizeDestination(channel, destinationInput);
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

async function verifyOtp(challengeId, codeInput) {
  cleanupExpiredRecords();
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

  const userId = ensureUserForIdentity(challenge.channel, challenge.destination);
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
    preferredRole: role,
    onboarding: getOnboardingState(userId),
    data: getSnapshot(),
  };
}

function selectSocietyForResident(userId, societyId) {
  const society = db.prepare('SELECT id, name FROM societies WHERE id = ?').get(societyId);

  if (!society) {
    throw new HttpError(404, 'Selected society was not found.');
  }

  const preferredRole = getUserProfile(userId)?.preferredRole ?? null;

  if (preferredRole !== 'owner' && preferredRole !== 'tenant') {
    throw new HttpError(400, 'Only owner and tenant accounts can join an existing society workspace.');
  }

  runTransaction(() => {
    const existingMembership = db
      .prepare('SELECT id, roles FROM memberships WHERE userId = ? AND societyId = ?')
      .get(userId, societyId);

    if (existingMembership) {
      const roles = new Set(parseStoredJson(existingMembership.roles));
      roles.add(preferredRole);
      db.prepare('UPDATE memberships SET roles = ? WHERE id = ?').run(
        JSON.stringify([...roles]),
        existingMembership.id,
      );
      return;
    }

    const isPrimary = getMembershipCount(userId) === 0 ? 1 : 0;

    db.prepare(
      'INSERT INTO memberships (id, userId, societyId, roles, unitIds, isPrimary) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(nextId('membership'), userId, societyId, JSON.stringify([preferredRole]), JSON.stringify([]), isPrimary);
  });

  return {
    currentUserId: userId,
    preferredRole,
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
  normalizeAuthChannel,
  requestOtp,
  requireChairmanRole,
  requireSession,
  selectSocietyForResident,
  setPreferredRole,
  verifyOtp,
};
