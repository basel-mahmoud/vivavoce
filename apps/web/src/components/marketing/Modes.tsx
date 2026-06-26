import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from './SectionHeading';
import { modes } from '@/lib/content';

export function Modes() {
  return (
    <section id="modes" className="border-t border-line py-24">
      <Container>
        <SectionHeading
          kicker="Six ways to spar"
          title="Match the mode to the moment"
          intro="A two-minute warm-up between lectures, or a full chained viva the night before. Same voice engine, different pressure."
        />

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
          {modes.map((mode, i) => (
            <Reveal key={mode.key} delay={(i % 3) * 0.06} className="bg-surface">
              <article className="group flex h-full flex-col p-7 transition-colors hover:bg-surface-2/50">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-ember transition-transform duration-300 group-hover:scale-150" />
                  <h3 className="font-display text-xl font-semibold text-ink">
                    {mode.name}
                  </h3>
                </div>
                <p className="mt-3 text-sm font-medium text-ink/90">{mode.line}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{mode.detail}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
