import { describe, it, expect } from 'vitest';
import { heuristicEvaluation, estimateWpm } from './fallback';

describe('heuristicEvaluation', () => {
  it('returns all-zero correctness and a no-speech summary for empty input', () => {
    const e = heuristicEvaluation('', null);
    expect(e.scores.correctness).toBe(0);
    expect(e.overall).toBe(0);
    expect(e.summary).toMatch(/could not detect/i);
  });

  it('penalises filler-heavy answers on conciseness and confidence', () => {
    const clean = heuristicEvaluation(
      'The mechanism is clear. First the trigger, then the response, then resolution.',
      null,
    );
    const fillers = heuristicEvaluation(
      'um like you know basically i mean um like the thing is um you know',
      null,
    );
    expect(fillers.scores.conciseness).toBeLessThan(clean.scores.conciseness);
    expect(fillers.fillerWordRate!).toBeGreaterThan(clean.fillerWordRate!);
  });

  it('clamps every score to the 0..100 range', () => {
    const e = heuristicEvaluation('word '.repeat(400), 999999);
    for (const v of Object.values(e.scores)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('picks the lowest axis as weakestAxis', () => {
    const e = heuristicEvaluation('A short answer.', null);
    const min = Math.min(...Object.values(e.scores));
    expect(e.scores[e.weakestAxis]).toBe(min);
  });
});

describe('estimateWpm', () => {
  it('returns null when duration is too short or missing', () => {
    expect(estimateWpm(null, 'hello world')).toBeNull();
    expect(estimateWpm(500, 'hello world')).toBeNull();
  });

  it('computes words per minute from duration', () => {
    // 10 words in 60s -> 10 wpm
    expect(estimateWpm(60_000, 'one two three four five six seven eight nine ten')).toBe(10);
  });
});
