const crypto = require('node:crypto');

const { db, getSnapshot } = require('../db/database');

const OTP_TTL_MINUTES = 10;
const SESSION_TTL_DAYS = 30;
const ACCOUNT_ROLES = new Set(['chairman', 'owner', 'tenant']);
const RESIDENT_JOIN_ROLES = new Set(['owner', 'tenant', 'committee']);
const CHAIRMAN_SELF_ASSIGN_ROLES = new Set(['owner', 'tenant']);
const JOIN_REQUEST_DECISIONS = new Set(['approve', 'reject']);
const AUTH_INTENTS = new Set(['signUp', 'signIn', 'auto']);
const EXPENSE_TYPES = new Set(['maintenance', 'adhoc']);
const PAYMENT_METHODS = new Set(['upi', 'netbanking', 'cash']);
const PAYMENT_REVIEW_DECISIONS = new Set(['approve', 'reject']);
const BOOKING_REVIEW_STATUSES = new Set(['confirmed', 'waitlisted']);
const COMPLAINT_CATEGORIES = new Set(['plumbing', 'security', 'billing', 'cleaning', 'general']);
const COMPLAINT_STATUSES = new Set(['open', 'inProgress', 'resolved']);
const STAFF_CATEGORIES = new Set(['domesticHelp', 'driver', 'cook', 'vendor']);
const VERIFICATION_STATES = new Set(['pending', 'verified', 'expired']);
const ENTRY_SUBJECT_TYPES = new Set(['staff', 'visitor', 'delivery']);
const ENTRY_STATUSES = new Set(['inside', 'exited']);
const STAFF_REVIEW_STATES = new Set(['verified', 'expired']);

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

function getPendingJoinRequestCount(userId) {
  const row = db
    .prepare("SELECT COUNT(*) AS count FROM joinRequests WHERE userId = ? AND status = 'pending'")
    .get(userId);
  return Number(row?.count ?? 0);
}

function getMembership(userId, societyId) {
  return db.prepare('SELECT id, roles, unitIds FROM memberships WHERE userId = ? AND societyId = ?').get(userId, societyId);
}

function getJoinRequest(joinRequestId) {
  return db
    .prepare(
      'SELECT id, societyId, userId, residentType, unitIds, status, createdAt, reviewedAt, reviewedByUserId, reviewNote FROM joinRequests WHERE id = ?',
    )
    .get(joinRequestId);
}

function getUnit(unitId) {
  return db.prepare('SELECT * FROM units WHERE id = ?').get(unitId);
}

function getSociety(societyId) {
  return db.prepare('SELECT id, name FROM societies WHERE id = ?').get(societyId);
}

function getStaffProfile(staffId) {
  return db
    .prepare(
      'SELECT id, societyId, name, phone, category, verificationState, employerUnitIds, requestedByUserId, requestedAt, reviewedByUserId, reviewedAt FROM staffProfiles WHERE id = ?',
    )
    .get(staffId);
}

function getInvoice(invoiceId) {
  return db
    .prepare('SELECT id, societyId, unitId, planId, periodLabel, dueDate, amountInr, status FROM invoices WHERE id = ?')
    .get(invoiceId);
}

function getPayment(paymentId) {
  return db
    .prepare(
      'SELECT id, societyId, invoiceId, amountInr, method, paidAt, status, submittedByUserId, referenceNote, reviewedByUserId, reviewedAt FROM payments WHERE id = ?',
    )
    .get(paymentId);
}

function getMaintenancePlan(planId) {
  return db
    .prepare('SELECT id, societyId, receiptPrefix FROM maintenancePlans WHERE id = ?')
    .get(planId);
}

function getAmenity(amenityId) {
  return db
    .prepare('SELECT id, societyId, name, bookingType, approvalMode, capacity, priceInr FROM amenities WHERE id = ?')
    .get(amenityId);
}

function getAmenityScheduleRules(amenityId) {
  return db
    .prepare(
      'SELECT id, amenityId, dayGroup, slotLabel, startTime, endTime, capacity, blackoutDates FROM amenityScheduleRules WHERE amenityId = ?',
    )
    .all(amenityId);
}

function getBooking(bookingId) {
  return db
    .prepare(
      'SELECT id, amenityId, societyId, userId, unitId, date, startTime, endTime, status, guests FROM bookings WHERE id = ?',
    )
    .get(bookingId);
}

