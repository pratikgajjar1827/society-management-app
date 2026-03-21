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
  commercialSpaceType TEXT,
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

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS amenities (
  id TEXT PRIMARY KEY,
  societyId TEXT NOT NULL,
  name TEXT NOT NULL,
  bookingType TEXT NOT NULL,
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
  start TEXT NOT NULL,
  end TEXT NOT NULL,
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
