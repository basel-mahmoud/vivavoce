import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';
import { Rooms } from '@/components/home/Rooms';
import { Close } from '@/components/home/Closing';
import { Reveal } from '@/components/ui/Reveal';

export const metadata: Metadata = {
  title: 'Use cases',
  description:
    'Oral exams and vivas, interviews, presentations, and language practice. VivaVoce works anywhere the answer is spoken.',
};

const stories = [
  [
    'The night before a cardiology viva',
    'Sara runs a Mock Viva on her weakest topic. The follow-up lands exactly where she froze last time: ECG interpretation. She answers it three times until the structure is automatic. The next morning the real examiner asks something close. She is ready.',
  ],
  [
    'A week of interview prep',
    'Marcus practises one conflict story every morning on the train, offline, queued, marked when he reconnects. His confidence average climbs from 58 to 79. By Friday the story lands in thirty seconds.',
  ],
  [
    'Rehearsing a conference talk',
    'Priya uses Explain It to test whether her core idea survives without jargon. Conciseness keeps flagging a rambling middle. She cuts it. The talk lands.',
  ],
] as const;

export default function UseCasesPage() {
  return (
    <>
      <PageHero
        title="Anywhere the answer is *spoken.*"
        intro="Different rooms, one problem: you know the material, but saying it well is its own skill."
      />

      <Rooms showHeading={false} />

      <section aria-labelledby="week-title" className="mx-auto w-full max-w-[1360px] px-3 pb-24 sm:px-5 sm:pb-32">
        <div className="tile tile-ink rounded-[2rem] p-7 sm:p-12 lg:p-16">
          <h2 id="week-title" className="display max-w-2xl text-[clamp(2.1rem,4.2vw,3.6rem)] text-paper">
            How a week of sparring goes.
          </h2>
          <div className="mt-12 grid gap-x-12 gap-y-12 md:grid-cols-3">
            {stories.map(([who, body], i) => (
              <Reveal key={who} delay={i * 0.06}>
                <figure>
                  <figcaption className="text-xl font-black leading-tight text-verm">{who}</figcaption>
                  <blockquote className="mt-4 leading-relaxed text-paper-mut">{body}</blockquote>
                </figure>
              </Reveal>
            ))}
          </div>
          <p className="mt-12 border-t border-line-dark pt-5 text-sm font-semibold text-paper-mut">
            Illustrative scenarios, to be replaced with real stories at launch.
          </p>
        </div>
      </section>

      <Close />
    </>
  );
}
