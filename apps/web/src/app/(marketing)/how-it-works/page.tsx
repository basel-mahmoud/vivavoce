import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';
import { StepsStrip, DemoSection, WaitlistSection } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'Pick a mode, answer out loud, get marked on five axes with a stronger answer to steal from, then come back sharper.',
};

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        title="Speak. Get marked. Come back sharper."
        intro="No setup and no scheduling another person. The whole loop takes about a minute, and you can run it below right now."
      />
      <div className="-mt-10">
        <StepsStrip />
      </div>
      <DemoSection />
      <WaitlistSection />
    </>
  );
}
