const http = require('node:http');

const {
  DEMO_USER_ID,
  createSocietyWorkspace,
  dbPath,
  getSnapshot,
  initializeDatabase,
  resetDatabase,
} = require('./db/database');
const { amenityLibrary, defaultSetupDraft } = require('./seed/seedData');

const DEFAULT_PORT = Number(process.env.PORT || 4000);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
}

function parseBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
    });

    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON body.'));
      }
    });

    request.on('error', reject);
  });
}

async function requestHandler(request, response) {
  if (!request.url) {
    sendJson(response, 400, { error: 'Missing URL.' });
    return;
  }

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  const url = new URL(request.url, 'http://localhost');

  try {
    if (request.method === 'GET' && url.pathname === '/health') {
      sendJson(response, 200, {
        status: 'ok',
        database: dbPath,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/bootstrap') {
      sendJson(response, 200, {
        currentUserId: DEMO_USER_ID,
        amenityLibrary,
        defaultSetupDraft,
        data: getSnapshot(),
      });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/societies') {
      const body = await parseBody(request);

      if (!body.userId || !body.draft?.societyName || !body.draft?.address) {
        sendJson(response, 400, {
          error: 'Missing required fields. Provide userId, societyName, and address.',
        });
        return;
      }

      const result = createSocietyWorkspace(body.userId, body.draft);
      sendJson(response, 201, result);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/dev/reset') {
      sendJson(response, 200, {
        currentUserId: DEMO_USER_ID,
        amenityLibrary,
        defaultSetupDraft,
        data: resetDatabase(),
      });
      return;
    }

    sendJson(response, 404, { error: 'Route not found.' });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : 'Unknown server error.',
    });
  }
}

function startServer(port = DEFAULT_PORT) {
  initializeDatabase();
  const server = http.createServer(requestHandler);
  server.listen(port, '0.0.0.0');
  return server;
}

if (require.main === module) {
  const server = startServer(DEFAULT_PORT);
  server.on('listening', () => {
    console.log(`SocietyOS backend running on http://0.0.0.0:${DEFAULT_PORT}`);
    console.log(`SQLite database: ${dbPath}`);
  });
}

module.exports = {
  startServer,
};
