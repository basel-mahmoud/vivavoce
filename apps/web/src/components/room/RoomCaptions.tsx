'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { motion, useTransform, type MotionValue } from 'motion/react';
import { ArrowRight, Mic } from 'lucide-react';
import { RedPen } from '@/components/ui/RedPen';
import { cn } from '@/lib/cn';
import { AXES, ROUNDS, weakestIndex } from './data';
import { BEATS, BEAT_WINDOW, HERO_END, OUTRO, ramp } from './story';
import styles from './room.module.css';

/** A headline word that rises into focus (CSS, so it plays before hydration). */
function Rise({ i, children }: { i: number; children: ReactNode }) {
  return (
    <span className="rise" style={{ '--i': i } as React.CSSProperties}>
      {children}
    </span>
  );
}

/**
 * The first viewport's copy: the promise in two lines, "before" circled in red pen, one support
 * line and the two keys. It fades as the scroll leaves the hero; focusing a key brings it back.
 */
export function HeroCopy({ progress, onFocusBack }: { progress: MotionValue<number>; onFocusBack: () => void }) {
  const opacity = useTransform(progress, (v) => ramp(v, [HERO_END - 0.035, HERO_END + 0.01], [1, 0]));
  const y = useTransform(progress, (v) => ramp(v, [0, HERO_END + 0.01], [0, -36]));
  const visibility = useTransform(opacity, (o) => (o > 0.02 ? 'visible' : 'hidden'));

  return (
    <motion.div
      style={{ opacity, y, visibility }}
      onFocus={onFocusBack}
      className="relative max-w-[40rem] motion-reduce:!transform-none"
    >
      <h1 className="display text-[clamp(2.45rem,10.4vw,4.4rem)] text-ink [@media(min-width:768px)_and_(min-aspect-ratio:21/20)]:text-[clamp(2.4rem,4vw,4.6rem)]">
        <span className="block">
          <Rise i={0}>Say</Rise> <Rise i={1}>it</Rise> <Rise i={2}>out</Rise> <Rise i={3}>loud</Rise>
        </span>
        <span className="block">
          <Rise i={4}>
            <RedPen mark="circle" play="mount" delay={1250}>
              before
            </RedPen>
          </Rise>{' '}
          <Rise i={5}>it</Rise> <Rise i={6}>counts.</Rise>
        </span>
      </h1>
      <p
        className="rise mt-4 max-w-[30rem] text-[1.02rem] font-medium leading-relaxed text-ink-mut sm:mt-6 sm:text-[1.2rem]"
        style={{ '--i': 7 } as React.CSSProperties}
      >
        Real exam questions, answered out loud and marked on five axes in seconds.
      </p>
      <div className="rise mt-5 flex flex-wrap items-center gap-2 sm:mt-8 sm:gap-3" style={{ '--i': 8 } as React.CSSProperties}>
        <a
          href="#live"
          className="btn btn-primary btn-lg max-sm:h-12 max-sm:px-4 max-sm:text-[0.94rem] max-[389px]:px-3! max-[389px]:text-[0.88rem]!"
        >
          <Mic size={18} aria-hidden />
          Answer a question
        </a>
        <Link
          href="/waitlist"
          className="btn btn-secondary btn-lg max-sm:h-12 max-sm:px-4 max-sm:text-[0.94rem] max-[389px]:px-3! max-[389px]:text-[0.88rem]!"
        >
          Get early access
        </Link>
      </div>
    </motion.div>
  );
}

/** Each axis question, with the phrase that matters split out for the highlighter. */
const ASKS: readonly (readonly [string, string, string])[] = [
  ['Did you answer ', 'the question they asked', '?'],
  ['Could a smart friend ', 'follow', ' you?'],
  ['Is there a ', 'claim', ', an order and a landing?'],
  ['Signal, or ', 'filler', '?'],
  ['Do you sound like you ', 'mean it', '?'],
];

const WEAKEST = weakestIndex(ROUNDS[0]!.scores);

/**
 * One examiner's note on the exam script: its mark circled in red pen in the margin, and, right of
 * the margin rule, the axis, its question with the phrase that matters under the highlighter, and
 * what the axis rewards. The flaw itself is marked on the transcript slip below.
 */
export function MarginNote({ index, progress, active }: { index: number; progress: MotionValue<number>; active: boolean }) {
  const c = BEATS[index]!;
  const range = [c - BEAT_WINDOW - 0.025, c - BEAT_WINDOW + 0.02, c + BEAT_WINDOW - 0.02, c + BEAT_WINDOW + 0.025];
  const opacity = useTransform(progress, (v) => ramp(v, range, [0, 1, 1, 0]));
  const y = useTransform(progress, (v) => ramp(v, range, [24, 0, 0, -24]));
  const visibility = useTransform(opacity, (o) => (o > 0.02 ? 'visible' : 'hidden'));
  const axis = AXES[index]!;
  const ask = ASKS[index]!;
  const score = ROUNDS[0]!.scores[index]!;
  const id = `note-${axis.key}`;

  return (
    <motion.article style={{ opacity, y, visibility }} aria-labelledby={id} className={cn(styles.note, 'motion-reduce:!transform-none')}>
      <h2 id={id} className={cn('display', styles.noteHead)}>
        {axis.label}
      </h2>
      <p className={styles.noteAsk}>
        {ask[0]}
        <RedPen mark="highlight" play="manual" show={active} delay={320}>
          {ask[1]}
        </RedPen>
        {ask[2]}
      </p>
      <p className={styles.noteLine}>{axis.line}</p>
      <p className={styles.noteMark}>
        <span className="sr-only">{index === WEAKEST ? 'Example mark, the one to fix first: ' : 'Example mark: '}</span>
        <span className="marks font-bold leading-none text-verm-text">
          <RedPen mark="circle" play="manual" show={active} delay={620} iterations={1}>
            {score}
          </RedPen>
        </span>
        <span aria-hidden className={styles.noteExample}>
          Example
        </span>
      </p>
    </motion.article>
  );
}

/** The marked panel, then the hand-off to the live engine below. */
export function OutroCaption({ progress, onFocusBack }: { progress: MotionValue<number>; onFocusBack: () => void }) {
  const opacity = useTransform(progress, (v) => ramp(v, [OUTRO - 0.06, OUTRO - 0.02], [0, 1]));
  const y = useTransform(progress, (v) => ramp(v, [OUTRO - 0.06, OUTRO - 0.02], [24, 0]));
  const visibility = useTransform(opacity, (o) => (o > 0.02 ? 'visible' : 'hidden'));
  return (
    <motion.div style={{ opacity, y, visibility }} onFocus={onFocusBack} className={cn(styles.outro, 'motion-reduce:!transform-none')}>
      <h2 className="display text-[clamp(2.1rem,8.4vw,3rem)] sm:text-[clamp(2.2rem,3.6vw,3.4rem)]">
        Five marks.{' '}
        <span className="whitespace-nowrap">
          <RedPen mark="underline" play="inview" delay={300}>
            One to fix first.
          </RedPen>
        </span>
      </h2>
      <p className={styles.outroLine}>
        Every answer ends with your weakest axis named, a stronger answer to steal from, and a
        follow-up aimed straight at it.
      </p>
      <a href="#live" className="btn btn-primary btn-lg mt-5 sm:mt-7">
        Answer a question <ArrowRight size={17} aria-hidden />
      </a>
    </motion.div>
  );
}
