import { describe, expect, it } from 'vitest';
import { BEATS, HERO_END, OUTRO, STOPS, STOP_SHOTS, beatAt, ramp, settle, stillAt, stopBlend } from './story';

describe('room story timing', () => {
  it('has one shot per stop', () => {
    expect(STOP_SHOTS).toHaveLength(STOPS.length);
  });

  it('holds on each stop: the eased blend has no slope at either end', () => {
    expect(settle(0)).toBe(0);
    expect(settle(1)).toBe(1);
    expect(settle(0.02)).toBeLessThan(0.001);
    expect(1 - settle(0.98)).toBeLessThan(0.001);
  });

  it('finds the examiner on stage inside its window only', () => {
    BEATS.forEach((b, i) => expect(beatAt(b)).toBe(i));
    expect(beatAt(0)).toBe(-1);
    expect(beatAt((BEATS[0] + BEATS[1]) / 2)).toBe(-1);
  });

  it('blends between the two stops around a position', () => {
    const hero = stopBlend(0.02);
    expect(STOP_SHOTS[hero.a]).toBe('hero');
    const beat = stopBlend(BEATS[2]);
    expect(STOP_SHOTS[beat.a === beat.b ? beat.a : beat.t > 0.5 ? beat.b : beat.a]).toBe('beat2');
  });

  it('cuts to the nearest still under reduced motion', () => {
    expect(stillAt(0)).toBe(0);
    expect(stillAt(HERO_END)).toBe(0);
    BEATS.forEach((b, i) => expect(stillAt(b)).toBe(i + 1));
    expect(stillAt(OUTRO)).toBe(6);
    expect(stillAt(1)).toBe(6);
  });

  it('maps piecewise and clamps', () => {
    expect(ramp(-1, [0, 1], [10, 20])).toBe(10);
    expect(ramp(0.5, [0, 1], [10, 20])).toBe(15);
    expect(ramp(2, [0, 1], [10, 20])).toBe(20);
  });
});
