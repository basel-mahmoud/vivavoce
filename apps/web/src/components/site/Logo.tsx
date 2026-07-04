import { cn } from '@/lib/cn';

/** Wordmark: the app icon (V-mark: a check that's also a V) + Archivo-black word. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg width="26" height="26" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <rect width="100" height="100" rx="24" fill="#FF4D26" />
        <path
          d="M20 52 L42 72 L80 30"
          stroke="#161412"
          strokeWidth="16.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M64.8 46.8 L80 30" stroke="#2E45FF" strokeWidth="16.4" strokeLinecap="round" />
      </svg>
      <span className="display text-lg leading-none">VivaVoce</span>
    </span>
  );
}
