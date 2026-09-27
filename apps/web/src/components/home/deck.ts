/** Pure geometry and gesture rules for the Modes deck (unit tested). */

export interface Pose {
  x: number;
  y: number;
  rotate: number;
  scale: number;
}

/**
 * Where a card rests. Slot 0 is the card in front. On wide screens the rest
 * fan out to the left like a hand of cards, each a little lower and turned;
 * on narrow ones they pile up behind it with their top edges showing.
 */
export function poseFor(slot: number, narrow: boolean): Pose {
  if (slot <= 0) return { x: 0, y: 0, rotate: 0, scale: 1 };
  if (narrow) {
    const tilt = [0, -2.2, 1.8, -1.2, 2.4, -2.8][slot] ?? 0;
    return { x: 0, y: -slot * 9, rotate: tilt, scale: 1 - slot * 0.032 };
  }
  return { x: -slot * 96, y: slot * 10, rotate: -slot * 2.6, scale: 1 - slot * 0.024 };
}

/** Faster than this (px/s) and a release is a throw, however short. */
export const FLICK_VELOCITY = 520;

/** A throw: fast enough, or pulled far enough, to send the card away. */
export function isFlick(offset: number, velocity: number, width: number) {
  return Math.abs(velocity) > FLICK_VELOCITY || Math.abs(offset) > width * 0.3;
}

/** Which way a thrown card leaves: the way it was moving, else the way it was pulled. */
export function flickDirection(offset: number, velocity: number): 1 | -1 {
  const sign = Math.abs(velocity) > FLICK_VELOCITY ? Math.sign(velocity) : Math.sign(offset);
  return sign < 0 ? -1 : 1;
}
