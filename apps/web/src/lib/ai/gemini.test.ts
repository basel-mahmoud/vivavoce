import { describe, it, expect } from 'vitest';
import { extractJson } from './gemini';
import { evaluationSchema } from './schemas';

describe('extractJson', () => {
  it('parses bare JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });
  it('unwraps fenced ```json blocks', () => {
    expect(extractJson('```json\n{"a":2}\n```')).toEqual({ a: 2 });
  });
  it('recovers an object embedded in prose', () => {
    expect(extractJson('Here you go: {"a":3} — thanks')).toEqual({ a: 3 });
  });
  it('returns null for non-JSON', () => {
    expect(extractJson('not json at all')).toBeNull();
    expect(extractJson(null)).toBeNull();
  });
});

describe('evaluationSchema', () => {
  const valid = {
    scores: { correctness: 80, clarity: 70, structure: 60, conciseness: 75, confidence: 65 },
    overall: 70,
    weakestAxis: 'structure',
    summary: 'Good but wandered.',
    strengths: ['clear opening'],
    improvements: ['signpost earlier'],
    improvedAnswer: 'A tighter answer.',
    suggestedFollowUp: 'What about edge cases?',
    fillerWordRate: 0.02,
  };

  it('accepts a well-formed evaluation', () => {
    expect(evaluationSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an out-of-range score', () => {
    const bad = { ...valid, scores: { ...valid.scores, clarity: 140 } };
    expect(evaluationSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an unknown weakest axis', () => {
    const bad = { ...valid, weakestAxis: 'charisma' };
    expect(evaluationSchema.safeParse(bad).success).toBe(false);
  });

  it('coerces numeric strings for scores', () => {
    const coerced = { ...valid, overall: '70' };
    const res = evaluationSchema.safeParse(coerced);
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.overall).toBe(70);
  });
});
