import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { amenityLibrary, defaultSetupDraft, seedData } from '../data/seed';
import {
  AccountRole,
  AnnouncementAudience,
  AnnouncementPriority,
  AuthChallenge,
  AuthChannel,
  AuthIntent,
  EntryStatus,
  EntrySubjectType,
  ExpenseType,
  JoinRequestRole,
  JoinRequestStatus,
  MaintenanceFrequency,
  OnboardingState,
  PaymentMethod,
  ComplaintCategory,
  SeedData,
  SecurityGuestRequestStatus,
  SocietySetupDraft,
  StaffCategory,
  UserProfile,
  VehicleType,
  VerificationState,
  VisitorCategory,
  VisitorPassStatus,
} from '../types/domain';

type BootstrapResponse = {
  currentUserId: string | null;
  chairmanAssigned: boolean;
  amenityLibrary: string[];
  defaultSetupDraft: SocietySetupDraft;
  data: SeedData;
};

type AuthenticatedResponse = BootstrapResponse & {
  currentUserId: string;
  onboarding: OnboardingState;
};

type SessionSnapshotResponse = AuthenticatedResponse & {
  sessionToken: string;
  user: UserProfile;
};

type VerifyOtpResponse = AuthenticatedResponse & {
  sessionToken: string;
  user: UserProfile;
  verifiedChannel: AuthChannel;
  verifiedDestination: string;
};

type SaveRoleResponse = AuthenticatedResponse & {
  preferredRole: AccountRole;
};

type SelectSocietyResponse = AuthenticatedResponse & {
  preferredRole: AccountRole;
  societyId: string;
  joinRequestId: string | null;
  joinRequestStatus: JoinRequestStatus;
};

type CreateSocietyResponse = AuthenticatedResponse & {
  societyId: string;
};

type ReviewJoinRequestResponse = AuthenticatedResponse & {
  societyId: string;
  joinRequestId: string;
  joinRequestStatus: JoinRequestStatus;
};

type SocietyAdminMutationResponse = AuthenticatedResponse & {
  societyId: string;
};

type VehicleNumberDetectionResponse = {
  vehicleNumber: string | null;
  rawText: string;
  message: string;
  source: 'backend-ocr';
};

export interface ResidenceVehicleInput {
  unitId: string;
  registrationNumber: string;
  vehicleType: VehicleType;
  color?: string;
  parkingSlot?: string;
  photoDataUrl?: string;
}

export interface ResidenceProfileInput {
  residentType: JoinRequestRole;
  fullName: string;
  email?: string;
  alternatePhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  secondaryEmergencyContactName?: string;
  secondaryEmergencyContactPhone?: string;
  vehicles?: ResidenceVehicleInput[];
  moveInDate: string;
  dataProtectionConsent: boolean;
  rentAgreementFileName?: string;
  rentAgreementDataUrl?: string;
}

export interface AnnouncementCreateInput {
  title: string;
  body: string;
  photoDataUrl?: string;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
}

export interface VisitorPassCreateInput {
  unitId: string;
  visitorName: string;
  phone?: string;
  category: VisitorCategory;
  purpose: string;
  guestCount: string;
  expectedAt: string;
  validUntil: string;
  vehicleNumber?: string;
  notes?: string;
}

export interface SecurityGuestRequestCreateInput {
  unitId: string;
  residentUserId: string;
  guestName: string;
  phone?: string;
  category: VisitorCategory;
  purpose: string;
  guestCount: string;
  vehicleNumber?: string;
  guestPhotoDataUrl?: string;
  guestPhotoCapturedAt?: string;
  vehiclePhotoDataUrl?: string;
  vehiclePhotoCapturedAt?: string;
  gateNotes?: string;
}

export interface SecurityGuestMessageInput {
  message: string;
}

export interface SecurityGuestRingInput {
  note?: string;
}

export interface SocietyChatMessageInput {
  message: string;
}

