const crypto = require('node:crypto');

const { db, getSnapshot } = require('../db/database');
const { normalizeSocietyLocationFields } = require('../utils/location-normalization');
const { SUPER_USER_ID } = require('../seed/seedData');

const OTP_TTL_MINUTES = 10;
const SESSION_TTL_DAYS = 30;
const ACCOUNT_ROLES = new Set(['superUser', 'chairman', 'owner', 'tenant']);
const RESIDENT_JOIN_ROLES = new Set(['owner', 'tenant', 'committee', 'chairman']);
const CHAIRMAN_SELF_ASSIGN_ROLES = new Set(['owner', 'tenant']);
const JOIN_REQUEST_DECISIONS = new Set(['approve', 'reject']);
const AUTH_INTENTS = new Set(['signUp', 'signIn', 'auto']);
const EXPENSE_TYPES = new Set(['maintenance', 'adhoc']);
const ANNOUNCEMENT_AUDIENCES = new Set(['all', 'residents', 'committee', 'owners', 'tenants']);
const ANNOUNCEMENT_PRIORITIES = new Set(['critical', 'high', 'normal']);
const PAYMENT_METHODS = new Set(['upi', 'netbanking', 'cash']);
const PAYMENT_REVIEW_DECISIONS = new Set(['approve', 'reject']);
const SOCIETY_DOCUMENT_DOWNLOAD_REVIEW_DECISIONS = new Set(['approve', 'reject']);
const BOOKING_REVIEW_STATUSES = new Set(['confirmed', 'waitlisted']);
const COMPLAINT_CATEGORIES = new Set(['plumbing', 'security', 'billing', 'cleaning', 'general']);
const COMPLAINT_STATUSES = new Set(['open', 'inProgress', 'resolved']);
const STAFF_CATEGORIES = new Set(['domesticHelp', 'driver', 'cook', 'vendor']);
const VERIFICATION_STATES = new Set(['pending', 'verified', 'expired']);
const ENTRY_SUBJECT_TYPES = new Set(['staff', 'visitor', 'delivery']);
const ENTRY_STATUSES = new Set(['inside', 'exited']);
const VISITOR_CATEGORIES = new Set(['guest', 'family', 'service', 'delivery']);
const VISITOR_PASS_STATUSES = new Set(['scheduled', 'checkedIn', 'completed', 'cancelled']);
const SECURITY_GUEST_REQUEST_STATUSES = new Set([
  'pendingApproval',
  'approved',
  'denied',
  'checkedIn',
  'completed',
  'cancelled',
]);
const SECURITY_GUEST_LOG_ACTIONS = new Set([
  'created',
  'approved',
  'denied',
  'checkedIn',
  'checkedOut',
  'cancelled',
  'message',
  'ringRequested',
]);
const CHAT_THREAD_TYPES = new Set(['society', 'direct']);
const STAFF_REVIEW_STATES = new Set(['verified', 'expired']);
const MAINTENANCE_FREQUENCIES = new Set(['monthly', 'quarterly']);
const VEHICLE_TYPES = new Set(['car', 'bike', 'scooter']);
const SOCIETY_DOCUMENT_CATEGORIES = new Set([
  'liftLicense',
  'commonLightBill',
  'waterBill',
  'fireSafety',
  'insurance',
  'auditReport',
  'other',
]);

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

function normalizeOptionalEmail(value) {
  const normalized = String(value ?? '').trim();
  return normalized ? normalizeEmail(normalized) : null;
}

function normalizeRequiredText(value, label, maxLength = 80) {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    throw new HttpError(400, `Enter ${label}.`);
  }

  if (normalized.length > maxLength) {
    throw new HttpError(400, `${label} should stay within ${maxLength} characters.`);
  }

  return normalized;
}

function normalizeOptionalText(value, maxLength = 80) {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw new HttpError(400, `Keep this field within ${maxLength} characters.`);
  }

  return normalized;
}

function normalizeOptionalPhoneNumber(value, label) {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    return null;
  }

  try {
    return normalizePhoneNumber(normalized);
  } catch (error) {
    throw new HttpError(400, `Enter a valid ${label}.`);
  }
}

function normalizeOptionalImageDataUrl(value, label, maxSizeInBytes = 4 * 1024 * 1024) {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    return null;
  }

  if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(normalized)) {
    throw new HttpError(400, `Upload ${label} as a PNG, JPG, or WEBP image.`);
  }

  const maxPayloadLength = Math.ceil(maxSizeInBytes * 1.5);

  if (normalized.length > maxPayloadLength) {
    throw new HttpError(400, `Choose ${label} smaller than 4 MB.`);
  }

  return normalized;
}

function normalizeDateOnlyInput(value, label) {
  const normalized = String(value ?? '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new HttpError(400, `Choose ${label}.`);
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new HttpError(400, `Choose a valid ${label}.`);
  }

  return normalized;
}

function normalizeRentAgreementAttachment(fileNameInput, dataUrlInput) {
  const fileName = String(fileNameInput ?? '').trim();
  const dataUrl = String(dataUrlInput ?? '').trim();

  if (!fileName && !dataUrl) {
    return {
      fileName: null,
      dataUrl: null,
      uploadedAt: null,
    };
  }

  if (!fileName || !dataUrl) {
    throw new HttpError(400, 'Finish attaching the rent agreement before saving.');
  }

  if (
    !/^data:(application\/pdf|image\/png|image\/jpeg|image\/webp);base64,/i.test(dataUrl)
  ) {
    throw new HttpError(400, 'Upload the rent agreement as a PDF, PNG, JPG, or WEBP file.');
  }

  if (dataUrl.length > 5_500_000) {
    throw new HttpError(400, 'Choose a rent agreement file smaller than 4 MB.');
  }

  return {
    fileName: fileName.slice(0, 120),
    dataUrl,
    uploadedAt: nowIso(),
  };
}

function normalizeAnnouncementPhotoDataUrl(dataUrlInput) {
  const dataUrl = String(dataUrlInput ?? '').trim();

  if (!dataUrl) {
    return null;
  }

  if (!/^data:(image\/png|image\/jpeg|image\/webp);base64,/i.test(dataUrl)) {
    throw new HttpError(400, 'Upload the announcement photo as a PNG, JPG, or WEBP image.');
  }

  if (dataUrl.length > 5_500_000) {
    throw new HttpError(400, 'Choose an announcement photo smaller than 4 MB.');
  }

  return dataUrl;
}

function normalizeVehiclePhotoDataUrl(dataUrlInput) {
  const dataUrl = String(dataUrlInput ?? '').trim();

  if (!dataUrl) {
    return null;
  }

  if (!/^data:(image\/png|image\/jpeg|image\/webp);base64,/i.test(dataUrl)) {
    throw new HttpError(400, 'Upload the vehicle photo as a PNG, JPG, or WEBP image.');
  }

  if (dataUrl.length > 5_500_000) {
    throw new HttpError(400, 'Choose a vehicle photo smaller than 4 MB.');
  }

  return dataUrl;
}

function normalizeComplaintUpdatePhotoDataUrl(dataUrlInput) {
  const dataUrl = String(dataUrlInput ?? '').trim();

  if (!dataUrl) {
    return null;
  }

  if (!/^data:(image\/png|image\/jpeg|image\/webp);base64,/i.test(dataUrl)) {
    throw new HttpError(400, 'Upload the helpdesk update photo as a PNG, JPG, or WEBP image.');
  }

  if (dataUrl.length > 5_500_000) {
    throw new HttpError(400, 'Choose a helpdesk update photo smaller than 4 MB.');
  }

  return dataUrl;
}

function normalizeLeadershipProfileInput(input, fallbackUser, roleSet) {
  const fallbackRoleLabel = roleSet.has('chairman') ? 'Chairman' : 'Committee member';
  return {
    displayName: requireText(input?.displayName || fallbackUser?.name, 'Enter the public display name.'),
    roleLabel: requireText(input?.roleLabel || fallbackRoleLabel, 'Enter the public role label.'),
    phone: normalizeOptionalPhoneNumber(input?.phone || fallbackUser?.phone, 'public contact number'),
    email: normalizeOptionalText(input?.email, 120),
    availability: normalizeOptionalText(input?.availability, 120),
    bio: normalizeOptionalText(input?.bio, 400),
    photoDataUrl: normalizeOptionalImageDataUrl(input?.photoDataUrl, 'the leadership profile photo'),
  };
}

function normalizeSocietyDocumentAttachment(fileNameInput, dataUrlInput) {
  const fileName = String(fileNameInput ?? '').trim();
  const dataUrl = String(dataUrlInput ?? '').trim();

  if (!fileName || !dataUrl) {
    throw new HttpError(400, 'Finish attaching the society document before uploading.');
  }

  if (!/^data:(application\/pdf|image\/png|image\/jpeg|image\/webp);base64,/i.test(dataUrl)) {
    throw new HttpError(400, 'Upload the document as a PDF, PNG, JPG, or WEBP file.');
  }

  if (dataUrl.length > 8_000_000) {
    throw new HttpError(400, 'Choose a document smaller than 5 MB.');
  }

  return {
    fileName: fileName.slice(0, 160),
    fileDataUrl: dataUrl,
  };
}

function normalizeVehicleRegistrationNumber(value) {
  const normalized = String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (!normalized) {
    throw new HttpError(400, 'Enter the vehicle number for each saved vehicle.');
  }

  if (normalized.length < 6 || normalized.length > 13) {
    throw new HttpError(400, 'Enter a valid vehicle number.');
  }

  return normalized;
}

function normalizeResidenceVehicles(vehicleInputs, allowedUnitIds) {
  if (!Array.isArray(vehicleInputs) || vehicleInputs.length === 0) {
    return [];
  }

  if (vehicleInputs.length > 4) {
    throw new HttpError(400, 'You can save up to 4 vehicles in one profile.');
  }

  return vehicleInputs.map((vehicleInput, index) => {
    const unitId = String(vehicleInput?.unitId ?? '').trim();

    if (!unitId || !allowedUnitIds.includes(unitId)) {
      throw new HttpError(400, `Choose a valid linked unit for vehicle ${index + 1}.`);
    }

    const vehicleType = String(vehicleInput?.vehicleType ?? '').trim();

    if (!VEHICLE_TYPES.has(vehicleType)) {
      throw new HttpError(400, 'Choose car, bike, or scooter for each vehicle.');
    }

    return {
      unitId,
      registrationNumber: normalizeVehicleRegistrationNumber(vehicleInput?.registrationNumber),
      vehicleType,
      color: normalizeOptionalText(vehicleInput?.color, 40),
      parkingSlot: normalizeOptionalText(vehicleInput?.parkingSlot, 40),
      photoDataUrl: normalizeVehiclePhotoDataUrl(vehicleInput?.photoDataUrl),
    };
  });
}

function normalizeResidenceProfileInput(input, residentType, allowedUnitIds = []) {
  if (!input || typeof input !== 'object') {
    throw new HttpError(400, 'Fill the residence profile before continuing.');
  }

  if (!RESIDENT_JOIN_ROLES.has(residentType)) {
    throw new HttpError(400, 'Choose owner, tenant, society committee member, or first chairman claim.');
  }

  if (input.dataProtectionConsent !== true) {
    throw new HttpError(
      400,
      'Confirm the privacy notice before saving resident profile details.',
    );
  }

  return {
    residentType,
    fullName: normalizeRequiredText(input.fullName, 'the resident full name'),
    photoDataUrl: normalizeOptionalImageDataUrl(input.photoDataUrl, 'the resident profile photo'),
    email: normalizeOptionalEmail(input.email),
    businessName: normalizeOptionalText(input.businessName, 120),
    businessDetails: normalizeOptionalText(input.businessDetails, 400),
    alternatePhone: normalizeOptionalPhoneNumber(input.alternatePhone, 'alternate mobile number'),
    emergencyContactName: normalizeOptionalText(input.emergencyContactName),
    emergencyContactPhone: normalizeOptionalPhoneNumber(
      input.emergencyContactPhone,
      'emergency contact mobile number',
    ),
    secondaryEmergencyContactName: normalizeOptionalText(input.secondaryEmergencyContactName),
    secondaryEmergencyContactPhone: normalizeOptionalPhoneNumber(
      input.secondaryEmergencyContactPhone,
      'secondary emergency contact mobile number',
    ),
    vehicles: normalizeResidenceVehicles(input.vehicles, allowedUnitIds),
    moveInDate: normalizeDateOnlyInput(input.moveInDate, 'the move-in date'),
    dataProtectionConsentAt: nowIso(),
    rentAgreement:
      residentType === 'tenant'
        ? normalizeRentAgreementAttachment(input.rentAgreementFileName, input.rentAgreementDataUrl)
        : { fileName: null, dataUrl: null, uploadedAt: null },
  };
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

function isConfiguredSecret(value) {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    return false;
  }

  return !/^your_|^replace-with-|_here$/i.test(normalized);
}

