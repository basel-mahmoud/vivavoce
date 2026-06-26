import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from './SectionHeading';
import { Scorecard } from './Scorecard';
import { rubricAxes } from '@/lib/content';

export function RubricSection() {
  return (
    <section id="rubric" className="border-t border-line bg-surface/30 py-24">
      <Container className="grid items-center gap-16 lg:grid-cols-2">
        <div>
          <SectionHeading
            kicker="The rubric"
            title={
              <>
                Five things decide
                <br />a spoken answer
              </>
            }
            intro="Knowing the material isn’t the same as delivering it. VivaVoce scores every answer across the five axes an examiner actually weighs — then tells you which one to fix first."
          />

          <ul className="mt-10 space-y-5">
            {rubricAxes.map((axis, i) => (
              <Reveal as="li" key={axis.key} delay={i * 0.05}>
                <div className="flex gap-4">
                  <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-xs font-semibold text-ember">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-ink">{axis.label}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted">
                      {axis.blurb}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal delay={0.1}>
          <Scorecard />
        </Reveal>
      </Container>
    </section>
  );
}