function getComplaint(complaintId) {
  return db
    .prepare(
      'SELECT id, societyId, unitId, createdByUserId, category, title, description, status, createdAt, assignedTo FROM complaints WHERE id = ?',
    )
    .get(complaintId);
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
  const pendingJoinRequestsCount = getPendingJoinRequestCount(userId);

  if (membershipsCount > 0 || pendingJoinRequestsCount > 0) {
    return {
      preferredRole,
      membershipsCount,
      pendingJoinRequestsCount,
      nextStep: 'workspaceSelection',
    };
  }

  return {
    preferredRole,
    membershipsCount,
    pendingJoinRequestsCount,
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

function normalizeRequestedUnitIds(unitIds) {
  if (!Array.isArray(unitIds)) {
    return [];
  }

  return [...new Set(unitIds.filter((unitId) => typeof unitId === 'string' && unitId.trim().length > 0))];
}

function requireSocietyChairman(userId, societyId) {
  const society = getSociety(societyId);

  if (!society) {
    throw new HttpError(404, 'Selected society was not found.');
  }

  const membership = getMembership(userId, societyId);
  const roles = membership ? new Set(parseStoredJson(membership.roles)) : new Set();

  if (!roles.has('chairman')) {
    throw new HttpError(403, 'Only the chairman of this society can review join requests.');
  }
}

function getMembershipRoleSet(userId, societyId) {
  const membership = getMembership(userId, societyId);
  return membership ? new Set(parseStoredJson(membership.roles)) : new Set();
}

function selectSocietyForResident(userId, societyId, unitIdsInput, residentType) {
  const society = db.prepare('SELECT id, name FROM societies WHERE id = ?').get(societyId);

  if (!society) {
    throw new HttpError(404, 'Selected society was not found.');
  }

  const unitIds = normalizeRequestedUnitIds(unitIdsInput);

  if (unitIds.length === 0) {
    throw new HttpError(400, 'Select one or more resident numbers, offices, or spaces before continuing.');
  }

  if (!RESIDENT_JOIN_ROLES.has(residentType)) {
    throw new HttpError(400, 'Choose owner, tenant, or society committee member.');
  }

  const units = unitIds.map((unitId) => getUnit(unitId));

  if (units.some((unit) => !unit || unit.societyId !== societyId)) {
    throw new HttpError(404, 'One or more selected resident numbers or spaces were not found in this society.');
  }

  const normalizedPreferredRole = residentType === 'tenant' ? 'tenant' : 'owner';
  const now = nowIso();

  runTransaction(() => {
    db.prepare(
      `INSERT INTO userProfiles (userId, preferredRole, createdAt, updatedAt)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(userId) DO UPDATE SET preferredRole = excluded.preferredRole, updatedAt = excluded.updatedAt`,
    ).run(userId, normalizedPreferredRole, now, now);

    const existingPendingRequest = db
      .prepare("SELECT id FROM joinRequests WHERE userId = ? AND societyId = ? AND status = 'pending'")
      .get(userId, societyId);

    if (existingPendingRequest) {
      db.prepare(
        `UPDATE joinRequests
         SET residentType = ?, unitIds = ?, createdAt = ?, reviewedAt = NULL, reviewedByUserId = NULL, reviewNote = NULL
         WHERE id = ?`,
      ).run(residentType, JSON.stringify(unitIds), now, existingPendingRequest.id);
    } else {
      db.prepare(
        'INSERT INTO joinRequests (id, societyId, userId, residentType, unitIds, status, createdAt, reviewedAt, reviewedByUserId, reviewNote) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(
        nextId('join-request'),
        societyId,
        userId,
        residentType,
        JSON.stringify(unitIds),
        'pending',
        now,
        null,
        null,
        null,
      );
    }
  });

  const joinRequest = db
    .prepare("SELECT id, status FROM joinRequests WHERE userId = ? AND societyId = ? AND status = 'pending'")
    .get(userId, societyId);

  return {
    currentUserId: userId,
    chairmanAssigned: hasAssignedChairman(),
    preferredRole: normalizedPreferredRole,
    societyId,
    joinRequestId: joinRequest?.id ?? null,
    joinRequestStatus: joinRequest?.status ?? 'pending',
    onboarding: getOnboardingState(userId),
    data: getSnapshot(),
  };
}

function reviewJoinRequest(userId, joinRequestId, decision, reviewNoteInput = '') {
  if (!JOIN_REQUEST_DECISIONS.has(decision)) {
    throw new HttpError(400, 'Choose approve or reject for the join request decision.');
  }

  const joinRequest = getJoinRequest(joinRequestId);

  if (!joinRequest) {
    throw new HttpError(404, 'Join request not found.');
  }

  if (joinRequest.status !== 'pending') {
    throw new HttpError(400, 'This join request has already been reviewed.');
  }

  requireSocietyChairman(userId, joinRequest.societyId);

  const requestedUnitIds = normalizeRequestedUnitIds(parseStoredJson(joinRequest.unitIds));

  if (requestedUnitIds.length === 0) {
    throw new HttpError(400, 'This join request does not contain any unit selections.');
  }

  const requestedUnits = requestedUnitIds.map((unitId) => getUnit(unitId));

  if (requestedUnits.some((unit) => !unit || unit.societyId !== joinRequest.societyId)) {
    throw new HttpError(400, 'One or more requested units no longer belong to this society.');
  }

  const normalizedPreferredRole = joinRequest.residentType === 'tenant' ? 'tenant' : 'owner';
  const membershipRoles =
    joinRequest.residentType === 'committee'
      ? new Set(['owner', 'committee'])
      : new Set([joinRequest.residentType]);
  const occupancyCategory = joinRequest.residentType === 'tenant' ? 'tenant' : 'owner';
  const reviewedAt = nowIso();
  const reviewNote = String(reviewNoteInput ?? '').trim();

  runTransaction(() => {
    if (decision === 'approve') {
      db.prepare(
        `INSERT INTO userProfiles (userId, preferredRole, createdAt, updatedAt)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(userId) DO UPDATE SET preferredRole = excluded.preferredRole, updatedAt = excluded.updatedAt`,
      ).run(joinRequest.userId, normalizedPreferredRole, reviewedAt, reviewedAt);

      const existingMembership = getMembership(joinRequest.userId, joinRequest.societyId);

      if (existingMembership) {
        const roles = new Set(parseStoredJson(existingMembership.roles));
        const unitIds = new Set(parseStoredJson(existingMembership.unitIds));

        for (const role of membershipRoles) {
          roles.add(role);
        }

        requestedUnitIds.forEach((unitId) => unitIds.add(unitId));

        db.prepare('UPDATE memberships SET roles = ?, unitIds = ? WHERE id = ?').run(
          JSON.stringify([...roles]),
          JSON.stringify([...unitIds]),
          existingMembership.id,
        );
      } else {
        const isPrimary = getMembershipCount(joinRequest.userId) === 0 ? 1 : 0;

        db.prepare(
          'INSERT INTO memberships (id, userId, societyId, roles, unitIds, isPrimary) VALUES (?, ?, ?, ?, ?, ?)',
        ).run(
          nextId('membership'),
          joinRequest.userId,
          joinRequest.societyId,
          JSON.stringify([...membershipRoles]),
          JSON.stringify(requestedUnitIds),
          isPrimary,
        );
      }

      requestedUnitIds.forEach((unitId) => {
        const existingOccupancy = db
          .prepare('SELECT id FROM occupancy WHERE societyId = ? AND unitId = ? AND userId = ? AND category = ?')
          .get(joinRequest.societyId, unitId, joinRequest.userId, occupancyCategory);

        if (!existingOccupancy) {
          db.prepare(
            'INSERT INTO occupancy (id, societyId, unitId, userId, category, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?)',
          ).run(
            nextId('occupancy'),
            joinRequest.societyId,
            unitId,
            joinRequest.userId,
            occupancyCategory,
            reviewedAt.slice(0, 10),
            null,
          );
        }
      });
    }

    db.prepare(
      'UPDATE joinRequests SET status = ?, reviewedAt = ?, reviewedByUserId = ?, reviewNote = ? WHERE id = ?',
    ).run(decision === 'approve' ? 'approved' : 'rejected', reviewedAt, userId, reviewNote || null, joinRequestId);
  });

  return {
    currentUserId: userId,
    chairmanAssigned: hasAssignedChairman(),
    societyId: joinRequest.societyId,
    joinRequestId,
    joinRequestStatus: decision === 'approve' ? 'approved' : 'rejected',
    onboarding: getOnboardingState(userId),
    data: getSnapshot(),
  };
}

function requireText(value, message) {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    throw new HttpError(400, message);
  }

  return normalized;
}

function parsePositiveWholeNumber(value, message) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new HttpError(400, message);
  }

  return parsed;
}

