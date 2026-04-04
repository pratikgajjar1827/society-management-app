const { TextEncoder } = require('node:util');
const { parentPort, workerData } = require('node:worker_threads');
const { Client } = require('pg');

const encoder = new TextEncoder();

let clientPromise = null;

function buildPgConfig() {
  const config = {
    connectionString: workerData.connectionString,
  };

  const sslMode = String(process.env.PGSSLMODE ?? '').trim().toLowerCase();
  const forceSsl = /^(1|true|yes|required|require)$/i.test(String(process.env.DATABASE_SSL ?? '').trim())
    || sslMode === 'require';

  if (forceSsl) {
    const rejectUnauthorized = !/^(0|false|no)$/i.test(
      String(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED ?? '').trim(),
    );

    config.ssl = {
      rejectUnauthorized,
    };
  }

  return config;
}

async function getClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const client = new Client(buildPgConfig());
      await client.connect();
      return client;
    })();
  }

  return clientPromise;
}

function serializeError(error) {
  return {
    code: error?.code ?? null,
    detail: error?.detail ?? null,
    message: error instanceof Error ? error.message : 'PostgreSQL query failed.',
    name: error instanceof Error ? error.name : 'Error',
    stack: error instanceof Error ? error.stack : null,
  };
}

function writeResponse(stateBuffer, responseBuffer, payload, ok) {
  const state = new Int32Array(stateBuffer);
  const responseBytes = new Uint8Array(responseBuffer);
  const encoded = encoder.encode(JSON.stringify(payload));

  if (encoded.length > responseBytes.byteLength) {
    const overflowPayload = {
      error: {
        message: `PostgreSQL response exceeded ${responseBytes.byteLength} bytes.`,
        name: 'RangeError',
      },
    };
    const overflowEncoded = encoder.encode(JSON.stringify(overflowPayload));
    responseBytes.set(overflowEncoded);
    Atomics.store(state, 1, overflowEncoded.length);
    Atomics.store(state, 0, -1);
    Atomics.notify(state, 0, 1);
    return;
  }

  responseBytes.fill(0);
  responseBytes.set(encoded);
  Atomics.store(state, 1, encoded.length);
  Atomics.store(state, 0, ok ? 1 : -1);
  Atomics.notify(state, 0, 1);
}

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const nextCharacter = sql[index + 1];

    if (character === "'" && !inDoubleQuote) {
      current += character;

      if (inSingleQuote && nextCharacter === "'") {
        current += nextCharacter;
        index += 1;
        continue;
      }

      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (character === '"' && !inSingleQuote) {
      current += character;

      if (inDoubleQuote && nextCharacter === '"') {
        current += nextCharacter;
        index += 1;
        continue;
      }

      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (character === ';' && !inSingleQuote && !inDoubleQuote) {
      const trimmed = current.trim();

      if (trimmed) {
        statements.push(trimmed);
      }

      current = '';
      continue;
    }

    current += character;
  }

  const trimmed = current.trim();

  if (trimmed) {
    statements.push(trimmed);
  }

  return statements;
}

async function handleMessage(message) {
  if (message.type === 'close') {
    if (clientPromise) {
      const client = await clientPromise;
      await client.end();
      clientPromise = null;
    }

    return { result: null };
  }

  const client = await getClient();

  if (message.type === 'init') {
    return { result: { ok: true } };
  }

  if (message.type === 'exec') {
    const statements = splitSqlStatements(message.sql ?? '');

    for (const statement of statements) {
      await client.query(statement);
    }

    return { result: null };
  }

  if (message.type === 'query') {
    const queryResult = await client.query(message.sql, message.params ?? []);

    return {
      result: {
        rowCount: queryResult.rowCount ?? 0,
        rows: queryResult.rows ?? [],
      },
    };
  }

  throw new Error(`Unsupported PostgreSQL worker message type: ${message.type}`);
}

parentPort.on('message', async (message) => {
  try {
    const response = await handleMessage(message);
    writeResponse(message.stateBuffer, message.responseBuffer, response, true);
  } catch (error) {
    writeResponse(
      message.stateBuffer,
      message.responseBuffer,
      { error: serializeError(error) },
      false,
    );
  }
});
