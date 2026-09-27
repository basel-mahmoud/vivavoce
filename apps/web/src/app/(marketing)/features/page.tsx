import { PageHero } from '@/components/site/PageHero';
import { PanelOfMarks } from '@/components/site/PanelOfMarks';
import { AxesIndex } from '@/components/home/AxesIndex';
import { Interrupts } from '@/components/home/Interrupts';
import { Modes } from '@/components/home/Modes';
import { LiveEngine } from '@/components/engine/LiveEngine';
import { Close } from '@/components/home/Closing';
import { pageMeta } from '@/lib/site';

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
      <AxesIndex />
      <Interrupts />
      <Modes />
      <div className="pb-24 sm:pb-32">
        <LiveEngine />
      </div>
      <Close />
    </>
  );
}
