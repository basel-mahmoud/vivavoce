'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useInView, useReducedMotion } from 'motion/react';
import { annotate } from 'rough-notation';
import type { BracketType, RoughAnnotation, RoughAnnotationType } from 'rough-notation/lib/model';
import { cn } from '@/lib/cn';

declare global {
  interface Window {
    /** rough-notation's "keyframes injected" flag. globals.css ships them. */
    __rno_kf_s?: unknown;
  }
}

export type RedPenMark = Extract<
  RoughAnnotationType,
  'circle' | 'underline' | 'strike-through' | 'crossed-off' | 'box' | 'bracket' | 'highlight'
>;

/**
 * pen: vermilion text colour, AA as a thin stroke on paper and canvas (the default).
 * bright: brand vermilion, for coal fields.
 * blue: the candidate's own blue ink.
 * highlighter: butter, under coal text (the default for `highlight`).
 */
export type RedPenTone = 'pen' | 'bright' | 'blue' | 'highlighter';

type Play = 'inview' | 'mount' | 'manual';

/** Default stroke timing per mark, in ms: quick flicks, slower loops. */
const DURATION: Record<RedPenMark, number> = {
  underline: 460,
  'strike-through': 380,
  'crossed-off': 520,
  circle: 820,
  box: 760,
  bracket: 520,
  highlight: 620,
};

/** Padding in em, so the mark scales with the type it sits on. */
const PADDING: Record<RedPenMark, readonly [number, number]> = {
  underline: [0.02, 0.02],
  'strike-through': [0, 0],
  'crossed-off': [0.02, 0.04],
  circle: [0.2, 0.24],
  box: [0.06, 0.1],
  bracket: [0.06, 0.1],
  highlight: [0, 0.06],
};

const ITERATIONS: Record<RedPenMark, number> = {
  underline: 1,
  'strike-through': 1,
  'crossed-off': 1,
  circle: 2,
  box: 1,
  bracket: 1,
  highlight: 1,
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface RedPenProps {
  children: ReactNode;
  /** What the examiner does to the words. */
  mark?: RedPenMark;
  tone?: RedPenTone;
  /**
   * inview (default): draw once when scrolled into view.
   * mount: draw as soon as it mounts. manual: draw while `show` is true.
   */
  play?: Play;
  show?: boolean;
  /** Wait before drawing, in ms. Sequence several marks in marking order. */
  delay?: number;
  /** Stroke time in ms. */
  duration?: number;
  /** Stroke width in px. Defaults to the type size (thin on body, bolder on display). */
  strokeWidth?: number;
  /** Which sides a bracket goes on. */
  brackets?: BracketType | BracketType[];
  /** Follow the words across line breaks (underline, strike, highlight). */
  multiline?: boolean;
  /** 1 is a single decisive stroke; 2 a hurried double pass. */
  iterations?: number;
  /** Said to screen readers after the words, e.g. "filler, struck through". */
  srLabel?: string;
  onDrawn?: () => void;
  className?: string;
}

/**
 * The examiner's red pen. Wraps words and draws a hand-made mark on them
 * (rough-notation): circle, underline, strike-through, crossed-off, box,
 * bracket or a butter highlight. Draws once, in view or on demand, and
 * redraws still (no animation) if the layout reflows. Under reduced motion
 * the finished mark is simply there.
 *
 * Vermilion is the examiner's colour only: use it for marks on a candidate's
 * answer, never for decoration. The mark is visual; pass `srLabel` when it
 * carries meaning.
 */
export function RedPen({
  children,
  mark = 'underline',
  tone,
  play = 'inview',
  show = true,
  delay = 0,
  duration,
  strokeWidth,
  brackets,
  multiline = true,
  iterations,
  srLabel,
  onDrawn,
  className,
}: RedPenProps) {
  const wrapper = useRef<HTMLSpanElement>(null);
  const target = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion() ?? false;
  const inView = useInView(target, { once: true, margin: '0px 0px -12% 0px' });
  const drawn = useRef<(() => void) | undefined>(onDrawn);

  useEffect(() => {
    drawn.current = onDrawn;
  }, [onDrawn]);

  const wants =
    play === 'manual' ? show : play === 'mount' ? true : reduce ? true : inView;
  const resolvedTone: RedPenTone = tone ?? (mark === 'highlight' ? 'highlighter' : 'pen');
  // A stable key, so an inline array literal does not redraw every render.
  const bracketKey = Array.isArray(brackets) ? brackets.join(' ') : (brackets ?? '');

  useEffect(() => {
    const el = target.current;
    const wrap = wrapper.current;
    if (!el || !wrap || !wants) return;

    // globals.css defines @keyframes rough-notation-dash; skip the injected <style>.
    window.__rno_kf_s = true;

    const size = parseFloat(getComputedStyle(el).fontSize) || 16;
    const [py, px] = PADDING[mark];
    const ms = duration ?? DURATION[mark];
    const annotation: RoughAnnotation = annotate(el, {
      type: mark,
      animate: !reduce,
      animationDuration: ms,
      // Stroke colour comes from CSS (currentColor on the svg), so it follows
      // the colour scheme without redrawing.
      color: undefined,
      strokeWidth: strokeWidth ?? clamp(size * 0.07, 1.75, 5),
      padding: [py * size, px * size, py * size, px * size],
      iterations: iterations ?? ITERATIONS[mark],
      multiline,
      brackets: bracketKey ? (bracketKey.split(' ') as BracketType[]) : undefined,
    });

    const timers: number[] = [];
    timers.push(
      window.setTimeout(
        () => {
          annotation.show();
          wrap.dataset.drawn = 'true';
          // rough-notation times each stroke with CSS `ease-out`; use the house curve.
          wrap
            .querySelectorAll<SVGPathElement>(':scope > svg.rough-annotation path')
            .forEach((p) => p.style.setProperty('animation-timing-function', 'var(--ease-out)'));
          timers.push(window.setTimeout(() => drawn.current?.(), reduce ? 0 : ms));
        },
        reduce ? 0 : delay,
      ),
    );

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      delete wrap.dataset.drawn;
      annotation.remove();
    };
  }, [wants, mark, reduce, delay, duration, strokeWidth, bracketKey, multiline, iterations]);

  return (
    <span
      ref={wrapper}
      data-mark={mark}
      data-tone={resolvedTone}
      className={cn('vv-redpen', className)}
      style={{ '--rp-ms': `${duration ?? DURATION[mark]}ms` } as React.CSSProperties}
    >
      <span ref={target} className="vv-redpen-words">
        {children}
      </span>
      {srLabel ? <span className="sr-only"> ({srLabel})</span> : null}
    </span>
  );
}
