'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionStyle } from 'motion/react';
import { EASE, SPRING } from '@/lib/motion';
import { cn } from '@/lib/cn';

export type StubTone = 'cobalt' | 'butter' | 'paper';

export interface TearTicketProps {
  /** The slip itself. It stays when the stub is gone. */
  children: ReactNode;
  /** The tear-off stub's face. */
  stub: ReactNode;
  stubTone?: StubTone;
  /** The stub is a button with this name. */
  tearLabel?: string;
  /** Announced (politely) once the stub is off. */
  tornMessage?: string;
  /** Controlled: the stub is already off. Remount the ticket to put a stub back. */
  torn?: boolean;
  defaultTorn?: boolean;
  /** Called once the stub is off. Focus has moved to the slip; move it on if you like. */
  onTear?: () => void;
  className?: string;
}

/** Degrees of pull that part the last fibre. */
const TEAR_AT = 17;
/** How much of the pointer's arc turns the stub (the paper resists). */
const FOLLOW = 0.82;
/** px/s² for the falling stub. A physical fall, not a UI ease. */
const GRAVITY = 2600;
/** The drop: a small hop up (px/s), a drift (px/s), and when it fades (s). */
const DROP = { hop: -120, drift: 70, hold: 0.14, fade: 0.42 } as const;

type Phase = 'intact' | 'pulling' | 'falling' | 'torn';

interface Drag {
  hx: number;
  hy: number;
  a0: number;
  x0: number;
  y0: number;
  moved: boolean;
}

/**
 * An ADMIT ONE slip with a perforated stub. Pull the stub away (it pivots on
 * the last fibre at the foot of the perforation, so the tear runs down from
 * the top) or press it: Enter, Space or a click tears it cleanly. Past the
 * tear point it comes off in your hand and drops; let go early and it
 * springs back. The perforation is real: body and stub are cut with
 * half-holes that meet as holes, so the torn edge keeps its bite. Reduced
 * motion: pressing the stub removes it with a fade; no pull, no drop.
 */
export function TearTicket({
  children,
  stub,
  stubTone = 'cobalt',
  tearLabel = 'Tear off the stub',
  tornMessage = 'Stub torn off.',
  torn,
  defaultTorn = false,
  onTear,
  className,
}: TearTicketProps) {
  const reduce = useReducedMotion() ?? false;
  const [inner, setInner] = useState<Phase>(defaultTorn ? 'torn' : 'intact');
  const phase: Phase = torn ? 'torn' : inner;

  const stubEl = useRef<HTMLButtonElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const dragged = useRef(false);
  const frame = useRef(0);
  const busy = useRef(false);

  const theta = useMotionValue(0);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const fade = useMotionValue(1);
  const recoil = useMotionValue(0);
  // How far the tear has run, 0..1. The stub lifts (its shadow grows) as it opens.
  const open = useTransform(theta, [0, TEAR_AT], [0, 1]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const finish = () => {
    const hadFocus = stubEl.current !== null && document.activeElement === stubEl.current;
    setInner('torn');
    if (hadFocus) body.current?.focus({ preventScroll: true });
    onTear?.();
  };

  /**
   * The stub is free: it hops, drops under gravity, drifts and turns, and
   * fades. Solved from elapsed time, so a slow frame rate never stretches it.
   */
  const drop = (spin: number) => {
    setInner('falling');
    animate(recoil, [0, -5, 0], { duration: 0.42, times: [0, 0.18, 1], ease: [EASE.out, EASE.inOut] });
    const start = performance.now();
    const [x0, y0, a0] = [x.get(), y.get(), theta.get()];
    const step = (now: number) => {
      const t = (now - start) / 1000;
      y.set(y0 + DROP.hop * t + 0.5 * GRAVITY * t * t);
      x.set(x0 + DROP.drift * t);
      theta.set(a0 + spin * t);
      fade.set(Math.min(1, Math.max(0, 1 - (t - DROP.hold) / DROP.fade)));
      if (t < DROP.hold + DROP.fade) frame.current = requestAnimationFrame(step);
      else finish();
    };
    frame.current = requestAnimationFrame(step);
  };

  /** Keyboard, click or tap: tear it cleanly from the top down. */
  const tearCleanly = () => {
    if (phase !== 'intact' || busy.current) return;
    busy.current = true;
    if (reduce) {
      setInner('falling');
      void animate(fade, 0, { duration: 0.2, ease: 'easeOut' }).then(finish);
      return;
    }
    setInner('pulling');
    void animate(theta, TEAR_AT, { duration: 0.46, ease: EASE.inOut }).then(() => drop(46));
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    dragged.current = false;
    if (reduce || phase !== 'intact' || busy.current || e.button !== 0) return;
    const el = stubEl.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const notch = parseFloat(getComputedStyle(el).getPropertyValue('--notch')) || 10;
    // The hinge: the foot of the perforation, just above the bottom notch.
    const hx = r.left;
    const hy = r.bottom - notch;
    drag.current = {
      hx,
      hy,
      a0: Math.atan2(e.clientY - hy, e.clientX - hx),
      x0: e.clientX,
      y0: e.clientY,
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || busy.current) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 6) return;
      d.moved = true;
      dragged.current = true;
      setInner('pulling');
    }
    const a = Math.atan2(e.clientY - d.hy, e.clientX - d.hx);
    const turn = Math.atan2(Math.sin(a - d.a0), Math.cos(a - d.a0));
    const deg = Math.max(0, (turn * 180 * FOLLOW) / Math.PI);
    theta.set(Math.min(deg, TEAR_AT));
    if (deg >= TEAR_AT) {
      drag.current = null;
      busy.current = true;
      if ('vibrate' in navigator) navigator.vibrate(8);
      drop(70);
    }
  };

  const onPointerEnd = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved || busy.current) return;
    setInner('intact');
    animate(theta, 0, SPRING.physical);
  };

  const gone = phase === 'torn';
  const stubStyle: MotionStyle = { rotate: theta, x, y, opacity: fade, '--open': open } as MotionStyle;

  return (
    <div className={cn('vv-ticket', className)} data-phase={phase} data-stub={stubTone}>
      <motion.div ref={body} tabIndex={-1} className="vv-ticket-body" style={{ x: recoil }}>
        {children}
      </motion.div>
      {gone ? null : (
        <motion.button
          ref={stubEl}
          type="button"
          className="vv-ticket-stub"
          aria-label={tearLabel}
          aria-disabled={phase === 'falling' ? true : undefined}
          style={stubStyle}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onClick={() => {
            // A pull that ended short is not a click.
            if (dragged.current) {
              dragged.current = false;
              return;
            }
            tearCleanly();
          }}
        >
          <span className="vv-ticket-stub-face">{stub}</span>
        </motion.button>
      )}
      <p className="sr-only" aria-live="polite">
        {gone ? tornMessage : ''}
      </p>
    </div>
  );
}
