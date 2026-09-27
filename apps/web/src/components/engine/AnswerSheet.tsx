'use client';

import { Fragment } from 'react';
import { RefreshCcw } from 'lucide-react';
import { AXES } from '@/components/room/data';
import { Marks } from '@/components/ui/Marks';
import { RedPen } from '@/components/ui/RedPen';
import { cn } from '@/lib/cn';
import { BEAT, beatsAt, penAt } from './choreo';
import type { EngineState, Verdict } from './engine';
import { penNote, penSegments, type PenResult } from './pen';
import { MAX_CHARS, QUESTIONS } from './questions';
import { stageScale } from './stage';
import styles from './engine.module.css';

const PEN_LABEL = { hedge: 'hedge, underlined', filler: 'filler, struck through', claim: 'your claim, circled' } as const;
const PEN_MARK = { hedge: 'underline', filler: 'strike-through', claim: 'circle' } as const;

export interface AnswerSheetProps {
  id: string;
  state: EngineState;
  pen: PenResult;
  clock: number;
  reduce: boolean;
  speechReady: boolean;
  onType: (text: string) => void;
  onSubmit: () => void;
  onNext: () => void;
}

/**
 * The candidate's side of the desk: the question paper and the answer written under it in blue
 * ink, on ruled exam paper. After marking, the red pen goes over the answer (hedges underlined,
 * filler struck, a buried claim circled), the examiner writes a note, and the marks go in the
 * examiners' box at the foot of the sheet.
 */
export function QuestionPaper({ state, onNext, id }: Pick<AnswerSheetProps, 'state' | 'onNext' | 'id'>) {
  return (
    <div className={cn(styles.sheet, styles.sheetTop)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.8rem] font-bold text-ink-mut">
          Question <span className="marks">{state.question + 1}</span> of <span className="marks">{QUESTIONS.length}</span>
        </p>
        <button type="button" onClick={onNext} className="btn btn-ghost btn-sm -mr-2 h-9 gap-1.5 px-3 text-[0.82rem] text-ink-mut">
          <RefreshCcw size={14} aria-hidden /> Another question
        </button>
      </div>
      <h3 id={`${id}-question`} className={cn(styles.question, 'mt-2 font-extrabold text-ink')} aria-live="polite">
        {QUESTIONS[state.question]}
      </h3>
    </div>
  );
}

