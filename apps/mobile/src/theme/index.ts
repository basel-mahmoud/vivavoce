/**
 * Ink & Ember — mobile theme tokens. Mirrors packages/tokens and web globals.css
 * so the app and the marketing site read as one product. `colors[scheme]` gives
 * a flat, semantic palette per appearance.
 */
import { useColorScheme } from 'react-native';

export const colors = {
  light: {
    bg: '#F7F4ED',
    surface: '#FFFFFF',
    surface2: '#F1ECE1',
    border: '#E4DDCE',
    text: '#1A1714',
    textMuted: '#6B6256',
    textFaint: '#9A9081',
    accent: '#D9803B',
    accentSoft: '#F2C28A',
    accentDeep: '#B5641F',
    onAccent: '#16130F',
    gravitas: '#7C2D3A',
    success: '#5C7A6B',
    danger: '#B23A3A',
    live: '#B33A3A',
  },
  dark: {
    bg: '#0C0A09',
    surface: '#16130F',
    surface2: '#1F1A14',
    border: '#2A241C',
    text: '#F4EFE6',
    textMuted: '#A89F90',
    textFaint: '#6E665A',
    accent: '#E08C44',
    accentSoft: '#F2C28A',
    accentDeep: '#B5641F',
    onAccent: '#16130F',
    gravitas: '#C97D88',
    success: '#86A893',
    danger: '#E06A6A',
    live: '#E06A6A',
  },
} as const;

export type Scheme = keyof typeof colors;
export type ThemeColors = (typeof colors)[Scheme];

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  mono: 'JetBrainsMono_500Medium',
} as const;

export const type = {
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36 },
  display2: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30 },
  title: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  mono: { fontFamily: fonts.mono, fontSize: 14, lineHeight: 18 },
} as const;

export const minTapTarget = 44;

export function useTheme() {
  const scheme: Scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  return { scheme, c: colors[scheme], space, radius, fonts, type };
}
