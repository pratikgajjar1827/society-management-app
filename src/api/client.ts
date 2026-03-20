import { Platform } from 'react-native';

import { amenityLibrary, defaultSetupDraft, seedData } from '../data/seed';
import {
  AccountRole,
  AuthChallenge,
  AuthChannel,
  AuthIntent,
  OnboardingState,
  SeedData,
  SocietySetupDraft,
  UserProfile,
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
};

type CreateSocietyResponse = AuthenticatedResponse & {
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
  unitId?: string,
  residentType?: 'owner' | 'tenant' | 'committee',
) {
  return requestJson<SelectSocietyResponse>('/api/auth/select-society', {
    method: 'POST',
    headers: createAuthHeaders(sessionToken),
    body: JSON.stringify({ societyId, unitId, residentType }),
  });
}

export async function createSocietyWorkspace(sessionToken: string, draft: SocietySetupDraft) {
  return requestJson<CreateSocietyResponse>('/api/societies', {
    method: 'POST',
    headers: createAuthHeaders(sessionToken),
    body: JSON.stringify({ draft }),
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
