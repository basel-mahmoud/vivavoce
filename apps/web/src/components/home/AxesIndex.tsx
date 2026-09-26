'use client';

import { Fragment, useId, useRef, useState } from 'react';
import { useInView } from 'motion/react';
import { AXES } from '@/components/room/data';
import { Paddle } from '@/components/ui/Paddle';
import { Portrait, type ExaminerAxis } from '@/components/ui/Portrait';
import { RedPen, type RedPenMark } from '@/components/ui/RedPen';
import { cn } from '@/lib/cn';
import { FINE_POINTER, useMedia } from './useHome';

/** A piece of a sample answer: plain words, or words the examiner marks. */
type Part = string | { text: string; mark: RedPenMark; label: string };

interface Sample {
  parts: readonly Part[];
  note: string;
  mark: number;
}

/**
 * One example answer per axis to the same question, each with the flaw that
 * examiner catches. Marks are illustrative and labelled as examples.
 */
const SAMPLES: Record<ExaminerAxis, Sample> = {
  correctness: {
    parts: [{ text: 'The heart has four chambers and four valves.', mark: 'crossed-off', label: 'off the question' }],
    note: 'True, but not what I asked.',
    mark: 38,
  },
  clarity: {
    parts: ['Because systemic afterload ', { text: 'necessitates myocardial hypertrophy', mark: 'circle', label: 'jargon' }, '.'],
    note: 'Say it plainly.',
    mark: 52,
  },
  structure: {
    parts: ['Well, the lungs are close, and pressure matters, so ', { text: 'it has to pump harder', mark: 'underline', label: 'the buried claim' }, '.'],
    note: 'Lead with this.',
    mark: 48,
  },
  conciseness: {
    parts: [{ text: 'So basically what I am trying to say is', mark: 'strike-through', label: 'filler' }, ' it pumps to the whole body.'],
    note: 'Cut to it.',
    mark: 57,
  },
  confidence: {
    parts: [
      { text: 'I think', mark: 'underline', label: 'hedge' },
      ' it is ',
      { text: 'maybe', mark: 'underline', label: 'hedge' },
      ' because it pumps further? ',
      { text: 'Sort of?', mark: 'underline', label: 'hedge' },
    ],
    note: 'Say it like you mean it.',
    mark: 54,
  },
};

function AxisRow({ axis }: { axis: (typeof AXES)[number] }) {
  const key = axis.key as ExaminerAxis;
  const sample = SAMPLES[key];
  const row = useRef<HTMLLIElement>(null);
  const fine = useMedia(FINE_POINTER);
  const inView = useInView(row, { amount: 0.6, once: true });
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  // With a mouse, the pen marks the answer you point at; on touch it marks as you scroll to it.
  const marked = fine ? hovered || focused || pinned : inView || pinned;
  // Marks land in reading order, a beat apart.
  const penAt = sample.parts.map((_, i) => sample.parts.slice(0, i).filter((p) => typeof p !== 'string').length);

  return (
    <li
      ref={row}
      className="vv-axis"
      data-marked={marked ? '' : undefined}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHovered(false)}
    >
      <span className="vv-axis-face">
        <Portrait axis={key} state={marked ? 'marking' : 'neutral'} size={88} decorative />
      </span>
      <div className="vv-axis-name">
        <h3 className="display text-[clamp(1.9rem,3.4vw,2.9rem)]">{axis.label}</h3>
        <p className="mt-2 text-lg font-black leading-snug">{axis.ask}</p>
        <p className="mt-1.5 max-w-sm text-[0.95rem] leading-relaxed text-ink-mut">{axis.line}</p>
      </div>
      <button
        type="button"
        className="vv-axis-sample"
        aria-pressed={pinned}
        aria-label={`Example answer for ${axis.label}. ${marked ? `Marked: ${sample.note}` : 'Show how it is marked.'}`}
        onClick={() => setPinned((p) => !p)}
        onFocus={(e) => e.currentTarget.matches(':focus-visible') && setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <span className="vv-axis-answer" aria-hidden="true">
          {sample.parts.map((part, i) =>
            typeof part === 'string' ? (
              <Fragment key={i}>{part}</Fragment>
            ) : (
              <RedPen
                key={i}
                mark={part.mark}
                play="manual"
                show={marked}
                delay={140 + penAt[i]! * 260}
                iterations={part.mark === 'underline' ? 1 : undefined}
              >
                {part.text}
              </RedPen>
            ),
          )}
        </span>
        <span className="vv-axis-note" aria-hidden="true">
          {sample.note}
        </span>
      </button>
      <span className="vv-axis-mark">
        <Paddle value={sample.mark} label={axis.label} revealed={marked} handle={false} delay={120} />
      </span>
    </li>
  );
}

/**
 * The rubric as an index: one row per examiner. Point at an answer (or tab
 * to it) and that examiner marks it in red pen and turns their paddle over.
 * Every sample answers the same question, so the flaw each axis catches
 * is easy to see.
 */
export function AxesIndex({ className }: { className?: string }) {
  const uid = useId();
  return (
    <section
      aria-labelledby={`${uid}-title`}
      className={cn('vv-axes mx-auto w-full max-w-[1360px] px-4 py-20 sm:px-5 sm:py-28', className)}
    >
      <h2 id={`${uid}-title`} className="display max-w-[15ch] text-[clamp(2.3rem,5vw,4.3rem)] lg:max-w-[22ch]">
        Five examiners. <span className="text-ink-mut">Five marks, and one thing to fix first.</span>
      </h2>
      <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-ink-mut">
        Every answer is marked from 0 to 100 on each axis. Below, five example answers to one question:{' '}
        <span className="font-bold text-ink">why is the left ventricle wall thicker than the right?</span>{' '}
        <span className="vv-hint-fine">Point at an answer to see it marked.</span>
        <span className="vv-hint-touch">Each one is marked as you reach it.</span>
      </p>
      <ol className="vv-axis-list mt-12 sm:mt-16">
        {AXES.map((a) => (
          <AxisRow key={a.key} axis={a} />
        ))}
      </ol>
      <p className="mt-6 text-[0.8rem] font-semibold text-ink-mut">
        Example answers and example marks. Scores are guidance, not grades.
      </p>
    </section>
  );
}
