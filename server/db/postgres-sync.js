const fs = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');
const { Worker } = require('node:worker_threads');

const RESPONSE_BUFFER_SIZE = 16 * 1024 * 1024;
const decoder = new TextDecoder();
const supplementalColumnNames = [
  'requestedByUserId',
  'requestedAt',
  'reviewedByUserId',
  'reviewedAt',
  'secondaryEmergencyContactName',
  'secondaryEmergencyContactPhone',
  'photoDataUrl',
  'submittedByUserId',
  'referenceNote',
  'proofImageDataUrl',
  'upiId',
  'upiMobileNumber',
  'upiPayeeName',
  'upiQrCodeDataUrl',
  'upiQrPayload',
  'bankAccountName',
  'bankAccountNumber',
  'bankIfscCode',
  'bankName',
  'bankBranchName',
  'description',
  'reservationScope',
  'guestPhotoCapturedAt',
  'vehiclePhotoDataUrl',
  'vehiclePhotoCapturedAt',
];

function buildColumnNameMap() {
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const map = new Map();
  const columnPattern = /^\s*(?:"([^"]+)"|([A-Za-z][A-Za-z0-9_]*))\s+(?:TEXT|INTEGER|REAL|BLOB)\b/gm;

  for (const match of schemaSql.matchAll(columnPattern)) {
    const columnName = match[1] ?? match[2];
    map.set(String(columnName).toLowerCase(), columnName);
  }

  supplementalColumnNames.forEach((columnName) => {
    map.set(String(columnName).toLowerCase(), columnName);
  });

  return map;
}

const canonicalColumnNameByLowercase = buildColumnNameMap();

function normalizeResultRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return row;
  }

  const normalized = {};

  for (const [key, value] of Object.entries(row)) {
    const canonicalKey = canonicalColumnNameByLowercase.get(String(key).toLowerCase()) ?? key;
    normalized[canonicalKey] = value;
  }

  return normalized;
}

function stripSqliteOnlyFragments(sql) {
  return sql
    .replace(/\bPRAGMA\s+foreign_keys\s*=\s*(?:ON|OFF)\s*;?/gi, '')
    .replace(/\bdatetime\s*\(\s*([^)]+?)\s*\)/gi, '$1')
    .replace(/\s+COLLATE\s+NOCASE\b/gi, '');
}

function convertPlaceholders(sql) {
  let result = '';
  let placeholderIndex = 1;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const nextCharacter = sql[index + 1];

    if (character === "'" && !inDoubleQuote) {
      result += character;

      if (inSingleQuote && nextCharacter === "'") {
        result += nextCharacter;
        index += 1;
        continue;
      }

      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (character === '"' && !inSingleQuote) {
      result += character;

      if (inDoubleQuote && nextCharacter === '"') {
        result += nextCharacter;
        index += 1;
        continue;
      }

      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (character === '?' && !inSingleQuote && !inDoubleQuote) {
      result += `$${placeholderIndex}`;
      placeholderIndex += 1;
      continue;
    }

    result += character;
  }

  return result;
}

function translateSql(sql) {
  return convertPlaceholders(stripSqliteOnlyFragments(sql));
}

function reviveError(serialized) {
  const error = new Error(serialized?.message || 'PostgreSQL query failed.');
  error.name = serialized?.name || 'Error';

  if (serialized?.stack) {
    error.stack = serialized.stack;
  }

  if (serialized?.code) {
    error.code = serialized.code;
  }

  if (serialized?.detail) {
    error.detail = serialized.detail;
  }

  return error;
}

function executeSync(worker, payload) {
  const stateBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 3);
  const responseBuffer = new SharedArrayBuffer(RESPONSE_BUFFER_SIZE);
  const state = new Int32Array(stateBuffer);

  worker.postMessage({
    ...payload,
    responseBuffer,
    stateBuffer,
  });

  Atomics.wait(state, 0, 0);

  const status = Atomics.load(state, 0);
  const payloadLength = Atomics.load(state, 1);
  const payloadBytes = new Uint8Array(responseBuffer, 0, payloadLength);
  const message = payloadLength > 0 ? JSON.parse(decoder.decode(payloadBytes)) : null;

  if (status === 1) {
    return message?.result;
  }

  throw reviveError(message?.error);
}

function createPostgresDatabase(connectionString) {
  const worker = new Worker(path.join(__dirname, 'postgres-sync-worker.js'), {
    workerData: {
      connectionString,
      responseBufferSize: RESPONSE_BUFFER_SIZE,
    },
  });

  executeSync(worker, { type: 'init' });

  const database = {
    clientType: 'postgres',
    close() {
      try {
        executeSync(worker, { type: 'close' });
      } finally {
        worker.terminate();
      }
    },
    exec(sql) {
      return executeSync(worker, {
        type: 'exec',
        sql: stripSqliteOnlyFragments(sql),
      });
    },
    prepare(sql) {
      const translatedSql = translateSql(sql);

      return {
        all(...params) {
          const result = executeSync(worker, {
            type: 'query',
            mode: 'all',
            sql: translatedSql,
            params,
          });

          return result.rows.map(normalizeResultRow);
        },
        get(...params) {
          const result = executeSync(worker, {
            type: 'query',
            mode: 'get',
            sql: translatedSql,
            params,
          });

          return normalizeResultRow(result.rows[0]);
        },
        run(...params) {
          const result = executeSync(worker, {
            type: 'query',
            mode: 'run',
            sql: translatedSql,
            params,
          });

          return {
            changes: result.rowCount ?? 0,
            lastInsertRowid: 0,
          };
        },
      };
    },
  };

  process.once('exit', () => {
    worker.terminate();
  });

  return database;
}

module.exports = {
  createPostgresDatabase,
  translateSql,
};
