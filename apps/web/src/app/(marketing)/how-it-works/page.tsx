import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';
import { Loop } from '@/components/home/Loop';
import { LiveEngine } from '@/components/engine/LiveEngine';
import { Close } from '@/components/home/Closing';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'Pick a mode, answer out loud, get marked on five axes with a stronger answer to steal from, then come back sharper.',
};

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        title="Speak. Get *marked.* Come back sharper."
        intro="No setup and no scheduling another person. The whole loop takes about a minute, and you can run it below right now."
      >
        <a href="#live" className="btn btn-verm h-13 px-6 text-base">
          Answer a question
        </a>
      </PageHero>
      <Loop />
      <div className="pb-24 sm:pb-32">
        <LiveEngine />
      </div>
      <Close />
    </>
  );
}
