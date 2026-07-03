import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';
import { WaitlistSection } from '@/components/marketing/sections';
import { Reveal } from '@/components/ui/Reveal';

export const metadata: Metadata = {
  title: 'Use cases',
  description:
    'Oral exams and vivas, interviews, presentations, and language practice. VivaVoce works anywhere the answer is spoken.',
};

const cases = [
  [
    'Students facing a viva',
    'Medicine, law, engineering: anywhere the exam is spoken. Rehearse the follow-ups, not just the facts, and walk in having already answered the hard question three times.',
  ],
  [
    'Job seekers',
    'The behavioural and system-design questions you will actually get. Practice until your stories land in thirty seconds with a beginning, a middle, and a result.',
  ],
  [
    'Presenters and speakers',
    'Cut the filler, find the structure, land the point. The room should hear confidence, not preparation.',
  ],
  [
    'Language learners',
    'A sparring partner that never tires and never judges. Speak, get corrected on clarity and pace, repeat.',
  ],
] as const;

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
        title="Anywhere the answer is spoken."
        intro="Different rooms, one problem: you know the material, but saying it well is its own skill."
      />

      <section className="bg-canvas text-ink">
        <div className="mx-auto w-full max-w-[1400px] px-5 pb-24 sm:px-8">
          <div className="grid gap-x-14 gap-y-12 md:grid-cols-2">
            {cases.map(([title, body], i) => (
              <Reveal key={title} delay={Math.min(i * 0.05, 0.15)}>
                <div>
                  <h2 className="text-2xl font-black">{title}</h2>
                  <p className="mt-2 max-w-md leading-relaxed text-ink-mut">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-verm text-ink">
        <div className="mx-auto w-full max-w-[1400px] px-5 py-24 sm:px-8">
          <Reveal>
            <h2 className="display max-w-3xl text-[clamp(2rem,4.5vw,3.4rem)]">
              How a week of sparring goes.
            </h2>
          </Reveal>
          <div className="mt-14 flex flex-col gap-12">
            {stories.map(([who, body], i) => (
              <Reveal key={who} delay={Math.min(i * 0.06, 0.18)}>
                <figure className="max-w-2xl">
                  <blockquote className="text-lg font-medium leading-relaxed">
                    {body}
                  </blockquote>
                  <figcaption className="mt-3 font-black">{who}</figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
          <p className="mt-12 text-sm font-semibold opacity-60">
            Illustrative scenarios, marked for replacement with real customer
            stories at launch.
          </p>
        </div>
      </section>

      <WaitlistSection />
    </>
  );
}
