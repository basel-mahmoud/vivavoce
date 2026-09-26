'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'motion/react';
import { EASE_CSS } from '@/lib/motion';
import { cn } from '@/lib/cn';

/** Flap colours. Brand fields keep their fixed text pairings in both schemes. */
export type FlapTone = 'coal' | 'paper' | 'verm' | 'butter' | 'cobalt';

export interface FlapSegment {
  text: string;
  /** Cells this segment occupies (pads or truncates the text). */
  width?: number;
  tone?: FlapTone;
  /** 'end' right-aligns inside the width, for marks and counts. */
  align?: 'start' | 'end';
}

/** A row is plain text, or segments with their own widths and tones. */
export type FlapRow = string | readonly FlapSegment[];

interface Cell {
  ch: string;
  tone: FlapTone;
}

// Real boards turn a drum in a fixed order; a flap only ever moves forward.
const LETTERS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';

function drumFor(ch: string) {
  if (DIGITS.includes(ch)) return DIGITS;
  if (LETTERS.includes(ch)) return LETTERS;
  return null;
}

/** The faces a flap shows on its way from `from` to `to`, ending on `to`. */
function faces(from: string, to: string, max: number): string[] {
  if (from === to) return [];
  const drum = drumFor(to);
  if (!drum) return [to];
  const end = drum.indexOf(to);
  const start = drum.indexOf(from);
  const distance = start >= 0 ? (end - start + drum.length) % drum.length : max;
  const count = Math.min(Math.max(distance, 1), max);
  const out: string[] = [];
  for (let k = count - 1; k >= 0; k--) out.push(drum[(end - k + drum.length) % drum.length]!);
  return out;
}

function normalize(rows: readonly FlapRow[], minCols = 1, minRows = 0) {
  const built = rows.map((row) => {
    if (typeof row === 'string') {
      return Array.from(row.toUpperCase(), (ch): Cell => ({ ch, tone: 'coal' }));
    }
    const out: Cell[] = [];
    for (const seg of row) {
      const text = seg.text.toUpperCase();
      const width = seg.width ?? text.length;
      const padded = (seg.align === 'end' ? text.padStart(width) : text.padEnd(width)).slice(0, width);
      for (const ch of padded) out.push({ ch, tone: seg.tone ?? 'coal' });
    }
    return out;
  });
  const cols = Math.max(1, minCols, ...built.map((r) => r.length));
  while (built.length < minRows) built.push([]);
  const cells = built.map((r) =>
    r.length < cols
      ? [...r, ...Array.from({ length: cols - r.length }, (): Cell => ({ ch: ' ', tone: 'coal' }))]
      : r.slice(0, cols),
  );
  return { cells, cols };
}

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (ms <= 0 || signal.aborted) return resolve();
    const t = window.setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      window.clearTimeout(t);
      resolve();
    });
  });

interface CellParts {
  top: HTMLSpanElement;
  bottom: HTMLSpanElement;
  leafTop: HTMLSpanElement;
  leafBottom: HTMLSpanElement;
}

function partsOf(cell: HTMLSpanElement | null): CellParts | null {
  if (!cell) return null;
  const glyphs = cell.querySelectorAll<HTMLSpanElement>('.vv-flap-glyph');
  const [top, bottom, leafTop, leafBottom] = Array.from(glyphs);
  if (!top || !bottom || !leafTop || !leafBottom) return null;
  return { top, bottom, leafTop, leafBottom };
}

/** Show `ch` on the resting halves, no motion. */
function setStill(parts: CellParts, ch: string) {
  parts.top.textContent = ch;
  parts.bottom.textContent = ch;
  for (const leaf of [parts.leafTop, parts.leafBottom]) {
    leaf.parentElement!.getAnimations().forEach((a) => a.cancel());
    leaf.parentElement!.style.visibility = 'hidden';
  }
}