const DEFAULT_API_PORT = 4000;
const API_BASE_URL_STORAGE_KEY = 'societyos.apiBaseUrl';

let runtimeApiBaseUrlOverride: string | undefined;

function normalizeSeedDataSnapshot(data: unknown) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const snapshot = data as SeedData & {
    residenceProfiles?: unknown;
    vehicleRegistrations?: unknown;
    importantContacts?: unknown;
    complaintUpdates?: unknown;
    visitorPasses?: unknown;
    securityGuestRequests?: unknown;
    securityGuestLogs?: unknown;
    chatThreads?: unknown;
    chatMessages?: unknown;
  };

  return {
    ...snapshot,
    residenceProfiles: Array.isArray(snapshot.residenceProfiles) ? snapshot.residenceProfiles : [],
    vehicleRegistrations: Array.isArray(snapshot.vehicleRegistrations) ? snapshot.vehicleRegistrations : [],
    importantContacts: Array.isArray(snapshot.importantContacts) ? snapshot.importantContacts : [],
    complaintUpdates: Array.isArray(snapshot.complaintUpdates) ? snapshot.complaintUpdates : [],
    visitorPasses: Array.isArray(snapshot.visitorPasses) ? snapshot.visitorPasses : [],
    securityGuestRequests: Array.isArray(snapshot.securityGuestRequests) ? snapshot.securityGuestRequests : [],
    securityGuestLogs: Array.isArray(snapshot.securityGuestLogs) ? snapshot.securityGuestLogs : [],
    chatThreads: Array.isArray(snapshot.chatThreads) ? snapshot.chatThreads : [],
    chatMessages: Array.isArray(snapshot.chatMessages) ? snapshot.chatMessages : [],
  };
}

function normalizeApiPayload<T>(payload: T): T {
  if (!payload || typeof payload !== 'object' || !('data' in (payload as object))) {
    return payload;
  }

  const responseWithData = payload as T & { data?: unknown };

  return {
    ...responseWithData,
    data: normalizeSeedDataSnapshot(responseWithData.data),
  };
}

export function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

export function getDefaultApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (configured) {
    return normalizeBaseUrl(configured);
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const protocol = window.location.protocol || 'http:';
    const hostname = window.location.hostname || 'localhost';
    return `${protocol}//${hostname}:${DEFAULT_API_PORT}`;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEFAULT_API_PORT}`;
  }

  return `http://localhost:${DEFAULT_API_PORT}`;
}

export function getApiBaseUrl() {
  return runtimeApiBaseUrlOverride ?? getDefaultApiBaseUrl();
}

export async function loadPersistedApiBaseUrl() {
  const storedValue = await AsyncStorage.getItem(API_BASE_URL_STORAGE_KEY);
  const normalizedValue = storedValue ? normalizeBaseUrl(storedValue) : '';

  runtimeApiBaseUrlOverride = normalizedValue || undefined;
  return runtimeApiBaseUrlOverride ?? null;
}

export async function persistApiBaseUrl(value: string) {
  const normalizedValue = normalizeBaseUrl(value);

  await AsyncStorage.setItem(API_BASE_URL_STORAGE_KEY, normalizedValue);
  runtimeApiBaseUrlOverride = normalizedValue;
  return normalizedValue;
}

export async function clearPersistedApiBaseUrl() {
  await AsyncStorage.removeItem(API_BASE_URL_STORAGE_KEY);
  runtimeApiBaseUrlOverride = undefined;
  return getDefaultApiBaseUrl();
}

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const rawText = await response.text();
  let payload: unknown = null;

  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch (error) {
      payload = rawText;
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error)
        : rawText || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return normalizeApiPayload(payload as T);
}

function createAuthHeaders(sessionToken: string) {
  return {
    Authorization: `Bearer ${sessionToken}`,
  };
}

export async function fetchBootstrapData() {
  return requestJson<BootstrapResponse>('/api/bootstrap');
}

