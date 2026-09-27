import { describe, expect, it } from 'vitest';
import { LINE_WIDTH, SWING, VOICE_WORDS, voiceBand } from './heroVoice';

/** Walks the band's path: one closed shape per word, as absolute points in ems. */
function shapes(d: string) {
  return d
    .split('M')
    .filter(Boolean)
    .map((part) => {
      const [start, ...steps] = part.replace(/Z$/, '').split('l');
      const [x0, y0] = start!.trim().split(' ').map(Number) as [number, number];
      const pts: [number, number][] = [[x0 / 1000, y0 / 1000]];
      let [x, y] = [x0, y0];
      for (const s of steps) {
        const [dx, dy] = s.trim().split(' ').map(Number) as [number, number];
        x += dx;
        y += dy;
        pts.push([x / 1000, y / 1000]);
      }
      return pts;
    });
}

describe('the voice under the promise', () => {
  const d = voiceBand();
  const words = shapes(d);

  it('is drawn the same on every render', () => {
    expect(voiceBand()).toBe(d);
  });

  it('is one closed syllable under each word, and silence between them', () => {
    expect(words).toHaveLength(VOICE_WORDS.length);
    words.forEach((pts, i) => {
      const [a, b] = VOICE_WORDS[i]!.ink;
      expect(pts[0]![0]).toBeCloseTo(a, 3);
      expect(pts.at(-1)).toEqual(pts[0]);
      const xs = pts.map(([x]) => x);
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(a - 0.001);
      expect(Math.max(...xs)).toBeLessThanOrEqual(b + 0.001);
    });
  });

  it('stays inside its box and on the line', () => {
    const all = words.flat();
    expect(Math.max(...all.map(([, y]) => Math.abs(y)))).toBeLessThanOrEqual(SWING + 1e-9);
    expect(Math.max(...all.map(([x]) => x))).toBeLessThanOrEqual(LINE_WIDTH);
  });

  it('gets louder word by word', () => {
    const peak = words.map((pts) => Math.max(...pts.map(([, y]) => Math.abs(y))));
    for (let i = 1; i < peak.length; i++) expect(peak[i]).toBeGreaterThan(peak[i - 1]!);
  });
});
