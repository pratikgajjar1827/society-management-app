require('./config/load-env');

const http = require('node:http');

const {
  createSocietyWorkspace,
  dbPath,
  dbDialect,
  deleteSocietyWorkspace,
  initializeDatabase,
  resetDatabase,
} = require('./db/database');
const {
  countApartmentUnits,
  countOfficeUnits,
  countShedUnits,
  findDuplicateOfficeCodes,
  normalizeApartmentBlockPlan,
  normalizeApartmentStartingFloorNumber,
  normalizeOfficeFloorPlan,
  normalizeShedBlockPlan,
} = require('./seed/factories');
const {
  assignChairmanResidence,
  buildAuthPayload,
  captureResidentUpiPayment,
  createAnnouncement,
  createAmenityBooking,
  createComplaintTicket,
  createSocietyDocument,
  requestSocietyDocumentDownload,
  createEntryLogRecord,
  createExpenseRecord,
  createSecurityGuard,
  createSecurityGuestRequest,
  createStaffVerification,
  createVisitorPass,
  getSynchronizedSnapshot,
  isOtpDeliveryConfigured,
  HttpError,
  getOnboardingState,
  hasAssignedChairman,
  markAnnouncementRead,
  requestOtp,
  recordManualPayment,
  requireSuperUserRole,
  requireSession,
  ringSecurityGuestRequest,
  reviewAmenityBooking,
  reviewSocietyDocumentDownloadRequest,
  reviewJoinRequest,
  reviewSecurityGuestRequest,
  reviewResidentPayment,
  reviewStaffVerification,
  sendDirectChatMessage,
  sendSocietyChatMessage,
  sendSecurityGuestMessage,
  updateSecurityGuestRequestStatus,
  updateVisitorPassStatus,
  sendMaintenanceReminder,
  selectSocietyForResident,
  setPreferredRole,
  submitResidentPayment,
  updateLeadershipRole,
  updateLeadershipProfile,
  updateMaintenancePlanSettings,
  updateMaintenanceBillingConfig,
  updateResidenceProfile,
  updateSocietyProfile,
  updateComplaintTicket,
  verifyOtp,
} = require('./auth/service');
const { detectVehicleNumberFromPhotoDataUrl } = require('./ocr/vehicleNumber');
const { amenityLibrary, defaultSetupDraft } = require('./seed/seedData');

const DEFAULT_PORT = Number(process.env.PORT || 4000);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
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
    data: getSynchronizedSnapshot(),
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

const structureOptions = ['apartment', 'bungalow', 'commercial'];
const commercialSpaceTypes = ['shed', 'office'];

function normalizeSelections(value, allowedValues) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((item) => allowedValues.includes(item)))];
}

function getEnabledStructures(draft) {
  const enabledStructures = normalizeSelections(draft.enabledStructures, structureOptions);

  if (enabledStructures.length > 0) {
    return enabledStructures;
  }

  return structureOptions.includes(draft.structure) ? [draft.structure] : [];
}