function normalizeCalendarDate(value, message) {
  const normalized = String(value ?? '').trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const parsed = Date.parse(normalized);

  if (Number.isNaN(parsed)) {
    throw new HttpError(400, message);
  }

  return new Date(parsed).toISOString().slice(0, 10);
}

function normalizeDateTime(value, message) {
  const normalized = String(value ?? '').trim();
  const parsed = Date.parse(normalized);

  if (!normalized || Number.isNaN(parsed)) {
    throw new HttpError(400, message);
  }

  return new Date(parsed).toISOString();
}

function normalizeClockTime(value, message) {
  const normalized = String(value ?? '').trim();

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
    throw new HttpError(400, message);
  }

  return normalized;
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value).split(':').map((segment) => Number.parseInt(segment, 10));
  return hours * 60 + minutes;
}

function rangesOverlap(startA, endA, startB, endB) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(startB) < timeToMinutes(endA);
}

function getScheduleDayGroup(date) {
  const day = new Date(`${date}T00:00:00`).getDay();
  return day === 0 || day === 6 ? 'weekends' : 'weekdays';
}

function normalizeUnitCodes(unitCodesInput) {
  if (!Array.isArray(unitCodesInput)) {
    return [];
  }

  return [...new Set(unitCodesInput.map((value) => String(value ?? '').trim()).filter(Boolean))];
}

function findUnitsByCodes(societyId, unitCodesInput) {
  const unitCodes = normalizeUnitCodes(unitCodesInput);

  if (unitCodes.length === 0) {
    throw new HttpError(400, 'Select at least one resident unit, plot, office, or shed.');
  }

  const units = db.prepare('SELECT id, code, societyId FROM units WHERE societyId = ?').all(societyId);
  const unitMap = new Map(units.map((unit) => [String(unit.code).trim().toLowerCase(), unit]));
  const resolvedUnits = unitCodes.map((code) => unitMap.get(code.toLowerCase()));

  if (resolvedUnits.some((unit) => !unit)) {
    const missingCodes = unitCodes.filter((code, index) => !resolvedUnits[index]);
    throw new HttpError(
      400,
      `These unit codes were not found in this society: ${missingCodes.join(', ')}.`,
    );
  }

  return resolvedUnits;
}

