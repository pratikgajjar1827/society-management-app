const fs = require('node:fs');
const path = require('node:path');
const { createPostgresDatabase } = require('./postgres-sync');
const { normalizeSocietyLocationFields } = require('../utils/location-normalization');

const {
  countApartmentUnits,
  countOfficeUnits,
  countShedUnits,
  createAmenitiesFromSelection,
  createUnitStructure,
  findDuplicateOfficeCodes,
  normalizeApartmentBlockPlan,
  normalizeApartmentStartingFloorNumber,
  normalizeOfficeFloorPlan,
  normalizeShedBlockPlan,
} = require('../seed/factories');
const { DEMO_USER_ID, SUPER_USER_ID, seedData } = require('../seed/seedData');

const dbDirectory = path.join(process.cwd(), 'backend-data');
const sqliteDbPath = path.join(dbDirectory, 'societyos.db');
const schemaPath = path.join(__dirname, 'schema.sql');
const postgresConnectionString = String(process.env.DATABASE_URL ?? '').trim();
const requirePostgres = /^(1|true|yes)$/i.test(String(process.env.REQUIRE_POSTGRES ?? '').trim());
const isProduction = String(process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production';

if (!postgresConnectionString && (requirePostgres || isProduction)) {
  throw new Error(
    requirePostgres
      ? 'REQUIRE_POSTGRES is enabled, but DATABASE_URL is not set.'
      : 'DATABASE_URL must be set when NODE_ENV=production. Refusing to start with SQLite in production.',
  );
}

const dbDialect = postgresConnectionString ? 'postgres' : 'sqlite';
const dbPath = dbDialect === 'postgres' ? 'postgresql' : sqliteDbPath;

const tableConfigs = [
  ['users'],
  ['societies'],
  ['buildings'],
  ['units'],
  ['memberships', ['roles', 'unitIds']],
  ['joinRequests', ['unitIds']],
  ['residenceProfiles'],
  ['occupancy'],
  ['vehicleRegistrations'],
  ['importantContacts'],
  ['leadershipProfiles'],
  ['announcements', ['readByUserIds']],
  ['rules', ['acknowledgedByUserIds']],
  ['societyDocuments'],
  ['societyDocumentDownloadRequests'],
  ['amenities'],
  ['amenityScheduleRules', ['blackoutDates']],
  ['bookings'],
  ['maintenancePlans'],
  ['expenseRecords'],
  ['invoices'],
  ['payments'],
  ['paymentReminders', ['invoiceIds', 'unitIds']],
  ['receipts'],
  ['complaints'],
  ['complaintUpdates'],
  ['staffProfiles', ['employerUnitIds']],
  ['staffAssignments'],
  ['securityGuards'],
  ['securityShifts'],
  ['entryLogs'],
  ['visitorPasses'],
  ['securityGuestRequests'],
  ['securityGuestLogs'],
  ['chatThreads', ['participantUserIds']],
  ['chatMessages'],
];

const authTableNames = ['authSessions', 'authChallenges', 'authIdentities', 'userProfiles'];
const seededRoleMap = {
  'user-super-admin': 'superUser',
  'user-aarav': 'owner',
  'user-neha': 'tenant',
  'user-rohan': 'owner',
  'user-kavya': 'tenant',
};
const premiumApartmentAmenityDefaults = [
  'Clubhouse Hall',
  'Banquet Hall',
  'Community Hall',
  'Party Lawn',
  'Guest Suites',
  'Coworking Lounge',
  'Business Lounge',
  'Cafe Lounge',
  'Gym',
  'Swimming Pool',
  'Indoor Games Lounge',
  'Badminton Court',
  'Squash Court',
  'Tennis Court',
  'Basketball Court',
  'Childrens Play Area',
  'Senior Citizen Lounge',
  'Pet Park',
  'BBQ Deck',
  'Yoga Deck',
  'Guest Parking',
  'Garden',
  'Walking Track',
];
const premiumBungalowAmenityDefaults = [
  'Clubhouse Hall',
  'Banquet Hall',
  'Community Hall',
  'Party Lawn',
  'Guest Suites',
  'Cafe Lounge',
  'Gym',
  'Swimming Pool',
  'Badminton Court',
  'Tennis Court',
  'Childrens Play Area',
  'Senior Citizen Lounge',
  'Pet Park',
  'BBQ Deck',
  'Yoga Deck',
  'Guest Parking',
  'Garden',
  'Walking Track',
];

function normalizeSeedPhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }

  return digits ? `+${digits}` : '';
}

function normalizeSeedEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

