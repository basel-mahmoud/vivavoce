'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';

type Tone = 'cobalt' | 'coal' | 'verm' | 'butter';

const TONES: Record<Tone, { field: string; mut: string; chip: string }> = {
  cobalt: { field: 'bg-cobalt text-paper', mut: 'text-paper', chip: 'bg-paper text-coal' },
  coal: { field: 'bg-coal text-paper', mut: 'text-paper-mut', chip: 'bg-paper text-coal' },
  verm: { field: 'bg-verm text-coal', mut: 'text-coal', chip: 'bg-coal text-paper' },
  butter: { field: 'bg-butter text-coal', mut: 'text-coal/75', chip: 'bg-coal text-paper' },
};

function Artifact({ id }: { id: string }) {
  if (id === 'viva')
    return (
      <div className="w-full max-w-[17rem] rounded-2xl bg-paper p-4 text-coal">
        <p className="text-sm font-black">Cardiology viva</p>
        <div className="mt-3 flex items-end justify-between">
          <p className="text-sm font-semibold text-coal/70">Exam countdown</p>
          <p className="marks text-3xl font-bold leading-none">6 days</p>
        </div>
      </div>
    );
  if (id === 'jobs')
    return (
      <ul className="flex gap-2">
        {['S', 'T', 'A', 'R'].map((l) => (
          <li
            key={l}
            className={cn(
              'marks grid h-12 w-12 place-items-center rounded-xl text-lg font-bold',
              l === 'R' ? 'bg-verm text-coal' : 'bg-paper text-coal',
            )}
          >
            {l}
          </li>
        ))}
      </ul>
    );
  if (id === 'talks')
    return (
      <div className="w-full max-w-[17rem] rounded-2xl bg-coal p-4 text-paper">
        <p className="marks text-xs font-bold text-paper-mut">SLIDE 7 OF 12</p>
        <p className="mt-2 text-sm font-bold leading-snug">
          Conciseness keeps flagging the middle. Cut it.
        </p>
      </div>
    );
  return (
    <div className="w-full max-w-[17rem] rounded-2xl bg-coal p-4 text-paper">
      <div className="flex items-center justify-between text-sm font-bold">
        <span>Pace</span>
        <span className="text-butter">steady</span>
      </div>
      <div className="relative mt-3 h-2 rounded-full bg-paper/20">
        <span className="absolute left-[46%] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-butter" />
      </div>
    </div>
  );
}

const ROOMS = [
  {
    id: 'viva',
    title: 'Students facing a viva',
    body: 'Medicine, law, engineering: anywhere the exam is spoken. Rehearse the follow-ups, not just the facts.',
    tone: 'cobalt',
  },
  {
    id: 'jobs',
    title: 'Job seekers',
    body: 'The behavioural questions you will actually get. Practise until each story lands in thirty seconds.',
    tone: 'coal',
  },
  {
    id: 'talks',
    title: 'Presenters',
    body: 'Cut the filler, find the structure, land the point. The room should hear confidence, not preparation.',
    tone: 'verm',
  },
  {
    id: 'lang',
    title: 'Language learners',
    body: 'A sparring partner that never tires and never judges. Speak, get corrected on clarity and pace, repeat.',
    tone: 'butter',
  },
] as const;

/**
 * Four rooms, four colour fields. On desktop the one under the pointer (or
 * keyboard focus) opens wide and the rest step back; on touch they stack.
 */
export function Rooms({ showHeading = true }: { showHeading?: boolean }) {
  const [open, setOpen] = useState(0);

  return (
    <section
      aria-labelledby={showHeading ? 'rooms-title' : undefined}
      aria-label={showHeading ? undefined : 'Who it is for'}
      className="mx-auto w-full max-w-[1360px] px-4 pb-24 sm:px-5 sm:pb-32"
    >
      {showHeading && (
        <>
          <h2 id="rooms-title" className="display max-w-4xl text-[clamp(2.3rem,5vw,4.4rem)]">
            Anywhere the answer is spoken.
          </h2>
          <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-ink-mut">
            Different rooms, one problem: you know the material, but saying it
            well is its own skill.
          </p>
        </>
      )}

      <div className={cn('grid gap-3 md:grid-cols-2 xl:flex xl:h-[32rem] xl:flex-row', showHeading && 'mt-12')}>
        {ROOMS.map((r, i) => {
          const t = TONES[r.tone];
          const on = open === i;
          return (
            <article
              key={r.id}
              onMouseEnter={() => setOpen(i)}
              onFocus={() => setOpen(i)}
              className={cn(
                'group relative flex min-w-0 flex-col overflow-hidden rounded-[1.75rem] p-6 sm:p-8',
                'transition-[flex-grow] duration-500 ease-[cubic-bezier(0.77,0,0.175,1)] motion-reduce:transition-none',
                t.field,
                on ? 'xl:grow-[2.4]' : 'xl:grow',
                'xl:basis-0',
              )}
            >
              <h3 className="text-[clamp(1.6rem,4vw,2.1rem)] font-black leading-[1.02] tracking-[-0.02em] xl:text-[clamp(1.4rem,1.8vw,1.8rem)]">
                {r.title}
              </h3>
              <div
                className={cn(
                  'mt-4 flex flex-1 flex-col transition-opacity duration-300 xl:w-[26rem] xl:max-w-full',
                  on ? 'xl:opacity-100 xl:delay-200' : 'xl:opacity-0',
                )}
              >
                <p className={cn('max-w-md text-[1.02rem] font-medium leading-relaxed', t.mut)}>{r.body}</p>
                <div className="mt-6 md:mt-auto">
                  <Artifact id={r.id} />
                </div>
                <Link
                  href="/use-cases"
                  className="mt-6 inline-flex items-center gap-1.5 self-start font-bold underline decoration-2 underline-offset-4"
                >
                  How it helps<span className="sr-only">: {r.title.toLowerCase()}</span>
                  <ArrowUpRight size={16} aria-hidden />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