export async function fetchSessionSnapshot(sessionToken: string) {
  return requestJson<SessionSnapshotResponse>('/api/session/snapshot', {
    method: 'GET',
    headers: createAuthHeaders(sessionToken),
  });
}

export async function requestOtp(intent: AuthIntent, channel: AuthChannel, destination: string, forceDevelopment?: boolean) {
  return requestJson<AuthChallenge>('/api/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ intent, channel, destination, forceDevelopment }),
  });
}

export async function verifyOtp(intent: AuthIntent, challengeId: string, code: string) {
  return requestJson<VerifyOtpResponse>('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ intent, challengeId, code }),
  });
}

export async function saveAccountRole(sessionToken: string, role: AccountRole) {
  return requestJson<SaveRoleResponse>('/api/auth/role', {
    method: 'POST',
    headers: createAuthHeaders(sessionToken),
    body: JSON.stringify({ role }),
  });
}

export async function enrollIntoSociety(
  sessionToken: string,
  societyId: string,
  unitIds: string[],
  residentType?: JoinRequestRole,
  residenceProfile?: ResidenceProfileInput,
) {
  return requestJson<SelectSocietyResponse>('/api/auth/select-society', {
    method: 'POST',
    headers: createAuthHeaders(sessionToken),
    body: JSON.stringify({ societyId, unitIds, residentType, residenceProfile }),
  });
}

export async function updateResidenceProfile(
  sessionToken: string,
  societyId: string,
  profile: ResidenceProfileInput,
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/societies/${encodeURIComponent(societyId)}/residence-profile`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(profile),
    },
  );
}

export async function reviewJoinRequest(
  sessionToken: string,
  joinRequestId: string,
  decision: 'approve' | 'reject',
  reviewNote?: string,
) {
  return requestJson<ReviewJoinRequestResponse>(`/api/join-requests/${encodeURIComponent(joinRequestId)}/decision`, {
    method: 'POST',
    headers: createAuthHeaders(sessionToken),
    body: JSON.stringify({ decision, reviewNote }),
  });
}

export async function createSocietyWorkspace(sessionToken: string, draft: SocietySetupDraft) {
  return requestJson<CreateSocietyResponse>('/api/societies', {
    method: 'POST',
    headers: createAuthHeaders(sessionToken),
    body: JSON.stringify({ draft }),
  });
}

export async function deleteSocietyWorkspace(sessionToken: string, societyId: string) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/societies/${encodeURIComponent(societyId)}`,
    {
      method: 'DELETE',
      headers: createAuthHeaders(sessionToken),
    },
  );
}

export async function assignChairmanResidence(
  sessionToken: string,
  societyId: string,
  unitIds: string[],
  residentType: 'owner' | 'tenant',
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/societies/${encodeURIComponent(societyId)}/chairman-residence`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify({ unitIds, residentType }),
    },
  );
}

export async function updateSocietyProfile(
  sessionToken: string,
  societyId: string,
  profile: {
    name: string;
    country: string;
    state: string;
    city: string;
    area: string;
    address: string;
    tagline?: string;
  },
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/societies/${encodeURIComponent(societyId)}/profile`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(profile),
    },
  );
}

export async function createAnnouncement(
  sessionToken: string,
  societyId: string,
  announcement: AnnouncementCreateInput,
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/societies/${encodeURIComponent(societyId)}/announcements`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(announcement),
    },
  );
}

export async function createExpenseRecord(
  sessionToken: string,
  societyId: string,
  expense: {
    expenseType: ExpenseType;
    title: string;
    amountInr: string;
    incurredOn: string;
    notes?: string;
  },
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/societies/${encodeURIComponent(societyId)}/expenses`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(expense),
    },
  );
}

