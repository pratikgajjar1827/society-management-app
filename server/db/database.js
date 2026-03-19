const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const { createAmenitiesFromSelection, createUnitStructure } = require('../seed/factories');
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
  ['occupancy'],
  ['announcements', ['readByUserIds']],
  ['rules', ['acknowledgedByUserIds']],
  ['amenities'],
  ['amenityScheduleRules', ['blackoutDates']],
  ['bookings'],
  ['maintenancePlans'],
  ['invoices'],
  ['payments'],
  ['receipts'],
  ['complaints'],
  ['staffProfiles', ['employerUnitIds']],
  ['staffAssignments'],
  ['securityGuards'],
  ['securityShifts'],
  ['entryLogs'],
];

fs.mkdirSync(dbDirectory, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON;');

function ensureSchema() {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(sql);
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
      columnName === 'employerUnitIds'
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
    columnName === 'employerUnitIds'
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
  const tableNames = tableConfigs.map(([tableName]) => tableName).reverse();
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

function createSocietyWorkspace(userId, draft) {
  const now = new Date().toISOString();
  const societyId = nextId('society');
  const totalUnits = Math.max(1, Number.parseInt(draft.totalUnits, 10) || 1);
  const maintenanceDay = Math.min(28, Math.max(1, Number.parseInt(draft.maintenanceDay, 10) || 10));
  const maintenanceAmount = Math.max(1000, Number.parseInt(draft.maintenanceAmount, 10) || 5000);
  const structure = createUnitStructure(societyId, draft.structure, totalUnits);
  const amenitySetup = createAmenitiesFromSelection(societyId, draft.selectedAmenities);
  const primaryUnitId = structure.units[0]?.id ?? null;

  runTransaction(() => {
    insertMany('societies', [
      {
        id: societyId,
        name: draft.societyName.trim(),
        address: draft.address.trim(),
        structure: draft.structure,
        timezone: 'Asia/Kolkata',
        totalUnits,
        maintenanceDayOfMonth: maintenanceDay,
        maintenanceAmount,
        tagline:
          draft.structure === 'apartment'
            ? 'New apartment community workspace'
            : 'New bungalow cluster workspace',
        createdAt: now,
      },
    ]);

    insertMany('buildings', structure.buildings);
    insertMany('units', structure.units);
    insertMany('memberships', [
      {
        id: nextId('membership'),
        userId,
        societyId,
        roles: ['chairman', 'owner'],
        unitIds: primaryUnitId ? [primaryUnitId] : [],
        isPrimary: false,
      },
    ]);

    if (primaryUnitId) {
      insertMany('occupancy', [
        {
          id: nextId('occupancy'),
          societyId,
          unitId: primaryUnitId,
          userId,
          category: 'owner',
          startDate: now.slice(0, 10),
          endDate: null,
        },
      ]);
    }

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
  dbPath,
  getSnapshot,
  initializeDatabase,
  resetDatabase,
};
