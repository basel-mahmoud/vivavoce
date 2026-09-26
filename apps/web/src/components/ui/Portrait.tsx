'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cn } from '@/lib/cn';

export type ExaminerAxis = 'correctness' | 'clarity' | 'structure' | 'conciseness' | 'confidence';
export type ExaminerState = 'neutral' | 'listening' | 'pleased' | 'sceptical' | 'speaking' | 'marking' | 'raised';

const AXIS_LABEL: Record<ExaminerAxis, string> = {
  correctness: 'Correctness',
  clarity: 'Clarity',
  structure: 'Structure',
  conciseness: 'Conciseness',
  confidence: 'Confidence',
};

const STATE_WORD: Record<ExaminerState, string> = {
  neutral: 'waiting',
  listening: 'listening',
  pleased: 'pleased',
  sceptical: 'sceptical',
  speaking: 'speaking',
  marking: 'marking',
  raised: 'raising a paddle',
};

/** Where the renders live: /examiners/<axis>-<state>.webp. */
export function portraitSrc(axis: ExaminerAxis, state: ExaminerState) {
  return `/examiners/${axis}-${state}.webp`;
}

export interface PortraitProps {
  axis: ExaminerAxis;
  state?: ExaminerState;
  /**
   * Width in px. It shrinks to fit a narrower container (max-width: 100%);
   * the height follows the frame: square, or 3:4 when raised.
   */
  size?: number;
  /** Override the description. Defaults to "The Structure examiner, listening". */
  alt?: string;
  /** Beside a visible name already: hide it from screen readers. */
  decorative?: boolean;
  /** Load eagerly (above the fold). */
  priority?: boolean;
  className?: string;
}

/**
 * An examiner portrait: a 2D render of the same cast as the room, one file
 * per expression. If an expression has not been rendered it falls back to
 * that examiner's neutral face, and if that is missing too, to a quiet
 * silhouette of the examiner's shape with its visor. Swapping expressions
 * crossfades: the old face stays until the new one has loaded.
 */