function buildSocietyMutationPayload(userId, societyId) {
  return {
    currentUserId: userId,
    chairmanAssigned: hasAssignedChairman(),
    societyId,
    onboarding: getOnboardingState(userId),
    data: getSnapshot(),
  };
}

function resolveInvoiceOpenStatus(dueDate) {
  const normalizedDueDate = String(dueDate ?? '').trim();
  const today = new Date().toISOString().slice(0, 10);
  return normalizedDueDate < today ? 'overdue' : 'pending';
}

function buildReceiptNumber(planId) {
  const plan = getMaintenancePlan(planId);

  if (!plan) {
    throw new HttpError(404, 'Maintenance plan not found for the selected invoice.');
  }

  const receiptCount = Number(
    db.prepare('SELECT COUNT(*) AS count FROM receipts WHERE societyId = ?').get(plan.societyId)?.count ?? 0,
  );

  return `${plan.receiptPrefix}-${String(receiptCount + 1).padStart(4, '0')}`;
}

function resolveAmenityAvailability(amenity, date, startTime, endTime, guests, excludedBookingId = null) {
  const scheduleRules = getAmenityScheduleRules(amenity.id).map((rule) => ({
    ...rule,
    blackoutDates: parseStoredJson(rule.blackoutDates),
  }));
  const applicableDayGroup = getScheduleDayGroup(date);
  const matchingRules = scheduleRules.filter((rule) => {
    const matchesDay =
      rule.dayGroup === 'allDays' ||
      rule.dayGroup === applicableDayGroup;
    const isBlackoutDate = rule.blackoutDates.includes(date);
    const isWithinSlot =
      timeToMinutes(startTime) >= timeToMinutes(rule.startTime) &&
      timeToMinutes(endTime) <= timeToMinutes(rule.endTime);

    return matchesDay && !isBlackoutDate && isWithinSlot;
  });

  if (scheduleRules.length > 0 && matchingRules.length === 0) {
    throw new HttpError(
      400,
      'This amenity is not available for the selected date and time. Pick one of the configured slots.',
    );
  }

  const activeBookings = db
    .prepare(
      'SELECT id, amenityId, societyId, userId, unitId, date, startTime, endTime, status, guests FROM bookings WHERE amenityId = ? AND date = ?',
    )
    .all(amenity.id, date)
    .filter(
      (booking) =>
        booking.id !== excludedBookingId &&
        (booking.status === 'pending' || booking.status === 'confirmed') &&
        rangesOverlap(booking.startTime, booking.endTime, startTime, endTime),
    );

  if (amenity.bookingType === 'exclusive') {
    return {
      canConfirm: activeBookings.length === 0,
      matchingRules,
    };
  }

  if (amenity.bookingType === 'capacity') {
    const configuredCapacities = matchingRules
      .map((rule) => Number(rule.capacity))
      .filter((value) => Number.isFinite(value) && value > 0);
    const capacityLimit =
      configuredCapacities.length > 0
        ? Math.max(...configuredCapacities)
        : Number(amenity.capacity ?? 0) > 0
          ? Number(amenity.capacity)
          : null;
    const bookedGuests = activeBookings.reduce((sum, booking) => sum + Number(booking.guests ?? 0), 0);

    return {
      canConfirm: capacityLimit === null ? true : bookedGuests + guests <= capacityLimit,
      matchingRules,
    };
  }

  return {
    canConfirm: false,
    matchingRules,
  };
}

function resolveAmenityBookingStatus(amenity, availability) {
  if (!availability.canConfirm) {
    return 'waitlisted';
  }

  return amenity.approvalMode === 'committee' ? 'pending' : 'confirmed';
}

