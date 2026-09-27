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
  // Every answer is marked as it comes into view, one row after another, so the
  // index never rests on blank coins; pointing at a marked answer marks it again.
  const inView = useInView(row, { amount: 0.6, once: true });
  const [again, setAgain] = useState(0);
  const [asked, setAsked] = useState(false);
  const marked = inView || asked;
  // Marks land in reading order, a beat apart.
  const penAt = sample.parts.map((_, i) => sample.parts.slice(0, i).filter((p) => typeof p !== 'string').length);

  return (
    <li
      ref={row}
      className="vv-axis"
      data-marked={marked ? '' : undefined}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse' || !fine || !marked) return;
        setAgain((n) => n + 1);
      }}
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
        aria-label={`Example answer for ${axis.label}: ${sample.parts.map((p) => (typeof p === 'string' ? p : p.text)).join('')} Marked ${sample.mark}: ${sample.note} Press to watch it marked again.`}
        onClick={() => {
          setAsked(true);
          setAgain((n) => n + 1);
        }}
      >
        <span className="vv-axis-answer" aria-hidden="true">
          {sample.parts.map((part, i) =>
            typeof part === 'string' ? (
              <Fragment key={i}>{part}</Fragment>
            ) : (
              <RedPen
                key={`${i}-${again}`}
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
        <Paddle value={sample.mark} label={axis.label} revealed={marked} handle={false} delay={260} />
      </span>
    </li>
  );
}

/**
 * The rubric as an index: one row per examiner, each with an example answer
 * to the same exam question and the flaw that examiner catches. Each row is
 * marked as it comes into view: the red pen goes over the answer, the
 * examiner's note appears and the paddle turns over. Point at a marked
 * answer (or press it) to watch it marked again.
 */
export function AxesIndex({ className }: { className?: string }) {
  const uid = useId();
  return (
    <section
      aria-labelledby={`${uid}-title`}
      className={cn('vv-axes mx-auto w-full max-w-[1360px] px-4 pb-20 pt-16 sm:px-5 sm:pb-28 sm:pt-24', className)}
    >
      {/* Headed like the question paper it is: one question, answered five ways. */}
      <header className="vv-axes-head">
        <p className="vv-axes-q" aria-hidden="true">
          Q.
        </p>
        <div>
          <h2 id={`${uid}-title`} className="vv-axes-title">
            Why is the left ventricle wall thicker than the right?
          </h2>
          <p className="vv-axes-lead">
            Five answers to that one question, each with the flaw one examiner catches, marked 0 to 100.
          </p>
        </div>
      </header>
      <ol className="vv-axis-list mt-10 sm:mt-14">
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
