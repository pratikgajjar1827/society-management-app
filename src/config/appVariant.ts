import Constants from 'expo-constants';

export type AppVariant = 'main' | 'creator';

function readVariantFromExpoConfig() {
  const extra = Constants.expoConfig?.extra as { appVariant?: string } | undefined;
  return String(extra?.appVariant ?? '').trim().toLowerCase();
}

function readVariantFromEnv() {
  return String(process.env.EXPO_PUBLIC_APP_VARIANT ?? '').trim().toLowerCase();
}

const normalizedVariant = readVariantFromExpoConfig() || readVariantFromEnv();

export const appVariant: AppVariant = normalizedVariant === 'creator' ? 'creator' : 'main';

export function isCreatorAppVariant() {
  return appVariant === 'creator';
}
