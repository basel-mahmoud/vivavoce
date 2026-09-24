'use client';

import { useEffect, useRef } from 'react';

const WORD = 'VivaVoce';
// Archivo's variable axes: letters near the pointer swell in weight and width.
const REST = { wght: 640, wdth: 84 };
const PEAK = { wght: 900, wdth: 125 };
const RADIUS = 300;

/**
 * The footer wordmark. On a fine pointer, letters under the cursor inflate
 * along Archivo's weight and width axes, like a voice filling a room. Writes
 * straight to style in a rAF loop that only runs while something is moving.
 * Touch and reduced motion get the static black word.
 */
export function KineticWordmark({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const letters = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;

    el.dataset.live = 'true';
    const values = WORD.split('').map(() => 0);
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;
    let last = performance.now();

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
      let moving = false;
      letters.current.forEach((span, i) => {
        if (!span) return;
        let target = 0;
        if (pointer) {
          const r = span.getBoundingClientRect();
          const dx = pointer.x - (r.left + r.width / 2);
          const dy = pointer.y - (r.top + r.height / 2);
          const d = Math.hypot(dx, dy);
          target = Math.max(0, 1 - d / RADIUS);
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
      pointer = { x: e.clientX, y: e.clientY };
      start();
    };
    const onLeave = () => {
      pointer = null;
      start();
    };

    WORD.split('').forEach((_, i) => apply(i, 0));
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
    <div
      ref={root}
      aria-hidden
      className={`group select-none whitespace-nowrap text-center leading-[0.8] ${className ?? ''}`}
      style={{ fontVariationSettings: "'wght' 900, 'wdth' 100" }}
    >
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
    </div>
  );
}
