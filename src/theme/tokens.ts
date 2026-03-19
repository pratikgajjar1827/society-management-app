export const palette = {
  background: '#F4EFE8',
  surface: '#FFFCF7',
  surfaceMuted: '#E9E0D6',
  ink: '#17212E',
  mutedInk: '#5F6D78',
  primary: '#163D34',
  primaryDark: '#102C27',
  primarySoft: '#D7E7E1',
  accent: '#C66A4A',
  accentSoft: '#F4DDD4',
  gold: '#C8A04A',
  goldSoft: '#F3E7C7',
  blue: '#274A67',
  blueSoft: '#DCEAF5',
  success: '#2D7B5A',
  warning: '#AA6B00',
  danger: '#B14B3A',
  border: '#D6C9BC',
  white: '#FFFFFF',
  overlay: '#0D1417',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const typeScale = {
  eyebrow: 12,
  body: 15,
  title: 20,
  hero: 34,
  metric: 30,
} as const;

export const shadow = {
  card: {
    shadowColor: '#111111',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
} as const;
