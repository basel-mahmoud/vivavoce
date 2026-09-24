import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';
import { AxesIndex } from '@/components/home/AxesIndex';
import { Interrupts } from '@/components/home/Interrupts';
import { Modes } from '@/components/home/Modes';
import { LiveEngine } from '@/components/engine/LiveEngine';
import { Close } from '@/components/home/Closing';

export const metadata: Metadata = {
  title: 'Features',
  description:
    'A five-axis marking scheme, six practice modes, a resilient voice engine, and progress that remembers your weak spots.',
};

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        title="Everything between knowing it and *saying* it well."
        intro="The gap between knowledge and delivery is real, trainable, and worth closing before the room is watching. That gap is the whole product."
      />
      <AxesIndex />
      <Interrupts />
      <div className="-mt-24 sm:-mt-32">
        <Modes />
      </div>
      <div className="pb-24 sm:pb-32">
        <LiveEngine />
      </div>
      <Close />
    </>
  );
}
