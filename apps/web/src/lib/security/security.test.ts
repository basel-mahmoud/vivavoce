import { describe, it, expect } from 'vitest';
import { redact, maskEmail } from './redact';
import { hashIp, safeEqual } from './hash';

describe('redact', () => {
  it('masks sensitive keys and emails, leaving safe data intact', () => {
    const out = redact({
      email: 'jane.doe@university.edu',
      transcript: 'my private spoken answer',
      token: 'secret-token',
      mode: 'mock_viva',
      nested: { password: 'hunter2', score: 88 },
    }) as Record<string, unknown>;

    expect(out.transcript).toBe('[redacted]');
    expect(out.token).toBe('[redacted]');
    expect(out.mode).toBe('mock_viva');
    expect(out.email).toMatch(/^ja\*+@university\.edu$/);
    expect((out.nested as Record<string, unknown>).password).toBe('[redacted]');
    expect((out.nested as Record<string, unknown>).score).toBe(88);
  });

  it('handles arrays and primitives without throwing', () => {
    expect(redact([1, 'a', { token: 'x' }])).toEqual([1, 'a', { token: '[redacted]' }]);
    expect(redact('plain')).toBe('plain');
  });
});

describe('maskEmail', () => {
  it('keeps the first two chars and the domain', () => {
    expect(maskEmail('alexander@x.com')).toBe('al*******@x.com');
  });
});

describe('hashIp', () => {
  it('is deterministic and never returns the raw IP', () => {
    const a = hashIp('203.0.113.5');
    const b = hashIp('203.0.113.5');
    expect(a).toBe(b);
    expect(a).not.toContain('203.0.113.5');
    expect(hashIp(null)).toBeNull();
  });
});

describe('safeEqual', () => {
  it('compares strings without length leaks', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
