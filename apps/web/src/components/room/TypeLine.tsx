'use client';

import { useEffect, useState } from 'react';

/**
 * Types a line out character by character. Owns its own timer so the parent
 * (and the 3D scene) never re-renders per keystroke. `instant` renders the
 * whole line at once. The blue-ink caret is the candidate's; pass
 * `caret={false}` for an examiner's words.
 */
export function TypeLine({
  text,
  cps = 38,
  delay = 0,
  instant = false,
  caret = true,
  className,
}: {
  text: string;
  /** characters per second */
  cps?: number;
  delay?: number;
  instant?: boolean;
  caret?: boolean;
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

  const shown = instant ? text.length : count;
  if (shown >= text.length) {
    return (
      <span className={className}>
        <span className="sr-only">{text}</span>
        <span aria-hidden>{text}</span>
      </span>
    );
  }
  // While it types, the rest of the line holds its place (invisible), so the note has its final
  // size from the first letter and nothing reflows. The word being typed never breaks at the
  // caret, and the caret takes no room of its own.
  const wordStart = text.lastIndexOf(' ', shown - 1) + 1;
  const space = text.indexOf(' ', shown);
  const wordEnd = space < 0 ? text.length : space;
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.slice(0, wordStart)}
        <span className="whitespace-nowrap">
          {text.slice(wordStart, shown)}
          {caret && <span className="caret mr-[calc(-0.5em_-_2px)]" />}
          <span className="invisible">{text.slice(shown, wordEnd)}</span>
        </span>
        <span className="invisible">{text.slice(wordEnd)}</span>
      </span>
    </span>
  );
}