function assignChairmanResidence(userId, societyId, unitIdsInput, residentTypeInput) {
  const society = getSociety(societyId);

  if (!society) {
    throw new HttpError(404, 'Selected society was not found.');
  }

  const membership = getMembership(userId, societyId);
  const membershipRoles = membership ? new Set(parseStoredJson(membership.roles)) : new Set();

  if (!membership || !membershipRoles.has('chairman')) {
    throw new HttpError(403, 'Only the chairman of this society can link their own residence or space.');
  }

  const unitIds = normalizeRequestedUnitIds(unitIdsInput);

  const residentType = String(residentTypeInput ?? '').trim();

  if (!CHAIRMAN_SELF_ASSIGN_ROLES.has(residentType)) {
    throw new HttpError(400, 'Choose whether the chairman should be linked as an owner or tenant.');
  }

  if (unitIds.length > 0) {
    const units = unitIds.map((unitId) => getUnit(unitId));

    if (units.some((unit) => !unit || unit.societyId !== societyId)) {
      throw new HttpError(404, 'One or more selected units were not found in this society.');
    }
  }

  const startDate = nowIso().slice(0, 10);

  runTransaction(() => {
    const nextRoles = new Set(
      parseStoredJson(membership.roles).filter((role) => role !== 'owner' && role !== 'tenant'),
    );

    if (unitIds.length > 0) {
      nextRoles.add(residentType);
    }

    db.prepare('UPDATE memberships SET roles = ?, unitIds = ? WHERE id = ?').run(
      JSON.stringify([...nextRoles]),
      JSON.stringify(unitIds),
      membership.id,
    );

    db.prepare('DELETE FROM occupancy WHERE societyId = ? AND userId = ?').run(societyId, userId);

    for (const unitId of unitIds) {
      db.prepare(
        'INSERT INTO occupancy (id, societyId, unitId, userId, category, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run(nextId('occupancy'), societyId, unitId, userId, residentType, startDate, null);
    }
  });

  return buildSocietyMutationPayload(userId, societyId);
}

function createAmenityBooking(userId, societyId, input) {
  const amenityId = requireText(input?.amenityId, 'Choose the amenity you want to book.');
  const amenity = getAmenity(amenityId);

  if (!amenity || amenity.societyId !== societyId) {
    throw new HttpError(404, 'Selected amenity was not found in this society.');
  }

  if (amenity.bookingType === 'info') {
    throw new HttpError(400, 'This amenity is informational only and does not accept booking requests.');
  }

  const membership = getMembership(userId, societyId);
  const allowedUnitIds = normalizeRequestedUnitIds(parseStoredJson(membership?.unitIds));

  if (!membership || allowedUnitIds.length === 0) {
    throw new HttpError(
      403,
      'Only residents linked to a unit, plot, office, or shed can raise an amenity booking request.',
    );
  }

  const unitId = String(input?.unitId ?? '').trim() || allowedUnitIds[0];

  if (!allowedUnitIds.includes(unitId)) {
    throw new HttpError(403, 'You can only book amenities for units already linked to your membership.');
  }

  const unit = getUnit(unitId);

  if (!unit || unit.societyId !== societyId) {
    throw new HttpError(404, 'Selected resident number or space was not found in this society.');
  }

  const date = normalizeCalendarDate(input?.date, 'Enter the booking date in YYYY-MM-DD format.');
  const startTime = normalizeClockTime(input?.startTime, 'Enter the booking start time in HH:MM format.');
  const endTime = normalizeClockTime(input?.endTime, 'Enter the booking end time in HH:MM format.');

  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    throw new HttpError(400, 'Booking end time must be later than the start time.');
  }

  const guests = parsePositiveWholeNumber(input?.guests, 'Enter how many guests will use this amenity.');

  const duplicateRequest = db
    .prepare(
      `SELECT id FROM bookings
       WHERE amenityId = ? AND societyId = ? AND userId = ? AND unitId = ? AND date = ? AND startTime = ? AND endTime = ? AND status != 'waitlisted'`,
    )
    .get(amenity.id, societyId, userId, unitId, date, startTime, endTime);

  if (duplicateRequest) {
    throw new HttpError(400, 'You already have a booking request for this amenity slot.');
  }

  const availability = resolveAmenityAvailability(amenity, date, startTime, endTime, guests);
  const status = resolveAmenityBookingStatus(amenity, availability);

  db.prepare(
    'INSERT INTO bookings (id, amenityId, societyId, userId, unitId, date, startTime, endTime, status, guests) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    nextId('booking'),
    amenity.id,
    societyId,
    userId,
    unitId,
    date,
    startTime,
    endTime,
    status,
    guests,
  );

  return buildSocietyMutationPayload(userId, societyId);
}

function reviewAmenityBooking(userId, bookingId, statusInput) {
  const booking = getBooking(bookingId);

  if (!booking) {
    throw new HttpError(404, 'Amenity booking was not found.');
  }

  requireSocietyChairman(userId, booking.societyId);

  const status = String(statusInput ?? '').trim();

  if (!BOOKING_REVIEW_STATUSES.has(status)) {
    throw new HttpError(400, 'Choose confirmed or waitlisted as the booking review decision.');
  }

  const amenity = getAmenity(booking.amenityId);

  if (!amenity) {
    throw new HttpError(404, 'The amenity linked to this booking no longer exists.');
  }

  if (status === 'confirmed') {
    const availability = resolveAmenityAvailability(
      amenity,
      booking.date,
      booking.startTime,
      booking.endTime,
      booking.guests,
      booking.id,
    );

    if (!availability.canConfirm) {
      throw new HttpError(
        400,
        'This slot is no longer available to confirm. Move it to waitlisted or adjust the booking window.',
      );
    }
  }

  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, booking.id);

  return buildSocietyMutationPayload(userId, booking.societyId);
}

