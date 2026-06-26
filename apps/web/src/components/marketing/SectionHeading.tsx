import { cn } from '@/lib/cn';
import { Reveal } from '@/components/ui/Reveal';

export function SectionHeading({
  kicker,
  title,
  intro,
  align = 'left',
  className,
}: {
  kicker?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' && 'mx-auto text-center',
        className,
      )}
    >
      {kicker && (
        <Reveal>
          <p className="kicker mb-4 flex items-center gap-2">
            {align === 'center' && <span className="h-px w-6 bg-claret" />}
            {kicker}
            <span className="h-px w-6 bg-claret" />
          </p>
        </Reveal>
      )}
      <Reveal delay={0.05}>
        <h2 className="text-balance text-3xl font-semibold leading-[1.1] text-ink sm:text-4xl md:text-[2.75rem]">
          {title}
        </h2>
      </Reveal>
      {intro && (
        <Reveal delay={0.1}>
          <p className="mt-5 text-lg leading-relaxed text-muted">{intro}</p>
        </Reveal>
      )}
    </div>
  );
}