/** Turn one cell through `seq`. The top leaf falls, the bottom leaf lands. */
async function turn(
  parts: CellParts,
  from: string,
  seq: string[],
  flipMs: number,
  signal: AbortSignal,
  onFace: (ch: string) => void,
) {
  const upper = parts.leafTop.parentElement!;
  const lower = parts.leafBottom.parentElement!;
  const half = flipMs / 2;
  let current = from;
  for (let i = 0; i < seq.length; i++) {
    if (signal.aborted) return;
    const next = seq[i]!;
    const last = i === seq.length - 1;
    parts.top.textContent = next;
    parts.bottom.textContent = current;
    parts.leafTop.textContent = current;
    parts.leafBottom.textContent = next;
    upper.style.visibility = 'visible';
    lower.style.visibility = 'visible';
    const fall = upper.animate(
      [
        { transform: 'rotateX(0deg)', filter: 'brightness(1)' },
        { transform: 'rotateX(-90deg)', filter: 'brightness(0.62)' },
      ],
      { duration: half, easing: 'linear', fill: 'both' },
    );
    // The last face lands with a small clack past the stop, then settles.
    const land = lower.animate(
      last
        ? [
            { transform: 'rotateX(90deg)', filter: 'brightness(0.7)', easing: EASE_CSS.out },
            { transform: 'rotateX(-7deg)', filter: 'brightness(1.04)', offset: 0.7, easing: EASE_CSS.inOut },
            { transform: 'rotateX(0deg)', filter: 'brightness(1)' },
          ]
        : [
            { transform: 'rotateX(90deg)', filter: 'brightness(0.7)' },
            { transform: 'rotateX(0deg)', filter: 'brightness(1)' },
          ],
      { duration: last ? half * 2.2 : half, delay: half, easing: last ? 'linear' : EASE_CSS.out, fill: 'both' },
    );
    // Interrupted: settle on the last whole face, never a torn one.
    const stop = () => setStill(parts, current);
    signal.addEventListener('abort', stop, { once: true });
    try {
      await land.finished;
    } catch {
      return;
    }
    signal.removeEventListener('abort', stop);
    parts.bottom.textContent = next;
    fall.cancel();
    land.cancel();
    upper.style.visibility = 'hidden';
    lower.style.visibility = 'hidden';
    current = next;
    onFace(current);
  }
}

interface FlapCellProps {
  index: number;
  initial: string;
  tone: FlapTone;
  digit: boolean;
  register: (index: number, el: HTMLSpanElement | null) => void;
}

/** One flap. React paints the first face; after that the board turns it. */
const FlapCell = memo(function FlapCell({ index, initial, tone, digit, register }: FlapCellProps) {
  const [face] = useState(initial);
  return (
    <span
      ref={(el) => register(index, el)}
      className="vv-flap"
      data-tone={tone}
      data-digit={digit ? '' : undefined}
    >
      <span className="vv-flap-half vv-flap-top">
        <span className="vv-flap-glyph">{face}</span>
      </span>
      <span className="vv-flap-half vv-flap-bottom">
        <span className="vv-flap-glyph">{face}</span>
      </span>
      <span className="vv-flap-leaf vv-flap-leaf-top">
        <span className="vv-flap-glyph" />
      </span>
      <span className="vv-flap-leaf vv-flap-leaf-bottom">
        <span className="vv-flap-glyph" />
      </span>
    </span>
  );
});

export interface SplitFlapProps {
  rows: readonly FlapRow[];
  /** What the board says, read to screen readers instead of the cells. */
  label: string;
  /** inview (default): reveal once when scrolled into view. mount: reveal on mount. */
  play?: 'inview' | 'mount';
  size?: 'sm' | 'md' | 'lg';
  /** Most faces a flap turns through before landing. Keep it low: decisive, not a casino. */
  flips?: number;
  /** Delay between neighbouring columns, in ms. */
  stagger?: number;
  /** One full flip, in ms. */
  flipMs?: number;
  /** Announce label changes politely (for a board that updates in place). */
  live?: boolean;
  /**
   * Fix the board's size, so it can mount blank (rows={[]}) and later flip
   * its verdict in without the grid changing shape.
   */
  columns?: number;
  lines?: number;
  onSettled?: () => void;
  className?: string;
}

/**
 * A flat, on-brand split-flap board: the verdict board, the departures board.
 * The server renders the final text. Off screen it is cleared, and when it
 * arrives each flap turns forward through a few faces of its drum, column by
 * column, and lands. Changing `rows` later flips only the cells that change.
 * Reduced motion sets the faces at once. The work is WAAPI on small
 * elements; React never re-renders per flip.
 */
