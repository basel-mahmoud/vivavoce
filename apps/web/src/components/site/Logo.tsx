import { cn } from '@/lib/cn';

/** Wordmark: five voice bars + ARCHIVO-black word. Inherits currentColor. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="1" y="9" width="3" height="6" rx="1" fill="currentColor" />
        <rect x="6" y="5" width="3" height="14" rx="1" fill="currentColor" />
        <rect x="11" y="1" width="3" height="22" rx="1" fill="currentColor" />
        <rect x="16" y="5" width="3" height="14" rx="1" fill="currentColor" />
        <rect x="21" y="9" width="3" height="6" rx="1" fill="currentColor" />
      </svg>
      <span className="display text-lg leading-none">VivaVoce</span>
    </span>
  );
}
