PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  avatarInitials TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS societies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT NOT NULL,
  address TEXT NOT NULL,
  structure TEXT NOT NULL,
  enabledStructures TEXT,
  commercialSpaceType TEXT,
  enabledCommercialSpaceTypes TEXT,
  apartmentSubtype TEXT,
  apartmentBlockPlan TEXT,
  apartmentStartingFloorNumber INTEGER,
  apartmentUnitCount INTEGER,
  bungalowUnitCount INTEGER,
  shedUnitCount INTEGER,
  shedBlockPlan TEXT,
  officeFloorPlan TEXT,
  timezone TEXT NOT NULL,
  totalUnits INTEGER NOT NULL,
  maintenanceDayOfMonth INTEGER NOT NULL,
  maintenanceAmount INTEGER NOT NULL,
  tagline TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS buildings (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  name TEXT NOT NULL,
  sortOrder INTEGER NOT NULL,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  buildingId TEXT,
  code TEXT NOT NULL,
  areaSqft INTEGER NOT NULL,
  occupancyStatus TEXT NOT NULL,
  unitType TEXT NOT NULL,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (buildingId) REFERENCES buildings(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  societyId TEXT NOT NULL,
  roles TEXT NOT NULL,
  unitIds TEXT NOT NULL,
  isPrimary INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS joinRequests (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  userId TEXT NOT NULL,
  residentType TEXT NOT NULL,
  unitIds TEXT NOT NULL,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  reviewedAt TEXT,
  reviewedByUserId TEXT,
  reviewNote TEXT,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewedByUserId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS residenceProfiles (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  userId TEXT NOT NULL,
  residentType TEXT NOT NULL,
  fullName TEXT NOT NULL,
  phone TEXT NOT NULL,
  photoDataUrl TEXT,
  email TEXT,
  businessName TEXT,
  businessDetails TEXT,
  alternatePhone TEXT,
  emergencyContactName TEXT,
  emergencyContactPhone TEXT,
  secondaryEmergencyContactName TEXT,
  secondaryEmergencyContactPhone TEXT,
  moveInDate TEXT NOT NULL,
  dataProtectionConsentAt TEXT NOT NULL,
  rentAgreementFileName TEXT,
  rentAgreementDataUrl TEXT,
  rentAgreementUploadedAt TEXT,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (societyId, userId)
);

CREATE TABLE IF NOT EXISTS occupancy (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  unitId TEXT NOT NULL,
  userId TEXT NOT NULL,
  category TEXT NOT NULL,
  startDate TEXT NOT NULL,
  endDate TEXT,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vehicleRegistrations (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  userId TEXT NOT NULL,
  unitId TEXT NOT NULL,
  registrationNumber TEXT NOT NULL,
  vehicleType TEXT NOT NULL,
  color TEXT,
  parkingSlot TEXT,
  photoDataUrl TEXT,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS importantContacts (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  roleLabel TEXT NOT NULL,
  phone TEXT NOT NULL,
  availability TEXT,
  notes TEXT,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leadershipProfiles (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  userId TEXT NOT NULL,
  roleLabel TEXT NOT NULL,
  displayName TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  availability TEXT,
  bio TEXT,
  photoDataUrl TEXT,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (societyId, userId)
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  photoDataUrl TEXT,
  audience TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  priority TEXT NOT NULL,
  readByUserIds TEXT NOT NULL,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  title TEXT NOT NULL,
  version TEXT NOT NULL,
  summary TEXT,
  publishedAt TEXT NOT NULL,
  acknowledgementRequired INTEGER NOT NULL,
  acknowledgedByUserIds TEXT NOT NULL,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS societyDocuments (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  fileName TEXT NOT NULL,
  fileDataUrl TEXT NOT NULL,
  summary TEXT,
  issuedOn TEXT,
  validUntil TEXT,
  uploadedByUserId TEXT NOT NULL,
  uploadedAt TEXT NOT NULL,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (uploadedByUserId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS societyDocumentDownloadRequests (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  documentId TEXT NOT NULL,
  requesterUserId TEXT NOT NULL,
  status TEXT NOT NULL,
  requestNote TEXT,
  requestedAt TEXT NOT NULL,
  reviewedAt TEXT,
  reviewedByUserId TEXT,
  reviewNote TEXT,
  accessExpiresAt TEXT,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (documentId) REFERENCES societyDocuments(id) ON DELETE CASCADE,
  FOREIGN KEY (requesterUserId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewedByUserId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS amenities (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  name TEXT NOT NULL,
  bookingType TEXT NOT NULL,
  reservationScope TEXT NOT NULL DEFAULT 'timeSlot',
  approvalMode TEXT NOT NULL,
  capacity INTEGER,
  priceInr INTEGER,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS amenityScheduleRules (
  id TEXT PRIMARY KEY,
  amenityId TEXT NOT NULL,
  dayGroup TEXT NOT NULL,
  slotLabel TEXT NOT NULL,
  startTime TEXT NOT NULL,
  endTime TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  blackoutDates TEXT NOT NULL,
  FOREIGN KEY (amenityId) REFERENCES amenities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  amenityId TEXT NOT NULL,
  societyId TEXT NOT NULL,
  userId TEXT NOT NULL,
  unitId TEXT,
  date TEXT NOT NULL,
  startTime TEXT NOT NULL,
  endTime TEXT NOT NULL,
  status TEXT NOT NULL,
  guests INTEGER NOT NULL,
  FOREIGN KEY (amenityId) REFERENCES amenities(id) ON DELETE CASCADE,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS maintenancePlans (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  frequency TEXT NOT NULL,
  dueDay INTEGER NOT NULL,
  amountInr INTEGER NOT NULL,
  lateFeeInr INTEGER NOT NULL,
  calculationMethod TEXT NOT NULL,
  receiptPrefix TEXT NOT NULL,
  upiId TEXT,
  upiMobileNumber TEXT,
  upiPayeeName TEXT,
  upiQrCodeDataUrl TEXT,
  upiQrPayload TEXT,
  bankAccountName TEXT,
  bankAccountNumber TEXT,
  bankIfscCode TEXT,
  bankName TEXT,
  bankBranchName TEXT,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenseRecords (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  expenseType TEXT NOT NULL,
  title TEXT NOT NULL,
  amountInr INTEGER NOT NULL,
  incurredOn TEXT NOT NULL,
  notes TEXT,
  createdByUserId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (createdByUserId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  unitId TEXT NOT NULL,
  planId TEXT NOT NULL,
  periodLabel TEXT NOT NULL,
  dueDate TEXT NOT NULL,
  amountInr INTEGER NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE CASCADE,
  FOREIGN KEY (planId) REFERENCES maintenancePlans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  invoiceId TEXT NOT NULL,
  amountInr INTEGER NOT NULL,
  method TEXT NOT NULL,
  paidAt TEXT NOT NULL,
  status TEXT NOT NULL,
  submittedByUserId TEXT,
  referenceNote TEXT,
  proofImageDataUrl TEXT,
  reviewedByUserId TEXT,
  reviewedAt TEXT,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (submittedByUserId) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewedByUserId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS paymentReminders (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  invoiceIds TEXT NOT NULL,
  unitIds TEXT NOT NULL,
  message TEXT NOT NULL,
  sentByUserId TEXT NOT NULL,
  sentAt TEXT NOT NULL,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (sentByUserId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  paymentId TEXT NOT NULL,
  number TEXT NOT NULL,
  issuedAt TEXT NOT NULL,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (paymentId) REFERENCES payments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  unitId TEXT NOT NULL,
  createdByUserId TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  assignedTo TEXT,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE CASCADE,
  FOREIGN KEY (createdByUserId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS complaintUpdates (
  id TEXT PRIMARY KEY,
  complaintId TEXT NOT NULL,
  societyId TEXT NOT NULL,
  createdByUserId TEXT NOT NULL,
  status TEXT NOT NULL,
  assignedTo TEXT,
  message TEXT,
  photoDataUrl TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (complaintId) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (createdByUserId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS staffProfiles (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  category TEXT NOT NULL,
  verificationState TEXT NOT NULL,
  employerUnitIds TEXT NOT NULL,
  requestedByUserId TEXT,
  requestedAt TEXT,
  reviewedByUserId TEXT,
  reviewedAt TEXT,
  FOREIGN KEY (requestedByUserId) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewedByUserId) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS staffAssignments (
  id TEXT PRIMARY KEY,
  staffId TEXT NOT NULL,
  societyId TEXT NOT NULL,
  unitId TEXT NOT NULL,
  serviceLabel TEXT NOT NULL,
  visitsPerWeek INTEGER NOT NULL,
  active INTEGER NOT NULL,
  FOREIGN KEY (staffId) REFERENCES staffProfiles(id) ON DELETE CASCADE,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS securityGuards (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  shiftLabel TEXT NOT NULL,
  vendorName TEXT,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS securityShifts (
  id TEXT PRIMARY KEY,
  guardId TEXT NOT NULL,
  societyId TEXT NOT NULL,
  "start" TEXT NOT NULL,
  "end" TEXT NOT NULL,
  gate TEXT NOT NULL,
  FOREIGN KEY (guardId) REFERENCES securityGuards(id) ON DELETE CASCADE,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS entryLogs (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  subjectType TEXT NOT NULL,
  subjectName TEXT NOT NULL,
  unitId TEXT,
  enteredAt TEXT NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS visitorPasses (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  unitId TEXT NOT NULL,
  createdByUserId TEXT NOT NULL,
  visitorName TEXT NOT NULL,
  phone TEXT,
  category TEXT NOT NULL,
  purpose TEXT NOT NULL,
  guestCount INTEGER NOT NULL,
  expectedAt TEXT NOT NULL,
  validUntil TEXT NOT NULL,
  vehicleNumber TEXT,
  notes TEXT,
  passCode TEXT NOT NULL,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  checkedInAt TEXT,
  checkedOutAt TEXT,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE CASCADE,
  FOREIGN KEY (createdByUserId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS securityGuestRequests (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  unitId TEXT NOT NULL,
  residentUserId TEXT NOT NULL,
  createdByUserId TEXT NOT NULL,
  visitorPassId TEXT,
  guestName TEXT NOT NULL,
  phone TEXT,
  category TEXT NOT NULL,
  purpose TEXT NOT NULL,
  guestCount INTEGER NOT NULL,
  vehicleNumber TEXT,
  guestPhotoDataUrl TEXT,
  guestPhotoCapturedAt TEXT,
  vehiclePhotoDataUrl TEXT,
  vehiclePhotoCapturedAt TEXT,
  gateNotes TEXT,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  respondedAt TEXT,
  respondedByUserId TEXT,
  checkedInAt TEXT,
  checkedOutAt TEXT,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE CASCADE,
  FOREIGN KEY (residentUserId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (createdByUserId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (visitorPassId) REFERENCES visitorPasses(id) ON DELETE SET NULL,
  FOREIGN KEY (respondedByUserId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS securityGuestLogs (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  requestId TEXT NOT NULL,
  actorUserId TEXT,
  actorRole TEXT NOT NULL,
  action TEXT NOT NULL,
  note TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (requestId) REFERENCES securityGuestRequests(id) ON DELETE CASCADE,
  FOREIGN KEY (actorUserId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chatThreads (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  createdByUserId TEXT,
  participantUserIds TEXT NOT NULL,
  directKey TEXT,
  createdAt TEXT NOT NULL,
  lastMessageAt TEXT,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (createdByUserId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chatMessages (
  id TEXT PRIMARY KEY,
  threadId TEXT NOT NULL,
  societyId TEXT NOT NULL,
  senderUserId TEXT NOT NULL,
  body TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (threadId) REFERENCES chatThreads(id) ON DELETE CASCADE,
  FOREIGN KEY (societyId) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (senderUserId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS userProfiles (
  userId TEXT PRIMARY KEY,
  preferredRole TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS authIdentities (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  channel TEXT NOT NULL,
  value TEXT NOT NULL UNIQUE,
  isPrimary INTEGER NOT NULL,
  verifiedAt TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS authChallenges (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL,
  destination TEXT NOT NULL,
  provider TEXT NOT NULL,
  providerReference TEXT,
  code TEXT,
  status TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS authSessions (
  token TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
