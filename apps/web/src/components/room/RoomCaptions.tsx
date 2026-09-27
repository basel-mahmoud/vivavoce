'use client';

import Link from 'next/link';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { motion, useTransform, type MotionValue } from 'motion/react';
import { ArrowRight, Mic } from 'lucide-react';
import { RedPen } from '@/components/ui/RedPen';
import { cn } from '@/lib/cn';
import { AXES, ROUNDS, weakestIndex } from './data';
import { BEATS, BEAT_WINDOW, HERO_END, OUTRO, ramp } from './story';
import { HeroTitle } from './HeroTitle';
import styles from './room.module.css';

/**
 * Handlers that tell the panel someone is about to answer: a mouse or pen resting on the key, or
 * keyboard focus on it. Touch never triggers it (a tap is already the answer).
 */
type Listen = (on: boolean, key?: HTMLElement) => void;

function listenCue(onListen: Listen) {
  const pointer = (on: boolean) => (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'touch') onListen(on, e.currentTarget);
  };
  return {
    onPointerEnter: pointer(true),
    onPointerLeave: pointer(false),
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      if (e.currentTarget.matches(':focus-visible')) onListen(true, e.currentTarget);
    },
    onBlur: () => onListen(false),
  };
}

/**
 * The first viewport's copy: the promise, rising from a whisper to "loud" over the candidate's
 * voice (HeroTitle), one support line and the two keys. It fades as the scroll leaves the hero;
 * focusing a key brings it back. Resting on "Answer a question" turns the panel to listen.
 */
export function HeroCopy({
  progress,
  onFocusBack,
  onListen,
}: {
  progress: MotionValue<number>;
  onFocusBack: () => void;
  onListen: Listen;
}) {
  const opacity = useTransform(progress, (v) => ramp(v, [HERO_END - 0.035, HERO_END + 0.01], [1, 0]));
  const y = useTransform(progress, (v) => ramp(v, [0, HERO_END + 0.01], [0, -36]));
  const visibility = useTransform(opacity, (o) => (o > 0.02 ? 'visible' : 'hidden'));

  return (
    <motion.div
      style={{ opacity, y, visibility }}
      onFocus={onFocusBack}
      className="relative max-w-[40rem] motion-reduce:!transform-none"
    >
      <HeroTitle />
      <p className={cn(styles.heroLead, 'font-medium text-ink-mut')}>
        Real exam questions, answered out loud and marked on five axes in seconds.
      </p>
      <div className={styles.heroKeys}>
        <a href="#live" className={cn('btn btn-primary btn-lg', styles.heroKey)} {...listenCue(onListen)}>
          <Mic size={18} aria-hidden />
          Answer a question
        </a>
        <Link href="/waitlist" className={cn('btn btn-secondary btn-lg', styles.heroKey)}>
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
export function OutroCaption({
  progress,
  onFocusBack,
  onListen,
}: {
  progress: MotionValue<number>;
  onFocusBack: () => void;
  onListen: Listen;
}) {
  const opacity = useTransform(progress, (v) => ramp(v, [OUTRO - 0.06, OUTRO - 0.02], [0, 1]));
  const y = useTransform(progress, (v) => ramp(v, [OUTRO - 0.06, OUTRO - 0.02], [24, 0]));
  const visibility = useTransform(opacity, (o) => (o > 0.02 ? 'visible' : 'hidden'));
  return (
    <motion.div style={{ opacity, y, visibility }} onFocus={onFocusBack} className={cn(styles.outro, 'motion-reduce:!transform-none')}>
      <h2 className={cn('display text-[clamp(2.1rem,8.4vw,3rem)] sm:text-[clamp(2.2rem,3.6vw,3.4rem)]', styles.outroTitle)}>
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
      <a href="#live" className={cn('btn btn-primary btn-lg mt-5 sm:mt-7', styles.outroKey)} {...listenCue(onListen)}>
        Answer a question <ArrowRight size={17} aria-hidden />
      </a>
    </motion.div>
  );
}
