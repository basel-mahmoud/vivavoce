'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Pause } from 'lucide-react';
import { SplitFlap } from '@/components/ui/SplitFlap';
import { cn } from '@/lib/cn';
import { boardRows, NARROW, WIDE } from './board';
import { SUBJECTS } from './subjects-data';
import { useMedia, usePageVisible, useReducedMarkup, useSeen } from './useHome';

/** How long each question stays up. The turn itself takes well under a second. */
const TURN_MS = 9000;

/**
 * Any subject, called like a departures board: the section's heading is
 * painted on the board's frame, the subject on a highlighted row, then the
 * question. The first question is on the board from the first byte; after
 * that it turns to the next one every few seconds while it is on screen,
 * each changing flap turning forward through its drum and landing. Pause
 * the board (and the subject marquee with it) any time; reduced motion keeps
 * both still. The chips below, the page's one marquee, call a subject up.
 */
export function Subjects({ className }: { className?: string }) {
  const uid = useId();
  const reduce = useReducedMarkup();
  const narrow = useMedia('(max-width: 767px)');
  const visible = usePageVisible();
  const section = useRef<HTMLElement>(null);
  const onScreen = useSeen(section, '0px 0px -10% 0px');
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [called, setCalled] = useState('');
  const moving = onScreen && visible && !paused && !reduce;

  useEffect(() => {
    if (!moving) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % SUBJECTS.length), TURN_MS);
    return () => window.clearTimeout(t);
  }, [moving, index]);

  const item = SUBJECTS[index]!;
  const shape = narrow ? NARROW : WIDE;

  const call = (i: number) => {
    setIndex(i);
    const next = SUBJECTS[i]!;
    setCalled(`${next.subject}: ${next.question}`);
  };

  return (
    <section ref={section} aria-labelledby={`${uid}-title`} className={cn('vv-subjects py-20 sm:py-28', className)}>
      <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-5">
        <SplitFlap
          rows={boardRows(item, index, shape)}
          label={`Next question, ${item.subject}: ${item.question}`}
          play="rest"
          size="lg"
          flips={3}
          flipMs={90}
          stagger={12}
          className="vv-subjects-board"
          header={
            <div className="vv-board-sign">
              <h2 id={`${uid}-title`} className="display vv-board-title">
                Any subject you can say out loud.
              </h2>
              <p className="vv-board-next" aria-hidden="true">
                Next question
              </p>
            </div>
          }
        />
        <div className="mt-6 grid gap-5 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-12">
          <p className="max-w-xl text-lg font-medium leading-relaxed text-ink-mut">
            Start from the decks, import your own questions, or turn your notes into a deck for your topic and level.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-ink-mut">
            {reduce ? null : (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-pressed={paused}
                className="btn btn-secondary btn-sm vv-pause gap-2 pointer-coarse:h-11"
              >
                <Pause size={14} aria-hidden />
                Pause the board
              </button>
            )}
            <span>Example questions. Pick a subject to call it up.</span>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {called}
        </p>
      </div>

      <SubjectMarquee active={index} onCall={call} running={moving} still={reduce} />
    </section>
  );
}

/**
 * The page's single marquee: every subject as a chip, drifting at a steady
 * pace. It stops under the pointer, while a chip has focus (then it becomes a
 * row you scroll, so the focused chip is always in full view), when the
 * board is paused, off screen, and under reduced motion. The chips are one
 * Tab stop: arrow keys, Home and End move between them.
 */
function SubjectMarquee({
  active,
  onCall,
  running,
  still,
}: {
  active: number;
  onCall: (i: number) => void;
  running: boolean;
  still: boolean;
}) {
  const [focus, setFocus] = useState(0);
  const chips = useRef<(HTMLButtonElement | null)[]>([]);
  const last = SUBJECTS.length - 1;

  const onKey = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    const to =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? Math.min(last, i + 1)
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? Math.max(0, i - 1)
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    if (to === null) return;
    e.preventDefault();
    setFocus(to);
    chips.current[to]?.focus();
  };

  const set = (copy: 0 | 1) =>
    SUBJECTS.map((s, i) => (
      <li key={`${copy}-${s.subject}`}>
        <button
          ref={
            copy
              ? undefined
              : (el) => {
                  chips.current[i] = el;
                }
          }
          type="button"
          tabIndex={copy ? -1 : i === focus ? 0 : -1}
          onClick={() => {
            setFocus(i);
            onCall(i);
          }}
          onKeyDown={copy ? undefined : (e) => onKey(e, i)}
          aria-pressed={copy ? undefined : i === active}
          className="vv-chip"
          data-on={i === active ? '' : undefined}
        >
          {s.subject}
        </button>
      </li>
    ));
  return (
    <div className="vv-marquee mt-12 sm:mt-16" data-running={running ? '' : undefined} data-still={still ? '' : undefined}>
      <div className="vv-marquee-track">
        <div role="toolbar" aria-label="Subjects" className="vv-marquee-group">
          <ul className="vv-marquee-set">{set(0)}</ul>
        </div>
        <ul className="vv-marquee-set" aria-hidden="true">
          {set(1)}
        </ul>
      </div>
    </div>
  );
}
