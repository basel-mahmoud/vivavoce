import { describe, it, expect } from 'vitest';
import { themes, fontSize, space } from '@vivavoce/tokens';

/** Guards the shared design system: both themes expose the same semantic keys,
 *  and core scales stay monotonic. Catches accidental token drift across apps. */
describe('design tokens', () => {
  it('light and dark themes share an identical key set', () => {
    expect(Object.keys(themes.light).sort()).toEqual(Object.keys(themes.dark).sort());
  });

  it('every theme color is a valid hex value', () => {
    for (const theme of [themes.light, themes.dark]) {
      for (const value of Object.values(theme)) {
        expect(value).toMatch(/^#([0-9a-fA-F]{3,8})$/);
      }
    }
  });

  it('the type scale increases monotonically', () => {
    const order = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'] as const;
    for (let i = 1; i < order.length; i++) {
      const cur = order[i]!;
      const prev = order[i - 1]!;
      expect(fontSize[cur].px).toBeGreaterThan(fontSize[prev].px);
    }
  });

  it('spacing uses a 4px base grid', () => {
    for (const v of Object.values(space)) {
      expect(v % 4).toBe(0);
    }
  });
});
