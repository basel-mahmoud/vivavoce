import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { StampTone } from './WordStamp';

/**
 * One word pressed into a heading like a rubber stamp, once, as the page
 * arrives. CSS only, so it lands before any script runs; it only turns and
 * settles (never fades), and reduced motion shows it already down.
 */
export function Stamp({ children, tone = 'blue', className }: { children: ReactNode; tone?: StampTone; className?: string }) {
  return (
    <span className={cn('vv-stamp', className)} data-tone={tone}>
      <span className="vv-stamp-box vv-stamp-ink vv-stamp-once">{children}</span>
    </span>
  );
}
