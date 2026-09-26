'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { SplitFlap } from '@/components/ui/SplitFlap';
import { cn } from '@/lib/cn';
import { boardRows, NARROW, WIDE } from './board';
import { SUBJECTS } from './subjects-data';
import { useMedia, usePageVisible, useReducedMarkup, useSeen } from './useHome';


const TURN_MS = 5600;

/**
 * Any subject, called like a departures board: NEXT QUESTION, the subject,
 * the question. It turns to the next one every few seconds while it is on
 * screen (pause it any time; reduced motion keeps it still), and the
 * subject chips below, the page's one marquee, call a subject up.
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
  const turning = onScreen && visible && !paused && !reduce;

  useEffect(() => {
    if (!turning) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % SUBJECTS.length), TURN_MS);
    return () => window.clearTimeout(t);
  }, [turning, index]);

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
        <h2 id={`${uid}-title`} className="display max-w-[14ch] text-[clamp(2.4rem,5.4vw,4.6rem)] lg:max-w-none">
          Any subject you can say out loud.
        </h2>
        <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-ink-mut">
          Start from the decks, import your own questions, or turn your notes into a deck for your topic and level.
        </p>

        <div className="mt-10 sm:mt-14">
          <SplitFlap
            rows={boardRows(item, index, shape)}
            label={`Next question, ${item.subject}: ${item.question}`}
            size="lg"
            flips={5}
            stagger={22}
            className="vv-subjects-board"
          />
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-ink-mut">
            {reduce ? null : (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-pressed={paused}
                className="btn btn-secondary btn-sm gap-2"
              >
                {paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
                {paused ? 'Play the board' : 'Pause the board'}
              </button>
            )}
            <span>Example questions. Pick a subject to call it up.</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {called}
          </p>
        </div>
      </div>

      <SubjectMarquee active={index} onCall={call} running={onScreen && visible && !reduce} still={reduce} />
    </section>
  );
}

/**
 * The page's single marquee: every subject as a chip, drifting at a steady
 * pace. It stops under the pointer, while a chip has focus, off screen, and
 * under reduced motion (where it becomes a row you can scroll).
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
  const chips = (copy: 0 | 1) =>
    SUBJECTS.map((s, i) => (
      <li key={`${copy}-${s.subject}`}>
        <button
          type="button"
          tabIndex={copy ? -1 : undefined}
          onClick={() => onCall(i)}
          aria-pressed={copy ? undefined : i === active}
          className="vv-chip"
          data-on={i === active ? '' : undefined}
        >
          {s.subject}
        </button>
      </li>
    ));
  return (
    <div
      className="vv-marquee mt-12 sm:mt-16"
      data-running={running ? '' : undefined}
      data-still={still ? '' : undefined}
    >
      <div className="vv-marquee-track">
        <ul className="vv-marquee-set" aria-label="Subjects">
          {chips(0)}
        </ul>
        <ul className="vv-marquee-set" aria-hidden="true">
          {chips(1)}
        </ul>
      </div>
    </div>
  );
}
