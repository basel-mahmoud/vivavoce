'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';
import { useLoop, useOnScreen } from '@/components/ui/hooks';

type CSSVars = React.CSSProperties & Record<`--${string}`, string>;
const d = (ms: number): CSSVars => ({ '--d': `${ms}ms` });

const MODES = [
  {
    id: 'mock-viva',
    name: 'Mock Viva',
    blurb: 'A chained examiner. Every follow-up targets your weakest axis.',
    period: 5600,
  },
  {
    id: 'interview',
    name: 'Interview',
    blurb: 'Behavioural and role questions, scored on STAR structure.',
    period: 5600,
  },
  {
    id: 'quick',
    name: 'Quick Question',
    blurb: 'One question, one answer, instant marks. The warm-up.',
    period: 4200,
  },
  {
    id: 'flash',
    name: 'Flash Recall',
    blurb: 'Rapid recall, spaced around the things you keep missing.',
    period: 4400,
  },
  {
    id: 'explain',
    name: 'Explain It',
    blurb: 'Teach it simply or you do not own it. Marked on clarity.',
    period: 6000,
  },
  {
    id: 'rapid',
    name: 'Rapid Fire',
    blurb: 'A countdown per question. Composure is the skill.',
    period: 8000,
  },
] as const;

type ModeId = (typeof MODES)[number]['id'];

/* ── Previews: small working versions of each mode, replayed on a loop ───── */

