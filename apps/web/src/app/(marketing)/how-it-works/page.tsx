import { ArrowDown } from 'lucide-react';
import { Muted, PageHero } from '@/components/site/PageHero';
import { Loop } from '@/components/home/Loop';
import { LiveEngine } from '@/components/engine/LiveEngine';
import { Close } from '@/components/home/Closing';
import { pageMeta } from '@/lib/site';

export const metadata = pageMeta({
  title: 'How it works',
  description:
    'Pick a mode, answer out loud, get marked on five axes with a stronger answer to steal from, then come back sharper.',
  path: '/how-it-works',
});

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        title={
          <>
            Speak. Get marked. <Muted>Come back sharper.</Muted>
          </>
        }
        intro="No setup and no scheduling another person. The whole loop takes about a minute, and you can run it below right now."
        flush
      >
        <a href="#live" className="btn btn-primary btn-lg">
          Answer a question
          <ArrowDown size={17} aria-hidden />
        </a>
      </PageHero>
      <Loop showHeading={false} className="pt-14 sm:pt-20" />
      <div className="pb-24 sm:pb-32">
        <LiveEngine />
      </div>
      <Close />
    </>
  );
}
