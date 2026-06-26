import { describe, it, expect } from 'vitest';
import { limiters } from './ratelimit';

describe('sliding-window rate limiter', () => {
  it('allows up to the limit then blocks, per key', () => {
    const key = `test-${Math.random()}`;
    // waitlist limiter = 5 / hour
    for (let i = 0; i < 5; i++) {
      expect(limiters.waitlist.check(key).ok).toBe(true);
    }
    const blocked = limiters.waitlist.check(key);
    expect(blocked.ok).toBe(false);
    expect(blocked.resetMs).toBeGreaterThan(0);
  });

  it('tracks keys independently', () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    for (let i = 0; i < 5; i++) limiters.waitlist.check(a);
    expect(limiters.waitlist.check(a).ok).toBe(false);
    expect(limiters.waitlist.check(b).ok).toBe(true);
  });

  it('reports decreasing remaining allowance', () => {
    const key = `rem-${Math.random()}`;
    const first = limiters.evaluate.check(key);
    const second = limiters.evaluate.check(key);
    expect(second.remaining).toBeLessThan(first.remaining);
  });
});
