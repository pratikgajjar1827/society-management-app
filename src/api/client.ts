import { Platform } from 'react-native';

import { amenityLibrary, defaultSetupDraft, seedData } from '../data/seed';
import {
  AccountRole,
  AuthChallenge,
  AuthChannel,
  AuthIntent,
  EntryStatus,
  EntrySubjectType,
  ExpenseType,
  JoinRequestRole,
  JoinRequestStatus,
  OnboardingState,
  PaymentMethod,
  ComplaintCategory,
  SeedData,
  SocietySetupDraft,
  StaffCategory,
  UserProfile,
  VerificationState,
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

const DEFAULT_API_PORT = 4000;

function normalizeBaseUrl(value: string) {
  return value.replace(/\/$/, '');
}

export function getApiBaseUrl() {
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

  return payload as T;
}

function createAuthHeaders(sessionToken: string) {
  return {
    Authorization: `Bearer ${sessionToken}`,
  };
}

export async function fetchBootstrapData() {
  return requestJson<BootstrapResponse>('/api/bootstrap');
}

export async function requestOtp(intent: AuthIntent, channel: AuthChannel, destination: string) {
  return requestJson<AuthChallenge>('/api/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ intent, channel, destination }),
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
) {
  return requestJson<SelectSocietyResponse>('/api/auth/select-society', {
    method: 'POST',
    headers: createAuthHeaders(sessionToken),
    body: JSON.stringify({ societyId, unitIds, residentType }),
  });
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

export async function sendMaintenanceReminder(
  sessionToken: string,
  societyId: string,
  reminder: {
    invoiceIds: string[];
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
