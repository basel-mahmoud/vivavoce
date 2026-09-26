'use client';

import type { CSSProperties } from 'react';
import { AXES, verdictFace } from '@/components/room/data';
import { Paddle } from '@/components/ui/Paddle';
import { Portrait, type ExaminerState } from '@/components/ui/Portrait';
import { TypeLine } from '@/components/room/TypeLine';
import { cn } from '@/lib/cn';
import { beatsAt } from './choreo';
import type { Phase } from './engine';
import styles from './engine.module.css';

/** An examiner speaking, as the note above the panel shows it. */
export interface Say {
  who: number;
  label: string;
  text: string;
  /** Changes whenever a new line starts, so it types out again. */
  key: string;
  /** Still saying it (the speaking face), rather than waiting for the answer. */
  talking: boolean;
}

export interface BenchProps {
  phase: Phase;
  /** Seconds into the marking sequence (-1 before it, Infinity under reduced motion). */
  clock: number;
  marks: (number | null)[] | null;
  weakest: number;
  say: Say | null;
  reduce: boolean;
  /** The 3D panel has taken over: this bench steps back (it stays as the stage's poster). */
  hidden: boolean;
}

function seatState(phase: Phase, clock: number, mark: number | null, i: number, say: Say | null): ExaminerState {
  if (say?.talking && say.who === i) return 'speaking';
  if (phase === 'listening') return 'listening';
  if (phase === 'conferring') return 'marking';
  if (phase !== 'marked' || mark === null) return 'neutral';
  const b = beatsAt(clock);
  if (!b.verdict(i)) return 'marking';
  const v = verdictFace(mark);
  return v === 'attentive' ? 'neutral' : v;
}

/**
 * The same five examiners as 2D renders of the 3D cast, on a bench: the panel wherever WebGL is
 * missing or motion is reduced, and the stage's poster while the canvas loads. Same states as the
 * 3D panel: listening, marking, then paddles up with their marks, faces by mark, the weakest in
 * vermilion asking its follow-up. Decorative to assistive tech: the marks are read from the
 * answer sheet's examiners' box.
 */
export function PortraitBench({ phase, clock, marks, weakest, say, reduce, hidden }: BenchProps) {
  const b = beatsAt(clock);
  const marked = phase === 'marked' && marks !== null;

  return (
    <div className={styles.bench} data-hidden={hidden ? '' : undefined} aria-hidden="true">
      <div className={styles.benchInner}>
        <div className={styles.benchTag} data-show={say ? '' : undefined} style={{ '--seat': say?.who ?? 2 } as CSSProperties}>
          {say ? (
            <>
              <p className="text-[0.72rem] font-bold text-verm-text">{say.label}</p>
              <p className="mt-0.5 text-[0.94rem] font-bold leading-snug text-ink">
                <TypeLine key={say.key} text={say.text} instant={reduce} cps={44} caret={false} />
              </p>
            </>
          ) : null}
          <span className={styles.benchLeader} />
        </div>
        <div className={styles.seats}>
          {AXES.map((a, i) => {
            const mark = marks?.[i] ?? null;
            const up = marked && mark !== null && b.raised(i);
            const hot = marked && b.hot && i === weakest;
            return (
              <div key={a.key} className={styles.seat} data-up={up ? '' : undefined} data-hot={hot ? '' : undefined} style={{ '--i': i } as CSSProperties}>
                <span className={styles.seatPaddle}>
                  <Paddle value={mark ?? 0} label={a.label} revealed={up} tone={hot ? 'verm' : 'coal'} size="sm" delay={reduce ? 0 : 140} />
                </span>
                <Portrait axis={a.key} state={seatState(phase, clock, mark, i, say)} size={220} decorative className={cn(styles.seatFace, hot && styles.seatHot)} />
              </div>
            );
          })}
        </div>
        <div className={styles.benchFront}>
          {AXES.map((a) => (
            <span key={a.key}>{a.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
