import * as THREE from 'three';
import { SEATS, EXAMINERS } from '../examiners/rig';

/**
 * Where the set's pieces stand, in world units, shared by the meshes that draw them and the
 * cyclorama shader that bakes their contact shadows into the floor (so every tier, with or
 * without a shadow map, shows the same contact).
 *
 * The bench (examiners.glb, build_examiners.py bench_dims) is an arc around a centre in front of
 * the panel: its apron faces the candidate at radius BENCH.front, its back edge sits at
 * BENCH.back, and it spans +-BENCH.halfAngle.
 */

/** The floor the bench stands on (the bench apron runs from 0 down to here). */
export const FLOOR = -0.5;
/** Where the floor starts to curve up into the wall, and the curve's radius. */
export const COVE_Z = -1.6;
export const COVE_R = 1.15;
/** The vertical wall's plane. */
export const WALL_Z = COVE_Z - COVE_R;

export const BENCH = { centreZ: 3.65, front: 3.47, back: 4.1, halfAngle: 0.56 } as const;

/**
 * The riser the panel sits on: a low stage behind the bench, tucked under its back edge and cut
 * square at both ends, so the two outer examiners (wider than the bench) sit on something rather
 * than hanging past its ends. Its top is the examiners' base line.
 */
export const RISER = { inner: 4.02, outer: 5.22, halfX: 2.56, top: -0.42, bevel: 0.012 } as const;

/** The task lamp: its round foot on the floor behind the panel's right end, and its head. */
export const LAMP = {
  foot: new THREE.Vector3(2.62, FLOOR, -1.38),
  footRadius: 0.23,
  height: 2.42,
  head: new THREE.Vector3(1.76, 2.66, -0.5),
  aim: new THREE.Vector3(0.45, 0.3, -0.9),
} as const;

/** Shell widths from scripts/examiners/build_report.json (rig.width). */
export const SHELL_WIDTH = {
  correctness: 1.26,
  clarity: 0.94,
  structure: 1.08,
  conciseness: 0.68,
  confidence: 1.73,
} as const;

/**
 * Where each examiner's shell meets the riser (world x, z centre and half extents, from the GLB's
 * shell bounds at the base line), for the contact shadows baked into the riser's top.
 */
export const FOOTPRINTS: readonly (readonly [number, number, number, number])[] = [
  [-1.7275, -0.613, 0.56, 0.5],
  [-0.914, -0.8585, 0.22, 0.22],
  [0, -0.95, 0.5, 0.41],
  [0.8145, -0.877, 0.33, 0.29],
  [1.6635, -0.6385, 0.78, 0.66],
];

/** Each examiner as (x, z, half width, crown height) for the soft shadows the wall catches. */
export function figureShadows(): THREE.Vector4[] {
  return EXAMINERS.map((k) => {
    const s = SEATS[k];
    return new THREE.Vector4(s.position[0], s.position[2], SHELL_WIDTH[k] / 2, s.top);
  });
}
