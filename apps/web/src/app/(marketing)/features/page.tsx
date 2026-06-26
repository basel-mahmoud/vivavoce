import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';
import { RubricSection } from '@/components/marketing/RubricSection';
import { Modes } from '@/components/marketing/Modes';
import { Trust } from '@/components/marketing/Trust';
import { FinalCTA } from '@/components/marketing/FinalCTA';

export const metadata: Metadata = {
  title: 'Features',
  description:
    'A five-axis coaching rubric, six practice modes, a resilient voice engine, and progress that remembers your weak spots.',
};

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        kicker="Features"
        title="Everything you need to turn knowledge into a confident answer"
        intro="VivaVoce is built around one belief: the gap between knowing something and saying it well is real, trainable, and worth closing before the room is watching."
      />
      <RubricSection />
      <Modes />
      <Trust />
      <FinalCTA />
    </>
  );
}
