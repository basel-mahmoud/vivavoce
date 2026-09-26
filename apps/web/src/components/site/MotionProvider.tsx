'use client';

import { MotionConfig } from 'motion/react';

/**
 * Site-wide motion policy: under prefers-reduced-motion, Motion drops
 * transform and layout animation but keeps opacity, so reduced means gentler,
 * not broken. Components with loops or scroll-driven scenes still check
 * useReducedMotion() themselves.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
