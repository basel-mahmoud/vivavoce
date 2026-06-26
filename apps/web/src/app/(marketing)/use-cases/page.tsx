import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';
import { Personas } from '@/components/marketing/Personas';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { FinalCTA } from '@/components/marketing/FinalCTA';
import { personas } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Use cases',
  description:
    'Oral exams and vivas, interviews, presentations, and language practice — VivaVoce works anywhere the answer is spoken.',
};

const stories = [
  {
    persona: 'The night before a cardiology viva',
    body: 'Sara runs a Mock Viva on her weakest topic. VivaVoce asks a follow-up about ECG interpretation — exactly where she froze last time. She answers it three times until the structure is automatic. The next morning, the real examiner asks something close. She’s ready.',
  },
  {
    persona: 'A week of interview prep',
    body: 'Marcus practises “tell me about a conflict” every morning on the train — offline, queued, evaluated when he reconnects. His confidence trend line climbs from 58 to 79. By Friday his stories land in thirty seconds, beginning to result.',
  },
  {
    persona: 'Rehearsing a conference talk',
    body: 'Priya uses Explain Like a Teacher to test whether her core idea survives without jargon. The conciseness score keeps flagging a rambling middle. She cuts it. The talk lands.',
  },
];

export default function UseCasesPage() {
  return (
    <>
      <PageHero
        kicker="Use cases"
        title="Anywhere the answer is spoken, out loud, under pressure"
        intro="Different rooms, same problem: you know the material, but saying it well is its own skill. Here’s how people use VivaVoce."
      />
      <Personas />

      <section className="border-t border-line py-24">
        <Container>
          <div className="grid gap-8 md:grid-cols-3">
            {stories.map((s, i) => (
              <Reveal key={s.persona} delay={i * 0.06}>
                <figure className="flex h-full flex-col rounded-2xl border border-line bg-surface p-7">
                  <blockquote className="flex-1 text-pretty leading-relaxed text-ink">
                    {s.body}
                  </blockquote>
                  <figcaption className="mt-5 border-t border-line pt-4 text-sm font-medium text-ember">
                    {s.persona}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-faint">
            Illustrative scenarios shown for clarity — replace with real customer
            stories at launch.
          </p>
        </Container>
      </section>

      <FinalCTA />
    </>
  );
}