export function Portrait({
  axis,
  state = 'neutral',
  size = 160,
  alt,
  decorative = false,
  priority = false,
  className,
}: PortraitProps) {
  const candidates = state === 'neutral' ? [portraitSrc(axis, 'neutral')] : [portraitSrc(axis, state), portraitSrc(axis, 'neutral')];
  const [failed, setFailed] = useState<readonly string[]>([]);
  const [loaded, setLoaded] = useState<string | null>(null);
  const active = candidates.find((c) => !failed.includes(c)) ?? null;
  const img = useRef<HTMLImageElement>(null);

  // An image can finish (or fail) before hydration attaches onLoad/onError.
  useEffect(() => {
    const el = img.current;
    if (!el || !active || !el.complete) return;
    const frame = requestAnimationFrame(() => {
      if (el.naturalWidth > 0) setLoaded(active);
      else setFailed((f) => (f.includes(active) ? f : [...f, active]));
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);

  const raised = state === 'raised';
  const height = Math.round(raised ? size * (4 / 3) : size);
  const description = alt ?? `The ${AXIS_LABEL[axis]} examiner, ${STATE_WORD[state]}`;
  const swapping = loaded !== null && active !== null && loaded !== active;
  const missing = active === null;

  return (
    <span
      className={cn('vv-portrait', className)}
      data-axis={axis}
      data-state={state}
      data-missing={missing ? '' : undefined}
      style={{ width: size, aspectRatio: raised ? '3 / 4' : '1 / 1' } as CSSProperties}
      role={missing && !decorative ? 'img' : undefined}
      aria-label={missing && !decorative ? description : undefined}
    >
      {missing ? <ExaminerSilhouette axis={axis} state={state} /> : null}
      {swapping ? (
        // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP sprites; the fallback chain needs onError
        <img src={loaded} alt="" aria-hidden="true" className="vv-portrait-img" width={size} height={height} />
      ) : null}
      {active ? (
        // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP sprites; the fallback chain needs onError
        <img
          key={active}
          ref={img}
          src={active}
          alt={decorative ? '' : description}
          width={size}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className="vv-portrait-img"
          data-entering={swapping ? '' : undefined}
          onLoad={() => setLoaded(active)}
          onError={() => setFailed((f) => (f.includes(active) ? f : [...f, active]))}
        />
      ) : null}
    </span>
  );
}

/* ── The placeholder cast ───────────────────────────────────────────────── */

type Visor = { x: number; y: number; w: number; h: number; r: number };

const CAST: Record<ExaminerAxis, { body: string; extra?: string; visor: Visor }> = {
  // A bench instrument: a squat cabinet with a status bar on top.
  correctness: {
    body: 'M24 116V52c0-11 8-19 19-19h34c11 0 19 8 19 19v64z',
    extra: 'M47 33v-5a3 3 0 0 1 3-3h20a3 3 0 0 1 3 3v5z',
    visor: { x: 33, y: 47, w: 54, h: 30, r: 10 },
  },
  // A bulb on a screw base.
  clarity: {
    body: 'M60 14c20 0 35 15 35 34 0 13-7 22-14 29-4 4-5 8-5 13H44c0-5-1-9-5-13-7-7-14-16-14-29 0-19 15-34 35-34z',
    extra: 'M45 94h30v5H45zM46 101h28v5H46zM48 108h24c0 5-5 8-12 8s-12-3-12-8z',
    visor: { x: 34, y: 33, w: 52, h: 27, r: 13 },
  },
  // A tiered stack: a head box on a body box, a binder clip on top.
  structure: {
    body: 'M40 26h40c6 0 10 4 10 10v24c0 6-4 10-10 10H40c-6 0-10-4-10-10V36c0-6 4-10 10-10zM36 74h48c5 0 8 3 8 8v34H28V82c0-5 3-8 8-8z',
    extra: 'M52 26v-8h16v8zM55 18a5 5 0 0 1 10 0',
    visor: { x: 38, y: 35, w: 44, h: 24, r: 8 },
  },
  // A metronome: a tall tapered tower with its rod up.
  conciseness: {
    body: 'M47 116l5-82c1-6 4-9 8-9s7 3 8 9l5 82z',
    extra: 'M59 25l6-21 3 1-6 21zM61 9h9v6h-9z',
    visor: { x: 50, y: 42, w: 20, h: 13, r: 6 },
  },
  // A pebble in a headset.
  confidence: {
    body: 'M14 116c0-50 20-78 46-78s46 28 46 78z',
    extra:
      'M20 70c2-30 18-48 40-48s38 18 40 48h-5c-2-26-15-42-35-42S27 44 25 70zM12 66h12v24H12zM96 66h12v24H96zM20 88c4 10 12 14 22 14v4c-12 0-21-5-26-16z',
    visor: { x: 30, y: 58, w: 60, h: 30, r: 14 },
  },
};

/** Eyes on the visor, per expression: the same vocabulary as the glass faces. */
function Eyes({ v, state }: { v: Visor; state: ExaminerState }) {
  const cx = v.x + v.w / 2;
  const cy = v.y + v.h / 2;
  const gap = v.w * 0.22;
  const ew = Math.max(3, v.w * 0.1);
  const eh = Math.max(4, v.h * 0.42);
  const l = cx - gap;
  const r = cx + gap;
  switch (state) {
    case 'pleased':
      return (
        <g fill="none" stroke="currentColor" strokeWidth={ew * 0.8} strokeLinecap="round">
          <path d={`M${l - ew} ${cy + 2}q${ew} ${-eh * 0.7} ${ew * 2} 0`} />
          <path d={`M${r - ew} ${cy + 2}q${ew} ${-eh * 0.7} ${ew * 2} 0`} />
        </g>
      );
    case 'sceptical':
      return (
        <g fill="currentColor">
          <rect x={l - ew / 2} y={cy - eh / 2} width={ew} height={eh} rx={ew / 2} />
          <rect x={r - ew / 2} y={cy} width={ew * 1.3} height={eh * 0.4} rx={ew / 3} />
          <path
            d={`M${l - ew * 1.2} ${cy - eh * 0.9}l${ew * 2.4} ${-eh * 0.25}`}
            stroke="currentColor"
            strokeWidth={ew * 0.55}
            strokeLinecap="round"
          />
        </g>
      );
    case 'marking':
      return (
        <g fill="currentColor">
          <rect x={l - ew / 2} y={cy - eh * 0.15} width={ew * 1.2} height={eh * 0.45} rx={ew / 3} />
          <rect x={r - ew / 2} y={cy - eh * 0.15} width={ew * 1.2} height={eh * 0.45} rx={ew / 3} />
          <rect x={cx - gap} y={cy + eh * 0.55} width={gap * 2} height={Math.max(1.5, ew * 0.4)} rx={1} opacity={0.7} />
        </g>
      );
    case 'listening':
      return (
        <g fill="currentColor">
          <rect x={l - ew / 2} y={cy - eh * 0.62} width={ew} height={eh} rx={ew / 2} />
          <rect x={r - ew / 2} y={cy - eh * 0.62} width={ew} height={eh} rx={ew / 2} />
          <path
            d={`M${cx - gap * 1.3} ${cy + eh * 0.62}q${gap * 0.32} ${-eh * 0.3} ${gap * 0.65} 0t${gap * 0.65} 0t${gap * 0.65} 0t${gap * 0.65} 0`}
            fill="none"
            stroke="currentColor"
            strokeWidth={Math.max(1.2, ew * 0.35)}
            strokeLinecap="round"
          />
        </g>
      );
    case 'speaking':
      return (
        <g>
          <g fill="currentColor">
            <rect x={l - ew / 2} y={cy - eh * 0.66} width={ew} height={eh * 0.8} rx={ew / 2} />
            <rect x={r - ew / 2} y={cy - eh * 0.66} width={ew} height={eh * 0.8} rx={ew / 2} />
          </g>
          <g className="vv-silhouette-voice">
            {[-2, -1, 0, 1, 2].map((k) => {
              const h = [0.3, 0.55, 0.8, 0.55, 0.3][k + 2]! * eh;
              return <rect key={k} x={cx + k * ew * 0.75 - ew * 0.22} y={cy + eh * 0.5 - h / 2} width={ew * 0.44} height={h} rx={ew * 0.22} />;
            })}
          </g>
        </g>
      );
    default:
      return (
        <g fill="currentColor">
          <rect x={l - ew / 2} y={cy - eh / 2} width={ew} height={eh} rx={ew / 2} />
          <rect x={r - ew / 2} y={cy - eh / 2} width={ew} height={eh} rx={ew / 2} />
        </g>
      );
  }
}

/** Shown only while a render is missing: the examiner's shape, visor and expression. */
function ExaminerSilhouette({ axis, state }: { axis: ExaminerAxis; state: ExaminerState }) {
  const cast = CAST[axis];
  const raised = state === 'raised';
  const v = cast.visor;
  return (
    <svg
      className="vv-silhouette"
      viewBox={raised ? '0 -40 120 160' : '0 0 120 120'}
      aria-hidden="true"
      preserveAspectRatio="xMidYMax meet"
    >
      <ellipse className="vv-silhouette-floor" cx="60" cy="117" rx="46" ry="3" />
      {raised ? (
        <g className="vv-silhouette-paddle">
          <rect x="97" y="-4" width="4" height="54" rx="2" />
          <circle cx="99" cy="-14" r="17" />
        </g>
      ) : null}
      <path className="vv-silhouette-body" d={cast.body} />
      {cast.extra ? <path className="vv-silhouette-body" d={cast.extra} /> : null}
      <rect className="vv-silhouette-visor" x={v.x} y={v.y} width={v.w} height={v.h} rx={v.r} />
      <g className="vv-silhouette-eyes">
        <Eyes v={v} state={raised ? 'pleased' : state} />
      </g>
    </svg>
  );
}
