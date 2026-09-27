import { describe, expect, it } from 'vitest';
import { loudness } from './useMicMeter';

describe('loudness', () => {
  it('is silent for silence and grows with the voice', () => {
    expect(loudness(0)).toBe(0);
    const levels = [0.005, 0.02, 0.06, 0.12, 0.2, 0.3, 0.5];
    const shown = levels.map(loudness);
    shown.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(shown[i]!));
  });

  it('moves for quiet speech without pinning a loud voice', () => {
    // about -34 dBFS: a quiet speaker still draws
    expect(loudness(0.02)).toBeGreaterThan(0.1);
    // about -14 dBFS, a close voice with automatic gain: high, with room left for its peaks
    expect(loudness(0.2)).toBeLessThan(0.8);
    expect(loudness(0.5)).toBeLessThan(1);
  });
});
