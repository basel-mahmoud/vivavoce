'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { spring } from 'motion/react';
import { cn } from '@/lib/cn';

// The key comes back up on the physical spring (motion.ts), rendered for CSS.
const RELEASE = spring(0.28, 0.35).toString();

export type KeycapTone = 'paper' | 'coal' | 'cobalt';

export interface KeycapProps {
  /** The legend, e.g. "Space". */
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  tone?: KeycapTone;
  /** Space-bar proportions. */
  wide?: boolean;
  /** Hold it down from outside (the mic is live, say). */
  pressed?: boolean;
  /** Mirror a physical key (a KeyboardEvent.code such as "Space"). Ignored while typing. */
  listen?: string;
  /** 0 to 1: blue ink filling the cap while a hold completes. */
  progress?: number;
  /**
   * Handlers make it a real button. Press start and end fire on pointer and
   * on Space/Enter, so it works as a hold-to-answer control.
   */
  onPressStart?: () => void;
  onPressEnd?: () => void;
  onPress?: () => void;
  /** Accessible name when it is a button and the legend is not enough. */
  label?: string;
  disabled?: boolean;
  className?: string;
}

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

/**
 * A keyboard key with real travel: a cap on a darker skirt. Pressing sinks
 * the cap into its skirt; letting go springs it back. As a plain legend it
 * renders <kbd> ("Hold Space to answer"); with handlers it is a button.
 * Reduced motion keeps the press (the skirt closes) without travel.
 */
export function Keycap({
  children,
  size = 'md',
  tone = 'paper',
  wide = false,
  pressed,
  listen,
  progress,
  onPressStart,
  onPressEnd,
  onPress,
  label,
  disabled = false,
  className,
}: KeycapProps) {
  const [held, setHeld] = useState(false);
  const [echo, setEcho] = useState(false);
  // Pointer up and lost capture both end a press; the ref makes it end once.
  const holding = useRef(false);
  const interactive = Boolean(onPressStart || onPressEnd || onPress);

  // Mirror the physical key, unless the person is typing in a field.
  useEffect(() => {
    if (!listen) return;
    const down = (e: KeyboardEvent) => {
      if (e.code === listen && !e.repeat && !isTyping(e.target)) setEcho(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === listen) setEcho(false);
    };
    const reset = () => setEcho(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', reset);
    };
  }, [listen]);

  const down = pressed ?? (held || echo);
  const style = {
    '--key-release': RELEASE,
    '--key-progress': progress === undefined ? undefined : Math.min(1, Math.max(0, progress)),
  } as CSSProperties;

  const face = (
    <>
      <span className="vv-key-skirt" aria-hidden="true" />
      <span className="vv-key-cap">
        {progress !== undefined ? <span className="vv-key-fill" aria-hidden="true" /> : null}
        <span className="vv-key-legend">{children}</span>
      </span>
    </>
  );

  const shared = {
    className: cn('vv-key', className),
    'data-size': size,
    'data-tone': tone,
    'data-wide': wide ? '' : undefined,
    'data-pressed': down ? 'true' : undefined,
    style,
  };

  if (!interactive) {
    return <kbd {...shared}>{face}</kbd>;
  }

  const start = () => {
    if (disabled || holding.current) return;
    holding.current = true;
    setHeld(true);
    onPressStart?.();
  };
  const end = (commit: boolean) => {
    if (!holding.current) return;
    holding.current = false;
    setHeld(false);
    onPressEnd?.();
    if (commit) onPress?.();
  };

  return (
    <button
      type="button"
      {...shared}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        start();
      }}
      onPointerUp={() => end(true)}
      onPointerCancel={() => end(false)}
      onLostPointerCapture={() => end(false)}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          end(true);
        }
      }}
      onBlur={() => end(false)}
    >
      {face}
    </button>
  );
}
