import { cn } from '@/lib/cn';

/**
 * The candidate's own underline: a short blue-ink stroke under the place you
 * are (the page in the nav, the section in a contents list), drawn once when
 * it appears. Vermilion stays the examiner's.
 */
export function InkStroke({ className }: { className?: string }) {
  return (
    <svg className={cn('vv-ink', className)} viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
      <path d="M2 5.2C17 3.4 33 6.3 50 4.9S83 3.2 98 4.6" pathLength={1} />
    </svg>
  );
}
