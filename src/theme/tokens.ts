export const palette = {
  background: '#F3F7FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EDF3FA',
  ink: '#142033',
  mutedInk: '#5F6F82',
  primary: '#18324B',
  primaryDark: '#0D2032',
  primarySoft: '#DCE8F5',
  accent: '#E07A5F',
  accentSoft: '#FCE4DC',
  gold: '#C9962A',
  goldSoft: '#F6E8C4',
  blue: '#2F6EA7',
  blueSoft: '#DCEBFA',
  success: '#1F8F5F',
  warning: '#A26917',
  danger: '#C44F45',
  border: '#D7E1EC',
  white: '#FFFFFF',
  overlay: '#08111C',
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
  sm: 14,
  md: 20,
  lg: 26,
  xl: 34,
  pill: 999,
} as const;

export const typeScale = {
  eyebrow: 12,
  body: 15,
  title: 21,
  hero: 36,
  metric: 32,
} as const;

export const shadow = {
  card: {
    shadowColor: '#10253B',
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 4,
  },
} as const;
