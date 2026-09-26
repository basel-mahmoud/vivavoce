/**
 * The panel: one examiner per scoring axis. Order matches the rubric in
 * PRODUCT.md, the demo-eval response keys and the cast in examiners.glb.
 */
export const AXES = [
  {
    key: 'correctness',
    label: 'Correctness',
    ask: 'Did you answer the question they asked?',
    line: 'Relevance first. A brilliant answer to a different question still scores low here.',
  },
  {
    key: 'clarity',
    label: 'Clarity',
    ask: 'Could a smart friend follow you?',
    line: 'Plain words, one idea at a time, no fog of jargon.',
  },
  {
    key: 'structure',
    label: 'Structure',
    ask: 'Is there a claim, an order and a landing?',
    line: 'Signpost it, sequence it, land it. Examiners mark the shape, not just the facts.',
  },
  {
    key: 'conciseness',
    label: 'Conciseness',
    ask: 'Signal, or filler?',
    line: 'Every sentence earns its place. Rambling costs marks even when it is right.',
  },
  {
    key: 'confidence',
    label: 'Confidence',
    ask: 'Do you sound like you mean it?',
    line: 'Hedges, filler words and pace are delivery signals, and they get marked too.',
  },
] as const;

export type AxisKey = (typeof AXES)[number]['key'];

export interface ExampleRound {
  question: string;
  answer: string;
  /** Scores in AXES order. Illustrative, labelled as an example on screen. */
  scores: readonly [number, number, number, number, number];
  followUp: string;
  /** Which examiner (AXES index) asks the question. The weakest asks the follow-up. */
  asker: number;
}

/** Scripted example rounds for the hero. Every surface labels these as examples. */
export const ROUNDS: readonly ExampleRound[] = [
  {
    question: 'Why do candidates who know the material still fail the viva?',
    answer: 'Um, there are lots of reasons, like nerves, and also they sort of know it but…',
    scores: [71, 66, 48, 62, 54],
    followUp: 'You buried your claim. What is the one-line answer?',
    asker: 1,
  },
  {
    question: 'Tell me about a decision you defended under pressure.',
    answer: 'Two weeks before the demo I cut our biggest feature. Here is why, and what it saved.',
    scores: [84, 81, 86, 57, 77],
    followUp: 'Good story, too long. Give it to me in thirty seconds.',
    asker: 0,
  },
  {
    question: 'Explain what an ECG shows, to someone outside medicine.',
    answer: 'It records the heart’s electrical activity, so I guess you can maybe see the rhythm?',
    scores: [88, 83, 74, 79, 52],
    followUp: 'You hedged twice. Say it again like you mean it.',
    asker: 2,
  },
];

export function weakestIndex(scores: readonly number[]): number {
  let lo = 0;
  scores.forEach((s, i) => {
    if (s < scores[lo]!) lo = i;
  });
  return lo;
}

/**
 * Phases of one scripted round, in seconds from the round's start. The room
 * opens on the first round's follow-up (the marked panel, the weakest examiner
 * asking), so the story starts at its most telling moment.
 */
export const ROUND_TIMELINE = {
  ask: 0,
  listen: 3.1,
  mark: 6.6,
  follow: 8.8,
  rest: 13.4,
  next: 14.6,
} as const;

export type RoundPhase = keyof typeof ROUND_TIMELINE;

/** The face an examiner wears once its mark is up. */
export function verdictFace(score: number): 'pleased' | 'attentive' | 'sceptical' {
  if (score >= 70) return 'pleased';
  if (score < 56) return 'sceptical';
  return 'attentive';
}
