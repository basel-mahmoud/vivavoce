import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';

export function PageHero({
  kicker,
  title,
  intro,
}: {
  kicker: string;
  title: string;
  intro?: string;
}) {
  return (
    <section className="border-b border-line">
      <Container className="py-20 md:py-24">
        <Reveal>
          <p className="kicker mb-5">{kicker}</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="max-w-3xl text-balance font-display text-4xl font-semibold leading-[1.05] text-ink sm:text-5xl">
            {title}
          </h1>
        </Reveal>
        {intro && (
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{intro}</p>
          </Reveal>
        )}
      </Container>
    </section>
  );
}
