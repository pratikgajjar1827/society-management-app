import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { palette } from './tokens';

export type ThemeMode = 'light' | 'night';

const THEME_STORAGE_KEY = 'societyos.theme-mode';

export type AppThemeColors = {
  mode: ThemeMode;
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceElevated: string;
  ink: string;
  mutedInk: string;
  border: string;
  borderStrong: string;
  overlay: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  gold: string;
  goldSoft: string;
  blue: string;
  blueSoft: string;
  white: string;
  success: string;
  warning: string;
  danger: string;
  shadowColor: string;
  backdropTop: string;
  backdropBottom: string;
  gridGlow: string;
};

const lightTheme: AppThemeColors = {
  mode: 'light',
  background: palette.background,
  surface: palette.surface,
  surfaceMuted: palette.surfaceMuted,
  surfaceElevated: '#FFF8F0',
  ink: palette.ink,
  mutedInk: palette.mutedInk,
  border: palette.border,
  borderStrong: '#D8CBB7',
  overlay: palette.overlay,
  primary: palette.primary,
  primaryDark: palette.primaryDark,
  primarySoft: palette.primarySoft,
  accent: palette.accent,
  accentSoft: palette.accentSoft,
  gold: palette.gold,
  goldSoft: palette.goldSoft,
  blue: palette.blue,
  blueSoft: palette.blueSoft,
  white: palette.white,
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  shadowColor: '#7E6148',
  backdropTop: '#F7DCCF',
  backdropBottom: '#DDE8F8',
  gridGlow: 'rgba(232, 93, 75, 0.08)',
};

const nightTheme: AppThemeColors = {
  mode: 'night',
  background: '#0C1520',
  surface: '#142231',
  surfaceMuted: '#182939',
  surfaceElevated: '#1A2D40',
  ink: '#F1F5F9',
  mutedInk: '#A8B7C7',
  border: '#2A4055',
  borderStrong: '#49627A',
  overlay: '#02070D',
  primary: '#D9E6F2',
  primaryDark: '#F8FBFF',
  primarySoft: '#24384C',
  accent: '#FF8B79',
  accentSoft: '#472A29',
  gold: '#F4C66B',
  goldSoft: '#433722',
  blue: '#7FB0EF',
  blueSoft: '#1E3147',
  white: '#FFFFFF',
  success: '#6BD3A4',
  warning: '#F1B861',
  danger: '#FF8D84',
  shadowColor: '#02070D',
  backdropTop: 'rgba(255, 139, 121, 0.12)',
  backdropBottom: 'rgba(127, 176, 239, 0.12)',
  gridGlow: 'rgba(244, 198, 107, 0.08)',
};

type ThemeContextValue = {
  theme: AppThemeColors;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  isHydrated: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    async function hydrateTheme() {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);

        if (!active) {
          return;
        }

        setMode(storedTheme === 'night' ? 'night' : 'light');
      } finally {
        if (active) {
          setIsHydrated(true);
        }
      }
    }

    void hydrateTheme();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [isHydrated, mode]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme: mode === 'night' ? nightTheme : lightTheme,
    mode,
    setMode,
    toggleMode: () => setMode((currentMode) => (currentMode === 'night' ? 'light' : 'night')),
    isHydrated,
  }), [isHydrated, mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within ThemeProvider.');
  }

  return context;
}
