require('../config/load-env');

const { dbDialect, dbPath, resetDatabase } = require('../db/database');

resetDatabase();
console.log(
  dbDialect === 'postgres'
    ? 'Database reset complete: PostgreSQL'
    : `Database reset complete: ${dbPath}`,
);
