'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { motion, useTransform, type MotionValue } from 'motion/react';
import { ArrowRight, Mic } from 'lucide-react';
import { RedPen, type RedPenMark } from '@/components/ui/RedPen';
import { AXES, ROUNDS } from './data';
import { BEATS, BEAT_WINDOW, HERO_END, OUTRO, ramp } from './story';

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
        <a href="#live" className="btn btn-primary btn-lg max-sm:h-12 max-sm:px-4 max-sm:text-[0.94rem]">
          <Mic size={18} aria-hidden />
          Answer a question
        </a>
        <Link href="/waitlist" className="btn btn-secondary btn-lg max-sm:h-12 max-sm:px-4 max-sm:text-[0.94rem]">
          Get early access
        </Link>
      </div>
    </motion.div>
  );
}

interface NoteText {
  /** The axis question, with the marked words split out. */
  ask: readonly [string, string, string];
  mark: RedPenMark;
}

/** Where the examiner's red pen lands in each note. */
const NOTES: readonly NoteText[] = [
  { ask: ['Did you answer ', 'the question they asked', '?'], mark: 'underline' },
  { ask: ['Could a smart friend ', 'follow', ' you?'], mark: 'circle' },
  { ask: ['Is there a ', 'claim', ', an order and a landing?'], mark: 'circle' },
  { ask: ['Signal, or ', 'filler', '?'], mark: 'strike-through' },
  { ask: ['Do you sound like you ', 'mean it', '?'], mark: 'underline' },
];

/**
 * One examiner's margin note on the exam script: the question number in the left margin, the
 * axis and its question on ruled paper with the red pen on the words that matter, and the mark
 * written in the right margin. Not a card: it is written on the page.
 */
export function MarginNote({ index, progress, active }: { index: number; progress: MotionValue<number>; active: boolean }) {
  const c = BEATS[index]!;
  const range = [c - BEAT_WINDOW - 0.025, c - BEAT_WINDOW + 0.02, c + BEAT_WINDOW - 0.02, c + BEAT_WINDOW + 0.025];
  const opacity = useTransform(progress, (v) => ramp(v, range, [0, 1, 1, 0]));
  const y = useTransform(progress, (v) => ramp(v, range, [24, 0, 0, -24]));
  const visibility = useTransform(opacity, (o) => (o > 0.02 ? 'visible' : 'hidden'));
  const axis = AXES[index]!;
  const note = NOTES[index]!;
  const score = ROUNDS[0]!.scores[index]!;
  const id = `note-${axis.key}`;

  return (
    <motion.article
      style={{ opacity, y, visibility }}
      aria-labelledby={id}
      className="relative w-full max-w-[34rem] motion-reduce:!transform-none"
    >
      <div className="relative grid grid-cols-[2.4rem_minmax(0,1fr)_auto] gap-x-3 pb-2 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:gap-x-5">
        {/* the exam paper under the note: blue rules on the text's baseline, the red margin rule */}
        <span
          aria-hidden
          className="paper-ruled paper-margin pointer-events-none absolute -inset-x-2 inset-y-0 [--margin-x:3.4rem] [--rule-gap:1.75rem] [mask-image:linear-gradient(to_right,#000_70%,transparent)] sm:[--margin-x:4.1rem]"
        />
        <p className="pt-[0.3rem] text-[1.05rem] font-black text-ink-blue sm:text-[1.2rem]" aria-hidden>
          Q{index + 1}
        </p>
        <div className="min-w-0">
          <h2 id={id} className="display text-[clamp(1.9rem,7.6vw,2.4rem)] leading-[1.15] sm:text-[clamp(2rem,3.4vw,3rem)]">
            {axis.label}
          </h2>
          <p className="mt-1 text-[1.1rem] font-black leading-[1.75rem] sm:mt-2 sm:text-[1.3rem]">
            {note.ask[0]}
            <RedPen mark={note.mark} play="manual" show={active} delay={260}>
              {note.ask[1]}
            </RedPen>
            {note.ask[2]}
          </p>
          <p className="text-[0.98rem] font-medium leading-[1.75rem] text-ink-mut sm:text-[1.02rem]">{axis.line}</p>
        </div>
        <p className="flex flex-col items-end pt-[0.35rem] text-right">
          <span className="sr-only">Example mark: </span>
          <span className="marks text-[1.9rem] font-bold leading-none text-verm-text sm:text-[2.4rem]">
            <RedPen mark="circle" play="manual" show={active} delay={620} iterations={1}>
              {score}
            </RedPen>
          </span>
          <span className="mt-2 text-[0.72rem] font-bold text-ink-mut" aria-hidden>
            Example
          </span>
        </p>
      </div>
    </motion.article>
  );
}

/** The marked panel, then the hand-off to the live engine below. */
export function OutroCaption({ progress, onFocusBack }: { progress: MotionValue<number>; onFocusBack: () => void }) {
  const opacity = useTransform(progress, (v) => ramp(v, [OUTRO - 0.06, OUTRO - 0.02], [0, 1]));
  const y = useTransform(progress, (v) => ramp(v, [OUTRO - 0.06, OUTRO - 0.02], [24, 0]));
  const visibility = useTransform(opacity, (o) => (o > 0.02 ? 'visible' : 'hidden'));
  return (
    <motion.div style={{ opacity, y, visibility }} onFocus={onFocusBack} className="relative max-w-[32rem] motion-reduce:!transform-none">
      <h2 className="display text-[clamp(2.1rem,8.4vw,3rem)] sm:text-[clamp(2.2rem,4.2vw,3.8rem)]">
        Five marks.{' '}
        <RedPen mark="underline" play="inview" delay={300}>
          One to fix first.
        </RedPen>
      </h2>
      <p className="mt-4 max-w-[27rem] text-[1.02rem] font-medium leading-relaxed text-ink-mut sm:mt-5 sm:text-lg">
        Every answer ends with your weakest axis named, a stronger answer to steal from, and a
        follow-up aimed straight at it.
      </p>
      <a href="#live" className="btn btn-primary btn-lg mt-5 sm:mt-7">
        Answer a question <ArrowRight size={17} aria-hidden />
      </a>
    </motion.div>
  );
}

