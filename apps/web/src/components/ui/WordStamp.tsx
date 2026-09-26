'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { useMotionSafe } from '@/lib/motion';
import { cn } from '@/lib/cn';

/**
 * blue: the candidate's ink (the default). red: the examiner's stamp, for
 * marks like "Fix first" only. print: coal/ink.
 */
export type StampTone = 'blue' | 'red' | 'print';

export interface WordStampProps {
  /** The words to stamp, first one first. It is also the resting word. */
  words: readonly string[];
  tone?: StampTone;
  /** Time each word stays down, in ms. */
  interval?: number;
  /**
   * false (default): one pass that returns to the first word, finishing in
   * under five seconds for three words. true: keep cycling while on screen.
   * Either way it holds still under the pointer or focus.
   */
  loop?: boolean;
  /** Punctuation that hugs the stamp, e.g. "." at the end of a headline. */
  suffix?: string;
  /** What screen readers hear. Defaults to "viva, interview or pitch". */
  srText?: string;
  className?: string;
}

function listWords(words: readonly string[]) {
  if (words.length < 2) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} or ${words[words.length - 1]}`;
}

/** The stamp comes down a little bigger and more askew than it rests, then settles. */
const LAND = { type: 'spring', bounce: 0.12, visualDuration: 0.32 } as const;

/**
 * A word pressed into the page like a rubber stamp, that cycles through its
 * alternatives (viva, interview, pitch). Each word comes down in place on a
 * short spring, slightly askew, with ink that does not quite take
 * everywhere; the slot fits the word on show and its punctuation hugs the
 * box. The landing never grows past the column: on phones it barely grows
 * at all. Reduced motion crossfades in place. Cycling waits until it is on
 * screen and holds while the tab is hidden, under the pointer or focus.
 */
export function WordStamp({ words, tone = 'blue', interval = 1500, loop = false, suffix, srText, className }: WordStampProps) {
  const slot = useRef<HTMLSpanElement>(null);
  const inView = useInView(slot, { margin: '0px 0px -15% 0px' });
  const { reduce } = useMotionSafe();
  const [index, setIndex] = useState(0);
  const [steps, setSteps] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = words.length;
  const finished = !loop && steps >= count;

  useEffect(() => {
    if (count < 2 || !inView || paused || finished) return;
    let timer = 0;
    const tick = () => {
      if (document.hidden) {
        timer = window.setTimeout(tick, interval);
        return;
      }
      setIndex((i) => (i + 1) % count);
      setSteps((s) => s + 1);
    };
    timer = window.setTimeout(tick, steps === 0 ? interval + 400 : interval);
    return () => window.clearTimeout(timer);
  }, [count, inView, paused, finished, interval, steps]);

  const word = words[index] ?? '';
  // Read at the moment a new word lands (client only): a narrow column gets a gentler landing.
  const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
  const landing = reduce ? { opacity: 0 } : { opacity: 0, scale: narrow ? 1.03 : 1.1, rotate: -4.5 };

  return (
    <span
      className={cn('vv-stamp', className)}
      data-tone={tone}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="sr-only">
        {srText ?? listWords(words)}
        {suffix}
      </span>
      <span ref={slot} className="vv-stamp-slot" aria-hidden="true">
        <span className="vv-stamp-live">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={word}
              className="vv-stamp-box vv-stamp-ink"
              initial={landing}
              animate={
                reduce
                  ? { opacity: 1, transition: { duration: 0.2 } }
                  : { opacity: 1, scale: 1, rotate: -2.5, transition: { ...LAND, opacity: { duration: 0.1 } } }
              }
              exit={{ opacity: 0, transition: { duration: reduce ? 0.2 : 0.12 } }}
              style={{ rotate: -2.5 }}
            >
              {word}
            </motion.span>
          </AnimatePresence>
          {suffix ? <span className="vv-stamp-suffix">{suffix}</span> : null}
        </span>
      </span>
    </span>
  );
}
