import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from './SectionHeading';
import { personas } from '@/lib/content';

export function Personas() {
  return (
    <section id="who" className="border-t border-line bg-surface/30 py-24">
      <Container>
        <SectionHeading
          kicker="Who it’s for"
          title="Anywhere the answer is spoken"
          align="center"
        />

        <div className="mx-auto mt-16 grid max-w-4xl gap-6 sm:grid-cols-2">
          {personas.map((p, i) => (
            <Reveal key={p.key} delay={(i % 2) * 0.06}>
              <article className="h-full rounded-2xl border border-line bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(26,23,20,0.04),0_24px_48px_-24px_rgba(26,23,20,0.25)]">
                <h3 className="font-display text-xl font-semibold text-ink">
                  {p.title}
                </h3>
                <p className="mt-1 text-sm font-medium text-ember">{p.line}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">{p.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