function getAvatarInitials(name) {
  const normalized = String(name ?? '').trim();

  if (!normalized) {
    return 'SG';
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || normalized.slice(0, 2).toUpperCase();
}

function createSqliteDatabase(filePath) {
  const { DatabaseSync } = require('node:sqlite');
  return new DatabaseSync(filePath);
}

if (dbDialect === 'sqlite') {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

const db = dbDialect === 'postgres'
  ? createPostgresDatabase(postgresConnectionString)
  : createSqliteDatabase(sqliteDbPath);

db.clientType = dbDialect;

if (dbDialect === 'sqlite') {
  db.exec('PRAGMA foreign_keys = ON;');
}

function getTableColumns(tableName) {
  if (dbDialect === 'postgres') {
    return new Set(
      db.prepare(
        `SELECT column_name AS name
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = ?
         ORDER BY ordinal_position ASC`,
      ).all(String(tableName).toLowerCase()).map((column) => String(column.name).toLowerCase()),
    );
  }

  return new Set(
    db.prepare(`PRAGMA table_info('${tableName}')`).all().map((column) => column.name),
  );
}

function addMissingColumns(tableName, definitions) {
  const existingColumns = getTableColumns(tableName);

  for (const [columnName, definition] of definitions) {
    const normalizedColumnName = dbDialect === 'postgres'
      ? String(columnName).toLowerCase()
      : columnName;

    if (!existingColumns.has(normalizedColumnName)) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    }
  }
}

function ensureSchema() {
  const sql = fs
    .readFileSync(schemaPath, 'utf8')
    .replace(/^\s*PRAGMA\s+foreign_keys\s*=\s*(?:ON|OFF)\s*;?\s*/gim, '');
  db.exec(sql);

  addMissingColumns('societies', [
    ['country', "TEXT NOT NULL DEFAULT 'India'"],
    ['state', "TEXT NOT NULL DEFAULT 'Gujarat'"],
    ['city', "TEXT NOT NULL DEFAULT 'Ahmedabad'"],
    ['area', "TEXT NOT NULL DEFAULT ''"],
    ['enabledStructures', 'TEXT'],
    ['commercialSpaceType', 'TEXT'],
    ['enabledCommercialSpaceTypes', 'TEXT'],
    ['apartmentSubtype', 'TEXT'],
    ['apartmentBlockPlan', 'TEXT'],
    ['apartmentStartingFloorNumber', 'INTEGER'],
    ['apartmentUnitCount', 'INTEGER'],
    ['bungalowUnitCount', 'INTEGER'],
    ['shedUnitCount', 'INTEGER'],
    ['shedBlockPlan', 'TEXT'],
    ['officeFloorPlan', 'TEXT'],
  ]);

  addMissingColumns('staffProfiles', [
    ['requestedByUserId', 'TEXT'],
    ['requestedAt', 'TEXT'],
    ['reviewedByUserId', 'TEXT'],
    ['reviewedAt', 'TEXT'],
  ]);

  addMissingColumns('residenceProfiles', [
    ['secondaryEmergencyContactName', 'TEXT'],
    ['secondaryEmergencyContactPhone', 'TEXT'],
    ['photoDataUrl', 'TEXT'],
    ['businessName', 'TEXT'],
    ['businessDetails', 'TEXT'],
  ]);

  addMissingColumns('payments', [
    ['submittedByUserId', 'TEXT'],
    ['referenceNote', 'TEXT'],
    ['proofImageDataUrl', 'TEXT'],
    ['reviewedByUserId', 'TEXT'],
    ['reviewedAt', 'TEXT'],
  ]);

  addMissingColumns('maintenancePlans', [
    ['upiId', 'TEXT'],
    ['upiMobileNumber', 'TEXT'],
    ['upiPayeeName', 'TEXT'],
    ['upiQrCodeDataUrl', 'TEXT'],
    ['upiQrPayload', 'TEXT'],
    ['bankAccountName', 'TEXT'],
    ['bankAccountNumber', 'TEXT'],
    ['bankIfscCode', 'TEXT'],
    ['bankName', 'TEXT'],
    ['bankBranchName', 'TEXT'],
  ]);

  addMissingColumns('complaints', [
    ['description', 'TEXT'],
  ]);

  addMissingColumns('announcements', [
    ['photoDataUrl', 'TEXT'],
  ]);

  addMissingColumns('amenities', [
    ['reservationScope', "TEXT NOT NULL DEFAULT 'timeSlot'"],
  ]);

  addMissingColumns('vehicleRegistrations', [
    ['photoDataUrl', 'TEXT'],
  ]);

  addMissingColumns('securityGuestRequests', [
    ['guestPhotoCapturedAt', 'TEXT'],
    ['vehiclePhotoDataUrl', 'TEXT'],
    ['vehiclePhotoCapturedAt', 'TEXT'],
  ]);
}

function ensureSuperUserAccount() {
  const superUser = seedData.users.find((user) => user.id === SUPER_USER_ID);

  if (!superUser) {
    return;
  }

  const now = new Date().toISOString();
  const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(superUser.id);

  if (!existingUser) {
    db.prepare(
      'INSERT INTO users (id, name, phone, email, avatarInitials) VALUES (?, ?, ?, ?, ?)',
    ).run(
      superUser.id,
      superUser.name,
      superUser.phone,
      superUser.email,
      superUser.avatarInitials,
    );
  }

  db.prepare(
    `INSERT INTO userProfiles (userId, preferredRole, createdAt, updatedAt)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(userId) DO UPDATE SET preferredRole = excluded.preferredRole, updatedAt = excluded.updatedAt`,
  ).run(superUser.id, 'superUser', now, now);

  db.prepare(
    `INSERT INTO authIdentities (id, userId, channel, value, isPrimary, verifiedAt, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO NOTHING`,
  ).run(
    `identity-${superUser.id}-sms`,
    superUser.id,
    'sms',
    normalizeSeedPhone(superUser.phone),
    1,
    now,
    now,
  );

  db.prepare(
    `INSERT INTO authIdentities (id, userId, channel, value, isPrimary, verifiedAt, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO NOTHING`,
  ).run(
    `identity-${superUser.id}-email`,
    superUser.id,
    'email',
    normalizeSeedEmail(superUser.email),
    0,
    now,
    now,
  );
}

function ensureSupplementalSeedRows() {
  const supplementalTables = [
    'vehicleRegistrations',
    'importantContacts',
    'complaintUpdates',
    'visitorPasses',
    'securityGuestRequests',
    'securityGuestLogs',
  ];

  for (const tableName of supplementalTables) {
    const row = db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get();

    if (Number(row.count) === 0) {
      insertMany(tableName, seedData[tableName]);
    }
  }
}

function ensureSecurityGuardAccess() {
  const now = new Date().toISOString();
  const guards = db.prepare('SELECT id, societyId, name, phone FROM securityGuards').all();

  for (const guard of guards) {
    const normalizedPhone = normalizeSeedPhone(guard.phone);

    if (!normalizedPhone) {
      continue;
    }

    runTransaction(() => {
      if (guard.phone !== normalizedPhone) {
        db.prepare('UPDATE securityGuards SET phone = ? WHERE id = ?').run(normalizedPhone, guard.id);
      }

      const existingIdentity = db
        .prepare("SELECT id, userId FROM authIdentities WHERE channel = 'sms' AND value = ?")
        .get(normalizedPhone);
      let userId = existingIdentity?.userId;

      if (!userId) {
        const existingUser = db.prepare('SELECT id FROM users WHERE phone = ?').get(normalizedPhone);
        userId = existingUser?.id ?? nextId('user');

        if (existingUser) {
          db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(normalizedPhone, userId);
        } else {
          db.prepare(
            'INSERT INTO users (id, name, phone, email, avatarInitials) VALUES (?, ?, ?, ?, ?)',
          ).run(userId, guard.name, normalizedPhone, '', getAvatarInitials(guard.name));
        }

        db.prepare(
          'INSERT INTO authIdentities (id, userId, channel, value, isPrimary, verifiedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ).run(`identity-${userId}-sms`, userId, 'sms', normalizedPhone, 1, now, now);
      }

      db.prepare(
        `INSERT INTO userProfiles (userId, preferredRole, createdAt, updatedAt)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(userId) DO UPDATE SET updatedAt = excluded.updatedAt`,
      ).run(userId, null, now, now);

      const membership = db
        .prepare('SELECT id, roles FROM memberships WHERE userId = ? AND societyId = ?')
        .get(userId, guard.societyId);

      if (!membership) {
        const existingMembershipCount = Number(
          db.prepare('SELECT COUNT(*) AS count FROM memberships WHERE userId = ?').get(userId)?.count ?? 0,
        );

        insertMany('memberships', [
          {
            id: nextId('membership'),
            userId,
            societyId: guard.societyId,
            roles: ['security'],
            unitIds: [],
            isPrimary: existingMembershipCount === 0,
          },
        ]);
        return;
      }

      const roles = JSON.parse(membership.roles ?? '[]');

      if (!roles.includes('security')) {
        db.prepare('UPDATE memberships SET roles = ? WHERE id = ?').run(
          JSON.stringify([...roles, 'security']),
          membership.id,
        );
      }
    });
  }
}

function getRecommendedAmenitiesForSociety(societyRow) {
  const enabledStructures = fromStoredValue('enabledStructures', societyRow.enabledStructures);
  const normalizedEnabledStructures = Array.isArray(enabledStructures) && enabledStructures.length > 0
    ? enabledStructures
    : [societyRow.structure].filter(Boolean);

  if (
    normalizedEnabledStructures.includes('apartment') ||
    societyRow.structure === 'apartment' ||
    societyRow.structure === 'mixed'
  ) {
    return premiumApartmentAmenityDefaults;
  }

  if (normalizedEnabledStructures.includes('bungalow') || societyRow.structure === 'bungalow') {
    return premiumBungalowAmenityDefaults;
  }

  return [];
}

function ensureResidentialAmenityCatalog() {
  const societies = db
    .prepare('SELECT id, structure, enabledStructures FROM societies ORDER BY createdAt ASC')
    .all();

  for (const society of societies) {
    const recommendedAmenities = getRecommendedAmenitiesForSociety(society);

    if (recommendedAmenities.length === 0) {
      continue;
    }

    const generatedSetup = createAmenitiesFromSelection(society.id, recommendedAmenities);
    const generatedAmenityByName = new Map(generatedSetup.amenities.map((amenity) => [amenity.name, amenity]));
    const generatedRulesByAmenityId = new Map();

    generatedSetup.rules.forEach((rule) => {
      const rules = generatedRulesByAmenityId.get(rule.amenityId) ?? [];
      rules.push(rule);
      generatedRulesByAmenityId.set(rule.amenityId, rules);
    });

    const existingAmenities = db
      .prepare(
        'SELECT id, societyId, name, bookingType, reservationScope, approvalMode, capacity, priceInr FROM amenities WHERE societyId = ?',
      )
      .all(society.id);

    runTransaction(() => {
      existingAmenities.forEach((amenity) => {
        const generatedAmenity = generatedAmenityByName.get(amenity.name);

        if (!generatedAmenity) {
          return;
        }

        db.prepare(
          `UPDATE amenities
           SET bookingType = ?, reservationScope = ?, approvalMode = ?, capacity = ?, priceInr = ?
           WHERE id = ?`,
        ).run(
          generatedAmenity.bookingType,
          generatedAmenity.reservationScope,
          generatedAmenity.approvalMode,
          generatedAmenity.capacity ?? null,
          generatedAmenity.priceInr ?? null,
          amenity.id,
        );

        db.prepare('DELETE FROM amenityScheduleRules WHERE amenityId = ?').run(amenity.id);
        insertMany(
          'amenityScheduleRules',
          (generatedRulesByAmenityId.get(generatedAmenity.id) ?? []).map((rule) => ({
            ...rule,
            amenityId: amenity.id,
          })),
        );
      });

      const existingAmenityNames = new Set(existingAmenities.map((amenity) => amenity.name));
      const missingAmenities = generatedSetup.amenities.filter((amenity) => !existingAmenityNames.has(amenity.name));

      if (missingAmenities.length > 0) {
        insertMany('amenities', missingAmenities);
        insertMany(
          'amenityScheduleRules',
          generatedSetup.rules.filter((rule) => missingAmenities.some((amenity) => amenity.id === rule.amenityId)),
        );
      }
    });
  }
}

function listAll(tableName) {
  if (tableName === 'units') {
    return db
      .prepare(`SELECT * FROM ${tableName} ORDER BY COALESCE(buildingId, ''), code ASC, id ASC`)
      .all();
  }

  if (tableName === 'buildings') {
    return db.prepare(`SELECT * FROM ${tableName} ORDER BY sortOrder ASC, id ASC`).all();
  }

  const columns = getTableColumns(tableName);
  const preferredColumns = [
    'sortOrder',
    'createdAt',
    'updatedAt',
    'publishedAt',
    'uploadedAt',
    'requestedAt',
    'issuedAt',
    'paidAt',
    'incurredOn',
    'enteredAt',
    'startDate',
    'date',
    'dueDate',
    'name',
    'title',
    'registrationNumber',
  ];
  const orderColumns = preferredColumns.filter((columnName) => columns.has(columnName));

  if (columns.has('id')) {
    orderColumns.push('id');
  } else if (columns.has('userId')) {
    orderColumns.push('userId');
  } else if (columns.has('token')) {
    orderColumns.push('token');
  }

  const orderClause = orderColumns.length > 0
    ? orderColumns.map((columnName) => `${columnName} ASC`).join(', ')
    : null;

  return db.prepare(
    orderClause ? `SELECT * FROM ${tableName} ORDER BY ${orderClause}` : `SELECT * FROM ${tableName}`,
  ).all();
}

function hasSeedData() {
  const row = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  return Number(row.count) > 0;
}

function toStoredValue(columnName, value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (columnName === 'isPrimary' || columnName === 'acknowledgementRequired' || columnName === 'active') {
    return value ? 1 : 0;
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  return value;
}

function fromStoredValue(columnName, value) {
  if (value === undefined || value === null) {
    if (
      columnName === 'roles' ||
      columnName === 'unitIds' ||
      columnName === 'readByUserIds' ||
      columnName === 'acknowledgedByUserIds' ||
      columnName === 'blackoutDates' ||
      columnName === 'employerUnitIds' ||
      columnName === 'enabledStructures' ||
      columnName === 'enabledCommercialSpaceTypes' ||
      columnName === 'apartmentBlockPlan' ||
      columnName === 'shedBlockPlan' ||
      columnName === 'officeFloorPlan' ||
      columnName === 'invoiceIds' ||
      columnName === 'unitIds'
    ) {
      return [];
    }

    return value;
  }

  if (
    columnName === 'roles' ||
    columnName === 'unitIds' ||
    columnName === 'readByUserIds' ||
    columnName === 'acknowledgedByUserIds' ||
    columnName === 'blackoutDates' ||
    columnName === 'employerUnitIds' ||
    columnName === 'enabledStructures' ||
    columnName === 'enabledCommercialSpaceTypes' ||
    columnName === 'apartmentBlockPlan' ||
    columnName === 'shedBlockPlan' ||
    columnName === 'officeFloorPlan' ||
    columnName === 'invoiceIds' ||
    columnName === 'unitIds'
  ) {
    return JSON.parse(value);
  }

  if (columnName === 'isPrimary' || columnName === 'acknowledgementRequired' || columnName === 'active') {
    return Boolean(value);
  }

  return value;
}

function normalizeIdentifier(identifier) {
  return dbDialect === 'postgres' ? String(identifier).toLowerCase() : String(identifier);
}

function quoteIdentifier(identifier) {
  return `"${normalizeIdentifier(identifier).replace(/"/g, '""')}"`;
}

function insertMany(tableName, rows) {
  if (!rows || rows.length === 0) {
    return;
  }

  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => '?').join(', ');
  const statement = db.prepare(
    `INSERT INTO ${quoteIdentifier(tableName)} (${columns.map(quoteIdentifier).join(', ')}) VALUES (${placeholders})`,
  );

  for (const row of rows) {
    const values = columns.map((columnName) => toStoredValue(columnName, row[columnName]));
    statement.run(...values);
  }
}

function clearAllTables() {
  const tableNames = [...authTableNames, ...tableConfigs.map(([tableName]) => tableName)].reverse();
  for (const tableName of tableNames) {
    db.prepare(`DELETE FROM ${tableName}`).run();
  }
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

function seedDatabase(data = seedData) {
  runTransaction(() => {
    clearAllTables();

    for (const [tableName] of tableConfigs) {
      insertMany(tableName, data[tableName]);
    }

    const seededAt = new Date().toISOString();

    insertMany(
      'userProfiles',
      data.users.map((user) => ({
        userId: user.id,
        preferredRole: seededRoleMap[user.id] ?? null,
        createdAt: seededAt,
        updatedAt: seededAt,
      })),
    );

    insertMany(
      'authIdentities',
      data.users.flatMap((user) => [
        {
          id: `identity-${user.id}-sms`,
          userId: user.id,
          channel: 'sms',
          value: normalizeSeedPhone(user.phone),
          isPrimary: 1,
          verifiedAt: seededAt,
          createdAt: seededAt,
        },
        {
          id: `identity-${user.id}-email`,
          userId: user.id,
          channel: 'email',
          value: normalizeSeedEmail(user.email),
          isPrimary: 0,
          verifiedAt: seededAt,
          createdAt: seededAt,
        },
      ]),
    );
  });
}

function getSnapshot() {
  const snapshot = {};

  for (const [tableName] of tableConfigs) {
    snapshot[tableName] = listAll(tableName).map((row) => {
      const normalized = {};
      for (const [key, value] of Object.entries(row)) {
        normalized[key] = fromStoredValue(key, value);
      }

      return normalized;
    });
  }

  snapshot.userProfiles = listAll('userProfiles').map((row) => {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key] = fromStoredValue(key, value);
    }

    return normalized;
  });

  return snapshot;
}

function nextId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function parseWholeNumber(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

const structureOptions = ['apartment', 'bungalow', 'commercial'];
const commercialSpaceTypes = ['shed', 'office'];

function normalizeSelections(value, allowedValues) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((item) => allowedValues.includes(item)))];
}

