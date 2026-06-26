/**
 * @vivavoce/tokens — the Ink & Ember design system, single source of truth.
 *
 * Consumed by:
 *   - apps/web    (Tailwind v4 @theme + CSS variables, generated from these)
 *   - apps/mobile (typed JS theme objects)
 *
 * See DESIGN.md for the rationale behind every value.
 */
export * from './colors';
export * from './scale';
export * from './motion';

import { palette, themes } from './colors';
import { fonts, fontSize, space, radius } from './scale';
import { duration, cssEasing } from './motion';

export const tokens = {
  palette,
  themes,
  fonts,
  fontSize,
  space,
  radius,
  duration,
  cssEasing,
} as const;

export type Tokens = typeof tokens;
