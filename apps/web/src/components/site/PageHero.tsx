import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * An inner page's opener, set like the top of an exam script: one heading,
 * then a short intro. The heading is two-tone (the claim in ink, the rest in
 * grey, with <Muted>) or has one word marked by the examiner's red pen
 * (wrap it in <RedPen play="mount">). No eyebrow, no number, no chip.
 */
export function PageHero({
  title,
  intro,
  children,
  flush = false,
  className,
}: {
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
  /** The next section brings its own top padding: keep the bottom tight. */
  flush?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn('vv-hero mx-auto w-full max-w-[1360px] px-4 sm:px-5', className)}
      data-flush={flush ? '' : undefined}
    >
      <h1 className="vv-hero-title display">{title}</h1>
      {intro ? <p className="vv-hero-intro">{intro}</p> : null}
      {children ? <div className="vv-hero-actions">{children}</div> : null}
    </section>
  );
}

/** The grey half of a two-tone heading: what follows the claim. */
export function Muted({ children }: { children: ReactNode }) {
  return <span className="text-ink-mut">{children}</span>;
}