export async function createAmenityBooking(
  sessionToken: string,
  societyId: string,
  booking: {
    amenityId: string;
    unitId?: string;
    date: string;
    startTime: string;
    endTime: string;
    guests: string;
  },
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/societies/${encodeURIComponent(societyId)}/bookings`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(booking),
    },
  );
}

export async function reviewAmenityBooking(
  sessionToken: string,
  bookingId: string,
  status: 'confirmed' | 'waitlisted',
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/bookings/${encodeURIComponent(bookingId)}/status`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify({ status }),
    },
  );
}

export async function submitResidentPayment(
  sessionToken: string,
  societyId: string,
  payment: {
    invoiceId: string;
    amountInr: string;
    method: PaymentMethod;
    paidAt: string;
    referenceNote?: string;
    proofImageDataUrl?: string;
  },
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/societies/${encodeURIComponent(societyId)}/billing/payments`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(payment),
    },
  );
}

export async function captureResidentUpiPayment(
  sessionToken: string,
  societyId: string,
  payment: {
    invoiceId: string;
    amountInr: string;
    paidAt: string;
    referenceNote?: string;
  },
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/societies/${encodeURIComponent(societyId)}/billing/payments/capture`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(payment),
    },
  );
}

export async function reviewResidentPayment(
  sessionToken: string,
  paymentId: string,
  decision: 'approve' | 'reject',
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/payments/${encodeURIComponent(paymentId)}/review`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify({ decision }),
    },
  );
}

export async function recordManualPayment(
  sessionToken: string,
  societyId: string,
  payment: {
    invoiceId: string;
    amountInr: string;
    method: PaymentMethod;
    paidAt: string;
    referenceNote?: string;
  },
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/societies/${encodeURIComponent(societyId)}/billing/payments/manual`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(payment),
    },
  );
}

export async function sendMaintenanceReminder(
  sessionToken: string,
  societyId: string,
  reminder: {
    invoiceIds: string[];
    unitIds?: string[];
    message?: string;
  },
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/societies/${encodeURIComponent(societyId)}/billing/reminders`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(reminder),
    },
  );
}

export async function markAnnouncementRead(
  sessionToken: string,
  announcementId: string,
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/announcements/${encodeURIComponent(announcementId)}/read`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify({}),
    },
  );
}

export async function updateMaintenanceBillingConfig(
  sessionToken: string,
  planId: string,
  config: {
    upiId?: string;
    upiMobileNumber?: string;
    upiPayeeName?: string;
    upiQrCodeDataUrl?: string;
    upiQrPayload?: string;
  },
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/maintenance-plans/${encodeURIComponent(planId)}/billing-config`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(config),
    },
  );
}

export async function updateMaintenancePlanSettings(
  sessionToken: string,
  planId: string,
  settings: {
    frequency: MaintenanceFrequency;
    dueDay: string;
    amountInr: string;
    receiptPrefix: string;
  },
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/maintenance-plans/${encodeURIComponent(planId)}/settings`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(settings),
    },
  );
}

export async function createComplaintTicket(
  sessionToken: string,
  societyId: string,
  complaint: {
    unitId: string;
    category: ComplaintCategory;
    title: string;
    description: string;
  },
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/societies/${encodeURIComponent(societyId)}/complaints`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(complaint),
    },
  );
}

export async function updateComplaintTicket(
  sessionToken: string,
  complaintId: string,
  complaint: {
    status: 'open' | 'inProgress' | 'resolved';
    assignedTo?: string;
    message?: string;
    photoDataUrl?: string;
  },
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/complaints/${encodeURIComponent(complaintId)}/status`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(complaint),
    },
  );
}

export async function createSecurityGuard(
  sessionToken: string,
  societyId: string,
  guard: {
    name: string;
    phone: string;
    shiftLabel: string;
    vendorName?: string;
    gate: string;
    shiftStart: string;
    shiftEnd: string;
  },
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/societies/${encodeURIComponent(societyId)}/security/guards`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(guard),
    },
  );
}

export async function createStaffVerification(
  sessionToken: string,
  societyId: string,
  staff: {
    name: string;
    phone: string;
    category: StaffCategory;
    verificationState: VerificationState;
    employerUnitCodes: string[];
    serviceLabel: string;
    visitsPerWeek: string;
  },
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/societies/${encodeURIComponent(societyId)}/security/staff`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(staff),
    },
  );
}

