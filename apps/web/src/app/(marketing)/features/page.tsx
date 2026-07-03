import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';
import { RadarTile, StreakTile, TranscriptTile } from '@/components/board/LiveTiles';
import { DemoSection, WaitlistSection } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'Features',
  description:
    'A five-axis marking scheme, six practice modes, a resilient voice engine, and progress that remembers your weak spots.',
};

const MODES = [
  ['Mock Viva', 'A chained examiner. Every follow-up targets your weakest axis.'],
  ['Interview', 'Behavioural and role questions, scored on STAR structure.'],
  ['Quick Question', 'One question, one answer, instant marks. The warm-up.'],
  ['Flash Recall', 'Rapid recall, spaced around the things you keep missing.'],
  ['Explain It', 'Teach it simply or you do not own it. Marked on clarity.'],
  ['Rapid Fire', 'A countdown per question. Composure is the skill.'],
] as const;

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        title="Everything between knowing it and saying it well."
        intro="The gap between knowledge and delivery is real, trainable, and worth closing before the room is watching. That gap is the whole product."
      />

      <section className="mx-auto w-full max-w-[1360px] px-4 pb-3 sm:px-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-9">
          <div className="lg:col-span-3">
            <RadarTile />
          </div>
          <div className="lg:col-span-4">
            <TranscriptTile />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <StreakTile />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1360px] px-4 py-3 sm:px-6">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {MODES.map(([name, blurb]) => (
            <div key={name} className="tile tile-lift p-6">
              <h3 className="text-xl font-black">{name}</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-mut">{blurb}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="pt-6">
        <DemoSection />
      </div>
      <WaitlistSection />
    </>
  );
}
