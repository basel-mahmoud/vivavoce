import { describe, it, expect } from 'vitest';
import { waitlistInput, startSessionInput, submitAnswerInput } from './contracts';

describe('waitlistInput', () => {
  it('normalises email to lowercase and trims', () => {
    const res = waitlistInput.safeParse({ email: '  JANE@Example.COM ' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.email).toBe('jane@example.com');
  });

  it('rejects an invalid email', () => {
    expect(waitlistInput.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });

  it('treats a filled honeypot as invalid (company must be empty)', () => {
    const res = waitlistInput.safeParse({ email: 'a@b.com', company: 'AcmeBot' });
    expect(res.success).toBe(false);
  });

  it('accepts a known persona and rejects an unknown one', () => {
    expect(waitlistInput.safeParse({ email: 'a@b.com', persona: 'student' }).success).toBe(true);
    expect(waitlistInput.safeParse({ email: 'a@b.com', persona: 'astronaut' }).success).toBe(false);
  });
});

describe('startSessionInput', () => {
  it('requires a sufficiently long idempotency key', () => {
    expect(startSessionInput.safeParse({ mode: 'quick', clientSessionKey: 'short' }).success).toBe(false);
    expect(
      startSessionInput.safeParse({ mode: 'quick', clientSessionKey: 'abcdefgh12345' }).success,
    ).toBe(true);
  });

  it('rejects an unknown mode', () => {
    expect(
      startSessionInput.safeParse({ mode: 'freestyle', clientSessionKey: 'abcdefgh12345' }).success,
    ).toBe(false);
  });
});

describe('submitAnswerInput', () => {
  it('caps transcript length to prevent abuse/cost blowups', () => {
    const res = submitAnswerInput.safeParse({
      sessionId: '00000000-0000-0000-0000-000000000000',
      clientAnswerKey: 'abcdefgh12345',
      questionPrompt: 'Q?',
      transcript: 'x'.repeat(6001),
    });
    expect(res.success).toBe(false);
  });
});