export function AnswerSheet({ id, state, pen, clock, reduce, speechReady, onType, onSubmit }: AnswerSheetProps) {
  const { phase, mode, result } = state;
  const b = beatsAt(clock);
  const marked = phase === 'marked' && result !== null && state.answered !== null;
  const listening = phase === 'listening' || phase === 'requesting';
  const editing = mode === 'text' && !marked && phase !== 'conferring';

  let body: React.ReactNode;
  if (marked) {
    body = (
      <p className={styles.ink}>
        {penSegments(state.answered!, pen.marks).map((seg, i) => {
          if (!seg.mark) return <Fragment key={i}>{seg.text}</Fragment>;
          const order = pen.marks.indexOf(seg.mark);
          return (
            <RedPen
              key={i}
              mark={PEN_MARK[seg.mark.kind]}
              play="manual"
              show={b.pen}
              delay={reduce ? 0 : Math.round(((penAt(order) - BEAT.pen) * 1000) / stageScale())}
              srLabel={PEN_LABEL[seg.mark.kind]}
              iterations={seg.mark.kind === 'claim' ? 2 : 1}
              className={seg.mark.kind === 'claim' ? styles.claim : undefined}
            >
              {seg.text}
            </RedPen>
          );
        })}
      </p>
    );
  } else if (editing) {
    body = (
      <>
        <label htmlFor={`${id}-answer`} className="sr-only">
          Your answer
        </label>
        <textarea
          id={`${id}-answer`}
          aria-describedby={`${id}-question`}
          value={state.text}
          onChange={(e) => onType(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onSubmit();
            }
          }}
          maxLength={MAX_CHARS}
          rows={5}
          placeholder="Answer in three or four sentences, as if the examiner is across the table."
          className={cn(styles.ink, styles.textarea)}
        />
      </>
    );
  } else {
    const shown = phase === 'conferring' ? (state.answered ?? state.text) : state.text;
    body = (
      <p className={cn(styles.ink, !shown && !state.interim && styles.placeholder)} aria-live="off">
        {shown || state.interim ? (
          <>
            {shown}
            {state.interim ? <span className="opacity-70"> {state.interim}</span> : null}
            {listening ? <span className="caret ml-0.5" aria-hidden /> : null}
          </>
        ) : phase === 'requesting' ? (
          // the browser is still asking for the microphone: nothing is being heard yet
          'Allow the microphone, then speak. Your words appear here in blue ink.'
        ) : listening ? (
          'Listening. Your words appear here in blue ink.'
        ) : speechReady ? (
          'Your answer appears here in blue ink as you speak.'
        ) : (
          'Your answer appears here.'
        )}
      </p>
    );
  }

  const count = (marked ? state.answered! : `${state.text} ${state.interim}`.trim()).length;

  return (
    <div className={cn(styles.sheet, styles.sheetBottom)}>
      <div className={cn(styles.lines, 'paper-ruled paper-margin')}>
        <span className={cn(styles.marginMark, 'marks')} aria-hidden>
          {state.question + 1}
        </span>
        {body}
        {marked ? (
          <p className={styles.penNote} data-show={b.pen ? '' : undefined}>
            {penNote(pen)}
          </p>
        ) : (
          <span className={cn(styles.count, 'marks')} aria-hidden>
            {count}/{MAX_CHARS}
          </span>
        )}
      </div>
      {marked ? (
        <p className={styles.comment} data-show={b.stamp ? '' : undefined}>
          <span className="font-bold">Examiner&rsquo;s note.</span> {result.summary}
        </p>
      ) : null}
      <ExaminersBox verdict={marked ? result : null} clock={clock} />
    </div>
  );
}

/** The grid at the foot of an exam script, filled in red pen. The accessible record of the marks. */
function ExaminersBox({ verdict, clock }: { verdict: Verdict | null; clock: number }) {
  const b = beatsAt(clock);
  return (
    <div className={styles.box}>
      <p className={styles.boxTitle}>For the examiners</p>
      <dl className={styles.boxGrid}>
        {AXES.map((a, i) => {
          const mark = verdict?.marks[i] ?? null;
          const shown = verdict !== null && b.raised(i);
          const weakest = verdict !== null && i === verdict.weakest;
          return (
            <div key={a.key} className={styles.boxCell} data-weak={weakest && b.hot ? '' : undefined}>
              <dt>{a.label}</dt>
              <dd>
                {!shown ? (
                  <span className="sr-only">{verdict ? 'marking' : 'not marked yet'}</span>
                ) : mark === null ? (
                  <span className={styles.boxNone}>needs the coach</span>
                ) : (
                  <RedPen mark="circle" play="manual" show={weakest && b.hot} srLabel={weakest ? 'fix first' : undefined}>
                    <Marks value={mark} play="mount" duration={760} delay={320} label={`${mark} out of 100`} className={styles.boxMark} />
                  </RedPen>
                )}
              </dd>
            </div>
          );
        })}
        <div className={cn(styles.boxCell, styles.boxTotal)}>
          <dt>Overall</dt>
          <dd>
            {verdict !== null && b.stamp ? (
              <Marks value={verdict.overall} play="mount" duration={760} label={`${verdict.overall} out of 100`} className={styles.boxMark} />
            ) : (
              <span className="sr-only">{verdict ? 'marking' : 'not marked yet'}</span>
            )}
          </dd>
        </div>
      </dl>
      <p className={styles.guidance}>
        Scores are guidance, not grades.
        {verdict?.source === 'model' ? ' Marked by the AI coach.' : null}
        {verdict?.source === 'heuristic' ? ' A quick check while the AI coach is busy: correctness needs the coach, so it is left unmarked.' : null}
      </p>
    </div>
  );
}
