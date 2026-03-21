const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const {
  countOfficeUnits,
  createAmenitiesFromSelection,
  createUnitStructure,
  findDuplicateOfficeCodes,
  normalizeOfficeFloorPlan,
} = require('../seed/factories');
const { DEMO_USER_ID, seedData } = require('../seed/seedData');

const dbDirectory = path.join(process.cwd(), 'backend-data');
const dbPath = path.join(dbDirectory, 'societyos.db');
const schemaPath = path.join(__dirname, 'schema.sql');

const tableConfigs = [
  ['users'],
  ['societies'],
  ['buildings'],
  ['units'],
  ['memberships', ['roles', 'unitIds']],
  ['joinRequests', ['unitIds']],
  ['occupancy'],
  ['announcements', ['readByUserIds']],
  ['rules', ['acknowledgedByUserIds']],
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
  ['staffProfiles', ['employerUnitIds']],
  ['staffAssignments'],
  ['securityGuards'],
  ['securityShifts'],
  ['entryLogs'],
];

const authTableNames = ['authSessions', 'authChallenges', 'authIdentities', 'userProfiles'];
const seededRoleMap = {
  'user-aarav': 'owner',
  'user-neha': 'tenant',
  'user-rohan': 'owner',
  'user-kavya': 'tenant',
};

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

