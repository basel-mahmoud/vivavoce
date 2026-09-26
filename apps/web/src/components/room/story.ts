/**
 * The scroll story, as positions along the room section's scroll progress
 * (0 = hero pinned at the top, 1 = section released). Shared by the 3D camera
 * director and the DOM captions so they can never drift apart.
 */
export const BEATS = [0.22, 0.36, 0.5, 0.64, 0.78] as const;
export const HERO_END = 0.08;
export const OUTRO = 0.9;

/**
 * The edit: every stop is a composed shot. Wide on the hero and the outro,
 * then medium, close-up, over the candidate's shoulder, close-up, medium, and
 * a last push-in as the panel turns to the visitor.
 */
export type ShotName = 'hero' | 'beat0' | 'beat1' | 'beat2' | 'beat3' | 'beat4' | 'outro' | 'handoff';
export type ShotKind = 'wide' | 'medium' | 'close' | 'shoulder';

export const SHOT_KIND: Record<ShotName, ShotKind> = {
  hero: 'wide',
  beat0: 'medium',
  beat1: 'close',
  beat2: 'shoulder',
  beat3: 'close',
  beat4: 'medium',
  outro: 'wide',
  handoff: 'wide',
};

/** Camera keyframes: hero hold, five examiners, the marked panel, the hand-off. */
export const STOPS = [0, HERO_END, ...BEATS, OUTRO, 1] as const;
export const STOP_SHOTS: readonly ShotName[] = ['hero', 'hero', 'beat0', 'beat1', 'beat2', 'beat3', 'beat4', 'outro', 'handoff'];

/** Half-width of a beat's window: the examiner holds the stage inside it. */
export const BEAT_WINDOW = 0.06;

/** Which examiner the scroll is on, or -1 between/outside beats. */
export function beatAt(p: number): number {
  for (let i = 0; i < BEATS.length; i++) {
    if (Math.abs(p - BEATS[i]!) < BEAT_WINDOW) return i;
  }
  return -1;
}

/** The stop pair around p and the eased blend between them (stops hold). */
export function stopBlend(p: number): { a: number; b: number; t: number } {
  let k = 0;
  while (k < STOPS.length - 2 && p > STOPS[k + 1]!) k++;
  const t = settle((p - STOPS[k]!) / (STOPS[k + 1]! - STOPS[k]!));
  return { a: k, b: k + 1, t };
}

/**
 * Reduced motion: the still frame the scroll is nearest to (a cut, never a
 * flight). 0 is the hero, 1..5 the beats, 6 the marked panel.
 */
export function stillAt(p: number): number {
  const marks = [0, ...BEATS, OUTRO];
  let best = 0;
  for (let i = 1; i < marks.length; i++) {
    const mid = (marks[i - 1]! + marks[i]!) / 2;
    if (p >= mid) best = i;
  }
  return best;
}

/** smootherstep: zero velocity and acceleration at both ends, so stops hold. */
export function settle(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/** Hermite smoothstep between two edges, clamped. */
export function smooth(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Piecewise-linear map, clamped at both ends. */
export function ramp(v: number, input: readonly number[], output: readonly number[]): number {
  if (v <= input[0]!) return output[0]!;
  for (let i = 1; i < input.length; i++) {
    if (v <= input[i]!) {
      const t = (v - input[i - 1]!) / (input[i]! - input[i - 1]!);
      return output[i - 1]! + (output[i]! - output[i - 1]!) * t;
    }
  }
  return output[output.length - 1]!;
}
