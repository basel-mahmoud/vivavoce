import { RiseText } from '@/components/ui/RiseText';

/**
 * Inner-page opener: one loud statement on the canvas, clear of the floating
 * nav. Words rise in sequence; wrap one word in *asterisks* for the chip.
 */
export function PageHero({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children?: React.ReactNode;
}) {
  const words = title.split(' ').length;
  return (
    <section className="mx-auto w-full max-w-[1360px] px-4 pb-12 pt-32 sm:px-5 sm:pb-16 sm:pt-40">
      <h1 className="display max-w-6xl text-[clamp(2.6rem,6.2vw,5.4rem)] leading-[1]">
        <RiseText text={title} />
      </h1>
      {intro && (
        <p
          className="rise mt-7 max-w-2xl text-lg font-medium leading-relaxed text-ink-mut sm:text-xl"
          style={{ '--i': words } as React.CSSProperties}
        >
          {intro}
        </p>
      )}
      {children && (
        <div className="rise mt-8" style={{ '--i': words + 1 } as React.CSSProperties}>
          {children}
        </div>
      )}
    </section>
  );
}