function getTwilioConfig() {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();
  const username =
    process.env.TWILIO_API_KEY?.trim() || process.env.TWILIO_ACCOUNT_SID?.trim();
  const password =
    process.env.TWILIO_API_KEY_SECRET?.trim() || process.env.TWILIO_AUTH_TOKEN?.trim();

  if (!isConfiguredSecret(serviceSid) || !isConfiguredSecret(username) || !isConfiguredSecret(password)) {
    return null;
  }

  return { serviceSid, username, password };
}

function isOtpDeliveryConfigured() {
  return Boolean(getTwilioConfig());
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

async function dispatchOtp(channel, destination, forceDevelopment = false) {
  const config = getTwilioConfig();

  if (!config || forceDevelopment) {
    return {
      provider: 'development',
      providerReference: null,
      code: generateDevelopmentCode(),
    };
  }

  const payload = await sendTwilioRequest('/Verifications', {
    To: destination,
    Channel: channel,
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
    To: challenge.destination,
    Code: code,
  });

  return payload.status === 'approved' || payload.valid === true;
}

function getUserById(userId) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
}

function getUserProfile(userId) {
  return db.prepare('SELECT * FROM userProfiles WHERE userId = ?').get(userId);
}

function isPlatformSuperUserAccount(userId) {
  return userId === SUPER_USER_ID || getUserProfile(userId)?.preferredRole === 'superUser';
}

function requireNonPlatformSuperUserResidentAccess(userId) {
  if (isPlatformSuperUserAccount(userId)) {
    throw new HttpError(403, 'The platform super user account cannot join a society as a resident.');
  }
}

function getResidenceProfileRecord(userId, societyId) {
  return db
    .prepare('SELECT * FROM residenceProfiles WHERE userId = ? AND societyId = ?')
    .get(userId, societyId);
}

function getLatestJoinRequestForUserSociety(userId, societyId) {
  return db
    .prepare(
      `SELECT id, residentType, status, createdAt
       FROM joinRequests
       WHERE userId = ? AND societyId = ?
       ORDER BY createdAt DESC
       LIMIT 1`,
    )
    .get(userId, societyId);
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
       ORDER BY LOWER(societies.name) ASC`,
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

function societyHasAssignedChairman(societyId, excludedUserId = null) {
  const memberships = db
    .prepare('SELECT userId, roles FROM memberships WHERE societyId = ?')
    .all(societyId);

  return memberships.some(
    (membership) =>
      membership.userId !== excludedUserId &&
      parseStoredJson(membership.roles).includes('chairman'),
  );
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
  return db.prepare('SELECT * FROM societies WHERE id = ?').get(societyId);
}

function getSocietyDocument(documentId) {
  return db
    .prepare(
      `SELECT id, societyId, category, title, fileName, fileDataUrl, summary, issuedOn, validUntil, uploadedByUserId, uploadedAt
       FROM societyDocuments
       WHERE id = ?`,
    )
    .get(documentId);
}

function getSocietyDocumentDownloadRequest(requestId) {
  return db
    .prepare(
      `SELECT id, societyId, documentId, requesterUserId, status, requestNote, requestedAt, reviewedAt, reviewedByUserId, reviewNote, accessExpiresAt
       FROM societyDocumentDownloadRequests
       WHERE id = ?`,
    )
    .get(requestId);
}

function getStaffProfile(staffId) {
  return db
    .prepare(
      'SELECT id, societyId, name, phone, category, verificationState, employerUnitIds, requestedByUserId, requestedAt, reviewedByUserId, reviewedAt FROM staffProfiles WHERE id = ?',
    )
    .get(staffId);
}

function getVisitorPass(visitorPassId) {
  return db
    .prepare(
      `SELECT id, societyId, unitId, createdByUserId, visitorName, phone, category, purpose, guestCount, expectedAt, validUntil, vehicleNumber, notes, passCode, status, createdAt, checkedInAt, checkedOutAt, updatedAt
       FROM visitorPasses
       WHERE id = ?`,
    )
    .get(visitorPassId);
}

function getSecurityGuestRequest(requestId) {
  return db
    .prepare(
      `SELECT id, societyId, unitId, residentUserId, createdByUserId, visitorPassId, guestName, phone, category, purpose, guestCount, vehicleNumber, guestPhotoDataUrl, guestPhotoCapturedAt, vehiclePhotoDataUrl, vehiclePhotoCapturedAt, gateNotes, status, createdAt, respondedAt, respondedByUserId, checkedInAt, checkedOutAt, updatedAt
       FROM securityGuestRequests
       WHERE id = ?`,
    )
    .get(requestId);
}

function getChatThread(threadId) {
  return db
    .prepare(
      `SELECT id, societyId, type, title, createdByUserId, participantUserIds, directKey, createdAt, lastMessageAt, updatedAt
       FROM chatThreads
       WHERE id = ?`,
    )
    .get(threadId);
}

function requireSocietyMember(userId, societyId) {
  const membership = getMembership(userId, societyId);

  if (!membership) {
    throw new HttpError(403, 'Only society members can use chat in this workspace.');
  }

  return membership;
}

function buildDirectChatKey(userIdA, userIdB) {
  return [String(userIdA ?? '').trim(), String(userIdB ?? '').trim()].sort().join('::');
}

function getSocietyChatThread(societyId) {
  return db
    .prepare(
      `SELECT id, societyId, type, title, createdByUserId, participantUserIds, directKey, createdAt, lastMessageAt, updatedAt
       FROM chatThreads
       WHERE societyId = ? AND type = 'society'
       ORDER BY createdAt ASC
       LIMIT 1`,
    )
    .get(societyId);
}

function getDirectChatThread(societyId, directKey) {
  return db
    .prepare(
      `SELECT id, societyId, type, title, createdByUserId, participantUserIds, directKey, createdAt, lastMessageAt, updatedAt
       FROM chatThreads
       WHERE societyId = ? AND type = 'direct' AND directKey = ?
       LIMIT 1`,
    )
    .get(societyId, directKey);
}

function createChatThreadRecord({
  societyId,
  type,
  title,
  createdByUserId,
  participantUserIds,
  directKey,
}) {
  if (!CHAT_THREAD_TYPES.has(type)) {
    throw new HttpError(400, 'Unsupported chat thread type.');
  }

  const createdAt = nowIso();
  const threadId = nextId('chat-thread');

  db.prepare(
    `INSERT INTO chatThreads (
      id,
      societyId,
      type,
      title,
      createdByUserId,
      participantUserIds,
      directKey,
      createdAt,
      lastMessageAt,
      updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    threadId,
    societyId,
    type,
    title || null,
    createdByUserId || null,
    JSON.stringify(participantUserIds),
    directKey || null,
    createdAt,
    null,
    createdAt,
  );

  return getChatThread(threadId);
}

function touchChatThread(threadId, updatedAt) {
  db.prepare('UPDATE chatThreads SET lastMessageAt = ?, updatedAt = ? WHERE id = ?').run(updatedAt, updatedAt, threadId);
}

function createChatMessageRecord(threadId, societyId, senderUserId, body) {
  const message = requireText(body, 'Enter a message before sending.');
  const createdAt = nowIso();

  db.prepare(
    `INSERT INTO chatMessages (
      id,
      threadId,
      societyId,
      senderUserId,
      body,
      createdAt,
      updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    nextId('chat-message'),
    threadId,
    societyId,
    senderUserId,
    message,
    createdAt,
    createdAt,
  );

  touchChatThread(threadId, createdAt);
}

function getOrCreateSocietyChatThread(societyId, userId) {
  const existingThread = getSocietyChatThread(societyId);

  if (existingThread) {
    return existingThread;
  }

  const participantUserIds = db
    .prepare('SELECT userId FROM memberships WHERE societyId = ? ORDER BY userId ASC')
    .all(societyId)
    .map((row) => row.userId);

  return createChatThreadRecord({
    societyId,
    type: 'society',
    title: 'Society lounge',
    createdByUserId: userId,
    participantUserIds,
    directKey: null,
  });
}

function getOrCreateDirectChatThread(societyId, userId, otherUserId) {
  const directKey = buildDirectChatKey(userId, otherUserId);
  const existingThread = getDirectChatThread(societyId, directKey);

  if (existingThread) {
    return existingThread;
  }

  return createChatThreadRecord({
    societyId,
    type: 'direct',
    title: null,
    createdByUserId: userId,
    participantUserIds: [userId, otherUserId].sort(),
    directKey,
  });
}

function canRespondToSecurityGuestRequest(userId, request) {
  const membership = getMembership(userId, request.societyId);
  const roleSet = membership ? new Set(parseStoredJson(membership.roles)) : new Set();
  const unitIds = membership ? normalizeRequestedUnitIds(parseStoredJson(membership.unitIds)) : [];

  return (
    request.residentUserId === userId ||
    ((roleSet.has('owner') || roleSet.has('tenant') || roleSet.has('family') || roleSet.has('authorizedOccupant'))
      && unitIds.includes(request.unitId))
  );
}

function canMessageSecurityGuestRequest(userId, request) {
  if (canRespondToSecurityGuestRequest(userId, request)) {
    return true;
  }

  try {
    requireSocietySecurityOperator(userId, request.societyId);
    return true;
  } catch (error) {
    return false;
  }
}

function getInvoice(invoiceId) {
  return db
    .prepare('SELECT id, societyId, unitId, planId, periodLabel, dueDate, amountInr, status FROM invoices WHERE id = ?')
    .get(invoiceId);
}

function getAnnouncement(announcementId) {
  return db
    .prepare('SELECT id, societyId, title, body, photoDataUrl, audience, createdAt, priority, readByUserIds FROM announcements WHERE id = ?')
    .get(announcementId);
}

function getPayment(paymentId) {
  return db
    .prepare(
      'SELECT id, societyId, invoiceId, amountInr, method, paidAt, status, submittedByUserId, referenceNote, proofImageDataUrl, reviewedByUserId, reviewedAt FROM payments WHERE id = ?',
    )
    .get(paymentId);
}

function getMaintenancePlan(planId) {
  return db
    .prepare(
      'SELECT id, societyId, frequency, dueDay, amountInr, lateFeeInr, calculationMethod, receiptPrefix, upiId, upiMobileNumber, upiPayeeName, upiQrCodeDataUrl, upiQrPayload, bankAccountName, bankAccountNumber, bankIfscCode, bankName, bankBranchName FROM maintenancePlans WHERE id = ?',
    )
    .get(planId);
}

function getAmenity(amenityId) {
  return db
    .prepare('SELECT id, societyId, name, bookingType, reservationScope, approvalMode, capacity, priceInr FROM amenities WHERE id = ?')
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

function buildComplaintUpdateMessage(previousComplaint, nextStatus, nextAssignedTo, inputMessage) {
  const explicitMessage = normalizeOptionalText(inputMessage, 240);

  if (explicitMessage) {
    return explicitMessage;
  }

  const changes = [];

  if (previousComplaint.status !== nextStatus) {
    changes.push(`Status moved to ${nextStatus}.`);
  }

  if ((previousComplaint.assignedTo ?? '') !== (nextAssignedTo ?? '')) {
    changes.push(nextAssignedTo ? `Assigned to ${nextAssignedTo}.` : 'Assignment cleared.');
  }

  return changes.length > 0 ? changes.join(' ') : null;
}

function insertComplaintUpdate({
  complaintId,
  societyId,
  createdByUserId,
  status,
  assignedTo,
  message,
  photoDataUrl = null,
}) {
  db.prepare(
    `INSERT INTO complaintUpdates (
      id,
      complaintId,
      societyId,
      createdByUserId,
      status,
      assignedTo,
      message,
      photoDataUrl,
      createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    nextId('complaint-update'),
    complaintId,
    societyId,
    createdByUserId,
    status,
    assignedTo || null,
    message || null,
    photoDataUrl || null,
    nowIso(),
  );
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
      preferredRole === 'superUser'
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
    data: getSynchronizedSnapshot(),
  };
}

