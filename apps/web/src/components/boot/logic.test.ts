import { describe, expect, it } from 'vitest';
import { approach, coverSide, decideBoot, progressOf, smoothFrame, type BootEnv, type Milestone, type Smoothness } from './logic';

const env = (over: Partial<BootEnv> = {}): BootEnv => ({
  path: '/',
  search: '',
  hash: '',
  reduce: false,
  nav: 'navigate',
  scrolled: false,
  stored: null,
  key: 'a.b.c',
  paths: ['/'],
  ...over,
});

describe('decideBoot', () => {
  it('shows on a first visit to a room page', () => {
    expect(decideBoot(env())).toEqual({ room: true, show: true, why: 'first' });
  });

  it('never covers a page without the room', () => {
    expect(decideBoot(env({ path: '/features' }))).toEqual({ room: false, show: false, why: 'page' });
    expect(decideBoot(env({ path: '/features', search: '?intro=1' })).show).toBe(false);
  });

  it('skips once this asset key has loaded, and shows again for a new one', () => {
    expect(decideBoot(env({ stored: 'a.b.c' }))).toMatchObject({ room: true, show: false, why: 'cached' });
    expect(decideBoot(env({ stored: 'a.b.OLD' })).show).toBe(true);
  });

  it('never shows under reduced motion, not even when forced', () => {
    expect(decideBoot(env({ reduce: true })).show).toBe(false);
    expect(decideBoot(env({ reduce: true, search: '?intro=1' })).show).toBe(false);
  });

  it('stays out of the way of deep links and restored pages', () => {
    expect(decideBoot(env({ hash: '#live' })).why).toBe('hash');
    expect(decideBoot(env({ nav: 'back_forward' })).why).toBe('restored');
    expect(decideBoot(env({ nav: 'reload', scrolled: true })).why).toBe('restored');
    // a reload at the top of the page is still a first visit if nothing completed
    expect(decideBoot(env({ nav: 'reload' })).show).toBe(true);
    // an empty fragment is no deep link
    expect(decideBoot(env({ hash: '#' })).show).toBe(true);
  });

  it('takes ?intro=1 and ?intro=0 for testing', () => {
    expect(decideBoot(env({ stored: 'a.b.c', hash: '#live', search: '?intro=1' }))).toMatchObject({ show: true, why: 'intro=1' });
    expect(decideBoot(env({ search: '?x=1&intro=0' }))).toMatchObject({ show: false, why: 'intro=0' });
    // not a near miss
    expect(decideBoot(env({ search: '?intro=10', stored: 'a.b.c' })).why).toBe('cached');
  });
});

const ms = (over: Record<string, Partial<Milestone>>): Record<string, Milestone> =>
  Object.fromEntries(
    Object.entries(over).map(([name, m]) => [name, { w: 1, f: 0, at: -1, tau: 0, done: false, off: false, ...m }]),
  );

describe('progressOf', () => {
  it('weighs finished milestones in full and the rest by what they report', () => {
    const p = progressOf(ms({ a: { w: 3, done: true }, b: { w: 1, f: 0.5 } }), 0);
    expect(p).toBeCloseTo((3 + 0.5) / 4);
  });

  it('lets an in-flight milestone creep, never to the end', () => {
    const m = ms({ code: { tau: 1000, at: 0 } });
    expect(progressOf(m, 0)).toBe(0);
    const later = progressOf(m, 1000);
    expect(later).toBeGreaterThan(0.5);
    expect(later).toBeLessThan(0.6);
    expect(progressOf(m, 1e9)).toBeLessThanOrEqual(0.9);
    // nothing creeps before it starts
    expect(progressOf(ms({ code: { tau: 1000 } }), 5000)).toBe(0);
  });

  it('counts a reported fraction over a slower creep', () => {
    expect(progressOf(ms({ model: { tau: 5000, at: 0, f: 0.7 } }), 100)).toBeCloseTo(0.7);
  });

  it('never reaches 1 until everything has finished', () => {
    expect(progressOf(ms({ a: { f: 1 } }), 0)).toBeLessThan(1);
    expect(progressOf(ms({ a: { done: true }, b: { done: true } }), 0)).toBe(1);
  });

  it('drops the milestones that will not happen', () => {
    const m = ms({ page: { w: 1, done: true }, room: { w: 9, off: true } });
    expect(progressOf(m, 0)).toBe(1);
  });
});

