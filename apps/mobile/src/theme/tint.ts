import type { ThemeColors } from './index';
import type { Tint } from '@/data/content';

/** Resolve a content tint token to a theme-aware accent color. */
export function tintColor(c: ThemeColors, tint: Tint): string {
  switch (tint) {
    case 'verm':
      return c.accent;
    case 'cobalt':
      return c.gravitas;
    case 'green':
      return c.success;
    case 'gold':
      return '#C98A1B';
    case 'ink':
      return c.text;
    default:
      return c.accent;
  }
}
