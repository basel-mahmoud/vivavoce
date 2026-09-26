'use client';

import { useEffect, useState } from 'react';
import { AXES } from '@/components/room/data';
import { BEAT, speakDuration } from './choreo';
import { stageScale } from './stage';

/**
 * The marking sequence's clock for the DOM (the portrait bench, the red pen, the board, the
 * stamp): seconds since the marks arrived, stepping only at the beats that change something, so
 * React renders a dozen times across the sequence, never per frame. -1 before the marks arrive;
 * Infinity (everything at once) under reduced motion.
 */
export function useMarkClock(run: number | null, reduce: boolean, followUp: string): number {
  const [clock, setClock] = useState<{ run: number | null; t: number }>({ run: null, t: -1 });

  useEffect(() => {
    if (run === null || reduce) return;
    const steps = new Set<number>([0, BEAT.hot, BEAT.board, BEAT.pen, BEAT.speak, BEAT.speak + speakDuration(followUp) + 0.36, BEAT.stamp, BEAT.done]);
    AXES.forEach((_, i) => {
      steps.add(BEAT.raise + i * BEAT.stagger);
      steps.add(BEAT.faces + i * BEAT.stagger);
    });
    const slow = stageScale();
    const timers = [...steps].map((at) => window.setTimeout(() => setClock({ run, t: at }), (at * 1000) / slow));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [run, reduce, followUp]);

  if (run === null) return -1;
  if (reduce) return Infinity;
  return clock.run === run ? clock.t : -1;
}
