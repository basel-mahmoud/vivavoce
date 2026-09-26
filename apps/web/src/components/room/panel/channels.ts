import * as THREE from 'three';
import { WAVE_SAMPLES, type FaceState } from '../examiners/faceMaterial';
import { EXAMINERS } from '../examiners/rig';

/** The free hand: resting on the bench, offered palm up, at the chin, or holding Clarity's loupe. */
export type Gesture = 'rest' | 'present' | 'chin' | 'loupe';

/** Where an examiner looks: the camera (the candidate), the pointer, or another examiner (index). */
export type LookAt = 'camera' | 'pointer' | number;

/**
 * One examiner's live targets. A director writes these every frame; the panel reads them in its own
 * useFrame and animates toward them (springs, stagger, anticipation), so nothing here is ever a
 * React state and nothing allocates per frame.
 */
export interface ExaminerChannel {
  /** 0..1: lean in and take the light pool. Focus never recolours a body. */
  focus: number;
  /** 0: resting face-down on the bench, axis name up. 1: raised, flipped to show the mark. */
  paddle: number;
  /** 0..1: the vermilion coin, the examiner's red pen. */
  hot: number;
  /** 0..1: the speaking face (bars follow `PanelChannels.speech`), the on-air tally and a small gesture. */
  speaking: number;
  /** The face when not speaking. */
  face: FaceState;
  /** The free hand. `loupe` only means something for Clarity. */
  gesture: Gesture;
  look: LookAt;
  /** The mark set on the paddle's face. */
  mark: number;
  /** Seconds to wait before a paddle move starts: the panel's stagger. */
  delay: number;
  /** World-space centre of the raised coin. */
  coin: THREE.Vector3;
}

export interface PanelChannels {
  examiners: ExaminerChannel[];
  /** 0..1 speech envelope of whoever speaks. */
  speech: number;
  /** 0..1 marking progress on 'marking' faces. */
  progress: number;
  /** Samples in -1..1 for 'listening' faces (a live mic meter or a synthetic voice). */
  wave: Float32Array;
  /** False shows the faces' own idle wave instead of `wave`. */
  waveLive: boolean;
  /** Pointer in normalised device coordinates, for `look: 'pointer'` (fine pointers only). */
  pointer: THREE.Vector2;
  /** Metronome speed for Conciseness's needle (1 is about 96 bpm). */
  tempo: number;
  /** Reduced motion: no idle life, faces still, every move snaps. */
  still: boolean;
}

/** Hero-shot coin positions (world): a low-high-mid-high-low skyline that clears every face. */
export const DEFAULT_COINS: readonly (readonly [number, number, number])[] = [
  [-2.4, 1.24, -0.42],
  [-1.42, 1.8, -0.55],
  [0.6, 0.98, -0.42],
  [1.32, 1.82, -0.6],
  [2.16, 1.46, -0.42],
];

export function createChannels(): PanelChannels {
  return {
    examiners: EXAMINERS.map((_, i) => ({
      focus: 0,
      paddle: 0,
      hot: 0,
      speaking: 0,
      face: 'neutral' as FaceState,
      gesture: 'rest' as Gesture,
      look: 'camera' as LookAt,
      mark: 0,
      delay: 0,
      coin: new THREE.Vector3(...DEFAULT_COINS[i]!),
    })),
    speech: 0,
    progress: 0,
    wave: new Float32Array(WAVE_SAMPLES),
    waveLive: false,
    pointer: new THREE.Vector2(),
    tempo: 1,
    still: false,
  };
}
