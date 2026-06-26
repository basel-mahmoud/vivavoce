/** Type, space, radius, and elevation scales (single source of truth). */

/** Font families. Web loads via next/font; mobile via @expo-google-fonts. */
export const fonts = {
  display: 'Fraunces', // serif, opsz + soft axes — the "living voice"
  ui: 'Inter',
  mono: 'JetBrains Mono',
} as const;

/** Major-third-ish type scale, in rem (web) / pt (mobile reads `.px`). */
export const fontSize = {
  xs: { rem: 0.75, px: 12, lh: 1.4 },
  sm: { rem: 0.875, px: 14, lh: 1.45 },
  base: { rem: 1, px: 16, lh: 1.55 },
  lg: { rem: 1.125, px: 18, lh: 1.5 },
  xl: { rem: 1.25, px: 20, lh: 1.4 },
  '2xl': { rem: 1.5, px: 24, lh: 1.25 },
  '3xl': { rem: 1.875, px: 30, lh: 1.15 },
  '4xl': { rem: 2.5, px: 40, lh: 1.08 },
  '5xl': { rem: 3.5, px: 56, lh: 1.04 },
  '6xl': { rem: 4.75, px: 76, lh: 1.0 },
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const tracking = {
  display: '-0.02em',
  body: '-0.011em',
  wide: '0.04em',
} as const;

/** 4px base grid. */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
  32: 128,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/** Warm, layered shadows (light). Dark mode prefers borders + inner highlight. */
export const elevation = {
  e1: '0 1px 2px rgba(26,23,20,0.04)',
  e2: '0 1px 2px rgba(26,23,20,0.04), 0 8px 24px -12px rgba(26,23,20,0.12)',
  e3: '0 2px 4px rgba(26,23,20,0.06), 0 16px 40px -16px rgba(26,23,20,0.18)',
  e4: '0 8px 16px rgba(26,23,20,0.08), 0 32px 64px -24px rgba(26,23,20,0.24)',
} as const;

/** Minimum accessible tap target (mobile), in pt. */
export const minTapTarget = 44;
