import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';
import { DemoSection } from '@/components/marketing/sections';
import { WaitlistSection } from '@/components/marketing/sections';
import { Reveal } from '@/components/ui/Reveal';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'Pick a mode, answer out loud, get marked on five axes with a stronger answer to steal from, then come back sharper.',
};

// A real ordered flow: the numbers carry information here.
const steps = [
  [
    'Pick a mode and a deck',
    'A mock viva, an interview, a two-minute warm-up. Choose the subject you are sweating.',
  ],
  [
    'Answer out loud',
    'VivaVoce asks. You speak. Stop, retry, or keep going, exactly like the room.',
  ],
  [
    'Get marked, not graded',
    'Five axes, what worked, what to fix first, and a stronger answer you could have given.',
  ],
  [
    'Come back sharper',
    'Weak areas resurface on a schedule. The real thing starts to feel familiar.',
  ],
] as const;

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        title="Speak. Get marked. Come back sharper."
        intro="No setup and no scheduling another person. The whole loop takes about a minute, and you can run it below right now."
      />

      <section className="bg-canvas text-ink">
        <div className="mx-auto w-full max-w-[1400px] px-5 pb-24 sm:px-8">
          <ol className="grid gap-x-14 gap-y-12 md:grid-cols-2">
            {steps.map(([title, body], i) => (
              <Reveal as="li" key={title} delay={Math.min(i * 0.05, 0.15)}>
                <div className="flex gap-5">
                  <span className="marks text-2xl font-bold text-verm">{i + 1}</span>
                  <div>
                    <h2 className="text-2xl font-black">{title}</h2>
                    <p className="mt-2 max-w-md leading-relaxed text-ink-mut">{body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <DemoSection />
      <WaitlistSection />
    </>
  );
}
