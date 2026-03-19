const http = require('node:http');

const {
  createSocietyWorkspace,
  dbPath,
  getSnapshot,
  initializeDatabase,
  resetDatabase,
} = require('./db/database');
const {
  HttpError,
  getOnboardingState,
  requestOtp,
  requireChairmanRole,
  requireSession,
  selectSocietyForResident,
  setPreferredRole,
  verifyOtp,
} = require('./auth/service');
const { amenityLibrary, defaultSetupDraft } = require('./seed/seedData');

const DEFAULT_PORT = Number(process.env.PORT || 4000);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

function buildBootstrapPayload(currentUserId = null) {
  return {
    currentUserId,
    amenityLibrary,
    defaultSetupDraft,
    data: getSnapshot(),
  };
}

function getBearerToken(request) {
  const header = request.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return '';
  }

  return header.slice('Bearer '.length).trim();
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
      sendJson(response, 200, buildBootstrapPayload());
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/request-otp') {
      const body = await parseBody(request);
      const challenge = await requestOtp(body.channel, body.destination);
      sendJson(response, 200, challenge);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/verify-otp') {
      const body = await parseBody(request);

      if (!body.challengeId || !body.code) {
        sendJson(response, 400, { error: 'Missing challengeId or code.' });
        return;
      }

      const result = await verifyOtp(body.challengeId, body.code);
      sendJson(response, 200, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/role') {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = setPreferredRole(userId, body.role);
      sendJson(response, 200, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/select-society') {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);

      if (!body.societyId) {
        sendJson(response, 400, { error: 'Missing societyId.' });
        return;
      }

      const result = selectSocietyForResident(userId, body.societyId);
      sendJson(response, 200, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/societies') {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      requireChairmanRole(userId);

      if (!body.draft?.societyName || !body.draft?.address) {
        sendJson(response, 400, {
          error: 'Missing required fields. Provide societyName and address.',
        });
        return;
      }

      const result = createSocietyWorkspace(userId, body.draft);
      sendJson(response, 201, {
        ...result,
        onboarding: getOnboardingState(userId),
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/dev/reset') {
      sendJson(response, 200, {
        ...buildBootstrapPayload(),
        data: resetDatabase(),
      });
      return;
    }

    sendJson(response, 404, { error: 'Route not found.' });
  } catch (error) {
    sendJson(response, error instanceof HttpError ? error.statusCode : 500, {
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
