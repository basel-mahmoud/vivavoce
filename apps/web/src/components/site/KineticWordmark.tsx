'use client';

import { useEffect, useRef } from 'react';

const WORD = 'VivaVoce';
// Archivo's variable axes. The word rests black and expanded, like every
// headline; letters near the pointer give way, thinning and narrowing.
const REST = { wght: 900, wdth: 118 };
const PEAK = { wght: 380, wdth: 72 };
/** The reach of the pointer, in letter heights. */
const REACH = 2.6;

/**
 * The footer's small wordmark. On a fine pointer, letters under the cursor
 * give way along Archivo's weight and width axes, pressed like keys, and
 * spring back when it leaves. It writes straight to style in a rAF loop that
 * only runs while something is moving. Touch and reduced motion get the
 * resting word.
 */
export function KineticWordmark({ className }: { className?: string }) {
  const root = useRef<HTMLSpanElement>(null);
  const letters = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;

    const values = WORD.split('').map(() => 0);
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;
    let last = performance.now();
    const radius = () => (parseFloat(getComputedStyle(el).fontSize) || 48) * REACH;

    const apply = (i: number, t: number) => {
      const span = letters.current[i];
      if (!span) return;
      const wght = REST.wght + (PEAK.wght - REST.wght) * t;
      const wdth = REST.wdth + (PEAK.wdth - REST.wdth) * t;
      span.style.fontVariationSettings = `'wght' ${wght.toFixed(0)}, 'wdth' ${wdth.toFixed(1)}`;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const reach = radius();
      let moving = false;
      letters.current.forEach((span, i) => {
        if (!span) return;
        let target = 0;
        if (pointer) {
          const r = span.getBoundingClientRect();
          const d = Math.hypot(pointer.x - (r.left + r.width / 2), pointer.y - (r.top + r.height / 2));
          target = Math.max(0, 1 - d / reach);
          target = target * target * (3 - 2 * target);
        }
        // Exponential damping: responsive, never snaps.
        const next = values[i]! + (target - values[i]!) * (1 - Math.exp(-12 * dt));
        if (Math.abs(next - values[i]!) > 0.001) moving = true;
        values[i] = next;
        apply(i, next);
      });
      frame = moving || pointer ? requestAnimationFrame(tick) : 0;
    };

    const start = () => {
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      pointer = { x: e.clientX, y: e.clientY };
      start();
    };
    const onLeave = () => {
      pointer = null;
      start();
    };

    const zone = el.parentElement ?? el;
    zone.addEventListener('pointermove', onMove);
    zone.addEventListener('pointerleave', onLeave);
    return () => {
      zone.removeEventListener('pointermove', onMove);
      zone.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    // The name is printed in the line beside it; the word itself is a toy.
    <span ref={root} aria-hidden="true" className={`vv-wordmark ${className ?? ''}`}>
      {WORD.split('').map((ch, i) => (
        <span
          key={i}
          ref={(n) => {
            letters.current[i] = n;
          }}
          className="inline-block"
        >
          {ch}
        </span>
      ))}
    </span>
  );
}
