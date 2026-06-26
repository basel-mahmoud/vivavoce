/**
 * Ink & Ember — color tokens (single source of truth).
 *
 * Warm, never neutral-grey. One signature accent (ember), claret for academic
 * gravitas, sage for "strong answer" positivity, a dedicated `live` red for the
 * recording pulse so it is never confused with the ember call-to-action.
 *
 * Both apps derive their theme from these values:
 *   web    → apps/web/src/app/globals.css  (@theme + CSS custom properties)
 *   mobile → apps/mobile/theme/tokens.ts    (typed JS objects)
 */

export const palette = {
  // Warm paper → ink ramp
  paper: '#F7F4ED',
  paperRaised: '#FFFFFF',
  paperInset: '#F1ECE1',
  ink: '#0C0A09',
  inkRaised: '#16130F',
  inkInset: '#1F1A14',

  // Borders
  borderLight: '#E4DDCE',
  borderDark: '#2A241C',

  // Text — light
  textLight: '#1A1714',
  textMutedLight: '#6B6256',
  textFaintLight: '#9A9081',
  // Text — dark
  textDark: '#F4EFE6',
  textMutedDark: '#A89F90',
  textFaintDark: '#6E665A',

  // Accents (theme-independent hues, used deliberately)
  ember: '#D9803B',
  emberSoft: '#F2C28A',
  emberDeep: '#B5641F',
  claret: '#7C2D3A',
  sage: '#5C7A6B',

  // Semantic
  danger: '#B23A3A',
  warning: '#D9803B',
  info: '#52606D',
  live: '#B33A3A',
} as const;

export type Palette = typeof palette;

/** Semantic, theme-aware token sets. Keys are stable across light/dark. */
export const themes = {
  light: {
    bg: palette.paper,
    surface: palette.paperRaised,
    surface2: palette.paperInset,
    border: palette.borderLight,
    text: palette.textLight,
    textMuted: palette.textMutedLight,
    textFaint: palette.textFaintLight,
    accent: palette.ember,
    accentSoft: palette.emberSoft,
    accentDeep: palette.emberDeep,
    onAccent: '#1A1714',
    gravitas: palette.claret,
    success: palette.sage,
    warning: palette.warning,
    danger: palette.danger,
    info: palette.info,
    live: palette.live,
  },
  dark: {
    bg: palette.ink,
    surface: palette.inkRaised,
    surface2: palette.inkInset,
    border: palette.borderDark,
    text: palette.textDark,
    textMuted: palette.textMutedDark,
    textFaint: palette.textFaintDark,
    accent: palette.ember,
    accentSoft: palette.emberSoft,
    accentDeep: palette.emberDeep,
    onAccent: '#16130F',
    gravitas: '#C77',
    success: '#86A893',
    warning: palette.ember,
    danger: '#E06A6A',
    info: '#8A97A3',
    live: '#E06A6A',
  },
} as const;

export type ThemeName = keyof typeof themes;
export type SemanticColors = typeof themes.light;
