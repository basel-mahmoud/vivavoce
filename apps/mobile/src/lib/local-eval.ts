import type { EvaluationResult } from './api';

const FILLERS = ['um', 'uh', 'er', 'like', 'you know', 'basically', 'actually', 'i mean'];

/**
 * On-device heuristic evaluation — mirrors the backend fallback so the app stays
 * useful offline or in demo mode (no backend configured). Clearly surfaced in the
 * UI as a heuristic, not full AI coaching.
 */
export function localEvaluate(
  transcript: string,
  durationMs: number | null,
): EvaluationResult {
  const text = transcript.trim();
  const words = text ? text.split(/\s+/) : [];
  const wordCount = words.length;
  const lower = ` ${text.toLowerCase()} `;
  const fillerHits = FILLERS.reduce((n, f) => n + (lower.split(` ${f} `).length - 1), 0);
  const fillerRate = wordCount ? Math.min(1, fillerHits / wordCount) : 0;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const wpm =
    durationMs && durationMs > 1000 && wordCount
      ? Math.round((wordCount / durationMs) * 60_000)
      : null;

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const lengthScore = wordCount === 0 ? 0 : clamp(100 - Math.abs(120 - wordCount) * 0.4);
  const conciseness = clamp(100 - fillerRate * 220);
  const structure = clamp(40 + Math.min(sentences, 6) * 9);
  const confidence = clamp(85 - fillerRate * 200 - (wpm && wpm > 200 ? 15 : 0));
  const clarity = clamp((lengthScore + structure) / 2);
  const correctness = wordCount === 0 ? 0 : 58;

  const scores = { correctness, clarity, structure, conciseness, confidence };
  const overall = clamp((correctness + clarity + structure + conciseness + confidence) / 5);
  const weakestAxis =
    Object.entries(scores).sort((a, b) => a[1] - b[1])[0]?.[0] ?? 'structure';

  return {
    answerId: `local-${Date.now()}`,
    source: 'heuristic',
    scores,
    overall,
    weakestAxis,
    summary:
      wordCount === 0
        ? 'We could not detect any speech — try again in a quieter spot.'
        : 'Heuristic review based on length, pacing, and filler words. Connect to get full AI coaching with a model answer.',
    strengths: conciseness > 70 ? ['Clean delivery — low filler-word rate.'] : [],
    improvements:
      fillerRate > 0.04
        ? ['Cut filler words to sound more decisive.']
        : ['State your structure up front, then walk through it.'],
    improvedAnswer: 'Full AI model answers appear when you’re connected.',
    suggestedFollowUp: 'Answer the same question again, more concisely.',
    fillerWordRate: Number(fillerRate.toFixed(3)),
    wordsPerMinute: wpm,
  };
}
