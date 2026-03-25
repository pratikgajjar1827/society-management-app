export const palette = {
  background: '#F7F2EA',
  surface: '#FFFDFC',
  surfaceMuted: '#F4EDE2',
  ink: '#223144',
  mutedInk: '#6A7282',
  primary: '#24364A',
  primaryDark: '#162433',
  primarySoft: '#DEE8F3',
  accent: '#E85D4B',
  accentSoft: '#FFE4DE',
  gold: '#D3A13F',
  goldSoft: '#FFF0CF',
  blue: '#4C7AB3',
  blueSoft: '#E1EDFB',
  success: '#2C8A62',
  warning: '#A86A1B',
  danger: '#CB4D43',
  border: '#E7DDCF',
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
  md: 22,
  lg: 28,
  xl: 36,
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
    shadowColor: '#7E6148',
    shadowOpacity: 0.09,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 4,
  },
} as const;
