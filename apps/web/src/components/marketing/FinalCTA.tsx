import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { Waveform } from '@/components/ui/Waveform';
import { WaitlistForm } from '@/components/site/WaitlistForm';

export function FinalCTA() {
  return (
    <section id="waitlist" className="border-t border-line py-24">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-16 sm:px-12">
            <div className="absolute inset-x-0 top-0 h-24 opacity-[0.12]">
              <Waveform bars={80} color="var(--ember)" />
            </div>
            <div className="relative mx-auto max-w-xl text-center">
              <h2 className="text-balance font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                Rehearse before it counts
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted">
                Join the early-access list. We’re bringing people in as we open
                spots — students with exams on the calendar first.
              </p>
              <div className="mx-auto mt-8 max-w-md">
                <WaitlistForm />
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