function submitResidentPayment(userId, societyId, input) {
  const invoiceId = requireText(input?.invoiceId, 'Select the maintenance invoice first.');
  const invoice = getInvoice(invoiceId);

  if (!invoice || invoice.societyId !== societyId) {
    throw new HttpError(404, 'Selected invoice was not found in this society.');
  }

  const membership = getMembership(userId, societyId);
  const allowedUnitIds = new Set(parseStoredJson(membership?.unitIds));

  if (!membership || !allowedUnitIds.has(invoice.unitId)) {
    throw new HttpError(403, 'You can only flag payment for invoices linked to your own units.');
  }

  if (invoice.status === 'paid') {
    throw new HttpError(400, 'This invoice is already marked paid.');
  }

  const existingPayments = db
    .prepare('SELECT id, status FROM payments WHERE invoiceId = ? ORDER BY paidAt DESC')
    .all(invoice.id);

  if (existingPayments.some((payment) => payment.status === 'captured')) {
    throw new HttpError(400, 'A captured payment already exists for this invoice.');
  }

  if (existingPayments.some((payment) => payment.status === 'pending')) {
    throw new HttpError(400, 'A payment confirmation is already pending review for this invoice.');
  }

  const amountInr = parsePositiveWholeNumber(input?.amountInr, 'Enter the payment amount.');

  if (amountInr !== invoice.amountInr) {
    throw new HttpError(
      400,
      `The submitted amount must match the invoice amount of INR ${invoice.amountInr}.`,
    );
  }

  const method = String(input?.method ?? '').trim();

  if (!PAYMENT_METHODS.has(method)) {
    throw new HttpError(400, 'Choose UPI, netbanking, or cash as the payment method.');
  }

  const paidAt = normalizeDateTime(input?.paidAt, 'Enter when the payment was made.');
  const referenceNote = String(input?.referenceNote ?? '').trim();

  db.prepare(
    `INSERT INTO payments (
      id, societyId, invoiceId, amountInr, method, paidAt, status, submittedByUserId, referenceNote, reviewedByUserId, reviewedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    nextId('payment'),
    societyId,
    invoice.id,
    amountInr,
    method,
    paidAt,
    'pending',
    userId,
    referenceNote || null,
    null,
    null,
  );

  return buildSocietyMutationPayload(userId, societyId);
}

function reviewResidentPayment(userId, paymentId, decisionInput) {
  const payment = getPayment(paymentId);

  if (!payment) {
    throw new HttpError(404, 'Payment record not found.');
  }

  requireSocietyChairman(userId, payment.societyId);

  if (payment.status !== 'pending') {
    throw new HttpError(400, 'Only pending resident payment submissions can be reviewed.');
  }

  const decision = String(decisionInput ?? '').trim();

  if (!PAYMENT_REVIEW_DECISIONS.has(decision)) {
    throw new HttpError(400, 'Choose approve or reject for this payment review.');
  }

  const invoice = getInvoice(payment.invoiceId);

  if (!invoice) {
    throw new HttpError(404, 'Linked invoice not found for this payment.');
  }

  const reviewedAt = nowIso();

  runTransaction(() => {
    db.prepare(
      'UPDATE payments SET status = ?, reviewedByUserId = ?, reviewedAt = ? WHERE id = ?',
    ).run(decision === 'approve' ? 'captured' : 'rejected', userId, reviewedAt, paymentId);

    db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(
      decision === 'approve' ? 'paid' : resolveInvoiceOpenStatus(invoice.dueDate),
      invoice.id,
    );

    if (decision === 'approve') {
      const existingReceipt = db.prepare('SELECT id FROM receipts WHERE paymentId = ?').get(paymentId);

      if (!existingReceipt) {
        db.prepare(
          'INSERT INTO receipts (id, societyId, paymentId, number, issuedAt) VALUES (?, ?, ?, ?, ?)',
        ).run(nextId('receipt'), payment.societyId, paymentId, buildReceiptNumber(invoice.planId), reviewedAt);
      }
    }
  });

  return buildSocietyMutationPayload(userId, payment.societyId);
}

function createComplaintTicket(userId, societyId, input) {
  const membership = getMembership(userId, societyId);
  const allowedUnitIds = normalizeRequestedUnitIds(parseStoredJson(membership?.unitIds));

  if (!membership || allowedUnitIds.length === 0) {
    throw new HttpError(
      403,
      'Only residents linked to a unit, plot, office, or shed can raise a helpdesk ticket.',
    );
  }

  const unitId = requireText(input?.unitId, 'Select the resident number or space this ticket belongs to.');

  if (!allowedUnitIds.includes(unitId)) {
    throw new HttpError(403, 'You can only raise tickets for the units already linked to your membership.');
  }

  const unit = getUnit(unitId);

  if (!unit || unit.societyId !== societyId) {
    throw new HttpError(404, 'Selected resident number or space was not found in this society.');
  }

  const category = String(input?.category ?? '').trim();

  if (!COMPLAINT_CATEGORIES.has(category)) {
    throw new HttpError(400, 'Choose plumbing, security, billing, cleaning, or general as the helpdesk category.');
  }

  const title = requireText(input?.title, 'Enter a short title for the ticket.');
  const description = requireText(input?.description, 'Add a few details so the chairman can act on this ticket.');

  db.prepare(
    'INSERT INTO complaints (id, societyId, unitId, createdByUserId, category, title, description, status, createdAt, assignedTo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    nextId('complaint'),
    societyId,
    unitId,
    userId,
    category,
    title,
    description,
    'open',
    nowIso(),
    null,
  );

  return buildSocietyMutationPayload(userId, societyId);
}

function updateComplaintTicket(userId, complaintId, input) {
  const complaint = getComplaint(complaintId);

  if (!complaint) {
    throw new HttpError(404, 'Helpdesk ticket not found.');
  }

  requireSocietyChairman(userId, complaint.societyId);

  const status = String(input?.status ?? '').trim();

  if (!COMPLAINT_STATUSES.has(status)) {
    throw new HttpError(400, 'Choose open, inProgress, or resolved as the complaint status.');
  }

  const assignedTo = String(input?.assignedTo ?? '').trim();

  db.prepare('UPDATE complaints SET status = ?, assignedTo = ? WHERE id = ?').run(
    status,
    assignedTo || null,
    complaint.id,
  );

  return buildSocietyMutationPayload(userId, complaint.societyId);
}

function sendMaintenanceReminder(userId, societyId, input) {
  requireSocietyChairman(userId, societyId);

  const requestedInvoiceIds = normalizeRequestedUnitIds(input?.invoiceIds);
  const invoices = requestedInvoiceIds.length > 0
    ? requestedInvoiceIds.map((invoiceId) => getInvoice(invoiceId))
    : db
      .prepare("SELECT id, societyId, unitId, planId, periodLabel, dueDate, amountInr, status FROM invoices WHERE societyId = ? AND status != 'paid'")
      .all(societyId);

  if (invoices.length === 0) {
    throw new HttpError(400, 'There are no unpaid maintenance invoices to remind right now.');
  }

  if (invoices.some((invoice) => !invoice || invoice.societyId !== societyId)) {
    throw new HttpError(404, 'One or more selected invoices were not found in this society.');
  }

  const unpaidInvoices = invoices.filter((invoice) => invoice.status !== 'paid');

  if (unpaidInvoices.length === 0) {
    throw new HttpError(400, 'Selected invoices are already paid.');
  }

  const uniqueUnitIds = [...new Set(unpaidInvoices.map((invoice) => invoice.unitId))];
  const message = String(input?.message ?? '').trim() ||
    'Maintenance is still unpaid for the selected period. Please flag the payment in your resident workspace or contact the chairman if already settled.';

  db.prepare(
    'INSERT INTO paymentReminders (id, societyId, invoiceIds, unitIds, message, sentByUserId, sentAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(
    nextId('payment-reminder'),
    societyId,
    JSON.stringify(unpaidInvoices.map((invoice) => invoice.id)),
    JSON.stringify(uniqueUnitIds),
    message,
    userId,
    nowIso(),
  );

  return buildSocietyMutationPayload(userId, societyId);
}

function createExpenseRecord(userId, societyId, input) {
  requireSocietyChairman(userId, societyId);

  const expenseType = String(input?.expenseType ?? '').trim();

  if (!EXPENSE_TYPES.has(expenseType)) {
    throw new HttpError(400, 'Choose maintenance or adhoc as the expense type.');
  }

  const title = requireText(input?.title, 'Enter an expense title.');
  const amountInr = parsePositiveWholeNumber(input?.amountInr, 'Enter a valid expense amount.');
  const incurredOn = normalizeCalendarDate(input?.incurredOn, 'Enter the expense date in YYYY-MM-DD format.');
  const notes = String(input?.notes ?? '').trim();
  const createdAt = nowIso();

  db.prepare(
    'INSERT INTO expenseRecords (id, societyId, expenseType, title, amountInr, incurredOn, notes, createdByUserId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(nextId('expense'), societyId, expenseType, title, amountInr, incurredOn, notes || null, userId, createdAt);

  return buildSocietyMutationPayload(userId, societyId);
}

function createSecurityGuard(userId, societyId, input) {
  requireSocietyChairman(userId, societyId);

  const name = requireText(input?.name, 'Enter the guard name.');
  const phone = requireText(input?.phone, 'Enter the guard contact number.');
  const shiftLabel = requireText(input?.shiftLabel, 'Enter a shift label.');
  const vendorName = String(input?.vendorName ?? '').trim();
  const gate = requireText(input?.gate, 'Enter the gate or patrol point.');
  const shiftStart = normalizeDateTime(input?.shiftStart, 'Enter the shift start date and time.');
  const shiftEnd = normalizeDateTime(input?.shiftEnd, 'Enter the shift end date and time.');

  if (Date.parse(shiftEnd) <= Date.parse(shiftStart)) {
    throw new HttpError(400, 'Shift end must be later than shift start.');
  }

  const guardId = nextId('guard');

  runTransaction(() => {
    db.prepare(
      'INSERT INTO securityGuards (id, societyId, name, phone, shiftLabel, vendorName) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(guardId, societyId, name, phone, shiftLabel, vendorName || null);

    db.prepare(
      'INSERT INTO securityShifts (id, guardId, societyId, start, end, gate) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(nextId('shift'), guardId, societyId, shiftStart, shiftEnd, gate);
  });

  return buildSocietyMutationPayload(userId, societyId);
}

function createStaffVerification(userId, societyId, input) {
  const name = requireText(input?.name, 'Enter the staff name.');
  const phone = requireText(input?.phone, 'Enter the staff contact number.');
  const category = String(input?.category ?? '').trim();
  const requestedVerificationState = String(input?.verificationState ?? '').trim();
  const serviceLabel = requireText(input?.serviceLabel, 'Enter the work description or service label.');
  const visitsPerWeek = parsePositiveWholeNumber(
    input?.visitsPerWeek,
    'Enter how many visits happen per week.',
  );

  if (!STAFF_CATEGORIES.has(category)) {
    throw new HttpError(400, 'Choose domesticHelp, driver, cook, or vendor for the staff category.');
  }

  if (!VERIFICATION_STATES.has(requestedVerificationState)) {
    throw new HttpError(400, 'Choose pending, verified, or expired as the verification state.');
  }

  const units = findUnitsByCodes(societyId, input?.employerUnitCodes);
  const membership = getMembership(userId, societyId);
  const roleSet = membership ? new Set(parseStoredJson(membership.roles)) : new Set();
  const isChairman = roleSet.has('chairman');
  const canSubmitResidentStaff = roleSet.has('owner') || roleSet.has('tenant');

  if (!isChairman && !canSubmitResidentStaff) {
    throw new HttpError(
      403,
      'Only the chairman, an owner, or a tenant of this society can register domestic staff.',
    );
  }

  if (!isChairman) {
    const allowedUnitIds = new Set(parseStoredJson(membership?.unitIds));

    if (units.some((unit) => !allowedUnitIds.has(unit.id))) {
      throw new HttpError(
        403,
        'Residents can only register domestic staff for the units, plots, offices, or sheds already linked to them.',
      );
    }
  }

  const staffId = nextId('staff');
  const requestedAt = nowIso();
  const verificationState = isChairman ? requestedVerificationState : 'pending';
  const reviewedAt = isChairman && verificationState !== 'pending' ? requestedAt : null;
  const reviewedByUserId = isChairman && verificationState !== 'pending' ? userId : null;

  runTransaction(() => {
    db.prepare(
      `INSERT INTO staffProfiles (
        id, societyId, name, phone, category, verificationState, employerUnitIds,
        requestedByUserId, requestedAt, reviewedByUserId, reviewedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      staffId,
      societyId,
      name,
      phone,
      category,
      verificationState,
      JSON.stringify(units.map((unit) => unit.id)),
      userId,
      requestedAt,
      reviewedByUserId,
      reviewedAt,
    );

    for (const unit of units) {
      db.prepare(
        'INSERT INTO staffAssignments (id, staffId, societyId, unitId, serviceLabel, visitsPerWeek, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run(nextId('staff-assignment'), staffId, societyId, unit.id, serviceLabel, visitsPerWeek, 1);
    }
  });

  return buildSocietyMutationPayload(userId, societyId);
}

