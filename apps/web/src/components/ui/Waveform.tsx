'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/cn';

/**
 * The product's signature motif — a voice waveform. `live` animates a quiet,
 * continuous breathing motion (paused under prefers-reduced-motion via the
 * global CSS rule); otherwise it renders a frozen "answer fingerprint".
 */
export function Waveform({
  bars = 48,
  live = false,
  className,
  color = 'var(--ember)',
  seed = 7,
}: {
  bars?: number;
  live?: boolean;
  className?: string;
  color?: string;
  seed?: number;
}) {
  const heights = useMemo(() => {
    // Deterministic pseudo-random so SSR and client match (no hydration drift).
    let s = seed;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return Array.from({ length: bars }, (_, i) => {
      const envelope = Math.sin((i / bars) * Math.PI); // taper at the ends
      return 0.18 + envelope * (0.35 + rand() * 0.55);
    });
  }, [bars, seed]);

  return (
    <div
      className={cn('flex h-full w-full items-center justify-center gap-[3px]', className)}
      aria-hidden="true"
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className="block w-[3px] rounded-full"
          style={{
            height: `${Math.round(h * 100)}%`,
            backgroundColor: color,
            transformOrigin: 'center',
            animation: live ? `vv-wave ${0.9 + (i % 7) * 0.12}s ease-in-out ${i * 0.02}s infinite` : undefined,
          }}
        />
      ))}
    </div>
  );
}