fs.mkdirSync(dbDirectory, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON;');

function ensureSchema() {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(sql);

  const societyColumns = new Set(
    db.prepare("PRAGMA table_info('societies')").all().map((column) => column.name),
  );
  const missingSocietyColumns = [
    ['country', "TEXT NOT NULL DEFAULT 'India'"],
    ['state', "TEXT NOT NULL DEFAULT 'Gujarat'"],
    ['city', "TEXT NOT NULL DEFAULT 'Ahmedabad'"],
    ['area', "TEXT NOT NULL DEFAULT ''"],
    ['commercialSpaceType', 'TEXT'],
    ['officeFloorPlan', 'TEXT'],
  ].filter(([columnName]) => !societyColumns.has(columnName));

  for (const [columnName, definition] of missingSocietyColumns) {
    db.exec(`ALTER TABLE societies ADD COLUMN ${columnName} ${definition}`);
  }

  const staffColumns = new Set(
    db.prepare("PRAGMA table_info('staffProfiles')").all().map((column) => column.name),
  );
  const missingStaffColumns = [
    ['requestedByUserId', 'TEXT'],
    ['requestedAt', 'TEXT'],
    ['reviewedByUserId', 'TEXT'],
    ['reviewedAt', 'TEXT'],
  ].filter(([columnName]) => !staffColumns.has(columnName));

  for (const [columnName, definition] of missingStaffColumns) {
    db.exec(`ALTER TABLE staffProfiles ADD COLUMN ${columnName} ${definition}`);
  }

  const paymentColumns = new Set(
    db.prepare("PRAGMA table_info('payments')").all().map((column) => column.name),
  );
  const missingPaymentColumns = [
    ['submittedByUserId', 'TEXT'],
    ['referenceNote', 'TEXT'],
    ['reviewedByUserId', 'TEXT'],
    ['reviewedAt', 'TEXT'],
  ].filter(([columnName]) => !paymentColumns.has(columnName));

  for (const [columnName, definition] of missingPaymentColumns) {
    db.exec(`ALTER TABLE payments ADD COLUMN ${columnName} ${definition}`);
  }

  const complaintColumns = new Set(
    db.prepare("PRAGMA table_info('complaints')").all().map((column) => column.name),
  );
  const missingComplaintColumns = [
    ['description', 'TEXT'],
  ].filter(([columnName]) => !complaintColumns.has(columnName));

  for (const [columnName, definition] of missingComplaintColumns) {
    db.exec(`ALTER TABLE complaints ADD COLUMN ${columnName} ${definition}`);
  }
}

function listAll(tableName) {
  return db.prepare(`SELECT * FROM ${tableName} ORDER BY rowid ASC`).all();
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

function insertMany(tableName, rows) {
  if (!rows || rows.length === 0) {
    return;
  }

  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => '?').join(', ');
  const statement = db.prepare(
    `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
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

  return snapshot;
}

function nextId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function parseWholeNumber(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveStructureSetup(draft) {
  if (draft.structure === 'commercial') {
    const commercialSpaceType = draft.commercialSpaceType === 'office' ? 'office' : 'shed';

    if (commercialSpaceType === 'office') {
      const officeFloorPlan = Array.isArray(draft.officeFloorPlan) ? draft.officeFloorPlan : [];
      const configuredFloors = normalizeOfficeFloorPlan(officeFloorPlan).filter(
        (floor) => floor.officeCodes.length > 0,
      );
      const totalUnits = countOfficeUnits(officeFloorPlan) || 1;
      const duplicateOfficeCodes = findDuplicateOfficeCodes(officeFloorPlan);

      return {
        totalUnits,
        commercialSpaceType,
        officeFloorPlan,
        unitStructureOptions: {
          commercialSpaceType,
          officeFloorPlan,
        },
        tagline:
          duplicateOfficeCodes.length > 0
            ? `Commercial office workspace with ${configuredFloors.length || 1} configured floors`
            : `Commercial office workspace with ${configuredFloors.length || 1} configured floors and ${totalUnits} unique office spaces`,
      };
    }

    const totalUnits = Math.max(1, parseWholeNumber(draft.totalUnits) || 1);

    return {
      totalUnits,
      commercialSpaceType,
      officeFloorPlan: [],
      unitStructureOptions: {
        commercialSpaceType,
      },
      tagline: `Commercial shed workspace with ${totalUnits} shed${totalUnits === 1 ? '' : 's'}`,
    };
  }

  const totalUnits = Math.max(1, parseWholeNumber(draft.totalUnits) || 1);

  return {
    totalUnits,
    commercialSpaceType: null,
    officeFloorPlan: [],
    unitStructureOptions: {},
    tagline:
      draft.structure === 'apartment'
        ? 'New apartment community workspace'
        : 'New bungalow cluster workspace',
  };
}

function createSocietyWorkspace(userId, draft) {
  const now = new Date().toISOString();
  const societyId = nextId('society');
  const maintenanceDay = Math.min(28, Math.max(1, Number.parseInt(draft.maintenanceDay, 10) || 10));
  const maintenanceAmount = Math.max(1000, Number.parseInt(draft.maintenanceAmount, 10) || 5000);
  const structureSetup = resolveStructureSetup(draft);
  const generatedStructure = createUnitStructure(
    societyId,
    draft.structure,
    structureSetup.totalUnits,
    structureSetup.unitStructureOptions,
  );
  const amenitySetup = createAmenitiesFromSelection(societyId, draft.selectedAmenities);

  runTransaction(() => {
    const existingMembershipCount = Number(
      db.prepare('SELECT COUNT(*) AS count FROM memberships WHERE userId = ?').get(userId)?.count ?? 0,
    );

    insertMany('societies', [
      {
        id: societyId,
        name: draft.societyName.trim(),
        country: draft.country.trim(),
        state: draft.state.trim(),
        city: draft.city.trim(),
        area: draft.area.trim(),
        address: draft.address.trim(),
        structure: draft.structure,
        commercialSpaceType: structureSetup.commercialSpaceType,
        officeFloorPlan: structureSetup.officeFloorPlan,
        timezone: 'Asia/Kolkata',
        totalUnits: structureSetup.totalUnits,
        maintenanceDayOfMonth: maintenanceDay,
        maintenanceAmount,
        tagline: structureSetup.tagline,
        createdAt: now,
      },
    ]);

    insertMany('buildings', generatedStructure.buildings);
    insertMany('units', generatedStructure.units);
    db.prepare(
      `INSERT INTO userProfiles (userId, preferredRole, createdAt, updatedAt)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(userId) DO UPDATE SET preferredRole = excluded.preferredRole, updatedAt = excluded.updatedAt`,
    ).run(userId, 'chairman', now, now);
    insertMany('memberships', [
      {
        id: nextId('membership'),
        userId,
        societyId,
        roles: ['chairman'],
        unitIds: [],
        isPrimary: existingMembershipCount === 0,
      },
    ]);

    insertMany('announcements', [
      {
        id: nextId('announcement'),
        societyId,
        title: 'Workspace created',
        body: 'Chairman setup is complete. You can now invite owners, tenants, staff, and committee members.',
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
        receiptPrefix: draft.societyName.trim().slice(0, 3).toUpperCase(),
      },
    ]);
  });

  return {
    currentUserId: userId,
    societyId,
    data: getSnapshot(),
  };
}

function resetDatabase() {
  db.exec('PRAGMA foreign_keys = OFF;');
  const existingTables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((row) => row.name)
    .reverse();

  for (const tableName of existingTables) {
    db.exec(`DROP TABLE IF EXISTS ${tableName}`);
  }

  db.exec('PRAGMA foreign_keys = ON;');
  ensureSchema();
  seedDatabase(seedData);
  return getSnapshot();
}

function initializeDatabase() {
  ensureSchema();
  if (!hasSeedData()) {
    seedDatabase(seedData);
  }
}

module.exports = {
  DEMO_USER_ID,
  createSocietyWorkspace,
  db,
  dbPath,
  getSnapshot,
  initializeDatabase,
  resetDatabase,
};
