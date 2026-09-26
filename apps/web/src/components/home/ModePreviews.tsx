'use client';

import { useEffect, useRef, useState } from 'react';
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  type MotionStyle,
} from 'motion/react';
import { utils, animate as animeAnimate, stagger, svg } from 'animejs';
import { ChevronsLeftRight, CornerDownRight, RotateCcw } from 'lucide-react';
import { Paddle } from '@/components/ui/Paddle';
import { RedPen } from '@/components/ui/RedPen';
import { Marks } from '@/components/ui/Marks';
import { useAnimeScope, ANIME_EASE } from '@/components/ui/useAnimeScope';
import { EASE, SPRING } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { DotClock } from './DotClock';
import { useBeat } from './useHome';

export type ModeId = 'mock-viva' | 'interview' | 'quick' | 'flash' | 'explain' | 'rapid';

export const MODES: readonly { id: ModeId; name: string; blurb: string }[] = [
  { id: 'mock-viva', name: 'Mock Viva', blurb: 'A chained examiner. Every follow-up targets your weakest axis.' },
  { id: 'interview', name: 'Interview', blurb: 'Behavioural and role questions, marked on STAR structure.' },
  { id: 'quick', name: 'Quick Question', blurb: 'One question, one answer, instant marks. The warm-up.' },
  { id: 'flash', name: 'Flash Recall', blurb: 'Rapid recall, spaced around the things you keep missing.' },
  { id: 'explain', name: 'Explain It', blurb: 'Teach it simply or you do not own it. Marked on clarity.' },
  { id: 'rapid', name: 'Rapid Fire', blurb: 'A countdown per question. Composure is the skill.' },
];

interface PreviewProps {
  /** In front, settled, on screen, and motion is allowed: play the demo. */
  running: boolean;
  /**
   * In front and at rest (unturned). Red-pen marks are measured on screen,
   * so they are only drawn once the card lies flat.
   */
  dealt: boolean;
}

/** Shown, or waiting for its beat: hidden but still holding its space. */
const beatClass = (on: boolean) =>
  cn(
    'transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none',
    on ? 'opacity-100' : 'translate-y-1.5 opacity-0',
  );

/* ── Mock Viva: the follow-up chain, with the examiner's scribbled notes ── */

const CHAIN = [
  { who: 'q', text: 'Walk me through how you would assess a patient with chest pain.' },
  { who: 'you', text: 'History, examination, then an ECG and bloods.' },
  { who: 'exam', axis: 'Correctness', text: 'You skipped the differential. What else could it be?' },
  { who: 'you', text: 'Dissection, PE, pericarditis, reflux.' },
  { who: 'exam', axis: 'Structure', text: 'Better. Now say it again, in order.' },
  { who: 'you', text: 'ECG first, then history, exam and bloods, ruling out the deadly causes.' },
] as const;
const CHAIN_STEPS = [900, 1100, 1700, 1100, 1700, 3000] as const;

/** Hand-drawn marginal notes: a scribbled line or two, then a mark. */
function Scribble({ variant }: { variant: 0 | 1 }) {
  return (
    <svg
      viewBox="0 0 96 56"
      className="vv-scribble pointer-events-none absolute -right-1 top-0 h-10 w-[4.25rem] text-verm-text sm:h-14 sm:w-24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-variant={variant}
    >
      {variant === 0 ? (
        <>
          <path strokeWidth="2.2" d="M8 14c5-5 8 4 12-1s6-6 10 0 7 3 10-2 6-4 9 1 5 3 9-2" />
          <path strokeWidth="2.2" d="M8 28c6-4 9 3 13-1s7-4 11 1 5 2 9-2" />
          <path strokeWidth="2.6" d="M70 16c-4-7 9-11 13-5 3 5-5 8-6 13M77 32v.5" />
          <path strokeWidth="2.2" d="M52 44c-10 2-24 3-38-1m0 0 5-4m-5 4 5 3" />
        </>
      ) : (
        <>
          <path strokeWidth="2.6" d="M10 20l6 7 11-15" />
          <path strokeWidth="2.2" d="M36 16c5-4 8 3 12-1s6-5 10 0 7 3 11-2" />
          <path strokeWidth="2.2" d="M36 30c4-4 7 2 11-1s6-4 9 1" />
          <path strokeWidth="2.4" d="M72 38c-9-3-20 1-19 7s17 7 24 2 4-12-8-11" />
        </>
      )}
    </svg>
  );
}