function MockViva() {
  const chain = [
    { tag: 'Opening question', q: 'Walk me through how you would assess a patient with chest pain.' },
    { tag: 'Follow-up on Correctness', q: 'You skipped the differential. What else could it be?' },
    { tag: 'Follow-up on Structure', q: 'Good. Now say it again, in order this time.' },
  ];
  return (
    <ol className="relative space-y-3 pl-7">
      <span aria-hidden className="grow-y absolute bottom-10 left-[9px] top-4 w-[2px] rounded-full bg-line" style={d(150)} />
      {chain.map((c, i) => (
        <li key={c.q} className="seq relative" style={d(i * 1100)}>
          <span
            aria-hidden
            className={cn(
              'absolute -left-7 top-4 h-[20px] w-[20px] rounded-full border-[3px] border-card',
              i === 0 ? 'bg-ink' : 'bg-verm',
            )}
          />
          <div className="rounded-2xl border border-line bg-canvas px-4 py-3.5">
            <p className={cn('text-xs font-bold', i === 0 ? 'text-ink-mut' : 'text-verm-text')}>{c.tag}</p>
            <p className="mt-1 font-bold leading-snug">{c.q}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Interview() {
  const star = [
    ['Situation', 1, 'Two teams, one launch date.'],
    ['Task', 0.9, 'Get them to agree on scope.'],
    ['Action', 0.85, 'A shared list, cut to what mattered.'],
    ['Result', 0.28, 'Thin. What changed because of you?'],
  ] as const;
  return (
    <div>
      <p className="seq rounded-2xl bg-ink px-4 py-3.5 font-bold leading-snug text-canvas" style={d(0)}>
        Tell me about a time you resolved a conflict on a team.
      </p>
      <ul className="mt-5 space-y-3.5">
        {star.map(([label, fill, note], i) => (
          <li key={label} className="grid grid-cols-[5.5rem_1fr] items-center gap-3">
            <span className="text-sm font-black">{label}</span>
            <div>
              <div className="h-2.5 overflow-hidden rounded-full">
                <span
                  className={cn('grow-x block h-full rounded-full', i === 3 ? 'bg-verm' : 'bg-cobalt')}
                  style={{ ...d(500 + i * 700), width: `${fill * 100}%` }}
                />
              </div>
              <p
                className={cn('seq mt-1 text-xs font-semibold', i === 3 ? 'text-verm-text' : 'text-ink-mut')}
                style={d(800 + i * 700)}
              >
                {note}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Quick() {
  return (
    <div className="flex h-full flex-col">
      <p className="seq text-[1.35rem] font-black leading-tight" style={d(0)}>
        What is the difference between weather and climate?
      </p>
      <div className="mt-auto flex items-end gap-5 pt-6">
        <div key="stamp" className="seq" style={d(1300)}>
          <div className="stamp rounded-2xl bg-verm px-5 py-3 text-coal">
            <span className="marks block text-5xl font-bold leading-none">74</span>
            <span className="marks text-xs font-bold">/100</span>
          </div>
        </div>
        <div className="seq pb-1" style={d(1700)}>
          <p className="font-bold">
            Fix first: <span className="text-verm-text">Structure</span>
          </p>
          <p className="mt-1 max-w-xs text-sm leading-snug text-ink-mut">
            Lead with the one-line distinction, then give the example.
          </p>
        </div>
      </div>
    </div>
  );
}

function Flash() {
  const steps = ['Again in 10 min', 'Tomorrow', 'In 4 days'];
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-sm [perspective:900px]">
        <div className="relative h-44 [transform-style:preserve-3d] motion-safe:animate-[vv-flip_4.4s_cubic-bezier(0.77,0,0.175,1)_both]">
          <div className="absolute inset-0 grid place-items-center rounded-2xl border border-line bg-canvas p-5 text-center [backface-visibility:hidden]">
            <div>
              <p className="text-xs font-bold text-ink-mut">Contract law</p>
              <p className="display mt-2 text-3xl">Define: tort</p>
            </div>
          </div>
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-cobalt p-5 text-center text-paper [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className="text-lg font-bold leading-snug">
              A civil wrong that causes harm, for which the courts give a remedy.
            </p>
          </div>
        </div>
      </div>
      <ul className="mt-auto flex flex-wrap justify-center gap-2 pt-6">
        {steps.map((s, i) => (
          <li
            key={s}
            className={cn(
              'seq rounded-full px-3.5 py-1.5 text-sm font-bold',
              i === 1 ? 'bg-ink text-canvas' : 'bg-card-2 text-ink-mut',
            )}
            style={d(2600 + i * 120)}
          >
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Explain() {
  const parts: ([string] | [string, string])[] = [
    ['The '],
    ['myocardium', 'heart muscle'],
    [' '],
    ['depolarises', 'fires a signal'],
    [', so the chambers '],
    ['contract synchronously', 'squeeze in time'],
    ['.'],
  ];
  let swap = 0;
  return (
    <div className="flex h-full flex-col">
      <p className="text-[1.3rem] font-bold leading-[1.7]">
        {parts.map((p, i) => {
          if (p.length === 1) return <span key={i}>{p[0]}</span>;
          const at = 700 + swap++ * 1100;
          return (
            <span key={i} className="whitespace-nowrap">
              <span className="relative text-ink-mut">
                {p[0]}
                <span aria-hidden className="grow-x absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-verm" style={d(at)} />
              </span>{' '}
              <span className="seq rounded-md bg-butter px-1 text-coal" style={d(at + 350)}>
                {p[1]}
              </span>
            </span>
          );
        })}
      </p>
      <div className="mt-auto flex items-center gap-3 pt-6">
        <span className="text-sm font-black">Clarity</span>
        <span className="marks relative inline-grid h-9 w-14 place-items-center overflow-hidden rounded-full bg-card-2 text-sm font-bold">
          <span className="seq-out col-start-1 row-start-1" style={d(3600)}>52</span>
          <span className="seq col-start-1 row-start-1 text-pass" style={d(3800)}>81</span>
        </span>
        <span className="seq text-sm text-ink-mut" style={d(3900)}>
          Same idea, no jargon.
        </span>
      </div>
    </div>
  );
}

const RAPID = [
  'Name three causes of acute kidney injury.',
  'What does a p-value actually tell you?',
  'Give one argument against judicial review.',
  'Why is the sky blue, in one sentence?',
];
const RAPID_SECONDS = 8;

function Rapid({ cycle }: { cycle: number }) {
  const reduce = useReducedMotion();
  const [left, setLeft] = useState(RAPID_SECONDS);
  useEffect(() => {
    if (reduce) return;
    const start = performance.now();
    const id = setInterval(() => {
      const s = RAPID_SECONDS - Math.floor((performance.now() - start) / 1000);
      setLeft(Math.max(0, s));
    }, 200);
    return () => clearInterval(id);
  }, [cycle, reduce]);
  const C = 2 * Math.PI * 52;
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-card-2)" strokeWidth="9" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="var(--color-verm)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={C}
            className="motion-safe:animate-[vv-countdown_8s_linear_both]"
            style={{ '--c': `${C}` } as CSSVars}
          />
        </svg>
        <span className="marks absolute inset-0 grid place-items-center text-4xl font-bold">
          {reduce ? RAPID_SECONDS : left}
        </span>
      </div>
      <p className="marks mt-5 text-xs font-bold text-ink-mut">
        QUESTION {(cycle % 10) + 1} OF 10
      </p>
      <p className="seq mt-2 max-w-sm text-xl font-black leading-tight" style={d(0)}>
        {RAPID[cycle % RAPID.length]}
      </p>
    </div>
  );
}

function Preview({ id, cycle }: { id: ModeId; cycle: number }) {
  switch (id) {
    case 'mock-viva':
      return <MockViva />;
    case 'interview':
      return <Interview />;
    case 'quick':
      return <Quick />;
    case 'flash':
      return <Flash />;
    case 'explain':
      return <Explain />;
    case 'rapid':
      return <Rapid cycle={cycle} />;
  }
}

/* ── The switcher ─────────────────────────────────────────────────────────── */

export function Modes() {
  const [active, setActive] = useState<ModeId>('mock-viva');
  const [stageRef, onScreen] = useOnScreen<HTMLDivElement>('-10% 0px');
  const mode = MODES.find((m) => m.id === active)!;
  const cycle = useLoop(mode.period, onScreen);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent) {
    const i = MODES.findIndex((m) => m.id === active);
    let next = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % MODES.length;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (i - 1 + MODES.length) % MODES.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = MODES.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setActive(MODES[next]!.id);
    tabs.current[next]?.focus();
  }

  return (
    <section aria-labelledby="modes-title" className="mx-auto w-full max-w-[1360px] px-4 py-24 sm:px-5 sm:py-32">
      <div className="max-w-3xl">
        <h2 id="modes-title" className="display text-[clamp(2.4rem,5.2vw,4.6rem)]">
          Six ways to spar.
        </h2>
        <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-ink-mut">
          Pick the room you are preparing for. Each mode trains a different part
          of saying it well.
        </p>
      </div>

      <div className="mt-12 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] lg:gap-6">
        <div
          role="tablist"
          aria-label="Practice modes"
          onKeyDown={onKeyDown}
          className="-mx-4 flex snap-x gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
        >
          {MODES.map((m, i) => {
            const on = m.id === active;
            return (
              <button
                key={m.id}
                ref={(n) => {
                  tabs.current[i] = n;
                }}
                role="tab"
                id={`tab-${m.id}`}
                aria-selected={on}
                aria-controls="mode-stage"
                tabIndex={on ? 0 : -1}
                onClick={() => setActive(m.id)}
                className={cn(
                  'relative shrink-0 snap-start cursor-pointer rounded-2xl px-4 py-3 text-left transition-colors duration-150 lg:px-5 lg:py-4',
                  on ? 'text-canvas' : 'text-ink hover:bg-card-2',
                )}
              >
                {on && (
                  <motion.span
                    layoutId="mode-pill"
                    aria-hidden
                    className="absolute inset-0 -z-10 rounded-2xl bg-ink"
                    transition={{ type: 'spring', duration: 0.42, bounce: 0.12 }}
                  />
                )}
                <span className="block whitespace-nowrap text-base font-black lg:text-xl">{m.name}</span>
                <span
                  className={cn(
                    'mt-1 hidden text-[0.95rem] leading-snug lg:block',
                    on ? 'text-canvas/75' : 'text-ink-mut',
                  )}
                >
                  {m.blurb}
                </span>
              </button>
            );
          })}
        </div>

        <div
          ref={stageRef}
          id="mode-stage"
          role="tabpanel"
          aria-labelledby={`tab-${active}`}
          className="tile relative flex min-h-[27rem] flex-col overflow-hidden p-6 sm:p-9"
        >
          <p className="text-[1.02rem] font-semibold leading-snug text-ink-mut lg:hidden">{mode.blurb}</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${active}-${cycle}`}
              initial={{ opacity: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(4px)', transition: { duration: 0.14 } }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="mt-6 flex flex-1 flex-col justify-center lg:mt-0"
            >
              <Preview id={active} cycle={cycle} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
