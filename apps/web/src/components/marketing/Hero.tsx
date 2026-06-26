import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { SessionPreview } from './SessionPreview';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* warm ember wash, top-right — restrained, not a blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 h-[36rem] w-[36rem] rounded-full opacity-[0.18] blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--ember) 0%, transparent 70%)' }}
      />
      <Container className="relative grid items-center gap-16 py-20 md:py-28 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Reveal>
            <p className="kicker mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-ember" />
              Viva voce — with the living voice
            </p>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="text-balance font-display text-5xl font-semibold leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-[4.5rem]">
              Practice out loud.
              <br />
              <span className="text-ember">Think clearly</span> under pressure.
            </h1>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="mt-7 max-w-xl text-pretty text-lg leading-relaxed text-muted">
              VivaVoce asks you questions, listens to your spoken answers, and
              coaches you on the five things that decide an oral exam — so you walk
              into the viva, the interview, or the talk already sure of yourself.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href="/waitlist" size="lg">
                Get early access <ArrowRight size={18} />
              </ButtonLink>
              <ButtonLink href="/how-it-works" variant="secondary" size="lg">
                See how it works
              </ButtonLink>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-7">
              {[
                ['5', 'axis breakdown'],
                ['6', 'practice modes'],
                ['∞', 'patient reps'],
              ].map(([n, label]) => (
                <div key={label}>
                  <dt className="tnum font-display text-3xl font-semibold text-ink">
                    {n}
                  </dt>
                  <dd className="mt-1 text-sm text-muted">{label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="relative">
          <SessionPreview />
        </Reveal>
      </Container>
    </section>
  );
}