function getEnabledCommercialSpaceTypes(draft, enabledStructures = getEnabledStructures(draft)) {
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
  return parseWholeNumber(value) ?? parseWholeNumber(fallbackValue) ?? 0;
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

  const enabledStructures = getEnabledStructures(draft);

  if (enabledStructures.length === 0) {
    throw new HttpError(400, 'Choose at least one society structure before creating the workspace.');
  }

  const enabledCommercialSpaceTypes = getEnabledCommercialSpaceTypes(draft, enabledStructures);
  const apartmentBlockPlan = enabledStructures.includes('apartment')
    ? normalizeApartmentBlockPlan(Array.isArray(draft.apartmentBlockPlan) ? draft.apartmentBlockPlan : [])
    : [];
  const rawApartmentStartingFloorNumber = parseWholeNumber(draft.apartmentStartingFloorNumber);
  const apartmentStartingFloorNumber = enabledStructures.includes('apartment')
    ? normalizeApartmentStartingFloorNumber(draft.apartmentStartingFloorNumber)
    : null;
  const apartmentUnitCount = enabledStructures.includes('apartment')
    ? (apartmentBlockPlan.length > 0
      ? countApartmentUnits(apartmentBlockPlan)
      : getDraftUnitCount(draft.apartmentUnitCount, enabledStructures.length === 1 ? draft.totalUnits : null))
    : 0;
  const bungalowUnitCount = enabledStructures.includes('bungalow')
    ? getDraftUnitCount(draft.bungalowUnitCount, enabledStructures.length === 1 ? draft.totalUnits : null)
    : 0;
  const shedUnitCount =
    enabledStructures.includes('commercial') && enabledCommercialSpaceTypes.includes('shed')
      ? (
        Array.isArray(draft.shedBlockPlan) && draft.shedBlockPlan.length > 0
          ? countShedUnits(draft.shedBlockPlan)
          : getDraftUnitCount(
            draft.shedUnitCount,
            enabledStructures.length === 1 && enabledCommercialSpaceTypes.length === 1 ? draft.totalUnits : null,
          )
      )
      : 0;

  if (enabledStructures.includes('apartment') && apartmentUnitCount < 1) {
    throw new HttpError(400, 'Add at least one apartment or tower home before creating the society.');
  }

  if (enabledStructures.includes('apartment')) {
    if (apartmentBlockPlan.length === 0) {
      throw new HttpError(400, 'Add at least one apartment block before creating the society.');
    }

    const invalidApartmentBlocks = apartmentBlockPlan
      .filter((block) => block.towerCount < 1 || block.floorsPerTower < 1 || block.homesPerFloor < 1)
      .map((block) => block.blockName);

    if (invalidApartmentBlocks.length > 0) {
      throw new HttpError(
        400,
        `Enter valid tower count, floors per tower, and homes per floor for: ${invalidApartmentBlocks.join(', ')}.`,
      );
    }

    if (!Number.isFinite(rawApartmentStartingFloorNumber) || rawApartmentStartingFloorNumber < 1) {
      throw new HttpError(400, 'Enter a valid first apartment floor number greater than 0.');
    }
  }

  if (enabledStructures.includes('bungalow') && bungalowUnitCount < 1) {
    throw new HttpError(400, 'Add at least one bungalow or plot before creating the society.');
  }

  if (enabledStructures.includes('commercial')) {
    if (enabledCommercialSpaceTypes.length === 0) {
      throw new HttpError(400, 'Choose at least one commercial space type.');
    }

    if (enabledCommercialSpaceTypes.includes('shed') && shedUnitCount < 1) {
      throw new HttpError(400, 'Add at least one shed before creating the society.');
    }

    if (enabledCommercialSpaceTypes.includes('shed')) {
      const shedBlockPlan = Array.isArray(draft.shedBlockPlan) ? normalizeShedBlockPlan(draft.shedBlockPlan) : [];

      if (shedBlockPlan.length === 0) {
        throw new HttpError(400, 'Add at least one shed block before creating the society.');
      }

      const invalidShedBlocks = shedBlockPlan
        .filter((block) => block.shedCount < 1)
        .map((block) => block.blockName);

      if (invalidShedBlocks.length > 0) {
        throw new HttpError(
          400,
          `Enter at least one shed for: ${invalidShedBlocks.join(', ')}.`,
        );
      }
    }

    if (enabledCommercialSpaceTypes.includes('office')) {
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
          'Each configured commercial floor must include at least one office number, code, or numeric range.',
        );
      }

      if (duplicateOfficeCodes.length > 0) {
        throw new HttpError(
          400,
          `Duplicate office numbers found: ${duplicateOfficeCodes.join(', ')}. Repeated office numbers are only allowed across different commercial towers or blocks.`,
        );
      }

      if (countOfficeUnits(officeFloorPlan) < 1) {
        throw new HttpError(400, 'Add at least one office number before creating the society.');
      }

      return;
    }
  }

  const officeUnitCount = enabledCommercialSpaceTypes.includes('office')
    ? countOfficeUnits(Array.isArray(draft.officeFloorPlan) ? draft.officeFloorPlan : [])
    : 0;
  const totalUnits = apartmentUnitCount + bungalowUnitCount + shedUnitCount + officeUnitCount;

  if (totalUnits < 1) {
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

    if (request.method === 'GET' && url.pathname === '/api/session/snapshot') {
      const sessionToken = getBearerToken(request);
      const userId = requireSession(sessionToken);
      const payload = buildAuthPayload(userId, sessionToken);
      sendJson(response, 200, {
        ...payload,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/security/vehicle-number/detect') {
      requireSession(getBearerToken(request));
      const body = await parseBody(request);

      if (!body.photoDataUrl) {
        throw new HttpError(400, 'Capture a vehicle photo before starting OCR.');
      }

      const result = await detectVehicleNumberFromPhotoDataUrl(body.photoDataUrl);
      sendJson(response, 200, result);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/request-otp') {
      const body = await parseBody(request);
      const challenge = await requestOtp(body.intent, body.channel, body.destination, Boolean(body.forceDevelopment));
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

      if (!body.societyId || !Array.isArray(body.unitIds) || !body.residentType || !body.residenceProfile) {
        sendJson(response, 400, { error: 'Missing societyId, unitIds, residentType, or residenceProfile.' });
        return;
      }

      const result = selectSocietyForResident(
        userId,
        body.societyId,
        body.unitIds,
        body.residentType,
        body.residenceProfile,
      );
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

    const leadershipRoleRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/leadership-role$/)
      : null;

    if (leadershipRoleRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = updateLeadershipRole(
        userId,
        decodeURIComponent(leadershipRoleRouteMatch[1]),
        body.targetUserId,
        body.role,
        body.enabled,
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

    const societyProfileRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/profile$/)
      : null;

    const residenceProfileRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/residence-profile$/)
      : null;

    const leadershipProfileRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/leadership-profile$/)
      : null;

    if (societyProfileRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = updateSocietyProfile(userId, decodeURIComponent(societyProfileRouteMatch[1]), body);
      sendJson(response, 200, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    if (residenceProfileRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = updateResidenceProfile(
        userId,
        decodeURIComponent(residenceProfileRouteMatch[1]),
        body,
      );
      sendJson(response, 200, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    if (leadershipProfileRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = updateLeadershipProfile(
        userId,
        decodeURIComponent(leadershipProfileRouteMatch[1]),
        body,
      );
      sendJson(response, 200, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

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

    const billingPaymentCaptureRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/billing\/payments\/capture$/)
      : null;

    if (billingPaymentCaptureRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = captureResidentUpiPayment(userId, decodeURIComponent(billingPaymentCaptureRouteMatch[1]), body);
      sendJson(response, 201, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const billingManualPaymentRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/billing\/payments\/manual$/)
      : null;

    if (billingManualPaymentRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = recordManualPayment(userId, decodeURIComponent(billingManualPaymentRouteMatch[1]), body);
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

    const announcementCreateRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/announcements$/)
      : null;

    const societyDocumentCreateRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/documents$/)
      : null;
    const societyDocumentDownloadRequestRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/documents\/([^/]+)\/download-requests$/)
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

    if (announcementCreateRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = createAnnouncement(
        userId,
        decodeURIComponent(announcementCreateRouteMatch[1]),
        body,
      );
      sendJson(response, 201, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    if (societyDocumentCreateRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = createSocietyDocument(
        userId,
        decodeURIComponent(societyDocumentCreateRouteMatch[1]),
        body,
      );
      sendJson(response, 201, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    if (societyDocumentDownloadRequestRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = requestSocietyDocumentDownload(
        userId,
        decodeURIComponent(societyDocumentDownloadRequestRouteMatch[1]),
        decodeURIComponent(societyDocumentDownloadRequestRouteMatch[2]),
        body,
      );
      sendJson(response, 201, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const announcementReadRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/announcements\/([^/]+)\/read$/)
      : null;

    if (announcementReadRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const result = markAnnouncementRead(userId, decodeURIComponent(announcementReadRouteMatch[1]));
      sendJson(response, 200, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const maintenanceBillingConfigRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/maintenance-plans\/([^/]+)\/billing-config$/)
      : null;
    const documentDownloadReviewRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/document-download-requests\/([^/]+)\/review$/)
      : null;

    const maintenancePlanSettingsRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/maintenance-plans\/([^/]+)\/settings$/)
      : null;

    if (maintenancePlanSettingsRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = updateMaintenancePlanSettings(
        userId,
        decodeURIComponent(maintenancePlanSettingsRouteMatch[1]),
        body,
      );
      sendJson(response, 200, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    if (maintenanceBillingConfigRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = updateMaintenanceBillingConfig(userId, decodeURIComponent(maintenanceBillingConfigRouteMatch[1]), body);
      sendJson(response, 200, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    if (documentDownloadReviewRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = reviewSocietyDocumentDownloadRequest(
        userId,
        decodeURIComponent(documentDownloadReviewRouteMatch[1]),
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

    const securityGuestRequestRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/security\/guest-requests$/)
      : null;

    if (securityGuestRequestRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = createSecurityGuestRequest(
        userId,
        decodeURIComponent(securityGuestRequestRouteMatch[1]),
        body,
      );
      sendJson(response, 201, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const societyChatRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/chat\/group\/messages$/)
      : null;

    if (societyChatRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = sendSocietyChatMessage(
        userId,
        decodeURIComponent(societyChatRouteMatch[1]),
        body.message,
      );
      sendJson(response, 201, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const directChatRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/chat\/direct\/([^/]+)\/messages$/)
      : null;

    if (directChatRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = sendDirectChatMessage(
        userId,
        decodeURIComponent(directChatRouteMatch[1]),
        decodeURIComponent(directChatRouteMatch[2]),
        body.message,
      );
      sendJson(response, 201, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const securityGuestDecisionRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/security\/guest-requests\/([^/]+)\/decision$/)
      : null;

    if (securityGuestDecisionRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = reviewSecurityGuestRequest(
        userId,
        decodeURIComponent(securityGuestDecisionRouteMatch[1]),
        body.decision,
        body.note,
      );
      sendJson(response, 200, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const securityGuestStatusRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/security\/guest-requests\/([^/]+)\/status$/)
      : null;

    if (securityGuestStatusRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = updateSecurityGuestRequestStatus(
        userId,
        decodeURIComponent(securityGuestStatusRouteMatch[1]),
        body.status,
        body.note,
      );
      sendJson(response, 200, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const securityGuestMessageRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/security\/guest-requests\/([^/]+)\/messages$/)
      : null;

    if (securityGuestMessageRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = sendSecurityGuestMessage(
        userId,
        decodeURIComponent(securityGuestMessageRouteMatch[1]),
        body.message,
      );
      sendJson(response, 200, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const securityGuestRingRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/security\/guest-requests\/([^/]+)\/ring$/)
      : null;

    if (securityGuestRingRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = ringSecurityGuestRequest(
        userId,
        decodeURIComponent(securityGuestRingRouteMatch[1]),
        body.note,
      );
      sendJson(response, 200, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const visitorPassRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)\/visitors$/)
      : null;

    if (visitorPassRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = createVisitorPass(userId, decodeURIComponent(visitorPassRouteMatch[1]), body);
      sendJson(response, 201, {
        ...result,
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const visitorPassStatusRouteMatch = request.method === 'POST'
      ? url.pathname.match(/^\/api\/visitor-passes\/([^/]+)\/status$/)
      : null;

    if (visitorPassStatusRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      const body = await parseBody(request);
      const result = updateVisitorPassStatus(
        userId,
        decodeURIComponent(visitorPassStatusRouteMatch[1]),
        body.status,
      );
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
      requireSuperUserRole(userId);
      validateSocietyDraft(body.draft);

      const result = createSocietyWorkspace(userId, body.draft);
      sendJson(response, 201, {
        ...result,
        data: getSynchronizedSnapshot(),
        chairmanAssigned: hasAssignedChairman(),
        onboarding: getOnboardingState(userId),
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    const societyDeleteRouteMatch = request.method === 'DELETE'
      ? url.pathname.match(/^\/api\/societies\/([^/]+)$/)
      : null;

    if (societyDeleteRouteMatch) {
      const userId = requireSession(getBearerToken(request));
      requireSuperUserRole(userId);
      const societyId = decodeURIComponent(societyDeleteRouteMatch[1]);
      const deleted = deleteSocietyWorkspace(societyId);

      if (!deleted) {
        throw new HttpError(404, 'Selected society was not found.');
      }

      sendJson(response, 200, {
        currentUserId: userId,
        societyId,
        data: getSynchronizedSnapshot(),
        chairmanAssigned: hasAssignedChairman(),
        onboarding: getOnboardingState(userId),
        amenityLibrary,
        defaultSetupDraft,
      });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/dev/reset') {
      resetDatabase();
      sendJson(response, 200, {
        ...buildBootstrapPayload(),
        data: getSynchronizedSnapshot(),
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
    console.log(
      dbDialect === 'postgres'
        ? `Database backend: PostgreSQL (${String(process.env.DATABASE_URL ?? '').trim() ? 'DATABASE_URL configured' : 'DATABASE_URL missing'})`
        : `Database backend: SQLite (${dbPath})`,
    );
    console.log(
      isOtpDeliveryConfigured()
        ? 'OTP delivery mode: Twilio Verify is configured. SMS OTP requests will be sent through Twilio.'
        : 'OTP delivery mode: local development fallback. No SMS will be sent until Twilio Verify environment variables are configured.',
    );
  });
}

module.exports = {
  startServer,
};