export function SplitFlap({
  rows,
  label,
  play = 'inview',
  size = 'md',
  flips = 4,
  stagger = 26,
  flipMs = 120,
  live = false,
  columns = 1,
  lines = 0,
  onSettled,
  className,
}: SplitFlapProps) {
  // Callers often pass a fresh array literal; the serialised rows are its identity.
  const key = JSON.stringify(rows);
  const { cells, cols } = useMemo(
    () => normalize(JSON.parse(key) as FlapRow[], columns, lines),
    [key, columns, lines],
  );
  const flat = useMemo(() => cells.flat(), [cells]);
  // The newest faces, for a reveal that fires after the rows have changed.
  const target = useRef(flat);
  useEffect(() => {
    target.current = flat;
  }, [flat]);
  const reduce = useReducedMotion() ?? false;

  const board = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLSpanElement | null)[]>([]);
  const showing = useRef<string[] | null>(null);
  const run = useRef<AbortController | null>(null);
  const revealed = useRef(false);
  const settled = useRef(onSettled);

  useEffect(() => {
    settled.current = onSettled;
  }, [onSettled]);

  const register = useCallback((index: number, el: HTMLSpanElement | null) => {
    els.current[index] = el;
  }, []);

  const turnTo = useCallback(
    (targets: Cell[], instant: boolean) => {
      run.current?.abort();
      const ctrl = new AbortController();
      run.current = ctrl;
      const now = showing.current ?? targets.map((c) => c.ch);
      showing.current = now;
      let pending = 0;
      const done = () => {
        if (--pending === 0 && !ctrl.signal.aborted) settled.current?.();
      };
      targets.forEach((cell, i) => {
        const parts = partsOf(els.current[i] ?? null);
        if (!parts) return;
        const from = now[i] ?? ' ';
        if (instant) {
          setStill(parts, cell.ch);
          now[i] = cell.ch;
          return;
        }
        const seq = faces(from, cell.ch, flips);
        if (!seq.length) return;
        const row = Math.floor(i / cols);
        const col = i % cols;
        pending++;
        void wait(col * stagger + row * stagger * 1.8, ctrl.signal)
          .then(() => turn(parts, from, seq, flipMs, ctrl.signal, (ch) => (now[i] = ch)))
          .then(done);
      });
      if (instant) settled.current?.();
    },
    [cols, flips, flipMs, stagger],
  );

  // First reveal: clear the board while it is off screen, turn it when it arrives.
  useEffect(() => {
    const el = board.current;
    if (!el || revealed.current) return;
    showing.current = flat.map((c) => c.ch);
    if (reduce) {
      revealed.current = true;
      return;
    }
    const blank = () => {
      const blanks = flat.map(() => ' ');
      els.current.forEach((cell) => {
        const parts = partsOf(cell);
        if (parts) setStill(parts, ' ');
      });
      showing.current = blanks;
    };
    if (play === 'mount') {
      const t = window.setTimeout(() => {
        blank();
        revealed.current = true;
        turnTo(target.current, false);
      }, 0);
      return () => window.clearTimeout(t);
    }
    let blanked = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          io.disconnect();
          revealed.current = true;
          if (blanked) turnTo(target.current, false);
        } else if (!blanked) {
          blanked = true;
          blank();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
    // The reveal happens once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cells remount (showing their new faces) when the board changes shape.
  const shape = `${cells.length}x${cols}`;

  // Later changes: flip only what changed.
  const lastKey = useRef(`${key}|${shape}`);
  const lastShape = useRef(shape);
  useEffect(() => {
    if (lastKey.current === `${key}|${shape}`) return;
    lastKey.current = `${key}|${shape}`;
    if (lastShape.current !== shape) {
      lastShape.current = shape;
      run.current?.abort();
      showing.current = flat.map((c) => c.ch);
      return;
    }
    if (!revealed.current) return;
    turnTo(flat, reduce);
  }, [key, shape, flat, reduce, turnTo]);

  useEffect(() => () => run.current?.abort(), []);

  return (
    <div
      ref={board}
      className={cn('vv-flapboard', className)}
      data-size={size}
      style={{ '--cols': cols } as CSSProperties}
    >
      <p className="sr-only" aria-live={live ? 'polite' : undefined}>
        {label}
      </p>
      <div className="vv-flapboard-face" aria-hidden="true" key={shape}>
        {cells.map((row, r) => (
          <div className="vv-flap-row" key={r}>
            {row.map((cell, c) => {
              const index = r * cols + c;
              return (
                <FlapCell
                  key={c}
                  index={index}
                  initial={cell.ch}
                  tone={cell.tone}
                  digit={DIGITS.includes(cell.ch)}
                  register={register}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
