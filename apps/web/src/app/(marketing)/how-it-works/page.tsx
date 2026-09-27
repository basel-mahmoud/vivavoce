import { ArrowDown } from 'lucide-react';
import { PageHero } from '@/components/site/PageHero';
import { Round } from '@/components/home/Round';
import { LiveEngine } from '@/components/engine/LiveEngine';
import { Close } from '@/components/home/Closing';
import { Deferred } from '@/components/home/Deferred';
import { EnginePlaceholder } from '@/components/home/EnginePlaceholder';
import { SectionBoundary } from '@/components/home/SectionBoundary';
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
        title="A minute in the hot seat."
        intro="No setup, and no one to schedule. Here is one round, moment by moment: they ask, you answer out loud, and five examiners mark it."
        flush
      >
        <a href="#live" className="btn btn-primary btn-lg">
          Answer a question
          <ArrowDown size={17} aria-hidden />
        </a>
      </PageHero>
      <Round />
      <Deferred height="900px" className="pb-24 pt-10 sm:pb-32 sm:pt-16">
        <SectionBoundary name="live engine" fallback={<EnginePlaceholder />}>
          <LiveEngine />
        </SectionBoundary>
      </Deferred>
      <Deferred height="1000px">
        <Close />
      </Deferred>
    </>
  );
}
