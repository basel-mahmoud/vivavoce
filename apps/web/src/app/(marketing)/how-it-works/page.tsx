import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { RubricSection } from '@/components/marketing/RubricSection';
import { FinalCTA } from '@/components/marketing/FinalCTA';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'Pick a mode, answer out loud, get a five-axis breakdown and a model answer, then come back sharper. The whole loop takes about a minute.',
};

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        kicker="How it works"
        title="Speak. Get coached. Come back sharper."
        intro="No setup, no scheduling another person. Open the app, pick how you want to spar, and start answering. Here’s the loop, end to end."
      />
      <HowItWorks />
      <RubricSection />
      <FinalCTA />
    </>
  );
}
