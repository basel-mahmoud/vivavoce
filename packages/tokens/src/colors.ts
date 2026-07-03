/**
 * "Out Loud" — color tokens (single source of truth). v2.
 *
 * Strategy: DRENCHED. One committed vermilion carries the brand surface
 * (reference lane: Klim-style #ff4500 drench), with a near-black "exam room"
 * as the second world and warm chalk as the type color on dark. Ink on red for
 * body-size text (≥4.5:1); chalk on red for display sizes only (≥3:1).
 *
 * Consumers:
 *   web    → apps/web/src/app/globals.css  (@theme inline utilities)
 *   mobile → apps/mobile/src/theme/index.ts (typed JS objects)
 */

export const palette = {
  // The drench
  vermilion: '#E8401F',
  vermilionHot: '#FF6A3D', // accent on dark surfaces (passes 4.5:1 on room)
  vermilionDeep: '#B72E12',

  // The exam room (dark world)
  room: '#151011',
  roomRaised: '#1E1717',
  roomInset: '#261D1D',

  // Type
  ink: '#170B08', // on red / on chalk
  chalk: '#F6EFE9', // on room / display-on-red
  chalkMuted: '#C9B8AF',
  chalkFaint: '#8F7F76',

  // Semantic
  pass: '#8FBF9F', // "strong answer" on dark
  danger: '#FF8D7A',
  live: '#FF3B30',
} as const;

export type Palette = typeof palette;

/** Semantic, theme-aware token sets. Keys are stable across light/dark. */
export const themes = {
  // "light" = the chalk world (mobile app light mode)
  light: {
    bg: '#F6EFE9',
    surface: '#FFFFFF',
    surface2: '#EFE4DC',
    border: '#DCCCC2',
    text: palette.ink,
    textMuted: '#5F4F48',
    textFaint: '#93817A',
    accent: palette.vermilion,
    accentSoft: '#FFB59E',
    accentDeep: palette.vermilionDeep,
    onAccent: '#FFF6F0',
    gravitas: palette.vermilionDeep,
    success: '#3E7A54',
    warning: palette.vermilion,
    danger: '#B02E18',
    info: '#54606C',
    live: palette.live,
  },
  // "dark" = the exam room (mobile dark mode + web inner pages)
  dark: {
    bg: palette.room,
    surface: palette.roomRaised,
    surface2: palette.roomInset,
    border: '#3A2E2C',
    text: palette.chalk,
    textMuted: palette.chalkMuted,
    textFaint: palette.chalkFaint,
    accent: palette.vermilionHot,
    accentSoft: '#FFB59E',
    accentDeep: palette.vermilionDeep,
    onAccent: '#1C0D08',
    gravitas: '#FF9C86',
    success: palette.pass,
    warning: palette.vermilionHot,
    danger: palette.danger,
    info: '#A9B4BE',
    live: '#FF5A4D',
  },
} as const;

export type ThemeName = keyof typeof themes;
export type SemanticColors = typeof themes.light;
