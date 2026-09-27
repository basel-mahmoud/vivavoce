import type { UserStats } from '@/lib/db/practice.repo';

export const AXIS_ORDER = ['correctness', 'clarity', 'structure', 'conciseness', 'confidence'] as const;
export type AxisKey = (typeof AXIS_ORDER)[number];

export const AXIS_LABEL: Record<AxisKey, string> = {
  correctness: 'Correctness',
  clarity: 'Clarity',
  structure: 'Structure',
  conciseness: 'Conciseness',
  confidence: 'Confidence',
};

/** Session modes as the app names them. */
export const MODE_NAME: Record<string, string> = {
  quick: 'Quick Question',
  mock_viva: 'Mock Viva',
  interview: 'Interview',
  flash_recall: 'Flash Recall',
  explain: 'Explain It',
  rapid_fire: 'Rapid Fire',
};

export const modeName = (mode: string) =>
  MODE_NAME[mode] ?? mode.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export const axisLabel = (key: string) =>
  AXIS_LABEL[key as AxisKey] ?? key.replace(/^\w/, (c) => c.toUpperCase());

/** Index of the lowest and highest mark (the first one wins a tie). */
export function extremes(values: readonly number[]) {
  let lo = 0;
  let hi = 0;
  values.forEach((v, i) => {
    if (v < values[lo]!) lo = i;
    if (v > values[hi]!) hi = i;
  });
  return { lo, hi };
}

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Heat levels 0 to 3 by share of the busiest day, like the app's grid. */
export function heatLevel(count: number, max: number): 0 | 1 | 2 | 3 {
  if (count <= 0 || max <= 0) return 0;
  const r = count / max;
  if (r <= 0.34) return 1;
  if (r <= 0.67) return 2;
  return 3;
}

export interface HeatCell {
  key: string;
  count: number;
  future: boolean;
  today: boolean;
  month: number;
}

/**
 * Twelve weeks as columns of seven days (Sunday first), ending with the
 * current week. Days after today are marked future and drawn empty.
 */
export function heatColumns(heatmap: UserStats['heatmap'], today: Date): HeatCell[][] {
  const noon = new Date(today);
  noon.setHours(12, 0, 0, 0);
  const byDay = new Map(heatmap.map((d) => [d.day, d.count]));
  const weekday = noon.getDay();
  const todayKey = iso(noon);
  const cols: HeatCell[][] = [];
  for (let w = 11; w >= 0; w--) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(noon.getTime() - (w * 7 + (weekday - d)) * DAY);
      const key = iso(date);
      col.push({
        key,
        count: byDay.get(key) ?? 0,
        future: date.getTime() > noon.getTime(),
        today: key === todayKey,
        month: date.getMonth(),
      });
    }
    cols.push(col);
  }
  return cols;
}

/** A tiny seeded generator, so the example board is the same on every visit. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The board a visitor sees before signing in: twelve weeks of a student
 * getting ready for a viva, labelled as an example wherever it shows. It is
 * consistent with itself: a five-day streak ending today, a best run of
 * twelve, lifetime answers that add up to the heat grid.
 */
export function exampleStats(today: Date = new Date()): UserStats {
  const rand = seeded(20260626);
  const noon = new Date(today);
  noon.setHours(12, 0, 0, 0);
  const heatmap: UserStats['heatmap'] = [];
  for (let back = 83; back >= 0; back--) {
    const ramp = 1 - back / 83;
    let count = 0;
    const streak = back <= 4;
    const best = back >= 22 && back <= 33;
    const rest = back === 5 || back === 21 || back === 34;
    if (streak || best) count = 1 + Math.floor(rand() * (2 + ramp * 5));
    else if (!rest && rand() < 0.22 + ramp * 0.4) count = 1 + Math.floor(rand() * (1 + ramp * 4));
    if (count) heatmap.push({ day: iso(new Date(noon.getTime() - back * DAY)), count });
  }
  const answers = heatmap.reduce((sum, d) => sum + d.count, 0);
  const lastWeek = heatmap.slice(-7).reduce((sum, d) => sum + d.count, 0);
  return {
    streak: { current: 5, longest: 12, freezeAvailable: true },
    overall: 60,
    overallDelta: 6,
    sessionsTotal: Math.round(answers / 4.4),
    answersTotal: answers,
    minutesThisWeek: Math.round(lastWeek * 1.8),
    axisAverages: { correctness: 71, clarity: 66, structure: 48, conciseness: 62, confidence: 54 },
    confidenceTrend: [44, 47, 46, 50, 52, 51, 54],
    heatmap,
    recent: [
      { id: 'ex-1', deckTitle: 'Cardiology viva', mode: 'mock_viva', overall: 58, weakest: 'structure', when: 'Today' },
      { id: 'ex-2', deckTitle: 'Cardiology viva', mode: 'flash_recall', overall: 64, weakest: 'structure', when: 'Yesterday' },
      { id: 'ex-3', deckTitle: 'Renal physiology', mode: 'explain', overall: 61, weakest: 'structure', when: '2 days ago' },
      { id: 'ex-4', deckTitle: 'Behavioural interview', mode: 'interview', overall: 57, weakest: 'structure', when: '3 days ago' },
      { id: 'ex-5', deckTitle: 'Pharmacology', mode: 'rapid_fire', overall: 55, weakest: 'structure', when: '4 days ago' },
    ],
    hasData: true,
  };
}
