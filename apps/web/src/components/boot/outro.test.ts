import { describe, expect, it } from 'vitest';
import { bezier } from './outro';

describe('bezier', () => {
  it('runs from 0 to 1', () => {
    for (const curve of [bezier(0.62, 0.02, 0.22, 1), bezier(0.25, 0.6, 0.3, 1), bezier(0.42, 0, 0.58, 1)]) {
      expect(curve(0)).toBeCloseTo(0, 5);
      expect(curve(1)).toBeCloseTo(1, 5);
    }
  });

  it('matches the browser curves it stands in for', () => {
    // CSS ease-in-out is symmetric about its middle; linear is the identity
    const inOut = bezier(0.42, 0, 0.58, 1);
    expect(inOut(0.5)).toBeCloseTo(0.5, 4);
    expect(inOut(0.25) + inOut(0.75)).toBeCloseTo(1, 4);
    const linear = bezier(0.25, 0.25, 0.75, 0.75);
    for (const t of [0.1, 0.33, 0.8]) expect(linear(t)).toBeCloseTo(t, 4);
    // CSS `ease` (cubic-bezier(.25,.1,.25,1)) a third of the way, against a bisection of the curve
    expect(bezier(0.25, 0.1, 0.25, 1)(1 / 3)).toBeCloseTo(0.57586, 4);
  });

  it('never runs backwards along the portal', () => {
    const grow = bezier(0.62, 0.02, 0.22, 1);
    let last = -1;
    for (let t = 0; t <= 1.0001; t += 0.01) {
      const v = grow(Math.min(1, t));
      expect(v).toBeGreaterThanOrEqual(last - 1e-9);
      last = v;
    }
  });
});