function getEnabledStructuresFromDraft(draft) {
  const enabledStructures = normalizeSelections(draft.enabledStructures, structureOptions);

  if (enabledStructures.length > 0) {
    return enabledStructures;
  }

  return structureOptions.includes(draft.structure) ? [draft.structure] : [];
}

function getEnabledCommercialSpaceTypesFromDraft(draft, enabledStructures = getEnabledStructuresFromDraft(draft)) {
  if (!enabledStructures.includes('commercial')) {
    return [];
  }

  const enabledCommercialSpaceTypes = normalizeSelections(
    draft.enabledCommercialSpaceTypes,
    commercialSpaceTypes,
  );

  if (enabledCommercialSpaceTypes.length > 0) {
    return enabledCommercialSpaceTypes;
  }

  return commercialSpaceTypes.includes(draft.commercialSpaceType) ? [draft.commercialSpaceType] : [];
}

function getDraftUnitCount(value, fallbackValue) {
  return Math.max(0, parseWholeNumber(value) ?? parseWholeNumber(fallbackValue) ?? 0);
}

function buildStructureTagline(structureSetup) {
  const segments = [];

  if (structureSetup.apartmentUnitCount) {
    const apartmentBlockCount = structureSetup.apartmentBlockPlan.length;
    const apartmentTowerCount = structureSetup.apartmentBlockPlan.reduce(
      (total, block) => total + (Number.parseInt(block.towerCount, 10) || 0),
      0,
    );

    segments.push(
      `${structureSetup.apartmentUnitCount} apartment home${structureSetup.apartmentUnitCount === 1 ? '' : 's'} across ${apartmentBlockCount} block${apartmentBlockCount === 1 ? '' : 's'} and ${apartmentTowerCount} tower${apartmentTowerCount === 1 ? '' : 's'}`,
    );
  }

  if (structureSetup.bungalowUnitCount) {
    segments.push(
      `${structureSetup.bungalowUnitCount} plot${structureSetup.bungalowUnitCount === 1 ? '' : 's'}`,
    );
  }

  if (structureSetup.shedUnitCount) {
    const shedBlockCount = structureSetup.shedBlockPlan.length;
    segments.push(
      `${structureSetup.shedUnitCount} shed${structureSetup.shedUnitCount === 1 ? '' : 's'}${shedBlockCount > 0 ? ` across ${shedBlockCount} block${shedBlockCount === 1 ? '' : 's'}` : ''}`,
    );
  }

  if (structureSetup.officeUnitCount) {
    segments.push(
      `${structureSetup.officeUnitCount} office space${structureSetup.officeUnitCount === 1 ? '' : 's'}`,
    );
  }

  if (segments.length === 0) {
    return 'New society workspace';
  }

  if (structureSetup.enabledStructures.length > 1) {
    return `Mixed-use workspace with ${segments.join(', ')}`;
  }

  if (structureSetup.enabledStructures[0] === 'commercial') {
    if (structureSetup.enabledCommercialSpaceTypes.length > 1) {
      return `Commercial mixed-use workspace with ${segments.join(', ')}`;
    }

    if (structureSetup.enabledCommercialSpaceTypes[0] === 'office') {
      const configuredOfficeFloors = normalizeOfficeFloorPlan(structureSetup.officeFloorPlan).filter(
        (floor) => floor.officeCodes.length > 0,
      );
      const configuredFloorCount = configuredOfficeFloors.length;
      const configuredBlockCount = new Set(
        configuredOfficeFloors.map((floor) => String(floor.blockName).toLowerCase()),
      ).size;

      return `Commercial office workspace with ${configuredBlockCount || 1} tower${configuredBlockCount === 1 ? '' : 's'}, ${configuredFloorCount || 1} configured floors, and ${structureSetup.officeUnitCount} unique office spaces`;
    }

    const shedBlockCount = structureSetup.shedBlockPlan.length;
    return `Commercial shed workspace with ${structureSetup.shedUnitCount} shed${structureSetup.shedUnitCount === 1 ? '' : 's'}${shedBlockCount > 0 ? ` across ${shedBlockCount} block${shedBlockCount === 1 ? '' : 's'}` : ''}`;
  }

  if (structureSetup.enabledStructures[0] === 'bungalow') {
    return `Bungalow cluster workspace with ${structureSetup.bungalowUnitCount} plot${structureSetup.bungalowUnitCount === 1 ? '' : 's'}`;
  }

  const apartmentBlockCount = structureSetup.apartmentBlockPlan.length;
  const apartmentTowerCount = structureSetup.apartmentBlockPlan.reduce(
    (total, block) => total + (Number.parseInt(block.towerCount, 10) || 0),
    0,
  );

  return `Apartment community workspace with ${apartmentBlockCount} block${apartmentBlockCount === 1 ? '' : 's'}, ${apartmentTowerCount} tower${apartmentTowerCount === 1 ? '' : 's'}, and ${structureSetup.apartmentUnitCount} home${structureSetup.apartmentUnitCount === 1 ? '' : 's'}`;
}

