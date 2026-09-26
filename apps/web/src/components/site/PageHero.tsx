import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * An inner page's opener, set like the top of an exam script: one heading,
 * then a short intro. No eyebrow, no number, no chip, and at most one mark
 * of the page's own: the examiner's tick in the margin (/faq), a correction
 * in the heading (/use-cases), a stamp (/waitlist). The red-pen circle
 * belongs to the home page alone. Two-tone headings (<Muted>) are kept for
 * the two legal pages.
 */
export function PageHero({
  title,
  intro,
  children,
  flush = false,
  margin,
  className,
}: {
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
  /** The next section brings its own top padding: keep the bottom tight. */
  flush?: boolean;
  /** Something the examiner writes in the page's margin beside the heading (a tick). */
  margin?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn('vv-hero mx-auto w-full max-w-[1360px] px-4 sm:px-5', className)}
      data-flush={flush ? '' : undefined}
      data-margin={margin ? '' : undefined}
    >
      {margin ? (
        <div className="vv-hero-margin" aria-hidden="true">
          {margin}
        </div>
      ) : null}
      <div className="vv-hero-text">
        <h1 className="vv-hero-title display">{title}</h1>
        {intro ? <p className="vv-hero-intro">{intro}</p> : null}
        {children ? <div className="vv-hero-actions">{children}</div> : null}
      </div>
    </section>
  );
}

/** The grey half of a two-tone heading: what follows the claim. Legal pages only. */
export function Muted({ children }: { children: ReactNode }) {
  return <span className="text-ink-mut">{children}</span>;
}
