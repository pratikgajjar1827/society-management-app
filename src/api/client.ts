import { Platform } from 'react-native';

import { DEMO_USER_ID, amenityLibrary, defaultSetupDraft, seedData } from '../data/seed';
import { SeedData, SocietySetupDraft } from '../types/domain';

type BootstrapResponse = {
  currentUserId: string;
  amenityLibrary: string[];
  defaultSetupDraft: SocietySetupDraft;
  data: SeedData;
};

type CreateSocietyResponse = {
  currentUserId: string;
  societyId: string;
  data: SeedData;
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

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchBootstrapData() {
  return requestJson<BootstrapResponse>('/api/bootstrap');
}

export async function createSocietyWorkspace(userId: string, draft: SocietySetupDraft) {
  return requestJson<CreateSocietyResponse>('/api/societies', {
    method: 'POST',
    body: JSON.stringify({ userId, draft }),
  });
}

export async function resetDatabase() {
  return requestJson<BootstrapResponse>('/api/dev/reset', {
    method: 'POST',
  });
}

export const localFallbackSnapshot: BootstrapResponse = {
  currentUserId: DEMO_USER_ID,
  amenityLibrary,
  defaultSetupDraft,
  data: seedData,
};