function resolveStructureSetup(draft) {
  const enabledStructures = getEnabledStructuresFromDraft(draft);
  const enabledCommercialSpaceTypes = getEnabledCommercialSpaceTypesFromDraft(draft, enabledStructures);
  const apartmentBlockPlan =
    enabledStructures.includes('apartment') && Array.isArray(draft.apartmentBlockPlan)
      ? normalizeApartmentBlockPlan(draft.apartmentBlockPlan)
        .filter((block) => block.towerCount > 0 && block.floorsPerTower > 0 && block.homesPerFloor > 0)
        .map((block) => ({
          blockName: block.blockName,
          towerCount: String(block.towerCount),
          floorsPerTower: String(block.floorsPerTower),
          homesPerFloor: String(block.homesPerFloor),
        }))
      : [];
  const apartmentStartingFloorNumber = enabledStructures.includes('apartment')
    ? normalizeApartmentStartingFloorNumber(draft.apartmentStartingFloorNumber)
    : null;
  const apartmentUnitCount = enabledStructures.includes('apartment')
    ? (apartmentBlockPlan.length > 0
      ? countApartmentUnits(apartmentBlockPlan)
      : getDraftUnitCount(draft.apartmentUnitCount, enabledStructures.length === 1 ? draft.totalUnits : null))
    : 0;
  const bungalowUnitCount = enabledStructures.includes('bungalow')
    ? getDraftUnitCount(draft.bungalowUnitCount, enabledStructures.length === 1 ? draft.totalUnits : null)
    : 0;
  const shedUnitCount =
    enabledStructures.includes('commercial') && enabledCommercialSpaceTypes.includes('shed')
      ? (
        Array.isArray(draft.shedBlockPlan) && draft.shedBlockPlan.length > 0
          ? countShedUnits(draft.shedBlockPlan)
          : getDraftUnitCount(
            draft.shedUnitCount,
            enabledStructures.length === 1 && enabledCommercialSpaceTypes.length === 1 ? draft.totalUnits : null,
          )
      )
      : 0;
  const shedBlockPlan =
    enabledStructures.includes('commercial') && enabledCommercialSpaceTypes.includes('shed') && Array.isArray(draft.shedBlockPlan)
      ? normalizeShedBlockPlan(draft.shedBlockPlan)
        .filter((block) => block.shedCount > 0)
        .map((block) => ({
          blockName: block.blockName,
          shedCount: String(block.shedCount),
        }))
      : [];
  const officeFloorPlan =
    enabledStructures.includes('commercial') && enabledCommercialSpaceTypes.includes('office') && Array.isArray(draft.officeFloorPlan)
      ? draft.officeFloorPlan
      : [];
  const officeUnitCount = enabledCommercialSpaceTypes.includes('office') ? countOfficeUnits(officeFloorPlan) : 0;
  const totalUnits = apartmentUnitCount + bungalowUnitCount + shedUnitCount + officeUnitCount;
  const structure = enabledStructures.length > 1 ? 'mixed' : enabledStructures[0] ?? 'apartment';
  const commercialSpaceType =
    enabledCommercialSpaceTypes.length === 0
      ? null
      : enabledCommercialSpaceTypes.includes('office')
        ? 'office'
        : 'shed';
  const generationPlan = [];

  if (apartmentUnitCount > 0) {
    generationPlan.push({
      structure: 'apartment',
      totalUnits: apartmentUnitCount,
      unitStructureOptions: {
        apartmentBlockPlan,
        apartmentStartingFloorNumber,
      },
    });
  }

  if (bungalowUnitCount > 0) {
    generationPlan.push({
      structure: 'bungalow',
      totalUnits: bungalowUnitCount,
      unitStructureOptions: {},
    });
  }

  if (shedUnitCount > 0) {
    generationPlan.push({
      structure: 'commercial',
      totalUnits: shedUnitCount,
      unitStructureOptions: {
        commercialSpaceType: 'shed',
        shedBlockPlan,
      },
    });
  }

  if (officeUnitCount > 0) {
    generationPlan.push({
      structure: 'commercial',
      totalUnits: officeUnitCount,
      unitStructureOptions: {
        commercialSpaceType: 'office',
        officeFloorPlan,
      },
    });
  }

  const structureSetup = {
    structure,
    enabledStructures,
    commercialSpaceType,
    enabledCommercialSpaceTypes,
    apartmentSubtype: apartmentUnitCount > 0 ? 'block' : null,
    apartmentBlockPlan,
    apartmentStartingFloorNumber,
    apartmentUnitCount: apartmentUnitCount || null,
    bungalowUnitCount: bungalowUnitCount || null,
    shedUnitCount: shedUnitCount || null,
    shedBlockPlan,
    officeFloorPlan,
    officeUnitCount,
    totalUnits: Math.max(1, totalUnits),
    generationPlan,
  };

  return {
    ...structureSetup,
    tagline: buildStructureTagline(structureSetup),
  };
}

