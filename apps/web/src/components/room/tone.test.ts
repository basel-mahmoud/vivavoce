import { describe, expect, it } from 'vitest';
import { hexToLinear, inverseNeutralClosed, linearToSrgb8, neutral, preToneMapped } from './tone';

describe('room tone curve', () => {
  it('leaves dark mid-tones alone below the shoulder', () => {
    const c = neutral([0.3, 0.2, 0.1]);
    expect(c[0]).toBeCloseTo(0.26, 2);
    expect(c[1]).toBeCloseTo(0.16, 2);
    expect(c[2]).toBeCloseTo(0.06, 2);
  });

  it.each(['#f3f5f8', '#0c0e14', '#e7ebf1', '#1f31c9'])(
    'lands the pre-compensated %s back on itself after Neutral',
    (hex) => {
      const out = linearToSrgb8(neutral(preToneMapped(hex)));
      const want = linearToSrgb8(hexToLinear(hex));
      for (let i = 0; i < 3; i++) expect(Math.abs(out[i]! - want[i]!)).toBeLessThanOrEqual(1);
    },
  );

  it.each(['#f3f5f8', '#e5e9f0', '#fbfaf6', '#b9c0cc', '#0c0e14', '#10131c', '#2b2823', '#040508'])(
    'inverts Neutral in closed form for the set tone %s',
    (hex) => {
      const out = linearToSrgb8(neutral(inverseNeutralClosed(hexToLinear(hex))));
      const want = linearToSrgb8(hexToLinear(hex));
      for (let i = 0; i < 3; i++) expect(Math.abs(out[i]! - want[i]!)).toBeLessThanOrEqual(1);
    },
  );

  it('needs a brighter paint than the page colour for the light canvas', () => {
    const paint = preToneMapped('#f3f5f8');
    const page = hexToLinear('#f3f5f8');
    expect(paint[0]).toBeGreaterThan(page[0]);
  });
});
