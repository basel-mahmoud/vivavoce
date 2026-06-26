import { cn } from '@/lib/cn';

/** Wordmark: a serif "Viva" + a small ember waveform glyph for "Voce". */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect x="1" y="9" width="2.4" height="4" rx="1.2" fill="var(--ember)" />
        <rect x="5" y="6" width="2.4" height="10" rx="1.2" fill="var(--ember)" />
        <rect x="9" y="2" width="2.4" height="18" rx="1.2" fill="var(--ember)" />
        <rect x="13" y="6" width="2.4" height="10" rx="1.2" fill="var(--claret)" />
        <rect x="17" y="9" width="2.4" height="4" rx="1.2" fill="var(--claret)" />
      </svg>
      <span className="font-display text-lg font-semibold tracking-tight text-ink">
        VivaVoce
      </span>
    </span>
  );
}