function reviewStaffVerification(userId, staffId, verificationStateInput) {
  const staffProfile = getStaffProfile(staffId);

  if (!staffProfile) {
    throw new HttpError(404, 'Domestic staff record not found.');
  }

  requireSocietyChairman(userId, staffProfile.societyId);

  const verificationState = String(verificationStateInput ?? '').trim();

  if (!STAFF_REVIEW_STATES.has(verificationState)) {
    throw new HttpError(400, 'Choose verified or expired as the review status.');
  }

  const reviewedAt = nowIso();

  db.prepare(
    'UPDATE staffProfiles SET verificationState = ?, reviewedByUserId = ?, reviewedAt = ? WHERE id = ?',
  ).run(verificationState, userId, reviewedAt, staffId);

  return buildSocietyMutationPayload(userId, staffProfile.societyId);
}

function createEntryLogRecord(userId, societyId, input) {
  requireSocietyChairman(userId, societyId);

  const subjectType = String(input?.subjectType ?? '').trim();
  const subjectName = requireText(input?.subjectName, 'Enter the visitor, staff, or delivery name.');
  const status = String(input?.status ?? '').trim();
  const unitCode = String(input?.unitCode ?? '').trim();

  if (!ENTRY_SUBJECT_TYPES.has(subjectType)) {
    throw new HttpError(400, 'Choose staff, visitor, or delivery as the entry subject type.');
  }

  if (!ENTRY_STATUSES.has(status)) {
    throw new HttpError(400, 'Choose whether the subject is inside or exited.');
  }

  let unitId = null;

  if (unitCode) {
    unitId = findUnitsByCodes(societyId, [unitCode])[0].id;
  }

  db.prepare(
    'INSERT INTO entryLogs (id, societyId, subjectType, subjectName, unitId, enteredAt, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(nextId('entry'), societyId, subjectType, subjectName, unitId, nowIso(), status);

  return buildSocietyMutationPayload(userId, societyId);
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
  assignChairmanResidence,
  buildAuthPayload,
  createAmenityBooking,
  createComplaintTicket,
  getOnboardingState,
  hasAssignedChairman,
  normalizeAuthChannel,
  normalizeAuthIntent,
  requestOtp,
  createEntryLogRecord,
  createExpenseRecord,
  createSecurityGuard,
  createStaffVerification,
  reviewAmenityBooking,
  reviewResidentPayment,
  reviewStaffVerification,
  requireChairmanRole,
  requireSession,
  reviewJoinRequest,
  sendMaintenanceReminder,
  selectSocietyForResident,
  setPreferredRole,
  submitResidentPayment,
  updateComplaintTicket,
  verifyOtp,
};
