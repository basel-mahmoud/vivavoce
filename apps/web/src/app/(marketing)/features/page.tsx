import { PageHero } from '@/components/site/PageHero';
import { PanelOfMarks } from '@/components/site/PanelOfMarks';
import { AxesIndex } from '@/components/home/AxesIndex';
import { Interrupts } from '@/components/home/Interrupts';
import { LiveEngine, Modes, WarmSections } from '@/components/home/lazy';
import { Close } from '@/components/home/Closing';
import { Deferred } from '@/components/home/Deferred';
import { EnginePlaceholder } from '@/components/home/EnginePlaceholder';
import { SectionBoundary } from '@/components/home/SectionBoundary';
import { pageMeta } from '@/lib/site';
// The live engine's code loads after the first screen; its styles must not wait for it.
import '@/components/engine/engine.module.css';

export const metadata = pageMeta({
  title: 'Features',
  description:
    'A five-axis marking scheme, six practice modes, a resilient voice engine, and progress that remembers your weak spots.',
  path: '/features',
});

/** The example round the whole site marks: Structure is the one to fix first. */
const EXAMPLE = { correctness: 71, clarity: 66, structure: 48, conciseness: 62, confidence: 54 } as const;

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        title="Everything between knowing it and saying it well."
        intro="Five examiners mark every spoken answer, each on one thing. Closing the gap between knowing it and saying it well is the whole product."
        flush
        figure={
          <figure className="vv-hero-panel">
            <PanelOfMarks averages={EXAMPLE} deal />
            <figcaption className="vv-hero-panel-note">
              <span className="sr-only">
                The panel&apos;s marks for one example answer: Correctness 71, Clarity 66, Structure 48, Conciseness
                62, Confidence 54. Structure is the one to fix first.{' '}
              </span>
              Example round. Scores are guidance, not grades.
            </figcaption>
          </figure>
        }
      />
      {/* Below the panel, each section renders on the server and hydrates as it comes near. */}
      <Deferred height="2600px">
        <AxesIndex />
      </Deferred>
      <Deferred height="760px">
        <Interrupts />
      </Deferred>
      <Deferred height="1000px">
        <Modes />
      </Deferred>
      <Deferred height="900px" className="pb-24 sm:pb-32">
        <SectionBoundary name="live engine" fallback={<EnginePlaceholder />}>
          <LiveEngine />
        </SectionBoundary>
      </Deferred>
      <Deferred height="1000px">
        <Close />
      </Deferred>
      <WarmSections names={['modes', 'engine']} />
    </>
  );
}
