'use client';

import { useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import Link from 'next/link';
import { animate } from 'motion/react';
import { ArrowRight, Plus } from 'lucide-react';
import { EASE } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { FINE_POINTER, useMedia, useReducedMarkup } from './useHome';

type Field = 'cobalt' | 'coal' | 'butter' | 'paper';

interface Room {
  id: string;
  title: string;
  body: string;
  field: Field;
  /** The example beside the row, in words (the visual itself is decorative). */
  example: string;
}

const ROOMS: readonly Room[] = [
  {
    id: 'viva',
    title: 'Students facing a viva',
    body: 'Medicine, law, engineering: anywhere the exam is spoken. Rehearse the follow-ups, not just the facts.',
    field: 'cobalt',
    example: 'In the app, for example: a cardiology viva, six days on the exam countdown.',
  },
  {
    id: 'jobs',
    title: 'Job seekers',
    body: 'The behavioural questions you will actually get. Practise until each story lands in thirty seconds.',
    field: 'coal',
    example: 'In the app, for example: a STAR answer with the result flagged as thin. Say what changed because of you.',
  },
  {
    id: 'talks',
    title: 'Presenters',
    body: 'Cut the filler, find the structure, land the point. The room should hear confidence, not preparation.',
    field: 'butter',
    example: 'In the app, for example: slide 7 of 12, where Conciseness keeps flagging the middle to cut.',
  },
  {
    id: 'lang',
    title: 'Language learners',
    body: 'A sparring partner that never tires and never judges. Speak, get corrected on clarity and pace, repeat.',
    field: 'paper',
    example: 'In the app, for example: a pace meter reading steady, between rushed and slow.',
  },
];

/** What each room looks like in the app, at a size you can read. Examples. */
function RoomVisual({ id }: { id: string }) {
  if (id === 'viva')
    return (
      <div className="vv-room-card bg-paper-obj text-coal">
        <p className="text-sm font-black">Cardiology viva</p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <p className="text-[0.8rem] font-semibold leading-snug text-coal/70">
            Exam
            <br />
            countdown
          </p>
          <p className="marks text-[2.1rem] font-bold leading-none">6 days</p>
        </div>
      </div>
    );
  if (id === 'jobs')
    return (
      <div>
        <div className="flex gap-2">
          {['S', 'T', 'A', 'R'].map((l) => (
            <span
              key={l}
              className={cn(
                'grid h-12 w-12 flex-none place-items-center rounded-xl text-xl font-black',
                l === 'R' ? 'border-2 border-dashed border-paper/55 text-paper/75' : 'bg-paper text-coal',
              )}
            >
              {l}
            </span>
          ))}
        </div>
        <p className="mt-2.5 text-[0.85rem] font-bold leading-snug text-paper">
          The result is thin. Say what changed because of you.
        </p>
      </div>
    );
  if (id === 'talks')
    return (
      <div className="vv-room-card bg-coal text-paper">
        <p className="text-[0.78rem] font-bold text-paper-mut">
          Slide <span className="marks">7</span> of <span className="marks">12</span>
        </p>
        <p className="mt-2 text-[0.98rem] font-bold leading-snug">Conciseness keeps flagging the middle. Cut it.</p>
      </div>
    );
  return (
    <div className="vv-room-card bg-coal text-paper">
      <div className="flex items-center justify-between text-sm font-bold">
        <span>Pace</span>
        <span className="text-butter">steady</span>
      </div>
      <div className="relative mt-3.5 h-2 rounded-full bg-paper/20">
        <span className="absolute left-[46%] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-butter" />
      </div>
      <div className="mt-2 flex justify-between text-[0.7rem] font-semibold text-paper-mut">
        <span>rushed</span>
        <span>slow</span>
      </div>
    </div>
  );
}

const CLOSED_TOP = 'inset(0% 0% 100% 0%)';
const CLOSED_BOTTOM = 'inset(100% 0% 0% 0%)';
const OPEN = 'inset(0% 0% 0% 0%)';

function RoomFace({ room, layer, children }: { room: Room; layer: 'base' | 'flood'; children: React.ReactNode }) {
  return (
    <div className="vv-room-face" data-layer={layer}>
      {children}
      <p className="vv-room-body">{room.body}</p>
      <div className="vv-room-more">
        <div className="vv-room-more-inner">
          <div className="vv-room-visual">
            <RoomVisual id={room.id} />
          </div>
        </div>
      </div>
      <span className="vv-room-sign" aria-hidden="true">
        <Plus size={20} strokeWidth={2.5} />
      </span>
    </div>
  );
}

function RoomRow({ room }: { room: Room }) {
  const example = useId();
  const reduce = useReducedMarkup();
  const fine = useMedia(FINE_POINTER);
  const flood = useRef<HTMLDivElement>(null);
  const target = useRef(false);
  const drained = useRef(true);
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const open = pinned || hovered || focused;

  /** Flood in from, or drain out to, the edge nearest the pointer. */
  const pour = (to: boolean, edge: 'top' | 'bottom') => {
    const el = flood.current;
    if (!el || target.current === to) return;
    target.current = to;
    // Reduced motion: the colour simply fades in and out (home.css).
    if (reduce) return;
    const closed = edge === 'top' ? CLOSED_TOP : CLOSED_BOTTOM;
    if (to && drained.current) el.style.clipPath = closed;
    drained.current = false;
    const run = animate(el, { clipPath: to ? OPEN : closed }, { duration: to ? 0.42 : 0.3, ease: EASE.out });
    if (!to) {
      void run.then(() => {
        if (!target.current) drained.current = true;
      });
    }
  };

  const edgeOf = (e: ReactPointerEvent<HTMLElement>): 'top' | 'bottom' => {
    const r = e.currentTarget.getBoundingClientRect();
    return e.clientY - r.top < r.height / 2 ? 'top' : 'bottom';
  };

  return (
    <li
      className="vv-room"
      data-field={room.field}
      data-open={open ? '' : undefined}
      onPointerEnter={(e) => {
        if (!fine || e.pointerType !== 'mouse') return;
        setHovered(true);
        pour(true, edgeOf(e));
      }}
      onPointerLeave={(e) => {
        if (!fine || e.pointerType !== 'mouse') return;
        setHovered(false);
        if (!pinned && !focused) pour(false, edgeOf(e));
      }}
    >
      <RoomFace room={room} layer="base">
        <h3 className="vv-room-title">
          <button
            type="button"
            className="vv-room-toggle"
            aria-expanded={pinned}
            aria-controls={example}
            onClick={() => {
              const next = !pinned;
              setPinned(next);
              if (!hovered) pour(next || focused, 'top');
            }}
            onFocus={(e) => {
              if (!e.currentTarget.matches(':focus-visible')) return;
              setFocused(true);
              pour(true, 'top');
            }}
            onBlur={() => {
              setFocused(false);
              if (!pinned && !hovered) pour(false, 'bottom');
            }}
          >
            {room.title}
          </button>
        </h3>
        {/* Pointing or tabbing only previews the room; opening it (click, tap, Enter) says what is in it. */}
        <p id={example} className="sr-only" hidden={!pinned}>
          {room.example}
        </p>
      </RoomFace>
      <div ref={flood} className="vv-room-flood" aria-hidden="true">
        <RoomFace room={room} layer="flood">
          <p className="vv-room-title">
            <span className="vv-room-toggle">{room.title}</span>
          </p>
        </RoomFace>
      </div>
    </li>
  );
}

/**
 * Where the answer is spoken, as ruled index rows under a small label. The
 * room names are the headline. Pointing at a row, or tabbing to it, floods
 * it with its colour from the edge you came in by and previews what that
 * room looks like in the app; clicking or tapping a row opens it (and tells
 * a screen reader what is in it).
 */
export function Rooms({ showHeading = true, className }: { showHeading?: boolean; className?: string }) {
  const uid = useId();
  return (
    <section aria-labelledby={`${uid}-title`} className={cn('vv-rooms mx-auto w-full max-w-[1360px] px-4 py-20 sm:px-5 sm:py-28', className)}>
      <div className="vv-rooms-grid" data-label={showHeading ? '' : undefined}>
        {showHeading ? (
          // The title stays small beside the rows: the room names are the headline.
          <div className="vv-rooms-label">
            <h2 id={`${uid}-title`} className="vv-rooms-title">
              Anywhere the answer is spoken.
            </h2>
            <p className="vv-rooms-lead">Different rooms, one problem: saying it well is its own skill.</p>
          </div>
        ) : (
          <h2 id={`${uid}-title`} className="sr-only">
            Who it is for
          </h2>
        )}
        <div className="min-w-0">
          <ul className="vv-room-list">
            {ROOMS.map((r) => (
              <RoomRow key={r.id} room={r} />
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <p className="text-[0.8rem] font-semibold text-ink-mut">What each room looks like in the app, as examples.</p>
            {showHeading ? (
              <Link href="/use-cases" className="group inline-flex min-h-11 items-center gap-1.5 font-bold">
                <span className="link-quiet">How a week of sparring goes</span>
                <ArrowRight size={16} aria-hidden className="text-ink-blue" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