function hasMatchingCreatorAccessKey(accessKeyInput) {
  const configuredKey = String(process.env.SOCIETY_CREATOR_ACCESS_KEY ?? '').trim();
  const accessKey = String(accessKeyInput ?? '').trim();

  if (!configuredKey) {
    throw new HttpError(
      503,
      'Creator app access is not configured on the backend. Set SOCIETY_CREATOR_ACCESS_KEY and try again.',
    );
  }

  if (!accessKey) {
    throw new HttpError(400, 'Enter the creator access key.');
  }

  const configuredBuffer = Buffer.from(configuredKey, 'utf8');
  const providedBuffer = Buffer.from(accessKey, 'utf8');

  return (
    configuredBuffer.length === providedBuffer.length
    && crypto.timingSafeEqual(configuredBuffer, providedBuffer)
  );
}

function requestCreatorSession(accessKeyInput) {
  cleanupExpiredRecords();

  if (!hasMatchingCreatorAccessKey(accessKeyInput)) {
    throw new HttpError(403, 'Creator access key is incorrect.');
  }

  const sessionToken = createSession(SUPER_USER_ID);

  return buildAuthPayload(SUPER_USER_ID, sessionToken);
}

async function requestOtp(intentInput, channelInput, destinationInput, forceDevelopment = false) {
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

  const providerResponse = await dispatchOtp(channel, destination, forceDevelopment);
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
    throw new HttpError(400, 'Choose super user, chairman, owner, or tenant.');
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
    data: getSynchronizedSnapshot(),
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

function requireSocietySecurityOperator(userId, societyId) {
  const society = getSociety(societyId);

  if (!society) {
    throw new HttpError(404, 'Selected society was not found.');
  }

  const roleSet = getMembershipRoleSet(userId, societyId);

  if (!roleSet.has('chairman') && !roleSet.has('committee') && !roleSet.has('security')) {
    throw new HttpError(403, 'Only the chairman, committee, or security workspace can manage gate operations.');
  }
}

function getMembershipRoleSet(userId, societyId) {
  const membership = getMembership(userId, societyId);
  return membership ? new Set(parseStoredJson(membership.roles)) : new Set();
}

function ensureMembershipRole(userId, societyId, role) {
  const membership = getMembership(userId, societyId);

  if (!membership) {
    db.prepare(
      'INSERT INTO memberships (id, userId, societyId, roles, unitIds, isPrimary) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(nextId('membership'), userId, societyId, JSON.stringify([role]), JSON.stringify([]), 0);
    return;
  }

  const roles = parseStoredJson(membership.roles);

  if (roles.includes(role)) {
    return;
  }

  db.prepare('UPDATE memberships SET roles = ? WHERE id = ?').run(
    JSON.stringify([...roles, role]),
    membership.id,
  );
}

function createSecurityGuestLog(
  requestId,
  societyId,
  actorUserId,
  actorRole,
  action,
  note,
  createdAt = nowIso(),
) {
  if (!SECURITY_GUEST_LOG_ACTIONS.has(action)) {
    throw new HttpError(400, 'Unsupported security guest log action.');
  }

  db.prepare(
    `INSERT INTO securityGuestLogs (
      id,
      societyId,
      requestId,
      actorUserId,
      actorRole,
      action,
      note,
      createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    nextId('security-guest-log'),
    societyId,
    requestId,
    actorUserId || null,
    actorRole,
    action,
    note || null,
    createdAt,
  );
}

function createLinkedVisitorPassFromSecurityRequest(request, createdByUserId, createdAt) {
  const visitorPassId = nextId('visitor-pass');

  db.prepare(
    `INSERT INTO visitorPasses (
      id,
      societyId,
      unitId,
      createdByUserId,
      visitorName,
      phone,
      category,
      purpose,
      guestCount,
      expectedAt,
      validUntil,
      vehicleNumber,
      notes,
      passCode,
      status,
      createdAt,
      checkedInAt,
      checkedOutAt,
      updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    visitorPassId,
    request.societyId,
    request.unitId,
    createdByUserId,
    request.guestName,
    request.phone || null,
    request.category,
    request.purpose,
    request.guestCount,
    createdAt,
    addMinutes(new Date(createdAt), 360),
    request.vehicleNumber || null,
    request.gateNotes || null,
    buildVisitorPassCode(request.societyId),
    'scheduled',
    createdAt,
    null,
    null,
    createdAt,
  );

  return visitorPassId;
}

function requireSocietyAnnouncementPublisher(userId, societyId) {
  const society = getSociety(societyId);

  if (!society) {
    throw new HttpError(404, 'Selected society was not found.');
  }

  const membership = getMembership(userId, societyId);
  const roleSet = membership ? new Set(parseStoredJson(membership.roles)) : new Set();

  if (!roleSet.has('chairman') && !roleSet.has('committee')) {
    throw new HttpError(403, 'Only a chairman or committee member can publish announcements.');
  }
}

function requireSocietyDocumentDownloadReviewer(userId, societyId) {
  const society = getSociety(societyId);

  if (!society) {
    throw new HttpError(404, 'Selected society was not found.');
  }

  const membership = getMembership(userId, societyId);
  const roleSet = membership ? new Set(parseStoredJson(membership.roles)) : new Set();

  if (!roleSet.has('chairman') && !roleSet.has('committee')) {
    throw new HttpError(403, 'Only the chairman or committee can review document download requests.');
  }
}

function requireSocietyLeadershipManager(userId, societyId) {
  const society = getSociety(societyId);

  if (!society) {
    throw new HttpError(404, 'Selected society was not found.');
  }

  const membership = getMembership(userId, societyId);
  const roleSet = membership ? new Set(parseStoredJson(membership.roles)) : new Set();

  if (!roleSet.has('chairman') && !roleSet.has('committee')) {
    throw new HttpError(403, 'Only a chairman or committee member can publish resident-facing leadership details.');
  }

  const user = getUserById(userId);

  if (!user) {
    throw new HttpError(404, 'Authenticated member was not found.');
  }

  return {
    membership,
    roleSet,
    user,
  };
}

function syncResidenceVehicles(userId, societyId, allowedUnitIds, vehicles) {
  db.prepare('DELETE FROM vehicleRegistrations WHERE userId = ? AND societyId = ?').run(
    userId,
    societyId,
  );

  if (!vehicles.length) {
    return;
  }

  const validUnitIds = new Set(allowedUnitIds);
  const insertVehicle = db.prepare(
    `INSERT INTO vehicleRegistrations (
      id,
      societyId,
      userId,
      unitId,
      registrationNumber,
      vehicleType,
      color,
      parkingSlot,
      photoDataUrl
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  for (const vehicle of vehicles) {
    if (!validUnitIds.has(vehicle.unitId)) {
      throw new HttpError(400, 'One or more vehicle entries are linked to an invalid unit.');
    }

    insertVehicle.run(
      nextId('vehicle'),
      societyId,
      userId,
      vehicle.unitId,
      vehicle.registrationNumber,
      vehicle.vehicleType,
      vehicle.color,
      vehicle.parkingSlot,
      vehicle.photoDataUrl,
    );
  }
}

function saveResidenceProfile(userId, societyId, residentType, input, allowedUnitIds = []) {
  const user = getUserById(userId);

  if (!user) {
    throw new HttpError(404, 'Resident account not found.');
  }

  const normalized = normalizeResidenceProfileInput(input, residentType, allowedUnitIds);
  const existingProfile = getResidenceProfileRecord(userId, societyId);
  const rentAgreementFileName =
    residentType === 'tenant'
      ? normalized.rentAgreement.fileName ?? existingProfile?.rentAgreementFileName ?? null
      : null;
  const rentAgreementDataUrl =
    residentType === 'tenant'
      ? normalized.rentAgreement.dataUrl ?? existingProfile?.rentAgreementDataUrl ?? null
      : null;
  const rentAgreementUploadedAt =
    residentType === 'tenant'
      ? normalized.rentAgreement.uploadedAt ?? existingProfile?.rentAgreementUploadedAt ?? null
      : null;
  const updatedAt = nowIso();
  const profileId = existingProfile?.id ?? nextId('residence-profile');

  db.prepare(
    `INSERT INTO residenceProfiles (
      id,
      societyId,
      userId,
      residentType,
      fullName,
      phone,
      photoDataUrl,
      email,
      businessName,
      businessDetails,
      alternatePhone,
      emergencyContactName,
      emergencyContactPhone,
      secondaryEmergencyContactName,
      secondaryEmergencyContactPhone,
      moveInDate,
      dataProtectionConsentAt,
      rentAgreementFileName,
      rentAgreementDataUrl,
      rentAgreementUploadedAt,
      updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(societyId, userId) DO UPDATE SET
      residentType = excluded.residentType,
      fullName = excluded.fullName,
      phone = excluded.phone,
      photoDataUrl = excluded.photoDataUrl,
      email = excluded.email,
      businessName = excluded.businessName,
      businessDetails = excluded.businessDetails,
      alternatePhone = excluded.alternatePhone,
      emergencyContactName = excluded.emergencyContactName,
      emergencyContactPhone = excluded.emergencyContactPhone,
      secondaryEmergencyContactName = excluded.secondaryEmergencyContactName,
      secondaryEmergencyContactPhone = excluded.secondaryEmergencyContactPhone,
      moveInDate = excluded.moveInDate,
      dataProtectionConsentAt = excluded.dataProtectionConsentAt,
      rentAgreementFileName = excluded.rentAgreementFileName,
      rentAgreementDataUrl = excluded.rentAgreementDataUrl,
      rentAgreementUploadedAt = excluded.rentAgreementUploadedAt,
      updatedAt = excluded.updatedAt`,
  ).run(
    profileId,
    societyId,
    userId,
    residentType,
    normalized.fullName,
    user.phone,
    normalized.photoDataUrl,
    normalized.email,
    normalized.businessName,
    normalized.businessDetails,
    normalized.alternatePhone,
    normalized.emergencyContactName,
    normalized.emergencyContactPhone,
    normalized.secondaryEmergencyContactName,
    normalized.secondaryEmergencyContactPhone,
    normalized.moveInDate,
    normalized.dataProtectionConsentAt,
    rentAgreementFileName,
    rentAgreementDataUrl,
    rentAgreementUploadedAt,
    updatedAt,
  );

  syncResidenceVehicles(userId, societyId, allowedUnitIds, normalized.vehicles);

  if (normalized.email) {
    db.prepare('UPDATE users SET name = ?, email = ?, avatarInitials = ? WHERE id = ?').run(
      normalized.fullName,
      normalized.email,
      getAvatarInitials(normalized.fullName),
      userId,
    );
    return;
  }

  db.prepare('UPDATE users SET name = ?, avatarInitials = ? WHERE id = ?').run(
    normalized.fullName,
    getAvatarInitials(normalized.fullName),
    userId,
  );
}

function resolveResidentTypeForProfile(userId, societyId, requestedResidentType) {
  if (RESIDENT_JOIN_ROLES.has(requestedResidentType)) {
    return requestedResidentType;
  }

  const existingProfile = getResidenceProfileRecord(userId, societyId);

  if (existingProfile?.residentType && RESIDENT_JOIN_ROLES.has(existingProfile.residentType)) {
    return existingProfile.residentType;
  }

  const latestJoinRequest = getLatestJoinRequestForUserSociety(userId, societyId);

  if (latestJoinRequest?.residentType && RESIDENT_JOIN_ROLES.has(latestJoinRequest.residentType)) {
    return latestJoinRequest.residentType;
  }

  const membershipRoles = getMembershipRoleSet(userId, societyId);

  if (membershipRoles.has('committee')) {
    return 'committee';
  }

  if (membershipRoles.has('tenant')) {
    return 'tenant';
  }

  if (membershipRoles.has('owner')) {
    return 'owner';
  }

  throw new HttpError(403, 'You are not allowed to edit residence details for this society.');
}

function selectSocietyForResident(userId, societyId, unitIdsInput, residentType, residenceProfileInput) {
  requireNonPlatformSuperUserResidentAccess(userId);
  const society = db.prepare('SELECT id, name FROM societies WHERE id = ?').get(societyId);

  if (!society) {
    throw new HttpError(404, 'Selected society was not found.');
  }

  const unitIds = normalizeRequestedUnitIds(unitIdsInput);

  if (unitIds.length === 0) {
    throw new HttpError(400, 'Select one or more resident numbers, offices, or spaces before continuing.');
  }

  if (!RESIDENT_JOIN_ROLES.has(residentType)) {
    throw new HttpError(400, 'Choose owner, tenant, society committee member, or first chairman claim.');
  }

  if (residentType === 'chairman' && societyHasAssignedChairman(societyId)) {
    throw new HttpError(400, 'This society already has a chairman. Join as an owner or tenant instead.');
  }

  const units = unitIds.map((unitId) => getUnit(unitId));

  if (units.some((unit) => !unit || unit.societyId !== societyId)) {
    throw new HttpError(404, 'One or more selected resident numbers or spaces were not found in this society.');
  }

  const normalizedPreferredRole =
    residentType === 'chairman'
      ? 'chairman'
      : residentType === 'tenant'
        ? 'tenant'
        : 'owner';
  const now = nowIso();

  runTransaction(() => {
    saveResidenceProfile(userId, societyId, residentType, residenceProfileInput, unitIds);

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
    data: getSynchronizedSnapshot(),
  };
}

function updateResidenceProfile(userId, societyId, input) {
  const society = getSociety(societyId);

  if (!society) {
    throw new HttpError(404, 'Selected society was not found.');
  }

  const residentType = resolveResidentTypeForProfile(userId, societyId, input?.residentType);
  const membership = getMembership(userId, societyId);
  const latestJoinRequest = getLatestJoinRequestForUserSociety(userId, societyId);

  if (!membership && !latestJoinRequest) {
    throw new HttpError(403, 'You are not allowed to edit residence details for this society.');
  }

  runTransaction(() => {
    const allowedUnitIds = membership
      ? normalizeRequestedUnitIds(parseStoredJson(membership.unitIds))
      : normalizeRequestedUnitIds(parseStoredJson(latestJoinRequest?.unitIds));

    saveResidenceProfile(userId, societyId, residentType, {
      ...input,
      residentType,
    }, allowedUnitIds);
  });

  return buildSocietyMutationPayload(userId, societyId);
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

  const isChairmanClaim = joinRequest.residentType === 'chairman';

  if (isChairmanClaim) {
    requireSuperUserRole(userId);
  } else {
    requireSocietyChairman(userId, joinRequest.societyId);
  }

  const requestedUnitIds = normalizeRequestedUnitIds(parseStoredJson(joinRequest.unitIds));

  if (requestedUnitIds.length === 0) {
    throw new HttpError(400, 'This join request does not contain any unit selections.');
  }

  const requestedUnits = requestedUnitIds.map((unitId) => getUnit(unitId));

  if (requestedUnits.some((unit) => !unit || unit.societyId !== joinRequest.societyId)) {
    throw new HttpError(400, 'One or more requested units no longer belong to this society.');
  }

  if (isChairmanClaim && decision === 'approve' && societyHasAssignedChairman(joinRequest.societyId)) {
    throw new HttpError(400, 'This society already has a chairman. Reject this claim or transfer chairman access from admin.');
  }

  const normalizedPreferredRole =
    joinRequest.residentType === 'chairman'
      ? 'chairman'
      : joinRequest.residentType === 'tenant'
        ? 'tenant'
        : 'owner';
  const membershipRoles =
    joinRequest.residentType === 'chairman'
      ? new Set(['chairman', 'committee', 'owner'])
      : joinRequest.residentType === 'committee'
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
    data: getSynchronizedSnapshot(),
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

function parseMaintenanceDueDay(value, message) {
  const parsed = parsePositiveWholeNumber(value, message);

  if (parsed > 28) {
    throw new HttpError(400, 'Choose a due day between 1 and 28.');
  }

  return parsed;
}

function normalizeReceiptPrefix(value) {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);

  if (normalized.length < 2) {
    throw new HttpError(400, 'Enter a receipt prefix with at least 2 letters or numbers.');
  }

  return normalized;
}

function normalizeUpiMobileNumber(value) {
  const digits = String(value ?? '').replace(/\D/g, '');

  if (!digits) {
    return null;
  }

  if (digits.length === 10) {
    return digits;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }

  throw new HttpError(
    400,
    'Enter a valid 10-digit Indian mobile number for the experimental UPI mobile-number flow.',
  );
}

function normalizeBankAccountNumber(value) {
  const digits = String(value ?? '').replace(/\s+/g, '').trim();

  if (!digits) {
    return null;
  }

  if (!/^\d{9,18}$/.test(digits)) {
    throw new HttpError(400, 'Enter a valid bank account number using 9 to 18 digits.');
  }

  return digits;
}

function normalizeIfscCode(value) {
  const normalized = String(value ?? '').trim().toUpperCase();

  if (!normalized) {
    return null;
  }

  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(normalized)) {
    throw new HttpError(400, 'Enter a valid IFSC code in the standard 11-character format.');
  }

  return normalized;
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

function normalizeOptionalDateTime(value, message) {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    return null;
  }

  const parsed = Date.parse(normalized);

  if (Number.isNaN(parsed)) {
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
    data: getSynchronizedSnapshot(),
  };
}

function getSynchronizedSnapshot(referenceDateInput = new Date()) {
  synchronizeMaintenanceInvoices(referenceDateInput);
  return getSnapshot();
}

function normalizeReferenceDateValue(referenceDateInput) {
  const normalized =
    referenceDateInput instanceof Date
      ? new Date(referenceDateInput.getTime())
      : new Date(referenceDateInput ?? Date.now());

  return Number.isNaN(normalized.getTime()) ? new Date() : normalized;
}

function formatDateOnly(value) {
  return normalizeReferenceDateValue(value).toISOString().slice(0, 10);
}

function getBillingCycleMonthSpan(frequency) {
  return frequency === 'quarterly' ? 3 : 1;
}

function getBillingCycleStart(referenceDateInput, frequency) {
  const referenceDate = normalizeReferenceDateValue(referenceDateInput);
  const startMonth =
    frequency === 'quarterly'
      ? Math.floor(referenceDate.getUTCMonth() / 3) * 3
      : referenceDate.getUTCMonth();

  return new Date(Date.UTC(referenceDate.getUTCFullYear(), startMonth, 1));
}

function addUtcMonths(referenceDateInput, monthCount) {
  const referenceDate = normalizeReferenceDateValue(referenceDateInput);
  return new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + monthCount, 1));
}

function shouldPrepareNextBillingCycle(referenceDateInput, frequency) {
  const referenceDate = normalizeReferenceDateValue(referenceDateInput);
  const isLastDayOfMonth =
    referenceDate.getUTCDate() === new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 0)).getUTCDate();

  if (!isLastDayOfMonth) {
    return false;
  }

  return frequency === 'quarterly' ? (referenceDate.getUTCMonth() + 1) % 3 === 0 : true;
}

function getFirstEligibleBillingCycleStart(societyCreatedAt, frequency) {
  const createdDate = normalizeReferenceDateValue(societyCreatedAt);
  const createdDateOnly = formatDateOnly(createdDate);
  const createdCycleStart = getBillingCycleStart(createdDate, frequency);
  const createdCycleStartDateOnly = formatDateOnly(createdCycleStart);

  return createdDateOnly > createdCycleStartDateOnly
    ? addUtcMonths(createdCycleStart, getBillingCycleMonthSpan(frequency))
    : createdCycleStart;
}

function getTargetBillingCycleStart(referenceDateInput, frequency) {
  const currentCycleStart = getBillingCycleStart(referenceDateInput, frequency);

  return shouldPrepareNextBillingCycle(referenceDateInput, frequency)
    ? addUtcMonths(currentCycleStart, getBillingCycleMonthSpan(frequency))
    : currentCycleStart;
}

function getBillingDueDate(cycleStartInput, dueDayInput) {
  const cycleStart = normalizeReferenceDateValue(cycleStartInput);
  const dueDay = Math.min(28, Math.max(1, Number.parseInt(String(dueDayInput ?? ''), 10) || 10));
  return new Date(Date.UTC(cycleStart.getUTCFullYear(), cycleStart.getUTCMonth(), dueDay)).toISOString().slice(0, 10);
}

function formatBillingPeriodLabel(cycleStartInput) {
  const cycleStart = normalizeReferenceDateValue(cycleStartInput);
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(cycleStart);
}

function synchronizeMaintenanceInvoices(referenceDateInput = new Date()) {
  const referenceDate = normalizeReferenceDateValue(referenceDateInput);
  const openInvoices = db
    .prepare("SELECT id, dueDate, status FROM invoices WHERE status != 'paid'")
    .all();
  const planContexts = db.prepare(
    `SELECT
      maintenancePlans.id,
      maintenancePlans.societyId,
      maintenancePlans.frequency,
      maintenancePlans.dueDay,
      maintenancePlans.amountInr,
      societies.createdAt AS societyCreatedAt
     FROM maintenancePlans
     INNER JOIN societies ON societies.id = maintenancePlans.societyId
     ORDER BY maintenancePlans.id ASC`,
  ).all();
  const listUnitsForSocietyStatement = db.prepare(
    "SELECT id FROM units WHERE societyId = ? ORDER BY COALESCE(buildingId, ''), code ASC, id ASC",
  );
  const findLatestInvoiceStatement = db.prepare(
    'SELECT dueDate FROM invoices WHERE planId = ? AND unitId = ? ORDER BY dueDate DESC LIMIT 1',
  );
  const findInvoiceForDueDateStatement = db.prepare(
    'SELECT id FROM invoices WHERE planId = ? AND unitId = ? AND dueDate = ? LIMIT 1',
  );
  const insertInvoiceStatement = db.prepare(
    'INSERT INTO invoices (id, societyId, unitId, planId, periodLabel, dueDate, amountInr, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const updateInvoiceStatusStatement = db.prepare(
    'UPDATE invoices SET status = ? WHERE id = ?',
  );

  runTransaction(() => {
    for (const invoice of openInvoices) {
      const nextStatus = resolveInvoiceOpenStatus(invoice.dueDate);

      if (invoice.status !== nextStatus) {
        updateInvoiceStatusStatement.run(nextStatus, invoice.id);
      }
    }

    for (const plan of planContexts) {
      const cycleMonthSpan = getBillingCycleMonthSpan(plan.frequency);
      const firstEligibleCycleStart = getFirstEligibleBillingCycleStart(plan.societyCreatedAt, plan.frequency);
      const targetCycleStart = getTargetBillingCycleStart(referenceDate, plan.frequency);

      if (firstEligibleCycleStart.getTime() > targetCycleStart.getTime()) {
        continue;
      }

      const units = listUnitsForSocietyStatement.all(plan.societyId);

      for (const unit of units) {
        const latestInvoice = findLatestInvoiceStatement.get(plan.id, unit.id);
        let cycleStart = firstEligibleCycleStart;

        if (latestInvoice?.dueDate) {
          cycleStart = addUtcMonths(
            getBillingCycleStart(`${latestInvoice.dueDate}T00:00:00.000Z`, plan.frequency),
            cycleMonthSpan,
          );
        }

        while (cycleStart.getTime() <= targetCycleStart.getTime()) {
          const dueDate = getBillingDueDate(cycleStart, plan.dueDay);
          const existingInvoice = findInvoiceForDueDateStatement.get(plan.id, unit.id, dueDate);

          if (!existingInvoice) {
            insertInvoiceStatement.run(
              nextId('invoice'),
              plan.societyId,
              unit.id,
              plan.id,
              formatBillingPeriodLabel(cycleStart),
              dueDate,
              plan.amountInr,
              resolveInvoiceOpenStatus(dueDate),
            );
          }

          cycleStart = addUtcMonths(cycleStart, cycleMonthSpan);
        }
      }
    }
  });
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

function getExistingInvoicePayments(invoiceId) {
  return db
    .prepare('SELECT id, status FROM payments WHERE invoiceId = ? ORDER BY paidAt DESC')
    .all(invoiceId);
}

function ensureInvoiceAvailableForPayment(invoice) {
  if (invoice.status === 'paid') {
    throw new HttpError(400, 'This invoice is already marked paid.');
  }

  const existingPayments = getExistingInvoicePayments(invoice.id);

  if (existingPayments.some((payment) => payment.status === 'captured')) {
    throw new HttpError(400, 'A captured payment already exists for this invoice.');
  }

  return existingPayments;
}

function requireInvoiceAmount(inputAmount, invoiceAmount) {
  const amountInr = parsePositiveWholeNumber(inputAmount, 'Enter the payment amount.');

  if (amountInr !== invoiceAmount) {
    throw new HttpError(
      400,
      `The submitted amount must match the invoice amount of INR ${invoiceAmount}.`,
    );
  }

  return amountInr;
}

function insertCapturedPayment({
  societyId,
  invoice,
  amountInr,
  method,
  paidAt,
  submittedByUserId = null,
  referenceNote = null,
  proofImageDataUrl = null,
  reviewedByUserId = null,
  reviewedAt = null,
}) {
  const paymentId = nextId('payment');

  db.prepare(
    `INSERT INTO payments (
      id, societyId, invoiceId, amountInr, method, paidAt, status, submittedByUserId, referenceNote, proofImageDataUrl, reviewedByUserId, reviewedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    paymentId,
    societyId,
    invoice.id,
    amountInr,
    method,
    paidAt,
    'captured',
    submittedByUserId,
    referenceNote || null,
    proofImageDataUrl || null,
    reviewedByUserId,
    reviewedAt,
  );

  db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run('paid', invoice.id);

  const existingReceipt = db.prepare('SELECT id FROM receipts WHERE paymentId = ?').get(paymentId);

  if (!existingReceipt) {
    db.prepare(
      'INSERT INTO receipts (id, societyId, paymentId, number, issuedAt) VALUES (?, ?, ?, ?, ?)',
    ).run(nextId('receipt'), societyId, paymentId, buildReceiptNumber(invoice.planId), reviewedAt || paidAt);
  }
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
        (
          amenity.reservationScope === 'fullDay' ||
          rangesOverlap(booking.startTime, booking.endTime, startTime, endTime)
        ),
    );

  if (amenity.bookingType === 'exclusive') {
    return {
      canConfirm: activeBookings.length === 0,
      activeBookings,
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
      activeBookings,
      matchingRules,
    };
  }

  return {
    canConfirm: false,
    activeBookings,
    matchingRules,
  };
}

function buildAmenityConflictMessage(amenity, activeBookings, date) {
  if (!Array.isArray(activeBookings) || activeBookings.length === 0) {
    return 'This amenity slot is no longer available.';
  }

  const visibleBookingDetails = activeBookings.slice(0, 3).map((booking) => {
    const unit = booking.unitId ? getUnit(booking.unitId) : null;
    const user = getUserById(booking.userId);
    const residentLabel = user?.name ? ` by ${user.name}` : '';
    return `${unit?.code ?? 'linked unit'}${residentLabel} (${booking.startTime}-${booking.endTime})`;
  });

  if (amenity.reservationScope === 'fullDay') {
    return `${amenity.name} is already booked on ${date}. Current booking: ${visibleBookingDetails.join(', ')}. This venue is locked for the full day once reserved.`;
  }

  return `${amenity.name} already has a conflicting booking for this slot: ${visibleBookingDetails.join(', ')}.`;
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

function updateLeadershipRole(userId, societyId, targetUserIdInput, roleInput, enabledInput = true) {
  const society = getSociety(societyId);

  if (!society) {
    throw new HttpError(404, 'Selected society was not found.');
  }

  requireSocietyChairman(userId, societyId);

  const targetUserId = requireText(targetUserIdInput, 'Choose the member you want to update.');
  const role = String(roleInput ?? '').trim();
  const enabled = Boolean(enabledInput);
  const targetMembership = getMembership(targetUserId, societyId);
  const targetUser = getUserById(targetUserId);

  if (!targetUser || !targetMembership) {
    throw new HttpError(404, 'Choose a member who already belongs to this society.');
  }

  const targetRoleSet = new Set(parseStoredJson(targetMembership.roles));
  const canHoldLeadership =
    targetRoleSet.has('owner') ||
    targetRoleSet.has('tenant') ||
    targetRoleSet.has('family') ||
    targetRoleSet.has('authorizedOccupant') ||
    targetRoleSet.has('committee') ||
    targetRoleSet.has('chairman');

  if (!canHoldLeadership) {
    throw new HttpError(400, 'Only resident or committee members can hold chairman or committee access.');
  }

  const now = nowIso();

  runTransaction(() => {
    if (role === 'committee') {
      const nextRoles = new Set(parseStoredJson(targetMembership.roles));

      if (enabled) {
        nextRoles.add('committee');
      } else {
        if (nextRoles.has('chairman')) {
          throw new HttpError(400, 'Transfer chairman access before removing committee access from this member.');
        }

        nextRoles.delete('committee');
      }

      if (nextRoles.size === 0) {
        throw new HttpError(400, 'This member would lose all society access.');
      }

      db.prepare('UPDATE memberships SET roles = ? WHERE id = ?').run(
        JSON.stringify([...nextRoles]),
        targetMembership.id,
      );

      return;
    }

    if (role !== 'chairman') {
      throw new HttpError(400, 'Choose chairman or committee as the role update.');
    }

    const societyMemberships = db
      .prepare('SELECT id, userId, roles FROM memberships WHERE societyId = ?')
      .all(societyId);

    for (const membership of societyMemberships) {
      const nextRoles = new Set(parseStoredJson(membership.roles));

      if (membership.userId === targetUserId) {
        nextRoles.add('chairman');
        nextRoles.add('committee');
      } else if (nextRoles.has('chairman')) {
        nextRoles.delete('chairman');
        nextRoles.add('committee');
      }

      db.prepare('UPDATE memberships SET roles = ? WHERE id = ?').run(
        JSON.stringify([...nextRoles]),
        membership.id,
      );
    }

    db.prepare(
      `INSERT INTO userProfiles (userId, preferredRole, createdAt, updatedAt)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(userId) DO UPDATE SET preferredRole = excluded.preferredRole, updatedAt = excluded.updatedAt`,
    ).run(targetUserId, 'chairman', now, now);
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

  if (amenity.reservationScope === 'fullDay' && !availability.canConfirm) {
    throw new HttpError(409, buildAmenityConflictMessage(amenity, availability.activeBookings, date));
  }

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
        buildAmenityConflictMessage(amenity, availability.activeBookings, booking.date),
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

  const existingPayments = ensureInvoiceAvailableForPayment(invoice);

  if (existingPayments.some((payment) => payment.status === 'pending')) {
    throw new HttpError(400, 'A payment confirmation is already pending review for this invoice.');
  }

  const amountInr = requireInvoiceAmount(input?.amountInr, invoice.amountInr);

  const method = String(input?.method ?? '').trim();

  if (!PAYMENT_METHODS.has(method)) {
    throw new HttpError(400, 'Choose UPI, netbanking, or cash as the payment method.');
  }

  const paidAt = normalizeDateTime(input?.paidAt, 'Enter when the payment was made.');
  const referenceNote = String(input?.referenceNote ?? '').trim();
  const proofImageDataUrl = String(input?.proofImageDataUrl ?? '').trim();

  db.prepare(
    `INSERT INTO payments (
      id, societyId, invoiceId, amountInr, method, paidAt, status, submittedByUserId, referenceNote, proofImageDataUrl, reviewedByUserId, reviewedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    proofImageDataUrl || null,
    null,
    null,
  );

  return buildSocietyMutationPayload(userId, societyId);
}

function captureResidentUpiPayment(userId, societyId, input) {
  const invoiceId = requireText(input?.invoiceId, 'Select the maintenance invoice first.');
  const invoice = getInvoice(invoiceId);

  if (!invoice || invoice.societyId !== societyId) {
    throw new HttpError(404, 'Selected invoice was not found in this society.');
  }

  const membership = getMembership(userId, societyId);
  const allowedUnitIds = new Set(parseStoredJson(membership?.unitIds));

  if (!membership || !allowedUnitIds.has(invoice.unitId)) {
    throw new HttpError(403, 'You can only pay invoices linked to your own units.');
  }

  const existingPayments = ensureInvoiceAvailableForPayment(invoice);

  if (existingPayments.some((payment) => payment.status === 'pending')) {
    throw new HttpError(400, 'A manual payment flag is already pending review for this invoice.');
  }

  const plan = getMaintenancePlan(invoice.planId);

  if (!plan?.upiId) {
    throw new HttpError(400, 'UPI billing is not configured for this society yet.');
  }

  const amountInr = requireInvoiceAmount(input?.amountInr, invoice.amountInr);
  const paidAt = normalizeDateTime(input?.paidAt, 'Enter when the payment was made.');
  const referenceNote = String(input?.referenceNote ?? '').trim();

  runTransaction(() => {
    insertCapturedPayment({
      societyId,
      invoice,
      amountInr,
      method: 'upi',
      paidAt,
      submittedByUserId: userId,
      referenceNote,
    });
  });

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

    if (decision === 'approve') {
      const existingReceipt = db.prepare('SELECT id FROM receipts WHERE paymentId = ?').get(paymentId);

      db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run('paid', invoice.id);

      if (!existingReceipt) {
        db.prepare(
          'INSERT INTO receipts (id, societyId, paymentId, number, issuedAt) VALUES (?, ?, ?, ?, ?)',
        ).run(nextId('receipt'), payment.societyId, paymentId, buildReceiptNumber(invoice.planId), reviewedAt);
      }
      return;
    }

    db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(
      resolveInvoiceOpenStatus(invoice.dueDate),
      invoice.id,
    );
  });

  return buildSocietyMutationPayload(userId, payment.societyId);
}

function recordManualPayment(userId, societyId, input) {
  requireSocietyChairman(userId, societyId);

  const invoiceId = requireText(input?.invoiceId, 'Select the maintenance invoice first.');
  const invoice = getInvoice(invoiceId);

  if (!invoice || invoice.societyId !== societyId) {
    throw new HttpError(404, 'Selected invoice was not found in this society.');
  }

  const existingPayments = ensureInvoiceAvailableForPayment(invoice);

  if (existingPayments.some((payment) => payment.status === 'pending')) {
    throw new HttpError(400, 'A resident payment flag is pending review for this invoice.');
  }

  const amountInr = requireInvoiceAmount(input?.amountInr, invoice.amountInr);
  const method = String(input?.method ?? '').trim();

  if (!PAYMENT_METHODS.has(method)) {
    throw new HttpError(400, 'Choose UPI, netbanking, or cash as the payment method.');
  }

  const paidAt = normalizeDateTime(input?.paidAt, 'Enter when the payment was made.');
  const referenceNote = String(input?.referenceNote ?? '').trim();
  const reviewedAt = nowIso();

  runTransaction(() => {
    insertCapturedPayment({
      societyId,
      invoice,
      amountInr,
      method,
      paidAt,
      referenceNote,
      reviewedByUserId: userId,
      reviewedAt,
    });
  });

  return buildSocietyMutationPayload(userId, societyId);
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
  const complaintId = nextId('complaint');

  runTransaction(() => {
    db.prepare(
      'INSERT INTO complaints (id, societyId, unitId, createdByUserId, category, title, description, status, createdAt, assignedTo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      complaintId,
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

    insertComplaintUpdate({
      complaintId,
      societyId,
      createdByUserId: userId,
      status: 'open',
      assignedTo: null,
      message: description,
    });
  });

  return buildSocietyMutationPayload(userId, societyId);
}

function updateComplaintTicket(userId, complaintId, input) {
  const complaint = getComplaint(complaintId);

  if (!complaint) {
    throw new HttpError(404, 'Helpdesk ticket not found.');
  }

  requireSocietyChairman(userId, complaint.societyId);

  const status = String(input?.status ?? '').trim();
  const photoDataUrl = normalizeComplaintUpdatePhotoDataUrl(input?.photoDataUrl);

  if (!COMPLAINT_STATUSES.has(status)) {
    throw new HttpError(400, 'Choose open, inProgress, or resolved as the complaint status.');
  }

  const assignedTo = String(input?.assignedTo ?? '').trim();
  const message = buildComplaintUpdateMessage(complaint, status, assignedTo || null, input?.message);

  if (!message && !photoDataUrl && complaint.status === status && (complaint.assignedTo ?? '') === assignedTo) {
    return buildSocietyMutationPayload(userId, complaint.societyId);
  }

  runTransaction(() => {
    db.prepare('UPDATE complaints SET status = ?, assignedTo = ? WHERE id = ?').run(
      status,
      assignedTo || null,
      complaint.id,
    );

    insertComplaintUpdate({
      complaintId: complaint.id,
      societyId: complaint.societyId,
      createdByUserId: userId,
      status,
      assignedTo,
      message,
      photoDataUrl,
    });
  });

  return buildSocietyMutationPayload(userId, complaint.societyId);
}

function createAnnouncement(userId, societyId, input) {
  requireSocietyAnnouncementPublisher(userId, societyId);

  const title = requireText(input?.title, 'Enter an announcement title.');
  const body = requireText(input?.body, 'Enter the announcement message.');
  const photoDataUrl = normalizeAnnouncementPhotoDataUrl(input?.photoDataUrl);
  const audience = String(input?.audience ?? '').trim();
  const priority = String(input?.priority ?? '').trim();

  if (!ANNOUNCEMENT_AUDIENCES.has(audience)) {
    throw new HttpError(400, 'Choose all, residents, committee, owners, or tenants as the announcement audience.');
  }

  if (!ANNOUNCEMENT_PRIORITIES.has(priority)) {
    throw new HttpError(400, 'Choose critical, high, or normal as the announcement priority.');
  }

  db.prepare(
    'INSERT INTO announcements (id, societyId, title, body, photoDataUrl, audience, createdAt, priority, readByUserIds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    nextId('announcement'),
    societyId,
    title,
    body,
    photoDataUrl,
    audience,
    nowIso(),
    priority,
    JSON.stringify([]),
  );

  return buildSocietyMutationPayload(userId, societyId);
}

function updateLeadershipProfile(userId, societyId, input) {
  const { roleSet, user } = requireSocietyLeadershipManager(userId, societyId);
  const normalized = normalizeLeadershipProfileInput(input, user, roleSet);
  const existing = db
    .prepare('SELECT id FROM leadershipProfiles WHERE societyId = ? AND userId = ?')
    .get(societyId, userId);
  const updatedAt = nowIso();

  if (existing) {
    db.prepare(
      `UPDATE leadershipProfiles
       SET roleLabel = ?, displayName = ?, phone = ?, email = ?, availability = ?, bio = ?, photoDataUrl = ?, updatedAt = ?
       WHERE id = ?`,
    ).run(
      normalized.roleLabel,
      normalized.displayName,
      normalized.phone,
      normalized.email || null,
      normalized.availability || null,
      normalized.bio || null,
      normalized.photoDataUrl || null,
      updatedAt,
      existing.id,
    );
  } else {
    db.prepare(
      `INSERT INTO leadershipProfiles (
        id,
        societyId,
        userId,
        roleLabel,
        displayName,
        phone,
        email,
        availability,
        bio,
        photoDataUrl,
        updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      nextId('leadership-profile'),
      societyId,
      userId,
      normalized.roleLabel,
      normalized.displayName,
      normalized.phone,
      normalized.email || null,
      normalized.availability || null,
      normalized.bio || null,
      normalized.photoDataUrl || null,
      updatedAt,
    );
  }

  return buildSocietyMutationPayload(userId, societyId);
}

function createSocietyDocument(userId, societyId, input) {
  requireSocietyAnnouncementPublisher(userId, societyId);

  const category = String(input?.category ?? '').trim();
  const title = requireText(input?.title, 'Enter a document title.');
  const summary = normalizeOptionalText(input?.summary, 300);
  const issuedOn = input?.issuedOn ? normalizeDateOnlyInput(input.issuedOn, 'the issue date') : null;
  const validUntil = input?.validUntil ? normalizeDateOnlyInput(input.validUntil, 'the expiry date') : null;
  const attachment = normalizeSocietyDocumentAttachment(input?.fileName, input?.fileDataUrl);

  if (!SOCIETY_DOCUMENT_CATEGORIES.has(category)) {
    throw new HttpError(400, 'Choose a valid society document category.');
  }

  db.prepare(
    `INSERT INTO societyDocuments (
      id,
      societyId,
      category,
      title,
      fileName,
      fileDataUrl,
      summary,
      issuedOn,
      validUntil,
      uploadedByUserId,
      uploadedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    nextId('society-document'),
    societyId,
    category,
    title,
    attachment.fileName,
    attachment.fileDataUrl,
    summary || null,
    issuedOn,
    validUntil,
    userId,
    nowIso(),
  );

  return buildSocietyMutationPayload(userId, societyId);
}

function requestSocietyDocumentDownload(userId, societyId, documentId, input = {}) {
  const document = getSocietyDocument(documentId);

  if (!document || document.societyId !== societyId) {
    throw new HttpError(404, 'Society document not found.');
  }

  const membership = getMembership(userId, societyId);

  if (!membership) {
    throw new HttpError(403, 'Only society residents can request document downloads.');
  }

  const requestNote = normalizeOptionalText(input?.requestNote, 240);
  const referenceIso = nowIso();
  const pendingRequest = db
    .prepare(
      `SELECT id
       FROM societyDocumentDownloadRequests
       WHERE documentId = ? AND requesterUserId = ? AND status = 'pending'
       ORDER BY requestedAt DESC
       LIMIT 1`,
    )
    .get(documentId, userId);

  if (pendingRequest) {
    throw new HttpError(400, 'A download request for this document is already waiting for admin approval.');
  }

  const activeApproval = db
    .prepare(
      `SELECT id
       FROM societyDocumentDownloadRequests
       WHERE documentId = ? AND requesterUserId = ? AND status = 'approved' AND accessExpiresAt IS NOT NULL AND accessExpiresAt > ?
       ORDER BY requestedAt DESC
       LIMIT 1`,
    )
    .get(documentId, userId, referenceIso);

  if (activeApproval) {
    throw new HttpError(400, 'You already have an approved download window for this document.');
  }

  db.prepare(
    `INSERT INTO societyDocumentDownloadRequests (
      id,
      societyId,
      documentId,
      requesterUserId,
      status,
      requestNote,
      requestedAt,
      reviewedAt,
      reviewedByUserId,
      reviewNote,
      accessExpiresAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    nextId('document-download-request'),
    societyId,
    documentId,
    userId,
    'pending',
    requestNote,
    referenceIso,
    null,
    null,
    null,
    null,
  );

  return buildSocietyMutationPayload(userId, societyId);
}

function reviewSocietyDocumentDownloadRequest(userId, requestId, decisionInput, reviewNoteInput) {
  const request = getSocietyDocumentDownloadRequest(requestId);

  if (!request) {
    throw new HttpError(404, 'Document download request not found.');
  }

  requireSocietyDocumentDownloadReviewer(userId, request.societyId);

  if (request.status !== 'pending') {
    throw new HttpError(400, 'Only pending document download requests can be reviewed.');
  }

  const decision = String(decisionInput ?? '').trim().toLowerCase();

  if (!SOCIETY_DOCUMENT_DOWNLOAD_REVIEW_DECISIONS.has(decision)) {
    throw new HttpError(400, 'Choose approve or reject for the document download request.');
  }

  const reviewNote = normalizeOptionalText(reviewNoteInput, 240);
  const reviewedAt = nowIso();
  const nextStatus = decision === 'approve' ? 'approved' : 'rejected';
  const accessExpiresAt = decision === 'approve' ? addDays(new Date(), 7) : null;

  db.prepare(
    `UPDATE societyDocumentDownloadRequests
     SET status = ?, reviewedAt = ?, reviewedByUserId = ?, reviewNote = ?, accessExpiresAt = ?
     WHERE id = ?`,
  ).run(nextStatus, reviewedAt, userId, reviewNote, accessExpiresAt, requestId);

  return buildSocietyMutationPayload(userId, request.societyId);
}

function markAnnouncementRead(userId, announcementId) {
  const announcement = getAnnouncement(announcementId);

  if (!announcement) {
    throw new HttpError(404, 'Notice not found.');
  }

  const membership = getMembership(userId, announcement.societyId);

  if (!membership) {
    throw new HttpError(403, 'You can only open notices for societies you belong to.');
  }

  const readByUserIds = parseStoredJson(announcement.readByUserIds);

  if (!readByUserIds.includes(userId)) {
    db.prepare('UPDATE announcements SET readByUserIds = ? WHERE id = ?').run(
      JSON.stringify([...readByUserIds, userId]),
      announcement.id,
    );
  }

  return buildSocietyMutationPayload(userId, announcement.societyId);
}

function updateMaintenanceBillingConfig(userId, planId, input) {
  const plan = getMaintenancePlan(planId);

  if (!plan) {
    throw new HttpError(404, 'Maintenance plan not found.');
  }

  requireSocietyChairman(userId, plan.societyId);

  const society = getSociety(plan.societyId);
  const upiId = String(input?.upiId ?? '').trim();
  const upiMobileNumber = normalizeUpiMobileNumber(input?.upiMobileNumber);
  const upiPayeeName = String(input?.upiPayeeName ?? '').trim() || society?.name || null;
  const upiQrCodeDataUrl = String(input?.upiQrCodeDataUrl ?? '').trim();
  const upiQrPayload = String(input?.upiQrPayload ?? '').trim();
  const bankAccountName = normalizeOptionalText(input?.bankAccountName, 120) || society?.name || null;
  const bankAccountNumber = normalizeBankAccountNumber(input?.bankAccountNumber);
  const bankIfscCode = normalizeIfscCode(input?.bankIfscCode);
  const bankName = normalizeOptionalText(input?.bankName, 120);
  const bankBranchName = normalizeOptionalText(input?.bankBranchName, 120);
  const hasAnyBankField = Boolean(bankAccountName || bankAccountNumber || bankIfscCode || bankName || bankBranchName);

  if (hasAnyBankField && (!bankAccountName || !bankAccountNumber || !bankIfscCode || !bankName)) {
    throw new HttpError(400, 'Bank transfer setup requires account holder name, account number, IFSC code, and bank name.');
  }

  db.prepare('UPDATE maintenancePlans SET upiId = ?, upiMobileNumber = ?, upiPayeeName = ?, upiQrCodeDataUrl = ?, upiQrPayload = ?, bankAccountName = ?, bankAccountNumber = ?, bankIfscCode = ?, bankName = ?, bankBranchName = ? WHERE id = ?').run(
    upiId || null,
    upiMobileNumber,
    upiPayeeName,
    upiQrCodeDataUrl || null,
    upiQrPayload || null,
    hasAnyBankField ? bankAccountName : null,
    hasAnyBankField ? bankAccountNumber : null,
    hasAnyBankField ? bankIfscCode : null,
    hasAnyBankField ? bankName : null,
    hasAnyBankField ? bankBranchName : null,
    plan.id,
  );

  return buildSocietyMutationPayload(userId, plan.societyId);
}

function updateSocietyProfile(userId, societyId, input) {
  requireSocietyChairman(userId, societyId);

  const society = getSociety(societyId);

  if (!society) {
    throw new HttpError(404, 'Selected society was not found.');
  }

  const locationFields = normalizeSocietyLocationFields({
    name: requireText(input?.name, 'Enter the society name.'),
    country: requireText(input?.country, 'Enter the country.'),
    state: requireText(input?.state, 'Enter the state.'),
    city: requireText(input?.city, 'Enter the city.'),
    area: requireText(input?.area, 'Enter the area.'),
    address: requireText(input?.address, 'Enter the full address.'),
    tagline: String(input?.tagline ?? '').trim(),
  });

  if (locationFields.name.length < 3) {
    throw new HttpError(400, 'Enter a society name with at least 3 characters.');
  }

  db.prepare(
    'UPDATE societies SET name = ?, country = ?, state = ?, city = ?, area = ?, address = ?, tagline = ? WHERE id = ?',
  ).run(
    locationFields.name,
    locationFields.country,
    locationFields.state,
    locationFields.city,
    locationFields.area,
    locationFields.address,
    locationFields.tagline || society.tagline,
    societyId,
  );

  const currentPlan = db
    .prepare('SELECT id, upiPayeeName FROM maintenancePlans WHERE societyId = ? ORDER BY id ASC LIMIT 1')
    .get(societyId);

  if (currentPlan && (!currentPlan.upiPayeeName || currentPlan.upiPayeeName === society.name)) {
    db.prepare('UPDATE maintenancePlans SET upiPayeeName = ? WHERE id = ?').run(locationFields.name, currentPlan.id);
  }

  return buildSocietyMutationPayload(userId, societyId);
}

function updateMaintenancePlanSettings(userId, planId, input) {
  const plan = getMaintenancePlan(planId);

  if (!plan) {
    throw new HttpError(404, 'Maintenance plan not found.');
  }

  requireSocietyChairman(userId, plan.societyId);

  const frequency = String(input?.frequency ?? '').trim();

  if (!MAINTENANCE_FREQUENCIES.has(frequency)) {
    throw new HttpError(400, 'Choose monthly or quarterly as the maintenance frequency.');
  }

  const dueDay = parseMaintenanceDueDay(input?.dueDay, 'Enter a due day between 1 and 28.');
  const amountInr = parsePositiveWholeNumber(input?.amountInr, 'Enter a valid maintenance amount.');
  const receiptPrefix = normalizeReceiptPrefix(input?.receiptPrefix);

  runTransaction(() => {
    db.prepare(
      'UPDATE maintenancePlans SET frequency = ?, dueDay = ?, amountInr = ?, receiptPrefix = ? WHERE id = ?',
    ).run(frequency, dueDay, amountInr, receiptPrefix, planId);

    db.prepare(
      'UPDATE societies SET maintenanceDayOfMonth = ?, maintenanceAmount = ? WHERE id = ?',
    ).run(dueDay, amountInr, plan.societyId);
  });

  return buildSocietyMutationPayload(userId, plan.societyId);
}

function sendMaintenanceReminder(userId, societyId, input) {
  requireSocietyChairman(userId, societyId);

  const requestedInvoiceIds = normalizeRequestedUnitIds(input?.invoiceIds);
  const requestedUnitIds = normalizeRequestedUnitIds(input?.unitIds);
  const invoices = requestedInvoiceIds.length > 0
    ? requestedInvoiceIds.map((invoiceId) => getInvoice(invoiceId))
    : requestedUnitIds.length > 0
      ? []
      : db
        .prepare("SELECT id, societyId, unitId, planId, periodLabel, dueDate, amountInr, status FROM invoices WHERE societyId = ? AND status != 'paid'")
        .all(societyId);

  if (invoices.some((invoice) => !invoice || invoice.societyId !== societyId)) {
    throw new HttpError(404, 'One or more selected invoices were not found in this society.');
  }

  const requestedUnits = requestedUnitIds.map((unitId) => getUnit(unitId));

  if (requestedUnits.some((unit) => !unit || unit.societyId !== societyId)) {
    throw new HttpError(404, 'One or more selected units were not found in this society.');
  }

  const unpaidInvoices = invoices.filter((invoice) => invoice.status !== 'paid');

  if (requestedInvoiceIds.length > 0 && unpaidInvoices.length === 0 && requestedUnitIds.length === 0) {
    throw new HttpError(400, 'Selected invoices are already paid.');
  }

  const uniqueUnitIds = [...new Set([
    ...requestedUnitIds,
    ...unpaidInvoices.map((invoice) => invoice.unitId),
  ])];

  if (uniqueUnitIds.length === 0) {
    throw new HttpError(400, 'There are no unpaid maintenance invoices or units to remind right now.');
  }

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
  const phone = normalizePhoneNumber(requireText(input?.phone, 'Enter the guard contact number.'));
  const shiftLabel = requireText(input?.shiftLabel, 'Enter a shift label.');
  const vendorName = String(input?.vendorName ?? '').trim();
  const gate = requireText(input?.gate, 'Enter the gate or patrol point.');
  const shiftStart = normalizeDateTime(input?.shiftStart, 'Enter the shift start date and time.');
  const shiftEnd = normalizeDateTime(input?.shiftEnd, 'Enter the shift end date and time.');

  if (Date.parse(shiftEnd) <= Date.parse(shiftStart)) {
    throw new HttpError(400, 'Shift end must be later than shift start.');
  }

  const guardId = nextId('guard');
  const securityUserId = ensureUserForIdentity('sms', phone);

  runTransaction(() => {
    db.prepare(
      'INSERT INTO securityGuards (id, societyId, name, phone, shiftLabel, vendorName) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(guardId, societyId, name, phone, shiftLabel, vendorName || null);

    db.prepare(
      'INSERT INTO securityShifts (id, guardId, societyId, "start", "end", gate) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(nextId('shift'), guardId, societyId, shiftStart, shiftEnd, gate);

    ensureMembershipRole(securityUserId, societyId, 'security');
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

function buildVisitorPassCode(societyId) {
  const prefix = societyId
    .split('-')
    .map((segment) => segment[0] ?? '')
    .join('')
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, 'X');

  const suffix = Math.floor(1000 + Math.random() * 9000).toString();
  return `${prefix}${suffix}`;
}

function createVisitorPass(userId, societyId, input) {
  const membership = getMembership(userId, societyId);
  const allowedUnitIds = normalizeRequestedUnitIds(parseStoredJson(membership?.unitIds));

  if (!membership || allowedUnitIds.length === 0) {
    throw new HttpError(
      403,
      'Only residents linked to a unit, plot, office, or shed can create a visitor pass.',
    );
  }

  const unitId = String(input?.unitId ?? '').trim() || allowedUnitIds[0];

  if (!allowedUnitIds.includes(unitId)) {
    throw new HttpError(403, 'You can only create a visitor pass for units linked to your membership.');
  }

  const unit = getUnit(unitId);

  if (!unit || unit.societyId !== societyId) {
    throw new HttpError(404, 'Selected resident number or space was not found in this society.');
  }

  const visitorName = requireText(input?.visitorName, 'Enter the visitor name.');
  const phone = normalizeOptionalPhoneNumber(input?.phone, 'visitor phone number');
  const category = String(input?.category ?? '').trim();
  const purpose = requireText(input?.purpose, 'Enter the visit purpose.');
  const guestCount = parsePositiveWholeNumber(input?.guestCount, 'Enter how many people are expected.');
  const expectedAt = normalizeDateTime(input?.expectedAt, 'Enter the expected arrival date and time.');
  const validUntil = normalizeDateTime(input?.validUntil, 'Enter the visitor pass expiry date and time.');
  const vehicleNumber = normalizeOptionalText(input?.vehicleNumber, 20);
  const notes = normalizeOptionalText(input?.notes, 200);

  if (!VISITOR_CATEGORIES.has(category)) {
    throw new HttpError(400, 'Choose guest, family, service, or delivery as the visitor type.');
  }

  if (Date.parse(validUntil) <= Date.parse(expectedAt)) {
    throw new HttpError(400, 'Visitor pass expiry should be later than the expected arrival time.');
  }

  const createdAt = nowIso();

  db.prepare(
    `INSERT INTO visitorPasses (
      id,
      societyId,
      unitId,
      createdByUserId,
      visitorName,
      phone,
      category,
      purpose,
      guestCount,
      expectedAt,
      validUntil,
      vehicleNumber,
      notes,
      passCode,
      status,
      createdAt,
      checkedInAt,
      checkedOutAt,
      updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    nextId('visitor-pass'),
    societyId,
    unitId,
    userId,
    visitorName,
    phone,
    category,
    purpose,
    guestCount,
    expectedAt,
    validUntil,
    vehicleNumber ? vehicleNumber.toUpperCase() : null,
    notes,
    buildVisitorPassCode(societyId),
    'scheduled',
    createdAt,
    null,
    null,
    createdAt,
  );

  return buildSocietyMutationPayload(userId, societyId);
}

function createSecurityGuestRequest(userId, societyId, input) {
  requireSocietySecurityOperator(userId, societyId);

  const unitId = requireText(input?.unitId, 'Select the resident unit for this guest.');
  const residentUserId = requireText(input?.residentUserId, 'Select the resident who should approve this guest.');
  const unit = getUnit(unitId);

  if (!unit || unit.societyId !== societyId) {
    throw new HttpError(404, 'Selected resident unit was not found in this society.');
  }

  const residentMembership = getMembership(residentUserId, societyId);
  const residentRoleSet = residentMembership ? new Set(parseStoredJson(residentMembership.roles)) : new Set();
  const residentUnitIds = residentMembership ? normalizeRequestedUnitIds(parseStoredJson(residentMembership.unitIds)) : [];

  if (!residentMembership || !residentRoleSet.has('owner') && !residentRoleSet.has('tenant') && !residentRoleSet.has('family') && !residentRoleSet.has('authorizedOccupant')) {
    throw new HttpError(400, 'Choose a resident account linked to this society.');
  }

  if (!residentUnitIds.includes(unitId)) {
    throw new HttpError(400, 'Selected resident is not linked to the chosen unit.');
  }

  const guestName = requireText(input?.guestName, 'Enter the guest name.');
  const phone = normalizeOptionalPhoneNumber(input?.phone, 'guest mobile number');
  const category = String(input?.category ?? '').trim();
  const purpose = requireText(input?.purpose, 'Enter the visit purpose.');
  const guestCount = parsePositiveWholeNumber(input?.guestCount, 'Enter the number of guests at the gate.');
  const vehicleNumber = normalizeOptionalText(input?.vehicleNumber, 20);
  const gateNotes = normalizeOptionalText(input?.gateNotes, 240);
  const guestPhotoDataUrl = normalizeOptionalImageDataUrl(input?.guestPhotoDataUrl, 'the guest photo');
  const guestPhotoCapturedAt = normalizeOptionalDateTime(
    input?.guestPhotoCapturedAt,
    'Choose a valid guest photo capture time.',
  );
  const vehiclePhotoDataUrl = normalizeOptionalImageDataUrl(input?.vehiclePhotoDataUrl, 'the vehicle photo');
  const vehiclePhotoCapturedAt = normalizeOptionalDateTime(
    input?.vehiclePhotoCapturedAt,
    'Choose a valid vehicle photo capture time.',
  );

  if (!VISITOR_CATEGORIES.has(category)) {
    throw new HttpError(400, 'Choose guest, family, service, or delivery as the visitor type.');
  }

  const createdAt = nowIso();
  const requestId = nextId('security-guest-request');

  runTransaction(() => {
    db.prepare(
      `INSERT INTO securityGuestRequests (
        id,
        societyId,
        unitId,
        residentUserId,
        createdByUserId,
        visitorPassId,
        guestName,
        phone,
        category,
        purpose,
        guestCount,
        vehicleNumber,
        guestPhotoDataUrl,
        guestPhotoCapturedAt,
        vehiclePhotoDataUrl,
        vehiclePhotoCapturedAt,
        gateNotes,
        status,
        createdAt,
        respondedAt,
        respondedByUserId,
        checkedInAt,
        checkedOutAt,
        updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      requestId,
      societyId,
      unitId,
      residentUserId,
      userId,
      null,
      guestName,
      phone,
      category,
      purpose,
      guestCount,
      vehicleNumber ? vehicleNumber.toUpperCase() : null,
      guestPhotoDataUrl,
      guestPhotoCapturedAt,
      vehiclePhotoDataUrl,
      vehiclePhotoCapturedAt,
      gateNotes,
      'pendingApproval',
      createdAt,
      null,
      null,
      null,
      null,
      createdAt,
    );

    createSecurityGuestLog(
      requestId,
      societyId,
      userId,
      getMembershipRoleSet(userId, societyId).has('security') ? 'security' : 'admin',
      'created',
      gateNotes,
      createdAt,
    );
  });

  return buildSocietyMutationPayload(userId, societyId);
}

function reviewSecurityGuestRequest(userId, requestId, decisionInput, noteInput) {
  const request = getSecurityGuestRequest(requestId);

  if (!request) {
    throw new HttpError(404, 'Gate approval request was not found.');
  }

  if (!canRespondToSecurityGuestRequest(userId, request)) {
    throw new HttpError(403, 'Only the linked resident can approve or deny this guest request.');
  }

  if (request.status !== 'pendingApproval') {
    throw new HttpError(400, 'Only pending gate requests can be reviewed.');
  }

  const decision = String(decisionInput ?? '').trim().toLowerCase();
  const note = normalizeOptionalText(noteInput, 240);

  if (decision !== 'approve' && decision !== 'deny') {
    throw new HttpError(400, 'Choose approve or deny for the gate request.');
  }

  const respondedAt = nowIso();

  runTransaction(() => {
    if (decision === 'approve') {
      const visitorPassId = createLinkedVisitorPassFromSecurityRequest(request, userId, respondedAt);

      db.prepare(
        `UPDATE securityGuestRequests
         SET status = ?, visitorPassId = ?, respondedAt = ?, respondedByUserId = ?, updatedAt = ?
         WHERE id = ?`,
      ).run('approved', visitorPassId, respondedAt, userId, respondedAt, requestId);

      createSecurityGuestLog(requestId, request.societyId, userId, 'resident', 'approved', note, respondedAt);
    } else {
      db.prepare(
        `UPDATE securityGuestRequests
         SET status = ?, respondedAt = ?, respondedByUserId = ?, updatedAt = ?
         WHERE id = ?`,
      ).run('denied', respondedAt, userId, respondedAt, requestId);

      createSecurityGuestLog(requestId, request.societyId, userId, 'resident', 'denied', note, respondedAt);
    }
  });

  return buildSocietyMutationPayload(userId, request.societyId);
}

function sendSecurityGuestMessage(userId, requestId, messageInput) {
  const request = getSecurityGuestRequest(requestId);

  if (!request) {
    throw new HttpError(404, 'Gate approval request was not found.');
  }

  if (!canMessageSecurityGuestRequest(userId, request)) {
    throw new HttpError(403, 'Only the resident or the gate team can message on this approval thread.');
  }

  if (request.status === 'cancelled' || request.status === 'denied' || request.status === 'completed') {
    throw new HttpError(400, 'This gate request is closed, so new chat messages are not allowed.');
  }

  const message = requireText(messageInput, 'Enter a message before sending.');
  const createdAt = nowIso();

  let actorRole = 'resident';

  if (!canRespondToSecurityGuestRequest(userId, request)) {
    actorRole = getMembershipRoleSet(userId, request.societyId).has('security') ? 'security' : 'admin';
  }

  createSecurityGuestLog(requestId, request.societyId, userId, actorRole, 'message', message, createdAt);
  db.prepare('UPDATE securityGuestRequests SET updatedAt = ? WHERE id = ?').run(createdAt, requestId);

  return buildSocietyMutationPayload(userId, request.societyId);
}

function ringSecurityGuestRequest(userId, requestId, noteInput) {
  const request = getSecurityGuestRequest(requestId);

  if (!request) {
    throw new HttpError(404, 'Gate approval request was not found.');
  }

  requireSocietySecurityOperator(userId, request.societyId);

  if (request.status !== 'pendingApproval') {
    throw new HttpError(400, 'Only waiting resident approvals can be rung right now.');
  }

  const createdAt = nowIso();
  const note =
    normalizeOptionalText(noteInput, 240) || 'Security desk is asking for a quick live approval.';
  const actorRole = getMembershipRoleSet(userId, request.societyId).has('security') ? 'security' : 'admin';

  createSecurityGuestLog(requestId, request.societyId, userId, actorRole, 'ringRequested', note, createdAt);
  db.prepare('UPDATE securityGuestRequests SET updatedAt = ? WHERE id = ?').run(createdAt, requestId);

  return buildSocietyMutationPayload(userId, request.societyId);
}

function sendSocietyChatMessage(userId, societyId, messageInput) {
  requireSocietyMember(userId, societyId);
  const thread = getOrCreateSocietyChatThread(societyId, userId);

  createChatMessageRecord(thread.id, societyId, userId, messageInput);

  return buildSocietyMutationPayload(userId, societyId);
}

function sendDirectChatMessage(userId, societyId, otherUserId, messageInput) {
  requireSocietyMember(userId, societyId);

  if (!otherUserId || String(otherUserId).trim() === userId) {
    throw new HttpError(400, 'Choose another society member to start a direct chat.');
  }

  const otherUser = getUserById(otherUserId);

  if (!otherUser || !getMembership(otherUserId, societyId)) {
    throw new HttpError(404, 'That society member is not available for direct chat.');
  }

  const thread = getOrCreateDirectChatThread(societyId, userId, otherUserId);

  createChatMessageRecord(thread.id, societyId, userId, messageInput);

  return buildSocietyMutationPayload(userId, societyId);
}

function updateSecurityGuestRequestStatus(userId, requestId, nextStatusInput, noteInput) {
  const request = getSecurityGuestRequest(requestId);

  if (!request) {
    throw new HttpError(404, 'Gate approval request was not found.');
  }

  requireSocietySecurityOperator(userId, request.societyId);

  const nextStatus = String(nextStatusInput ?? '').trim();
  const note = normalizeOptionalText(noteInput, 240);

  if (!SECURITY_GUEST_REQUEST_STATUSES.has(nextStatus)) {
    throw new HttpError(400, 'Choose a valid gate request status.');
  }

  const updatedAt = nowIso();
  const operatorRole = getMembershipRoleSet(userId, request.societyId).has('security') ? 'security' : 'admin';

  if (nextStatus === 'cancelled') {
    if (request.status !== 'pendingApproval' && request.status !== 'approved') {
      throw new HttpError(400, 'Only pending or approved gate requests can be cancelled.');
    }

    runTransaction(() => {
      db.prepare('UPDATE securityGuestRequests SET status = ?, updatedAt = ? WHERE id = ?').run(
        'cancelled',
        updatedAt,
        requestId,
      );

      if (request.visitorPassId) {
        db.prepare('UPDATE visitorPasses SET status = ?, updatedAt = ? WHERE id = ?').run(
          'cancelled',
          updatedAt,
          request.visitorPassId,
        );
      }

      createSecurityGuestLog(requestId, request.societyId, userId, operatorRole, 'cancelled', note, updatedAt);
    });

    return buildSocietyMutationPayload(userId, request.societyId);
  }

  if (nextStatus === 'checkedIn') {
    if (request.status !== 'approved') {
      throw new HttpError(400, 'Only approved gate requests can be checked in.');
    }

    if (!request.visitorPassId) {
      throw new HttpError(400, 'This gate request is missing its linked visitor pass.');
    }

    runTransaction(() => {
      db.prepare(
        'UPDATE securityGuestRequests SET status = ?, checkedInAt = ?, updatedAt = ? WHERE id = ?',
      ).run('checkedIn', updatedAt, updatedAt, requestId);

      db.prepare(
        'UPDATE visitorPasses SET status = ?, checkedInAt = ?, updatedAt = ? WHERE id = ?',
      ).run('checkedIn', updatedAt, updatedAt, request.visitorPassId);

      db.prepare(
        'INSERT INTO entryLogs (id, societyId, subjectType, subjectName, unitId, enteredAt, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run(nextId('entry'), request.societyId, 'visitor', request.guestName, request.unitId, updatedAt, 'inside');

      createSecurityGuestLog(requestId, request.societyId, userId, operatorRole, 'checkedIn', note, updatedAt);
    });

    return buildSocietyMutationPayload(userId, request.societyId);
  }

  if (nextStatus === 'completed') {
    if (request.status !== 'checkedIn') {
      throw new HttpError(400, 'Only checked-in gate requests can be completed.');
    }

    if (!request.visitorPassId) {
      throw new HttpError(400, 'This gate request is missing its linked visitor pass.');
    }

    runTransaction(() => {
      db.prepare(
        'UPDATE securityGuestRequests SET status = ?, checkedOutAt = ?, updatedAt = ? WHERE id = ?',
      ).run('completed', updatedAt, updatedAt, requestId);

      db.prepare(
        'UPDATE visitorPasses SET status = ?, checkedOutAt = ?, updatedAt = ? WHERE id = ?',
      ).run('completed', updatedAt, updatedAt, request.visitorPassId);

      db.prepare(
        'INSERT INTO entryLogs (id, societyId, subjectType, subjectName, unitId, enteredAt, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run(nextId('entry'), request.societyId, 'visitor', request.guestName, request.unitId, updatedAt, 'exited');

      createSecurityGuestLog(requestId, request.societyId, userId, operatorRole, 'checkedOut', note, updatedAt);
    });

    return buildSocietyMutationPayload(userId, request.societyId);
  }

  throw new HttpError(400, 'This gate request transition is not supported.');
}

function updateVisitorPassStatus(userId, visitorPassId, nextStatusInput) {
  const visitorPass = getVisitorPass(visitorPassId);

  if (!visitorPass) {
    throw new HttpError(404, 'Visitor pass was not found.');
  }

  const nextStatus = String(nextStatusInput ?? '').trim();

  if (!VISITOR_PASS_STATUSES.has(nextStatus)) {
    throw new HttpError(400, 'Choose a valid visitor pass status.');
  }

  const currentStatus = String(visitorPass.status ?? '').trim();
  const updatedAt = nowIso();

  if (nextStatus === 'cancelled') {
    const isCreator = visitorPass.createdByUserId === userId;

    if (!isCreator) {
      requireSocietySecurityOperator(userId, visitorPass.societyId);
    }

    if (currentStatus !== 'scheduled') {
      throw new HttpError(400, 'Only scheduled visitor passes can be cancelled.');
    }

    db.prepare('UPDATE visitorPasses SET status = ?, updatedAt = ? WHERE id = ?').run(
      'cancelled',
      updatedAt,
      visitorPassId,
    );

    return buildSocietyMutationPayload(userId, visitorPass.societyId);
  }

  requireSocietySecurityOperator(userId, visitorPass.societyId);

  if (nextStatus === 'checkedIn') {
    if (currentStatus !== 'scheduled') {
      throw new HttpError(400, 'Only scheduled visitor passes can be marked checked in.');
    }

    runTransaction(() => {
      db.prepare(
        'UPDATE visitorPasses SET status = ?, checkedInAt = ?, updatedAt = ? WHERE id = ?',
      ).run('checkedIn', updatedAt, updatedAt, visitorPassId);

      db.prepare(
        'INSERT INTO entryLogs (id, societyId, subjectType, subjectName, unitId, enteredAt, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run(nextId('entry'), visitorPass.societyId, 'visitor', visitorPass.visitorName, visitorPass.unitId, updatedAt, 'inside');
    });

    return buildSocietyMutationPayload(userId, visitorPass.societyId);
  }

  if (nextStatus === 'completed') {
    if (currentStatus !== 'checkedIn') {
      throw new HttpError(400, 'Only checked-in visitor passes can be completed.');
    }

    runTransaction(() => {
      db.prepare(
        'UPDATE visitorPasses SET status = ?, checkedOutAt = ?, updatedAt = ? WHERE id = ?',
      ).run('completed', updatedAt, updatedAt, visitorPassId);

      db.prepare(
        'INSERT INTO entryLogs (id, societyId, subjectType, subjectName, unitId, enteredAt, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run(nextId('entry'), visitorPass.societyId, 'visitor', visitorPass.visitorName, visitorPass.unitId, updatedAt, 'exited');
    });

    return buildSocietyMutationPayload(userId, visitorPass.societyId);
  }

  throw new HttpError(400, 'This visitor pass status transition is not supported.');
}

function createEntryLogRecord(userId, societyId, input) {
  requireSocietySecurityOperator(userId, societyId);

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

function requireSuperUserRole(userId) {
  const preferredRole = getUserProfile(userId)?.preferredRole ?? null;

  if (preferredRole !== 'superUser') {
    throw new HttpError(403, 'Only the super user account can manage society workspaces.');
  }

  return preferredRole;
}

module.exports = {
  HttpError,
  assignChairmanResidence,
  buildAuthPayload,
  captureResidentUpiPayment,
  createAnnouncement,
  createAmenityBooking,
  createComplaintTicket,
  createSocietyDocument,
  requestSocietyDocumentDownload,
  getOnboardingState,
  hasAssignedChairman,
  isOtpDeliveryConfigured,
  markAnnouncementRead,
  normalizeAuthChannel,
  normalizeAuthIntent,
  requestCreatorSession,
  recordManualPayment,
  requestOtp,
  ringSecurityGuestRequest,
  sendDirectChatMessage,
  sendSocietyChatMessage,
  sendSecurityGuestMessage,
  createEntryLogRecord,
  createExpenseRecord,
  createSecurityGuard,
  createSecurityGuestRequest,
  createStaffVerification,
  createVisitorPass,
  getSynchronizedSnapshot,
  reviewAmenityBooking,
  reviewSocietyDocumentDownloadRequest,
  reviewSecurityGuestRequest,
  reviewResidentPayment,
  reviewStaffVerification,
  updateSecurityGuestRequestStatus,
  updateVisitorPassStatus,
  requireSuperUserRole,
  requireSession,
  reviewJoinRequest,
  sendMaintenanceReminder,
  selectSocietyForResident,
  setPreferredRole,
  submitResidentPayment,
  updateResidenceProfile,
  updateLeadershipProfile,
  updateMaintenancePlanSettings,
  updateMaintenanceBillingConfig,
  updateSocietyProfile,
  updateComplaintTicket,
  verifyOtp,
  updateLeadershipRole,
};
