const http = require('node:http');

const {
  createSocietyWorkspace,
  dbPath,
  getSnapshot,
  initializeDatabase,
  resetDatabase,
} = require('./db/database');
const { countOfficeUnits, findDuplicateOfficeCodes, normalizeOfficeFloorPlan } = require('./seed/factories');
const {
  assignChairmanResidence,
  createAmenityBooking,
  createComplaintTicket,
  createEntryLogRecord,
  createExpenseRecord,
  createSecurityGuard,
  createStaffVerification,
  HttpError,
  getOnboardingState,
  hasAssignedChairman,
  requestOtp,
  requireChairmanRole,
  requireSession,
  reviewAmenityBooking,
  reviewJoinRequest,
  reviewResidentPayment,
  reviewStaffVerification,
  sendMaintenanceReminder,
  selectSocietyForResident,
  setPreferredRole,
  submitResidentPayment,
  updateComplaintTicket,
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
    chairmanAssigned: hasAssignedChairman(),
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

function parseWholeNumber(value) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateSocietyDraft(draft) {
  if (
    !draft?.societyName ||
    !draft?.country ||
    !draft?.state ||
    !draft?.city ||
    !draft?.area ||
    !draft?.address
  ) {
    throw new HttpError(
      400,
      'Missing required fields. Provide societyName, country, state, city, area, and address.',
    );
  }

  if (!['apartment', 'bungalow', 'commercial'].includes(draft.structure)) {
    throw new HttpError(400, 'Choose apartment, bungalow, or commercial as the society structure.');
  }

  if (draft.structure === 'commercial') {
    if (!['shed', 'office'].includes(draft.commercialSpaceType)) {
      throw new HttpError(400, 'Choose shed or office space for the commercial structure.');
    }

    if (draft.commercialSpaceType === 'office') {
      const officeFloorPlan = Array.isArray(draft.officeFloorPlan) ? draft.officeFloorPlan : [];
      const configuredFloors = normalizeOfficeFloorPlan(officeFloorPlan);
      const duplicateOfficeCodes = findDuplicateOfficeCodes(officeFloorPlan);

      if (configuredFloors.length === 0) {
        throw new HttpError(
          400,
          'Add at least one floor and enter the office numbers for it.',
        );
      }

      if (configuredFloors.some((floor) => floor.officeCodes.length === 0)) {
        throw new HttpError(
          400,
          'Each configured floor must include at least one office number, code, or numeric range.',
        );
      }

      if (duplicateOfficeCodes.length > 0) {
        throw new HttpError(
          400,
          `Duplicate office numbers found: ${duplicateOfficeCodes.join(', ')}. Each office code must be unique in the society.`,
        );
      }

      if (countOfficeUnits(officeFloorPlan) < 1) {
        throw new HttpError(400, 'Add at least one office number before creating the society.');
      }

      return;
    }
  }

  const totalUnits = parseWholeNumber(draft.totalUnits);

  if (totalUnits === null || totalUnits < 1) {
    throw new HttpError(400, 'Enter at least 1 unit for this society.');
  }
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
      const challenge = await requestOtp(body.intent, body.channel, body.destination);
      sendJson(response, 200, challenge);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/verify-otp') {
      const body = await parseBody(request);

      if (!body.challengeId || !body.code) {
        sendJson(response, 400, { error: 'Missing challengeId or code.' });
        return;
      }

      const result = await verifyOtp(body.intent, body.challengeId, body.code);
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

      if (!body.societyId || !Array.isArray(body.unitIds) || !body.residentType) {
        sendJson(response, 400, { error: 'Missing societyId, unitIds, or residentType.' });
        return;
      }

      const result = selectSocietyForResident(userId, body.societyId, body.unitIds, body.residentType);
      sendJson(response, 200, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const chairmanResidenceRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/chairman-residence$/)
      : null;

    if (chairmanResidenceRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = assignChairmanResidence(
        userId,
        decodeURIComponent(chairmanResidenceRouteMatch[1]),
        body.unitIds,
        body.residentType,
      );
      sendJson(response, 200, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const joinRequestDecisionMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/join-requests\/([^/]+)\/decision$/)
      : null;

    if (joinRequestDecisionMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = reviewJoinRequest(
        userId,
        decodeURIComponent(joinRequestDecisionMatch[1]),
        body.decision,
        body.reviewNote,
      );
      sendJson(response, 200, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const expenseRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/expenses$/)
      : null;

    if (expenseRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = createExpenseRecord(userId, decodeURIComponent(expenseRouteMatch[1]), body);
      sendJson(response, 201, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const bookingCreateRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/bookings$/)
      : null;

    if (bookingCreateRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = createAmenityBooking(userId, decodeURIComponent(bookingCreateRouteMatch[1]), body);
      sendJson(response, 201, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const bookingReviewRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/bookings\/([^/]+)\/status$/)
      : null;

    if (bookingReviewRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = reviewAmenityBooking(userId, decodeURIComponent(bookingReviewRouteMatch[1]), body.status);
      sendJson(response, 200, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const complaintCreateRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/complaints$/)
      : null;

    if (complaintCreateRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = createComplaintTicket(userId, decodeURIComponent(complaintCreateRouteMatch[1]), body);
      sendJson(response, 201, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const complaintUpdateRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/complaints\/([^/]+)\/status$/)
      : null;

    if (complaintUpdateRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = updateComplaintTicket(userId, decodeURIComponent(complaintUpdateRouteMatch[1]), body);
      sendJson(response, 200, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const billingPaymentRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/billing\/payments$/)
      : null;

    if (billingPaymentRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = submitResidentPayment(userId, decodeURIComponent(billingPaymentRouteMatch[1]), body);
      sendJson(response, 201, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const paymentReviewRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/payments\/([^/]+)\/review$/)
      : null;

    if (paymentReviewRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = reviewResidentPayment(userId, decodeURIComponent(paymentReviewRouteMatch[1]), body.decision);
      sendJson(response, 200, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const billingReminderRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/billing\/reminders$/)
      : null;

    if (billingReminderRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = sendMaintenanceReminder(userId, decodeURIComponent(billingReminderRouteMatch[1]), body);
      sendJson(response, 201, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const guardRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/security\/guards$/)
      : null;

    if (guardRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = createSecurityGuard(userId, decodeURIComponent(guardRouteMatch[1]), body);
      sendJson(response, 201, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const staffRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/security\/staff$/)
      : null;

    if (staffRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = createStaffVerification(userId, decodeURIComponent(staffRouteMatch[1]), body);
      sendJson(response, 201, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const staffReviewRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/staff\/([^/]+)\/verification$/)
      : null;

    if (staffReviewRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = reviewStaffVerification(
        userId,
        decodeURIComponent(staffReviewRouteMatch[1]),
        body.verificationState,
      );
      sendJson(response, 200, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const entryLogRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/security\/entry-logs$/)
      : null;

    if (entryLogRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = createEntryLogRecord(userId, decodeURIComponent(entryLogRouteMatch[1]), body);
      sendJson(response, 201, {
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
      validateSocietyDraft(body.draft);

      const result = createSocietyWorkspace(userId, body.draft);
      sendJson(response, 201, {
        ...result,
        chairmanAssigned: hasAssignedChairman(),
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