function mergeGeneratedStructures(structures) {
  let nextSortOrder = 1;
  const buildings = [];
  const units = [];

  structures.forEach((structure) => {
    const buildingIdMap = new Map();

    structure.buildings.forEach((building) => {
      const normalizedBuilding = {
        ...building,
        sortOrder: nextSortOrder,
      };

      nextSortOrder += 1;
      buildings.push(normalizedBuilding);
      buildingIdMap.set(building.id, normalizedBuilding.id);
    });

    structure.units.forEach((unit) => {
      units.push({
        ...unit,
        buildingId: unit.buildingId ? buildingIdMap.get(unit.buildingId) ?? unit.buildingId : unit.buildingId,
      });
    });
  });

  return { buildings, units };
}

function createSocietyWorkspace(userId, draft) {
  const now = new Date().toISOString();
  const societyId = nextId('society');
  const maintenanceDay = Math.min(28, Math.max(1, Number.parseInt(draft.maintenanceDay, 10) || 10));
  const maintenanceAmount = Math.max(1000, Number.parseInt(draft.maintenanceAmount, 10) || 5000);
  const structureSetup = resolveStructureSetup(draft);
  const generatedStructure = mergeGeneratedStructures(
    structureSetup.generationPlan.map((structurePlan) =>
      createUnitStructure(
        societyId,
        structurePlan.structure,
        structurePlan.totalUnits,
        structurePlan.unitStructureOptions,
      ),
    ),
  );
  const amenitySetup = createAmenitiesFromSelection(societyId, draft.selectedAmenities);
  const existingUserProfile = db.prepare('SELECT preferredRole FROM userProfiles WHERE userId = ?').get(userId);
  const preferredRoleToPersist = existingUserProfile?.preferredRole ?? null;
  const locationFields = normalizeSocietyLocationFields({
    name: draft.societyName,
    country: draft.country,
    state: draft.state,
    city: draft.city,
    area: draft.area,
    address: draft.address,
    tagline: structureSetup.tagline,
  });

  runTransaction(() => {
    insertMany('societies', [
      {
        id: societyId,
        name: locationFields.name,
        country: locationFields.country,
        state: locationFields.state,
        city: locationFields.city,
        area: locationFields.area,
        address: locationFields.address,
        structure: structureSetup.structure,
        enabledStructures: structureSetup.enabledStructures,
        commercialSpaceType: structureSetup.commercialSpaceType,
        enabledCommercialSpaceTypes: structureSetup.enabledCommercialSpaceTypes,
        apartmentSubtype: structureSetup.apartmentSubtype,
        apartmentBlockPlan: structureSetup.apartmentBlockPlan,
        apartmentStartingFloorNumber: structureSetup.apartmentStartingFloorNumber,
        apartmentUnitCount: structureSetup.apartmentUnitCount,
        bungalowUnitCount: structureSetup.bungalowUnitCount,
        shedUnitCount: structureSetup.shedUnitCount,
        shedBlockPlan: structureSetup.shedBlockPlan,
        officeFloorPlan: structureSetup.officeFloorPlan,
        timezone: 'Asia/Kolkata',
        totalUnits: structureSetup.totalUnits,
        maintenanceDayOfMonth: maintenanceDay,
        maintenanceAmount,
        tagline: locationFields.tagline,
        createdAt: now,
      },
    ]);

    insertMany('buildings', generatedStructure.buildings);
    insertMany('units', generatedStructure.units);
    db.prepare(
      `INSERT INTO userProfiles (userId, preferredRole, createdAt, updatedAt)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(userId) DO UPDATE SET preferredRole = excluded.preferredRole, updatedAt = excluded.updatedAt`,
    ).run(userId, preferredRoleToPersist, now, now);

    insertMany('announcements', [
      {
        id: nextId('announcement'),
        societyId,
        title: 'Workspace created',
        body: 'Workspace setup is complete. The first local chairman can now claim this society for approval.',
        audience: 'all',
        createdAt: now,
        priority: 'normal',
        readByUserIds: [userId],
      },
    ]);

    insertMany('rules', [
      {
        id: nextId('rule'),
        societyId,
        title: 'Society rules',
        version: 'v1.0',
        summary: draft.rulesSummary?.trim() || '',
        publishedAt: now,
        acknowledgementRequired: true,
        acknowledgedByUserIds: [userId],
      },
    ]);

    insertMany('amenities', amenitySetup.amenities);
    insertMany('amenityScheduleRules', amenitySetup.rules);
    insertMany('maintenancePlans', [
      {
        id: nextId('plan'),
        societyId,
        frequency: 'monthly',
        dueDay: maintenanceDay,
        amountInr: maintenanceAmount,
        lateFeeInr: 250,
        calculationMethod: 'fixed',
        receiptPrefix: locationFields.name.slice(0, 3).toUpperCase(),
        upiId: null,
        upiPayeeName: locationFields.name,
        upiQrCodeDataUrl: null,
        bankAccountName: locationFields.name,
      },
    ]);
  });

  return {
    currentUserId: userId,
    societyId,
    data: getSnapshot(),
  };
}

