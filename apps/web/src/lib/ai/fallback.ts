import type { Evaluation } from './schemas';

const FILLERS = [
  'um',
  'uh',
  'er',
  'like',
  'you know',
  'sort of',
  'kind of',
  'basically',
  'actually',
  'literally',
  'i mean',
];

/**
 * Deterministic, offline heuristic evaluation. Used when Gemini is unavailable
 * or returns unparseable output, so the user is never left with nothing. It is
 * intentionally conservative and clearly labelled as a heuristic in the UI.
 */
export function heuristicEvaluation(
  transcript: string,
  wpm: number | null,
): Evaluation {
  const text = transcript.trim();
  const words = text ? text.split(/\s+/) : [];
  const wordCount = words.length;
  const lower = ` ${text.toLowerCase()} `;
  const fillerHits = FILLERS.reduce(
    (n, f) => n + (lower.split(` ${f} `).length - 1),
    0,
  );
  const fillerRate = wordCount ? Math.min(1, fillerHits / wordCount) : 0;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  // Length sweet-spot ~60-180 words for a spoken answer.
  const lengthScore =
    wordCount === 0 ? 0 : clamp(100 - Math.abs(120 - wordCount) * 0.4);
  const conciseness = clamp(100 - fillerRate * 220);
  const structure = clamp(40 + Math.min(sentences, 6) * 9);
  const confidence = clamp(85 - fillerRate * 200 - (wpm && wpm > 200 ? 15 : 0));
  const clarity = clamp((lengthScore + structure) / 2);
  const correctness = wordCount === 0 ? 0 : 55; // unknown without a reference

  const scores = { correctness, clarity, structure, conciseness, confidence };
  const overall = clamp(
    (correctness + clarity + structure + conciseness + confidence) / 5,
  );
  const weakestAxis = (Object.entries(scores).sort(
    (a, b) => a[1] - b[1],
  )[0]?.[0] ?? 'structure') as Evaluation['weakestAxis'];

  return {
    scores,
    overall,
    weakestAxis,
    summary:
      wordCount === 0
        ? 'We could not detect any speech. Try recording again in a quieter spot.'
        : 'Heuristic review while AI coaching is unavailable: based on length, pacing, and filler words. Full coaching will appear once the evaluator is back.',
    strengths:
      conciseness > 70 ? ['Low filler-word rate — your delivery was clean.'] : [],
    improvements:
      fillerRate > 0.04
        ? ['Cut filler words ("um", "like") to sound more decisive.']
        : ['Add clear signposting: state your structure, then walk through it.'],
    improvedAnswer:
      'Full AI model answers resume automatically when the evaluator is reachable.',
    suggestedFollowUp: 'Try answering the same question again, more concisely.',
    fillerWordRate: Number(fillerRate.toFixed(3)),
  };
}

export function estimateWpm(durationMs: number | null, transcript: string): number | null {
  if (!durationMs || durationMs < 1000) return null;
  const words = transcript.trim().split(/\s+/).filter(Boolean).length;
  if (!words) return null;
  return Math.round((words / durationMs) * 60_000);
}
