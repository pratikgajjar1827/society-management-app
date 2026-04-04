require('../config/load-env');

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const { db, dbDialect, ensureSchema } = require('../db/database');

const sqliteSourcePath = process.env.SQLITE_SOURCE_PATH?.trim()
  || path.join(process.cwd(), 'backend-data', 'societyos.db');

const tableConfigs = [
  ['users'],
  ['societies'],
  ['buildings'],
  ['units'],
  ['memberships'],
  ['joinRequests'],
  ['residenceProfiles'],
  ['occupancy'],
  ['vehicleRegistrations'],
  ['importantContacts'],
  ['leadershipProfiles'],
  ['announcements'],
  ['rules'],
  ['societyDocuments'],
  ['societyDocumentDownloadRequests'],
  ['amenities'],
  ['amenityScheduleRules'],
  ['bookings'],
  ['maintenancePlans'],
  ['expenseRecords'],
  ['invoices'],
  ['payments'],
  ['paymentReminders'],
  ['receipts'],
  ['complaints'],
  ['complaintUpdates'],
  ['staffProfiles'],
  ['staffAssignments'],
  ['securityGuards'],
  ['securityShifts'],
  ['entryLogs'],
  ['visitorPasses'],
  ['securityGuestRequests'],
  ['securityGuestLogs'],
  ['chatThreads'],
  ['chatMessages'],
];

const authTableNames = ['userProfiles', 'authIdentities', 'authChallenges', 'authSessions'];

function hasTable(sqliteDb, tableName) {
  const row = sqliteDb
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName);

  return Boolean(row);
}

function normalizeIdentifier(identifier) {
  return dbDialect === 'postgres' ? String(identifier).toLowerCase() : String(identifier);
}

function quoteIdentifier(identifier) {
  return `"${normalizeIdentifier(identifier).replace(/"/g, '""')}"`;
}

function insertRows(tableName, rows) {
  if (!rows.length) {
    return 0;
  }

  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => '?').join(', ');
  const statement = db.prepare(
    `INSERT INTO ${quoteIdentifier(tableName)} (${columns.map(quoteIdentifier).join(', ')}) VALUES (${placeholders})`,
  );

  for (const row of rows) {
    statement.run(...columns.map((columnName) => row[columnName]));
  }

  return rows.length;
}

function recreatePostgresSchema() {
  const managedTableNames = [...authTableNames, ...tableConfigs.map(([tableName]) => tableName)].reverse();

  for (const tableName of managedTableNames) {
    db.exec(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
  }

  ensureSchema();
}

function migrate() {
  if (dbDialect !== 'postgres') {
    throw new Error('Set DATABASE_URL before running this script so the destination uses PostgreSQL.');
  }

  if (!fs.existsSync(sqliteSourcePath)) {
    throw new Error(`SQLite source database not found at ${sqliteSourcePath}`);
  }

  const sqliteDb = new DatabaseSync(sqliteSourcePath);
  const counts = [];

  recreatePostgresSchema();
  db.exec('BEGIN');

  try {
    for (const [tableName] of tableConfigs) {
      if (!hasTable(sqliteDb, tableName)) {
        counts.push([tableName, 0]);
        continue;
      }

      const rows = sqliteDb.prepare(`SELECT * FROM ${tableName}`).all();
      counts.push([tableName, insertRows(tableName, rows)]);
    }

    for (const tableName of authTableNames) {
      if (!hasTable(sqliteDb, tableName)) {
        counts.push([tableName, 0]);
        continue;
      }

      const rows = sqliteDb.prepare(`SELECT * FROM ${tableName}`).all();
      counts.push([tableName, insertRows(tableName, rows)]);
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    sqliteDb.close();
    if (typeof db.close === 'function') {
      db.close();
    }
  }

  console.log(`Migrated SQLite data from ${sqliteSourcePath} into PostgreSQL.`);

  counts.forEach(([tableName, rowCount]) => {
    console.log(`${tableName}: ${rowCount}`);
  });
}

migrate();