export async function reviewStaffVerification(
  sessionToken: string,
  staffId: string,
  verificationState: 'verified' | 'expired',
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/staff/${encodeURIComponent(staffId)}/verification`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify({ verificationState }),
    },
  );
}

export async function createEntryLogRecord(
  sessionToken: string,
  societyId: string,
  entryLog: {
    subjectType: EntrySubjectType;
    subjectName: string;
    unitCode?: string;
    status: EntryStatus;
  },
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/societies/${encodeURIComponent(societyId)}/security/entry-logs`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(entryLog),
    },
  );
}

export async function createSecurityGuestRequest(
  sessionToken: string,
  societyId: string,
  request: SecurityGuestRequestCreateInput,
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/societies/${encodeURIComponent(societyId)}/security/guest-requests`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(request),
    },
  );
}

export async function reviewSecurityGuestRequest(
  sessionToken: string,
  requestId: string,
  decision: 'approve' | 'deny',
  note?: string,
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/security/guest-requests/${encodeURIComponent(requestId)}/decision`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify({ decision, note }),
    },
  );
}

export async function updateSecurityGuestRequestStatus(
  sessionToken: string,
  requestId: string,
  status: SecurityGuestRequestStatus,
  note?: string,
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/security/guest-requests/${encodeURIComponent(requestId)}/status`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify({ status, note }),
    },
  );
}

export async function sendSecurityGuestMessage(
  sessionToken: string,
  requestId: string,
  input: SecurityGuestMessageInput,
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/security/guest-requests/${encodeURIComponent(requestId)}/messages`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(input),
    },
  );
}

export async function ringSecurityGuestRequest(
  sessionToken: string,
  requestId: string,
  input: SecurityGuestRingInput = {},
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/security/guest-requests/${encodeURIComponent(requestId)}/ring`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(input),
    },
  );
}

export async function sendSocietyChatMessage(
  sessionToken: string,
  societyId: string,
  input: SocietyChatMessageInput,
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/societies/${encodeURIComponent(societyId)}/chat/group/messages`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(input),
    },
  );
}

export async function sendDirectChatMessage(
  sessionToken: string,
  societyId: string,
  recipientUserId: string,
  input: SocietyChatMessageInput,
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/societies/${encodeURIComponent(societyId)}/chat/direct/${encodeURIComponent(recipientUserId)}/messages`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(input),
    },
  );
}

export async function createVisitorPass(
  sessionToken: string,
  societyId: string,
  visitorPass: VisitorPassCreateInput,
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/societies/${encodeURIComponent(societyId)}/visitors`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify(visitorPass),
    },
  );
}

export async function updateVisitorPassStatus(
  sessionToken: string,
  visitorPassId: string,
  status: VisitorPassStatus,
) {
  return requestJson<SocietyAdminMutationResponse>(
    `/api/visitor-passes/${encodeURIComponent(visitorPassId)}/status`,
    {
      method: 'POST',
      headers: createAuthHeaders(sessionToken),
      body: JSON.stringify({ status }),
    },
  );
}

export async function detectVehicleNumber(sessionToken: string, photoDataUrl: string) {
  return requestJson<VehicleNumberDetectionResponse>('/api/security/vehicle-number/detect', {
    method: 'POST',
    headers: createAuthHeaders(sessionToken),
    body: JSON.stringify({ photoDataUrl }),
  });
}

export async function resetDatabase() {
  return requestJson<BootstrapResponse>('/api/dev/reset', {
    method: 'POST',
  });
}

export const localFallbackSnapshot: BootstrapResponse = {
  currentUserId: null,
  chairmanAssigned: false,
  amenityLibrary,
  defaultSetupDraft,
  data: seedData,
};
