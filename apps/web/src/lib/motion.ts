import { useReducedMotion, type Transition } from 'motion/react';

/**
 * One motion vocabulary for the whole site, mirrored in globals.css
 * (--ease-*, --dur-*). Motion (React state, gestures, scroll) and anime.js
 * (authored SVG and text timelines) both read from here, so the two libraries
 * move alike.
 *
 * Decision order (Emil Kowalski): entering or exiting → ease-out; moving or
 * morphing on screen → ease-in-out; colour and hover → CSS `ease`; constant
 * motion (marquee, countdown, fills) → linear. Never ease-in on UI.
 */

type Bezier = readonly [number, number, number, number];

export const EASE = {
  /** Entrances, exits, UI state. The house curve. */
  out: [0.23, 1, 0.32, 1],
  /** Things that travel or morph on screen: swaps, camera moves. */
  inOut: [0.77, 0, 0.175, 1],
  /** Sheets and the mobile menu (iOS drawer curve). */
  drawer: [0.32, 0.72, 0, 1],
} as const satisfies Record<string, Bezier>;

export const EASE_CSS = {
  out: 'cubic-bezier(0.23, 1, 0.32, 1)',
  inOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
  drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
} as const;

/**
 * Springs, Apple-style (perceived duration + bounce), so they read the same
 * in Motion and in anime.js `spring({ bounce, duration })`.
 */
export const SPRING = {
  /** Layout, focus, nav pill: critically damped, no overshoot. */
  ui: { type: 'spring', bounce: 0, duration: 0.4 },
  /** Physical objects: paddles, stamps, a flicked card. A little overshoot. */
  physical: { type: 'spring', bounce: 0.2, duration: 0.4 },
} as const satisfies Record<string, Transition>;

/** Decorative tracking (heads, eyes, parallax) for `useSpring`. */
export const TRACKING = { stiffness: 100, damping: 10 } as const;

/** Durations in seconds. `ms()` converts for CSS, WAAPI and anime.js. */
export const DURATION = {
  /** Press feedback (:active scale .97). */
  press: 0.16,
  /** Hover and colour changes. */
  hover: 0.15,
  /** Tooltips, small popovers. */
  tooltip: 0.16,
  /** Dropdowns, selects. */
  dropdown: 0.2,
  /** Modals and drawers. */
  modal: 0.3,
  /** Layout, overlay and view transitions. */
  layout: 0.4,
  /** An authored focal entrance: hero words, a paddle reveal. */
  focal: 0.64,
  /** The reduced-motion stand-in: a short opacity fade. */
  fade: 0.2,
  /** Per-item stagger, and the cap on a whole staggered group. */
  stagger: 0.05,
  staggerCap: 0.4,
} as const;

/** Exits run at about two thirds of their entrance. */
export const EXIT_RATIO = 0.65;

export const ms = (seconds: number) => Math.round(seconds * 1000);

export const exitDuration = (enter: number) => enter * EXIT_RATIO;

/** Stagger delay for item `i`, capped so a long list never blocks input. */
export function staggerDelay(i: number, step: number = DURATION.stagger, cap: number = DURATION.staggerCap) {
  return Math.min(Math.max(0, i) * step, cap);
}

/** What reduced motion gets instead of travel: opacity only, quick. */
export const FADE: Transition = { duration: DURATION.fade, ease: 'easeOut' };

/**
 * Reduced-motion aware choices. Reduced means fewer and gentler, not zero:
 * `t(full)` swaps a travelling transition for a short fade, `pick(a, b)`
 * chooses any value by preference.
 *
 *   const { reduce, t } = useMotionSafe();
 *   <motion.div animate={{ opacity: 1, y: 0 }} transition={t(SPRING.ui)} />
 *
 * The server cannot know the preference, so never branch rendered markup on
 * `reduce` (hydration would mismatch); branch motion, or switch markup with a
 * `motion-reduce:` / `@media (prefers-reduced-motion)` style instead.
 * Client components only (it is a hook); the constants above are safe
 * anywhere.
 */
export function useMotionSafe() {
  const reduce = useReducedMotion() ?? false;
  return {
    reduce,
    t: (full: Transition, reduced: Transition = FADE): Transition => (reduce ? reduced : full),
    pick: <T,>(full: T, reduced: T): T => (reduce ? reduced : full),
  };
}