export function MockVivaPreview({ running }: PreviewProps) {
  const { beat } = useBeat(running, CHAIN_STEPS, { rest: 2200 });

  // The notes are drawn with anime.js, stroke by stroke, as each follow-up lands.
  const { root: host, scope } = useAnimeScope<HTMLDivElement>(({ scope: self, root }) => {
    const groups = Array.from(root.querySelectorAll<SVGSVGElement>('.vv-scribble')).map((s) =>
      svg.createDrawable(s.querySelectorAll('path')),
    );
    self.add('toBeat', (...args: unknown[]) => {
      const b = Number(args[0]);
      const still = Boolean(args[1]);
      groups.forEach((paths, g) => {
        const at = g === 0 ? 2 : 4;
        if (b < at) utils.set(paths, { draw: '0 0' });
        else if (b > at || still) utils.set(paths, { draw: '0 1' });
        else
          animeAnimate(paths, {
            draw: ['0 0', '0 1'],
            duration: 520,
            delay: stagger(360, { start: 380 }),
            ease: ANIME_EASE.inOut,
          });
      });
    });
  }, []);
  const reduce = useReducedMotion() ?? false;
  useEffect(() => {
    scope.current?.methods.toBeat?.(beat, !running || reduce);
  }, [beat, running, reduce, scope]);

  return (
    <div ref={host} className="flex h-full flex-col justify-start">
      <ol className="space-y-2.5 text-[0.92rem] leading-snug min-[360px]:text-[0.98rem] sm:text-[1.02rem]">
        {CHAIN.map((line, i) => (
          <li key={line.text} className={cn('relative', beatClass(beat >= i), line.who === 'exam' && 'pr-[4.5rem] pl-6 sm:pr-24')}>
            {line.who === 'q' ? (
              <p className="font-bold">
                <span className="mr-2 text-ink-mut">Q.</span>
                {line.text}
              </p>
            ) : line.who === 'you' ? (
              <p className="font-semibold text-ink-blue">
                <span className="mr-2 text-sm font-bold">You</span>
                {line.text}
              </p>
            ) : (
              <>
                <CornerDownRight size={16} aria-hidden className="absolute left-0 top-0.5 text-verm-text" />
                <p className="text-[0.78rem] font-bold text-verm-text">Follow-up on {line.axis}</p>
                <p className="font-bold">{line.text}</p>
                <Scribble variant={i === 2 ? 0 : 1} />
              </>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ── Interview: the STAR structure, assembled piece by piece ────────────── */

const STAR = [
  { k: 'S', label: 'Situation', text: 'Two teams, one launch date.' },
  { k: 'T', label: 'Task', text: 'Get them to agree on scope.' },
  { k: 'A', label: 'Action', text: 'One shared list, cut to what mattered.' },
  { k: 'R', label: 'Result', text: 'Thin. What changed because of you?' },
] as const;
const STAR_STEPS = [1000, 800, 800, 900, 3200] as const;

export function InterviewPreview({ running, dealt }: PreviewProps) {
  const { beat } = useBeat(running, STAR_STEPS, { rest: 1600 });
  const reduce = useReducedMotion() ?? false;
  return (
    <div className="flex h-full flex-col justify-start gap-5">
      <p className="text-[1.1rem] font-bold leading-snug sm:text-[1.2rem]">
        <span className="mr-2 text-ink-mut">Q.</span>
        Tell me about a time you resolved a conflict on a team.
      </p>
      <ol className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
        {STAR.map((s, i) => {
          const on = beat >= i + 1;
          const thin = s.k === 'R';
          const tile = (
            <motion.span
              aria-hidden
              initial={false}
              animate={
                on
                  ? { opacity: 1, y: 0, rotate: 0 }
                  : { opacity: 0, y: reduce ? 0 : 18, rotate: reduce ? 0 : i % 2 ? 5 : -5 }
              }
              transition={reduce ? { duration: 0.2 } : SPRING.physical}
              className={cn(
                'inline-grid h-14 w-14 place-items-center rounded-xl align-top text-2xl font-black',
                thin ? 'border-2 border-dashed border-ink-faint text-ink-faint' : 'bg-cobalt text-paper',
              )}
            >
              {s.k}
            </motion.span>
          );
          return (
            <li key={s.k} className="relative min-w-0">
              {thin ? (
                <RedPen
                  mark="circle"
                  play="manual"
                  show={on && dealt}
                  delay={running ? 560 : 0}
                  strokeWidth={2.5}
                  multiline={false}
                  className="vv-star-flag inline-block leading-none"
                  srLabel="flagged by the examiner"
                >
                  {tile}
                </RedPen>
              ) : (
                tile
              )}
              <div className={cn('mt-2.5', beatClass(on))}>
                <p className="text-sm font-black">{s.label}</p>
                <p
                  className={cn(
                    'mt-0.5 text-[0.9rem] leading-snug',
                    thin ? 'font-bold text-verm-text' : 'font-semibold text-ink-blue',
                  )}
                >
                  {s.text}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ── Quick Question: one answer, five paddles, one thing to fix ─────────── */

const QUICK_AXES = ['Correctness', 'Clarity', 'Structure', 'Conciseness', 'Confidence'] as const;
const QUICK_MARKS = [86, 88, 74, 91, 58] as const;
const QUICK_STEPS = [900, 1300, 1900, 3000] as const;

export function QuickPreview({ running }: PreviewProps) {
  const { beat } = useBeat(running, QUICK_STEPS, { rest: 1400 });
  const weakest = QUICK_MARKS.indexOf(Math.min(...QUICK_MARKS) as (typeof QUICK_MARKS)[number]);
  return (
    <div className="flex h-full flex-col justify-start gap-4">
      <p className="text-[1.1rem] font-bold leading-snug sm:text-[1.2rem]">
        <span className="mr-2 text-ink-mut">Q.</span>
        What is the difference between weather and climate?
      </p>
      <p className={cn('font-semibold leading-snug text-ink-blue', beatClass(beat >= 1))}>
        <span className="mr-2 text-sm font-bold">You</span>I think weather is the day to day, and climate is
        the long-run average.
      </p>
      {/* Five across; on the narrowest phones, three over two so every name fits. */}
      <ul className="flex flex-wrap justify-center gap-y-3 pt-1" aria-label="Example marks">
        {QUICK_AXES.map((axis, i) => (
          <li key={axis} className="flex w-1/3 min-w-0 flex-col items-center min-[380px]:w-1/5">
            <Paddle
              value={QUICK_MARKS[i]!}
              label={axis}
              revealed={beat >= 2}
              tone={i === weakest ? 'verm' : 'paper'}
              size="sm"
              handle={false}
              delay={i * 90}
              className="vv-quick-paddle"
            />
            <span className="mt-1.5 whitespace-nowrap text-[0.6rem] font-bold tracking-[-0.01em] text-ink-mut sm:text-[0.74rem]">
              {axis}
            </span>
          </li>
        ))}
      </ul>
      <p className={cn('text-[0.95rem] leading-snug', beatClass(beat >= 3))}>
        <span className="font-black text-verm-text">Fix first: Confidence.</span>{' '}
        <span className="font-medium text-ink-mut">A right answer, hedged. Say it flat.</span>
      </p>
    </div>
  );
}

/* ── Flash Recall: a card you can flip, then rate ───────────────────────── */

const FLASH = [
  { deck: 'Contract law', front: 'Define: tort', back: 'A civil wrong that causes harm, for which the courts give a remedy.' },
  { deck: 'Pharmacology', front: 'What do beta blockers do to heart rate?', back: 'They slow it, by blocking adrenaline at the heart.' },
  { deck: 'Spanish oral', front: 'Say: "I was about to say"', back: 'Iba a decir.' },
] as const;
const RATINGS = [
  { id: 'again', label: 'Again', when: 'in 10 min' },
  { id: 'good', label: 'Good', when: 'tomorrow' },
  { id: 'easy', label: 'Easy', when: 'in 4 days' },
] as const;
const FLASH_STEPS = [1600, 1500, 1500] as const;

export function FlashPreview({ running }: PreviewProps) {
  const { beat, round } = useBeat(running, FLASH_STEPS, { rest: 200 });
  // Once someone flips or rates a card, the demo stops playing itself.
  const [own, setOwn] = useState<{ card: number; flipped: boolean; rated: string | null } | null>(null);
  const auto = { card: round % FLASH.length, flipped: beat >= 1, rated: beat >= 2 ? 'good' : null };
  const view = own ?? auto;
  const card = FLASH[view.card]!;
  const due = 12 - (own ? own.card : round % 5);
  const nextTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(nextTimer.current), []);

  const rate = (id: string) => {
    const current = own ?? auto;
    setOwn({ ...current, flipped: true, rated: id });
    window.clearTimeout(nextTimer.current);
    nextTimer.current = window.setTimeout(
      () => setOwn({ card: (current.card + 1) % FLASH.length, flipped: false, rated: null }),
      1300,
    );
  };

  return (
    <div className="flex h-full flex-col justify-start gap-4">
      <div className="flex items-baseline justify-between text-sm font-bold text-ink-mut">
        <span>{card.deck}</span>
        <span>
          <Marks value={due} play="instant" /> due today
        </span>
      </div>
      <button
        type="button"
        onClick={() => setOwn({ ...view, flipped: !view.flipped, rated: null })}
        aria-label={view.flipped ? `Answer: ${card.back} Show the question` : `${card.front}. Show the answer`}
        className="vv-flashcard group relative h-44 w-full cursor-pointer rounded-2xl text-left [perspective:900px] sm:h-40"
        data-flipped={view.flipped ? '' : undefined}
      >
        <span className="vv-flashcard-inner absolute inset-0 block rounded-2xl">
          <span className="vv-flashcard-face absolute inset-0 grid place-items-center rounded-2xl border border-line bg-canvas p-5 text-center">
            <span className="display text-[1.55rem] leading-tight sm:text-[1.9rem]">{card.front}</span>
          </span>
          <span className="vv-flashcard-face vv-flashcard-back absolute inset-0 grid place-items-center rounded-2xl bg-cobalt p-5 text-center text-paper">
            <span className="text-[1.05rem] font-bold leading-snug sm:text-[1.15rem]">{card.back}</span>
          </span>
        </span>
      </button>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="How well did you know it?">
        {RATINGS.map((r) => {
          const on = view.rated === r.id;
          return (
            <button
              key={r.id}
              type="button"
              disabled={!view.flipped}
              onClick={() => rate(r.id)}
              aria-pressed={on}
              className={cn(
                'btn btn-sm h-9 px-3 text-[0.82rem] pointer-coarse:h-11',
                on ? 'btn-primary' : 'btn-secondary',
              )}
            >
              {r.label}
              <span className={cn('font-semibold', on ? 'text-paper/80' : 'text-ink-mut')}>{r.when}</span>
            </button>
          );
        })}
        {own ? (
          <button
            type="button"
            onClick={() => setOwn(null)}
            className="btn btn-ghost btn-sm ml-auto h-9 px-2.5 text-[0.82rem] text-ink-mut pointer-coarse:h-11"
          >
            <RotateCcw size={14} aria-hidden />
            Replay
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ── Explain It: your answer against the improved one, hedges struck ───── */

export function ExplainPreview({ running, dealt }: PreviewProps) {
  const reduce = useReducedMotion() ?? false;
  // Where the rule stands, 0 to 100 from the left: your answer on its left,
  // the improved answer on its right. It rests showing your answer.
  const pct = useMotionValue(100);
  const [improved, setImproved] = useState(false);
  const [held, setHeld] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const sweep = running && !held && !reduce;

  useMotionValueEvent(pct, 'change', (v) => {
    const next = v < 50;
    setImproved((was) => (was === next ? was : next));
  });

  // It wipes across by itself (dwelling so each answer can be read) until
  // someone takes hold of it.
  useEffect(() => {
    if (!sweep) return;
    const ctrl = animate(pct, [100, 100, 0, 0, 100, 100], {
      duration: 9.4,
      times: [0, 0.24, 0.39, 0.76, 0.91, 1],
      ease: ['linear', EASE.inOut, 'linear', EASE.inOut, 'linear'],
      repeat: Infinity,
    });
    return () => ctrl.stop();
  }, [sweep, pct]);

  const take = () => {
    setHeld(true);
    if (input.current) input.current.value = String(Math.round(pct.get()));
  };
  const at = useMotionTemplate`${pct}%`;

  // Struck each time the card is dealt to the front and lies flat.
  const hedge = (word: string, i: number) => (
    <RedPen mark="strike-through" play="manual" show={dealt} delay={380 + i * 240} srLabel="hedge, struck">
      {word}
    </RedPen>
  );

  return (
    <div className="flex h-full flex-col justify-start gap-4">
      <motion.div className="vv-compare relative" style={{ '--pct': at } as MotionStyle}>
        <div className="relative h-48 overflow-hidden rounded-2xl border border-line sm:h-44">
          <div className="absolute inset-0 bg-canvas px-5 pb-4 pt-9">
            <p className="absolute left-5 top-3.5 text-[0.72rem] font-bold text-ink-blue">Your answer</p>
            <p className="text-[1.04rem] font-semibold leading-[1.8] text-ink-blue">
              So {hedge('basically', 0)} the myocardium, {hedge('like', 1)}, depolarises, and {hedge('I guess', 2)}{' '}
              the chambers {hedge('sort of', 3)} contract synchronously.
            </p>
          </div>
          <div className="vv-compare-top absolute inset-0 bg-card px-5 pb-4 pt-9">
            <p className="absolute left-5 top-3.5 text-[0.72rem] font-bold text-ink-mut">Improved answer</p>
            <p className="text-[1.04rem] font-bold leading-[1.8]">
              The heart muscle fires an electrical signal, so the chambers squeeze in time.
            </p>
          </div>
        </div>
        <div className="vv-compare-rule pointer-events-none absolute inset-y-0" aria-hidden>
          <span className="absolute left-1/2 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-cobalt text-paper shadow-[0_2px_6px_rgb(var(--vv-shadow)/0.25)]">
            <ChevronsLeftRight size={16} />
          </span>
        </div>
        <input
          ref={input}
          type="range"
          min={0}
          max={100}
          defaultValue={100}
          onPointerDown={take}
          onFocus={take}
          onInput={(e) => pct.set(Number(e.currentTarget.value))}
          aria-label="Slide between your answer and the improved answer"
          aria-valuetext={improved ? 'Showing the improved answer' : 'Showing your answer'}
          className="vv-compare-input absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </motion.div>
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-black">Clarity</span>
        <Marks
          value={improved ? 81 : 52}
          play="instant"
          className={cn('text-xl', improved ? 'text-pass' : 'text-verm-text')}
          label={improved ? 'Clarity 81, the improved answer' : 'Clarity 52, your answer'}
        />
        <span className="text-sm font-medium text-ink-mut">Same idea, no jargon, no hedges.</span>
      </p>
    </div>
  );
}

/* ── Rapid Fire: a dot-matrix countdown per question ────────────────────── */

const RAPID = [
  'Name three causes of acute kidney injury.',
  'What does a p-value actually tell you?',
  'Give one argument against judicial review.',
  'Why is the sky blue, in one sentence?',
] as const;
const RAPID_SECONDS = 8;
const RAPID_STEPS = [...Array.from({ length: RAPID_SECONDS }, () => 1000), 1100] as const;

export function RapidPreview({ running }: PreviewProps) {
  const { beat, round } = useBeat(running, RAPID_STEPS, { rest: 0, still: 3 });
  const left = Math.max(0, RAPID_SECONDS - beat);
  const q = round % RAPID.length;
  const time = beat >= RAPID_SECONDS;
  return (
    <div className="flex h-full flex-col justify-start gap-4">
      <p className="text-sm font-bold text-ink-mut">
        Question <span className="marks">{3 + q}</span> of <span className="marks">10</span>
      </p>
      <p
        key={q}
        className={cn('display min-h-[2.2em] text-[1.45rem] leading-[1.06] sm:text-[1.75rem]', running && 'vv-rise-in')}
      >
        {RAPID[q]}
      </p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl bg-coal px-5 py-5 text-paper sm:gap-x-6 sm:px-6">
        <DotClock seconds={left} className={cn('h-14 w-auto shrink-0 sm:h-[4.5rem]', time && 'vv-dotclock-out')} />
        <p className="min-w-[5.5rem] flex-1 text-sm font-bold leading-snug text-paper-mut">
          <span className="sr-only">{left} seconds left. </span>
          {time ? 'Time. Next question.' : 'Answer before it hits zero.'}
        </p>
      </div>
    </div>
  );
}

export function ModePreview({ id, running, dealt }: { id: ModeId } & PreviewProps) {
  switch (id) {
    case 'mock-viva':
      return <MockVivaPreview running={running} dealt={dealt} />;
    case 'interview':
      return <InterviewPreview running={running} dealt={dealt} />;
    case 'quick':
      return <QuickPreview running={running} dealt={dealt} />;
    case 'flash':
      return <FlashPreview running={running} dealt={dealt} />;
    case 'explain':
      return <ExplainPreview running={running} dealt={dealt} />;
    case 'rapid':
      return <RapidPreview running={running} dealt={dealt} />;
  }
}
