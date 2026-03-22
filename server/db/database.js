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
const { DEMO_USER_ID, SUPER_USER_ID, seedData } = require('../seed/seedData');

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
  ['residenceProfiles'],
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
  'user-super-admin': 'superUser',
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
    ['enabledStructures', 'TEXT'],
    ['commercialSpaceType', 'TEXT'],
    ['enabledCommercialSpaceTypes', 'TEXT'],
    ['apartmentUnitCount', 'INTEGER'],
    ['bungalowUnitCount', 'INTEGER'],
    ['shedUnitCount', 'INTEGER'],
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
    ['proofImageDataUrl', 'TEXT'],
    ['reviewedByUserId', 'TEXT'],
    ['reviewedAt', 'TEXT'],
  ].filter(([columnName]) => !paymentColumns.has(columnName));

  for (const [columnName, definition] of missingPaymentColumns) {
    db.exec(`ALTER TABLE payments ADD COLUMN ${columnName} ${definition}`);
  }

  const maintenancePlanColumns = new Set(
    db.prepare("PRAGMA table_info('maintenancePlans')").all().map((column) => column.name),
  );
  const missingMaintenancePlanColumns = [
    ['upiId', 'TEXT'],
    ['upiMobileNumber', 'TEXT'],
    ['upiPayeeName', 'TEXT'],
    ['upiQrCodeDataUrl', 'TEXT'],
    ['upiQrPayload', 'TEXT'],
  ].filter(([columnName]) => !maintenancePlanColumns.has(columnName));

  for (const [columnName, definition] of missingMaintenancePlanColumns) {
    db.exec(`ALTER TABLE maintenancePlans ADD COLUMN ${columnName} ${definition}`);
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
      columnName === 'enabledStructures' ||
      columnName === 'enabledCommercialSpaceTypes' ||
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
    segments.push(
      `${structureSetup.apartmentUnitCount} apartment home${structureSetup.apartmentUnitCount === 1 ? '' : 's'}`,
    );
  }

  if (structureSetup.bungalowUnitCount) {
    segments.push(
      `${structureSetup.bungalowUnitCount} plot${structureSetup.bungalowUnitCount === 1 ? '' : 's'}`,
    );
  }

  if (structureSetup.shedUnitCount) {
    segments.push(
      `${structureSetup.shedUnitCount} shed${structureSetup.shedUnitCount === 1 ? '' : 's'}`,
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
      const configuredFloorCount = normalizeOfficeFloorPlan(structureSetup.officeFloorPlan).filter(
        (floor) => floor.officeCodes.length > 0,
      ).length;

      return `Commercial office workspace with ${configuredFloorCount || 1} configured floors and ${structureSetup.officeUnitCount} unique office spaces`;
    }

    return `Commercial shed workspace with ${structureSetup.shedUnitCount} shed${structureSetup.shedUnitCount === 1 ? '' : 's'}`;
  }

  if (structureSetup.enabledStructures[0] === 'bungalow') {
    return `Bungalow cluster workspace with ${structureSetup.bungalowUnitCount} plot${structureSetup.bungalowUnitCount === 1 ? '' : 's'}`;
  }

  return `Apartment community workspace with ${structureSetup.apartmentUnitCount} home${structureSetup.apartmentUnitCount === 1 ? '' : 's'}`;
}

function resolveStructureSetup(draft) {
  const enabledStructures = getEnabledStructuresFromDraft(draft);
  const enabledCommercialSpaceTypes = getEnabledCommercialSpaceTypesFromDraft(draft, enabledStructures);
  const apartmentUnitCount = enabledStructures.includes('apartment')
    ? getDraftUnitCount(draft.apartmentUnitCount, enabledStructures.length === 1 ? draft.totalUnits : null)
    : 0;
  const bungalowUnitCount = enabledStructures.includes('bungalow')
    ? getDraftUnitCount(draft.bungalowUnitCount, enabledStructures.length === 1 ? draft.totalUnits : null)
    : 0;
  const shedUnitCount =
    enabledStructures.includes('commercial') && enabledCommercialSpaceTypes.includes('shed')
      ? getDraftUnitCount(
        draft.shedUnitCount,
        enabledStructures.length === 1 && enabledCommercialSpaceTypes.length === 1 ? draft.totalUnits : null,
      )
      : 0;
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
      unitStructureOptions: {},
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
    apartmentUnitCount: apartmentUnitCount || null,
    bungalowUnitCount: bungalowUnitCount || null,
    shedUnitCount: shedUnitCount || null,
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
        structure: structureSetup.structure,
        enabledStructures: structureSetup.enabledStructures,
        commercialSpaceType: structureSetup.commercialSpaceType,
        enabledCommercialSpaceTypes: structureSetup.enabledCommercialSpaceTypes,
        apartmentUnitCount: structureSetup.apartmentUnitCount,
        bungalowUnitCount: structureSetup.bungalowUnitCount,
        shedUnitCount: structureSetup.shedUnitCount,
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
    ).run(userId, preferredRoleToPersist, now, now);
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
        upiId: null,
        upiPayeeName: draft.societyName.trim(),
        upiQrCodeDataUrl: null,
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
  ensureSuperUserAccount();
}

module.exports = {
  DEMO_USER_ID,
  createSocietyWorkspace,
  db,
  dbPath,
  deleteSocietyWorkspace,
  getSnapshot,
  initializeDatabase,
  resetDatabase,
};
