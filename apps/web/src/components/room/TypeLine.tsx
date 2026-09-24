'use client';

import { useEffect, useState } from 'react';

/**
 * Types a line out character by character, with the vermilion caret while it
 * runs. Owns its own timer so the parent (and the 3D scene) never re-renders
 * per keystroke. `instant` renders the whole line with no caret.
 */
export function TypeLine({
  text,
  cps = 38,
  delay = 0,
  instant = false,
  className,
}: {
  text: string;
  /** characters per second */
  cps?: number;
  delay?: number;
  instant?: boolean;
  className?: string;
}) {
  const [count, setCount] = useState(instant ? text.length : 0);

  useEffect(() => {
    if (instant) return;
    let id: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      const step = 1000 / cps;
      id = setInterval(() => {
        setCount((c) => {
          if (c >= text.length) {
            if (id) clearInterval(id);
            return c;
          }
          return c + 1;
        });
      }, step);
    }, delay);
    return () => {
      clearTimeout(start);
      if (id) clearInterval(id);
    };
  }, [text, cps, delay, instant]);

  const done = count >= text.length;
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className={done ? undefined : 'caret'}>
        {text.slice(0, count)}
      </span>
    </span>
  );
}
