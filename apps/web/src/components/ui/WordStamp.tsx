'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { SPRING, useMotionSafe } from '@/lib/motion';
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
  /**
   * true (default): the slot is as wide as the longest word, so nothing
   * around it ever reflows. false: the slot fits the word on show, so a short
   * word never leaves a gap (for narrow columns); the suffix slides along.
   */
  reserve?: boolean;
  /** What screen readers hear. Defaults to "viva, interview or pitch". */
  srText?: string;
  className?: string;
}

function listWords(words: readonly string[]) {
  if (words.length < 2) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} or ${words[words.length - 1]}`;
}

/**
 * A word pressed into the page like a rubber stamp, that cycles through its
 * alternatives (viva, interview, pitch). Each word lands on a physical
 * spring, slightly askew, with ink that does not quite take everywhere. By
 * default the slot reserves the longest word so nothing around it reflows.
 * Reduced motion crossfades in place. Cycling waits until it is on screen
 * and holds while the tab is hidden.
 */
export function WordStamp({
  words,
  tone = 'blue',
  interval = 1500,
  loop = false,
  suffix,
  reserve = true,
  srText,
  className,
}: WordStampProps) {
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
        {/* Invisible sizers: the slot is as wide as the longest word. */}
        {reserve
          ? words.map((w) => (
              <span key={w} className="vv-stamp-sizer">
                <span className="vv-stamp-box">{w}</span>
                {suffix}
              </span>
            ))
          : null}
        <span className="vv-stamp-live">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={word}
              className="vv-stamp-box vv-stamp-ink"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.45, rotate: -9 }}
              animate={
                reduce
                  ? { opacity: 1, transition: { duration: 0.2 } }
                  : {
                      opacity: 1,
                      scale: 1,
                      rotate: -2.5,
                      transition: { ...SPRING.physical, opacity: { duration: 0.12 } },
                    }
              }
              exit={{ opacity: 0, transition: { duration: reduce ? 0.2 : 0.14 } }}
              style={{ rotate: -2.5 }}
            >
              {word}
            </motion.span>
          </AnimatePresence>
          {suffix ? (
            <motion.span layout="position" transition={reduce ? { duration: 0 } : SPRING.ui}>
              {suffix}
            </motion.span>
          ) : null}
        </span>
      </span>
    </span>
  );
}