function deleteSocietyWorkspace(societyId) {
  const existingSociety = db.prepare('SELECT id FROM societies WHERE id = ?').get(societyId);

  if (!existingSociety) {
    return false;
  }

  db.prepare('DELETE FROM societies WHERE id = ?').run(societyId);

  return true;
}

function resetDatabase() {
  if (dbDialect === 'sqlite') {
    db.exec('PRAGMA foreign_keys = OFF;');
  }

  const managedTables = [...authTableNames, ...tableConfigs.map(([tableName]) => tableName)].reverse();

  for (const tableName of managedTables) {
    db.exec(
      dbDialect === 'postgres'
        ? `DROP TABLE IF EXISTS ${tableName} CASCADE`
        : `DROP TABLE IF EXISTS ${tableName}`,
    );
  }

  if (dbDialect === 'sqlite') {
    db.exec('PRAGMA foreign_keys = ON;');
  }

  ensureSchema();
  seedDatabase(seedData);
  ensureSecurityGuardAccess();
  return getSnapshot();
}

function initializeDatabase() {
  ensureSchema();
  if (!hasSeedData()) {
    seedDatabase(seedData);
  }
  ensureSuperUserAccount();
  ensureSupplementalSeedRows();
  ensureResidentialAmenityCatalog();
  ensureSecurityGuardAccess();
}

module.exports = {
  DEMO_USER_ID,
  createSocietyWorkspace,
  db,
  dbDialect,
  dbPath,
  deleteSocietyWorkspace,
  ensureSchema,
  getSnapshot,
  initializeDatabase,
  resetDatabase,
};
