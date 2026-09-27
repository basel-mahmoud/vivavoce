'use client';

import { useEffect } from 'react';
import { bootMark, bootStill } from './client';

/**
 * Rendered where the live room gave way to its fallback: the page's code has run and the room will
 * not go live, so the first-visit loader waits for the poster alone. Renders nothing.
 */
export function BootStill({ why }: { why: string }) {
  useEffect(() => {
    bootMark('app');
    bootStill(why);
  }, [why]);
  return null;
}
