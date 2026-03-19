const { resetDatabase, dbPath } = require('../db/database');

resetDatabase();
console.log(`Database reset complete: ${dbPath}`);
