import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from './SectionHeading';
import { steps } from '@/lib/content';

export function HowItWorks() {
  return (
    <section id="how" className="border-t border-line py-24">
      <Container>
        <SectionHeading
          kicker="The loop"
          title="A study partner, not a recording app"
          intro="Four steps, repeated until the hard question stops being hard. The whole loop takes about a minute."
        />

        <ol className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <Reveal as="li" key={step.n} delay={i * 0.06} className="bg-surface">
              <div className="flex h-full flex-col p-7">
                <span className="tnum font-display text-2xl font-semibold text-ember">
                  {step.n}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  );
}
