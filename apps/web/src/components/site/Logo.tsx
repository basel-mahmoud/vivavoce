import { cn } from '@/lib/cn';

/** Wordmark: the app icon (V-mark: a check that's also a V, sounding out) +
 *  Archivo-black word. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg width="26" height="26" viewBox="0 0 100 100" aria-hidden="true">
        <rect width="100" height="100" rx="24" fill="#FF4D26" />
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 52 L40 70 L64 42" stroke="#161412" strokeWidth="15.6" />
          <path d="M53.9 53.8 L64 42" stroke="#2E45FF" strokeWidth="15.6" />
          <path d="M59.2 29.4 A13.5 13.5 0 0 1 76.6 46.8" stroke="#2E45FF" strokeWidth="6" />
          <path d="M56.7 22.9 A20.5 20.5 0 0 1 83.1 49.3" stroke="#2E45FF" strokeWidth="6" />
        </g>
      </svg>
      <span className="display text-lg leading-none">VivaVoce</span>
    </span>
  );
}
