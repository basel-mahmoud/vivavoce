'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/** True while the element is on screen (with a little margin). */
export function useOnScreen<T extends Element>(margin = '0px') {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOn(Boolean(e?.isIntersecting)), {
      rootMargin: margin,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, on] as const;
}

/**
 * A cycle counter that ticks every `period` ms while `running`, used as a key
 * to replay CSS sequences. Frozen at 0 under reduced motion.
 */
export function useLoop(period: number, running: boolean) {
  const reduce = useReducedMotion();
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    if (!running || reduce) return;
    const id = setInterval(() => setCycle((c) => c + 1), period);
    return () => clearInterval(id);
  }, [period, running, reduce]);
  return cycle;
}
