/**
 * The scroll story, as positions along the room section's scroll progress
 * (0 = hero pinned at the top, 1 = section released). Shared by the 3D camera
 * director and the DOM captions so they can never drift apart.
 */
export const BEATS = [0.22, 0.36, 0.5, 0.64, 0.78] as const;
export const HERO_END = 0.08;
export const OUTRO = 0.92;

/** Camera keyframes: hero hold, five examiners, outro hold. */
export const STOPS = [0, HERO_END, ...BEATS, OUTRO, 1] as const;
export type PoseName = 'hero' | 0 | 1 | 2 | 3 | 4 | 'outro';
export const STOP_POSES: readonly PoseName[] = ['hero', 'hero', 0, 1, 2, 3, 4, 'outro', 'outro'];

/** Which examiner the scroll is on, or -1 between/outside beats. */
export function beatAt(p: number): number {
  for (let i = 0; i < BEATS.length; i++) {
    if (Math.abs(p - BEATS[i]!) < 0.06) return i;
  }
  return -1;
}

/** smootherstep: zero velocity and acceleration at both ends, so stops hold. */
export function settle(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
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