describe('approach', () => {
  it('eases towards the target without ever passing it or going back', () => {
    let shown = 0;
    const seen: number[] = [];
    for (let i = 0; i < 200; i++) {
      shown = approach(shown, 0.6, 1 / 60, 0.3, 1.5, 0.1);
      seen.push(shown);
    }
    expect(seen.every((v, i) => i === 0 || v >= seen[i - 1]!)).toBe(true);
    expect(shown).toBeCloseTo(0.6, 3);
    expect(Math.max(...seen)).toBeLessThanOrEqual(0.6);
    // a lower target never pulls it back
    expect(approach(0.6, 0.2, 1 / 60, 0.3, 1.5, 0.1)).toBe(0.6);
  });

  it('never draws faster than its rate, so a jump in progress is eased', () => {
    const step = approach(0, 1, 0.1, 0.3, 1.5, 0.1);
    expect(step).toBeLessThanOrEqual(0.15 + 1e-9);
    expect(step).toBeGreaterThan(0);
  });

  it('finishes the last stretch at its slowest rate rather than creeping forever', () => {
    let shown = 0.97;
    let frames = 0;
    while (shown < 1 && frames < 1000) {
      shown = approach(shown, 1, 1 / 60, 0.3, 1.5, 0.9);
      frames++;
    }
    expect(shown).toBe(1);
    expect(frames).toBeLessThan(30);
  });
});

describe('smoothFrame', () => {
  const run = (intervals: number[], need = 16, floor = 24) =>
    intervals.reduce<Smoothness>((s, dt) => smoothFrame(s, dt, need, floor), { run: 0, vsync: 0, ok: false });

  it('passes after a run of steady frames', () => {
    expect(run(Array(15).fill(16.7)).ok).toBe(false);
    expect(run(Array(16).fill(16.7)).ok).toBe(true);
  });

  it('starts the run again after a long frame', () => {
    const s = run([...Array(12).fill(16.7), 80, ...Array(10).fill(16.7)]);
    expect(s.ok).toBe(false);
    expect(s.run).toBe(10);
  });

  it('holds a 30 Hz screen to its own refresh, not to 60 Hz', () => {
    expect(run(Array(16).fill(33.4)).ok).toBe(true);
    // a dropped frame there is still a stall
    expect(run([...Array(8).fill(33.4), 70, ...Array(7).fill(33.4)]).ok).toBe(false);
  });

  it('stays passed once passed', () => {
    const s = run([...Array(16).fill(16.7), 300]);
    expect(s.ok).toBe(true);
  });

  it('ignores empty intervals', () => {
    expect(run([0, -1, NaN, ...Array(16).fill(16.7)]).ok).toBe(true);
  });
});

describe('coverSide', () => {
  /** Whether a rounded square of `side` around (cx, cy) contains (x, y). */
  const inside = (side: number, k: number, cx: number, cy: number, x: number, y: number) => {
    const dx = Math.abs(x - cx);
    const dy = Math.abs(y - cy);
    const inset = side * (0.5 - k);
    if (dx > side / 2 || dy > side / 2) return false;
    if (dx <= inset || dy <= inset) return true;
    return (dx - inset) ** 2 + (dy - inset) ** 2 <= (k * side) ** 2 + 1e-6;
  };

  it('finds the smallest rounded square that covers every corner', () => {
    for (const [w, h, cx, cy] of [
      [1440, 900, 720, 414],
      [390, 844, 195, 388],
      [360, 640, 180, 294],
      [2560, 1080, 1280, 497],
    ] as const) {
      const side = coverSide(cx, cy, w, h, 0.24);
      const corners = [
        [0, 0],
        [w, 0],
        [0, h],
        [w, h],
      ] as const;
      const covers = (s: number) => corners.every(([x, y]) => inside(s, 0.24, cx, cy, x, y));
      expect(covers(side)).toBe(true);
      expect(covers(side * 0.98)).toBe(false);
    }
  });
});
