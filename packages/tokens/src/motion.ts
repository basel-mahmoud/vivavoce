/** Motion tokens — physical, quiet, purposeful. */

export const duration = {
  fast: 120,
  base: 200,
  slow: 360,
  deliberate: 560,
} as const;

export const easing = {
  /** Standard — most state changes. */
  standard: [0.2, 0.8, 0.2, 1] as const,
  /** Entrances — slight overshoot-free settle. */
  entrance: [0.16, 1, 0.3, 1] as const,
  /** Exits. */
  exit: [0.4, 0, 1, 1] as const,
} as const;

export const cssEasing = {
  standard: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  entrance: 'cubic-bezier(0.16, 1, 0.3, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

/** Spring presets for Reanimated / motion (physical, restrained). */
export const spring = {
  gentle: { damping: 22, stiffness: 180, mass: 1 },
  snappy: { damping: 18, stiffness: 320, mass: 0.9 },
  press: { damping: 26, stiffness: 420, mass: 0.8 },
} as const;
