'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useAnimate, useReducedMotion } from 'motion/react';
import { EASE } from '@/lib/motion';
import { Marks } from './Marks';
import { cn } from '@/lib/cn';

/** paper: a resting mark. verm: the examiner's red paddle, the one to fix first. coal: for night panels. */
export type PaddleTone = 'paper' | 'verm' | 'coal';

export interface PaddleProps {
  /** The mark on the face, 0 to 100. */
  value: number;
  /** Axis name: printed on the back, and part of the accessible name. */
  label: string;
  /** Face up. Turning it true flips the paddle over; the mark rolls in as it lands. */
  revealed?: boolean;
  tone?: PaddleTone;
  size?: 'sm' | 'md' | 'lg';
  /** Wait before flipping, in ms (stagger a panel of five). */
  delay?: number;
  /** Show the handle. */
  handle?: boolean;
  onRevealed?: () => void;
  className?: string;
}

const RIM_LAYERS = [-0.5, -0.25, 0, 0.25, 0.5];

/**
 * A score paddle: a bevelled coin on a short handle. Face down it shows the
 * axis; revealing it winds back, flips over on rotateY with a little
 * overshoot and a lift, settles, and the mark rolls up on the face. The disc
 * has a real rim, so edge-on it reads as a coin, never a sliver. Reduced
 * motion swaps the faces with a fade and shows the mark at once.
 */
export function Paddle({
  value,
  label,
  revealed = true,
  tone = 'paper',
  size = 'md',
  delay = 0,
  handle = true,
  onRevealed,
  className,
}: PaddleProps) {
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const reduce = useReducedMotion() ?? false;
  const [face, setFace] = useState<'front' | 'back'>(revealed ? 'front' : 'back');
  const [mark, setMark] = useState(revealed ? value : 0);
  const first = useRef(true);
  const done = useRef(onRevealed);

  useEffect(() => {
    done.current = onRevealed;
  }, [onRevealed]);

  // The shown mark follows `value` while face up.
  useEffect(() => {
    if (face === 'front' && !first.current) {
      const t = window.setTimeout(() => setMark(value), 0);
      return () => window.clearTimeout(t);
    }
  }, [value, face]);

  useEffect(() => {
    const disc = scope.current?.querySelector<HTMLElement>('.vv-paddle-disc');
    if (!disc) return;
    if (first.current) {
      first.current = false;
      // Tell Motion where the disc starts: it cannot read rotateY back from CSS.
      void animate(disc, { rotateY: revealed ? 0 : 180, y: 0 }, { duration: 0 });
      return;
    }
    let cancelled = false;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));

    if (reduce) {
      later(() => {
        setFace(revealed ? 'front' : 'back');
        setMark(revealed ? value : 0);
        if (revealed) done.current?.();
      }, delay);
      return () => timers.forEach((t) => window.clearTimeout(t));
    }

    if (!revealed) {
      later(() => {
        setFace('back');
        void animate(disc, { rotateY: 180, y: 0 }, { duration: 0.34, ease: EASE.inOut });
        later(() => setMark(0), 340);
      }, delay);
      return () => timers.forEach((t) => window.clearTimeout(t));
    }

    later(async () => {
      // Anticipation: wind back and dip, as if the examiner lifts it.
      await animate(disc, { rotateY: 198, y: 3 }, { duration: 0.14, ease: EASE.out });
      if (cancelled) return;
      later(() => setFace('front'), 150);
      later(() => setMark(value), 230);
      await animate(
        disc,
        { rotateY: 0, y: [3, -7, 0] },
        {
          rotateY: { type: 'spring', bounce: 0.3, visualDuration: 0.52 },
          y: { duration: 0.62, times: [0, 0.42, 1], ease: [EASE.out, EASE.inOut] },
        },
      );
      if (!cancelled) done.current?.();
    }, delay);

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
    // Flip only when the side changes; the value rolls by itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  const accessible = revealed ? `${label}: ${value} out of 100` : `${label}: not marked yet`;

  return (
    <span
      ref={scope}
      role="img"
      aria-label={accessible}
      className={cn('vv-paddle', className)}
      data-tone={tone}
      data-size={size}
      data-face={face}
      style={{ '--rim-count': RIM_LAYERS.length } as CSSProperties}
    >
      <span className="vv-paddle-stage" aria-hidden="true">
        <span className="vv-paddle-disc">
          {RIM_LAYERS.map((z) => (
            <span key={z} className="vv-paddle-rim" style={{ '--z': z } as CSSProperties} />
          ))}
          <span className="vv-paddle-face vv-paddle-back">
            <span className="vv-paddle-axis">{label}</span>
          </span>
          <span className="vv-paddle-face vv-paddle-front">
            <Marks value={mark} play="instant" duration={760} className="vv-paddle-mark" />
          </span>
        </span>
      </span>
      {handle ? <span className="vv-paddle-handle" aria-hidden="true" /> : null}
    </span>
  );
}
