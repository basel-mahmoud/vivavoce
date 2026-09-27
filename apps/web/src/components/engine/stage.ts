import { devTimeScale } from '@/components/room/dev';
import type { Phase } from './engine';

/**
 * What the page tells the 3D stage, written in place when the round moves on (never React state
 * inside the canvas). Times are performance.now() in seconds.
 */
export interface StageCue {
  phase: Phase;
  /** When the current phase began. */
  since: number;
  /** When the marks arrived (the marking sequence's zero). */
  markedAt: number;
  /** In AXES order; null where the examiner could not mark. */
  marks: (number | null)[];
  /** AXES index of the examiner who asks the follow-up, or -1. */
  weakest: number;
  followUp: string;
  /** An examiner asking the question aloud while the candidate is still idle: who (AXES index, -1 for
   * nobody), what, and when they began. */
  askWho: number;
  askText: string;
  askAt: number;
}

/** DOM the stage positions every frame: the examiner's note and its red leader. */
export interface StageOverlays {
  tag: HTMLElement | null;
  leader: HTMLElement | null;
}

export function createCue(): StageCue {
  return {
    phase: 'idle',
    since: 0,
    markedAt: 0,
    marks: [null, null, null, null, null],
    weakest: -1,
    followUp: '',
    askWho: -1,
    askText: '',
    askAt: 0,
  };
}

let scale: number | null = null;

/**
 * How fast the round's clocks run: 1 for every visitor. In development, `?timescale=0.25` slows the
 * whole marking sequence (3D, timers and morphs alike) to review it frame by frame, as in the room.
 */
export function stageScale(): number {
  if (scale === null) scale = typeof window === 'undefined' ? 1 : devTimeScale();
  return scale;
}

let held: number | null = null;

/** The round's clock, in seconds: what the cue's times are measured on. */
export function stageNow(): number {
  if (process.env.NODE_ENV !== 'production' && held !== null) return held;
  return (performance.now() / 1000) * stageScale();
}

/**
 * Development only: hold the round's clock at `t` seconds (null lets it run again). The stage's
 * `?step` review mode steps it, frame by frame, together with the 3D panel.
 */
export function holdStageClock(t: number | null) {
  if (process.env.NODE_ENV !== 'production') held = t;
}
