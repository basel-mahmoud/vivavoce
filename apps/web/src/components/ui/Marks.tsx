'use client';

import { useEffect, useMemo, useRef, useState, type HTMLAttributes } from 'react';
import NumberFlow, { continuous, type Format } from '@number-flow/react';
import { useReducedMotion } from 'motion/react';
import { EASE_CSS } from '@/lib/motion';
import { cn } from '@/lib/cn';

type Play = 'inview' | 'mount' | 'instant';
type Phase = 'rest' | 'scramble' | 'settle';

const SCRAMBLE_STEP = 70;
const SCRAMBLE_STEPS = 6;
const FAST = { duration: SCRAMBLE_STEP, easing: 'linear' } as const;
// One locale on server and client, so the formatted value never mismatches.
const LOCALE = 'en-GB';

/** A random number with the same digit count as `n`, so the width holds still. */
function sameWidthRandom(n: number) {
  const digits = Math.max(1, Math.floor(Math.abs(n)).toString().length);
  const lo = digits === 1 ? 0 : 10 ** (digits - 1);
  const hi = 10 ** digits - 1;
  return Math.round(lo + Math.random() * (hi - lo));
}

export interface MarksProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The mark or count to show. */
  value: number;
  /**
   * inview (default): roll up from `from` the first time it scrolls into view.
   * mount: roll up as soon as it mounts. instant: no entrance; later changes
   * still roll.
   */
  play?: Play;
  /** Where the entrance roll starts. */
  from?: number;
  /** Tumble through a few random marks before settling, like a board. */
  scramble?: boolean;
  /** Settle time in ms. */
  duration?: number;
  /** Wait before the entrance, in ms (stagger a row of marks). */
  delay?: number;
  /** Intl.NumberFormat options, e.g. { minimumIntegerDigits: 2 } for clocks. */
  format?: Format;
  prefix?: string;
  suffix?: string;
  /**
   * What assistive tech reads instead of the digits, when the number alone
   * is not enough ("Structure, 48 out of 100"). Defaults to the formatted value.
   */
  label?: string;
  onSettled?: () => void;
}

/**
 * Every mark and count on the site: JetBrains Mono, tabular, rolling digit by
 * digit (NumberFlow) instead of re-rendering text. The server renders the
 * final value, so the number is right before any script runs; the entrance
 * roll only replays it once the mark is actually on screen. Reduced motion
 * shows the value without the roll.
 */
export function Marks({
  value,
  play = 'inview',
  from = 0,
  scramble = false,
  duration = 900,
  delay = 0,
  format,
  prefix,
  suffix,
  label,
  onSettled,
  className,
  ...rest
}: MarksProps) {
  const root = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion() ?? false;
  const [shown, setShown] = useState(value);
  const [phase, setPhase] = useState<Phase>('rest');
  const [animated, setAnimated] = useState(true);

  const latest = useRef(value);
  const entered = useRef(play === 'instant');
  const settled = useRef(onSettled);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    settled.current = onSettled;
  }, [onSettled]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  /** Tumble (optional) then settle on the latest value. Timer callbacks only. */
  const later = (fn: () => void, wait: number) => {
    timers.current.push(window.setTimeout(fn, wait));
  };
  const land = (tumble: boolean, wait: number) => {
    // A new mark interrupts one still tumbling, so two sequences never interleave.
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    later(() => {
      if (tumble) {
        setPhase('scramble');
        for (let i = 0; i < SCRAMBLE_STEPS; i++) {
          later(() => setShown(sameWidthRandom(latest.current)), i * SCRAMBLE_STEP);
        }
        later(() => {
          setPhase('settle');
          setShown(latest.current);
        }, SCRAMBLE_STEPS * SCRAMBLE_STEP);
      } else {
        setPhase('settle');
        setShown(latest.current);
      }
    }, wait);
  };

  // Entrance: park at `from` while off screen, roll up when it arrives.
  useEffect(() => {
    const el = root.current;
    if (!el || entered.current || reduce) return;

    const park = () => {
      setAnimated(false);
      setShown(from);
      requestAnimationFrame(() => setAnimated(true));
    };

    if (play === 'mount') {
      later(() => {
        park();
        entered.current = true;
        land(scramble, delay + 32);
      }, 0);
      return;
    }

    let parked = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          io.disconnect();
          entered.current = true;
          // Already on screen at hydration: keep the value (tumble it if asked).
          if (parked || scramble) land(scramble, delay);
        } else if (!parked) {
          parked = true;
          park();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
    // The entrance runs once per mount; value changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  // After the entrance, every new value rolls (or tumbles) into place.
  useEffect(() => {
    if (latest.current === value) return;
    latest.current = value;
    // Reduced motion renders `value` directly; a parked mark lands on it later.
    if (reduce || !entered.current) return;
    land(scramble, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const timing = phase === 'scramble' ? FAST : { duration, easing: EASE_CSS.out };
  const formatKey = JSON.stringify(format ?? {});
  const formatter = useMemo(() => new Intl.NumberFormat(LOCALE, JSON.parse(formatKey)), [formatKey]);
  // The rolling digits are drawn, not read: assistive tech gets the true value.
  const spoken = label ?? `${prefix ?? ''}${formatter.format(value)}${suffix ?? ''}`;

  return (
    <span ref={root} className={cn('marks vv-marks', className)} {...rest}>
      <span className="sr-only">{spoken}</span>
      <NumberFlow
        value={reduce ? value : shown}
        locales={LOCALE}
        format={format}
        prefix={prefix}
        suffix={suffix}
        animated={animated && !reduce}
        plugins={phase === 'settle' && !scramble ? [continuous] : undefined}
        trend={phase === 'scramble' ? 0 : undefined}
        spinTiming={timing}
        transformTiming={timing}
        opacityTiming={{ duration: phase === 'scramble' ? SCRAMBLE_STEP : 320, easing: EASE_CSS.out }}
        willChange={phase === 'scramble'}
        // A custom element: React would write aria-hidden="" for `true`.
        aria-hidden="true"
        onAnimationsFinish={() => {
          if (phase === 'settle') {
            setPhase('rest');
            settled.current?.();
          }
        }}
      />
    </span>
  );
}
