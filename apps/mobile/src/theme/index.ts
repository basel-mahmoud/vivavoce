/**
 * "The Practice Room" — mobile theme tokens (v4). Mirrors apps/web globals.css
 * and packages/tokens: porcelain canvas, flat ink/vermilion/cobalt accents,
 * Archivo Black display, JetBrains Mono marks. Light is the brand default;
 * dark is the same room with the lights off.
 */
import { useColorScheme } from 'react-native';

export const colors = {
  light: {
    bg: '#F2F1ED',
    surface: '#FBFAF8',
    surface2: '#E9E7E1',
    border: '#E0DDD5',
    text: '#161412',
    textMuted: '#5F5B54',
    textFaint: '#9B968D',
    accent: '#FF4D26',
    accentSoft: '#FFD2C2',
    accentDeep: '#D63A17',
    onAccent: '#161412',
    gravitas: '#2E45FF', // cobalt: the second brand color
    success: '#2C7A4B',
    warning: '#D63A17',
    danger: '#C92C0E',
    info: '#2E45FF',
    live: '#FF3B30',
  },
  dark: {
    bg: '#121110',
    surface: '#1C1A18',
    surface2: '#262421',
    border: '#33302C',
    text: '#FBFAF8',
    textMuted: '#C9C4BB',
    textFaint: '#8D897F',
    accent: '#FF4D26',
    accentSoft: '#FFB59E',
    accentDeep: '#D63A17',
    onAccent: '#161412',
    gravitas: '#8A9BFF', // cobalt, lifted for dark
    success: '#8FBF9F',
    warning: '#FF8B66',
    danger: '#FF8D7A',
    info: '#8A9BFF',
    live: '#FF5A4D',
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
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const fonts = {
  display: 'Archivo_900Black',
  displayBold: 'Archivo_900Black',
  regular: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  mono: 'JetBrainsMono_500Medium',
} as const;

export const type = {
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 34, letterSpacing: -0.8 },
  display2: { fontFamily: fonts.display, fontSize: 25, lineHeight: 28, letterSpacing: -0.5 },
  title: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
  mono: { fontFamily: fonts.mono, fontSize: 14, lineHeight: 18 },
} as const;

export const minTapTarget = 44;

export function useTheme() {
  const scheme: Scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, c: colors[scheme], space, radius, fonts, type };
}
