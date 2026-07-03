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

      {/* Who it's for: tiles, aligned to the board grid */}
      <section className="mx-auto w-full max-w-[1360px] px-4 pb-3 sm:px-6">
        <div className="grid gap-3 md:grid-cols-2">
          {cases.map(([title, body], i) => (
            <Reveal key={title} delay={Math.min(i * 0.05, 0.15)}>
              <div className="tile tile-lift h-full p-7">
                <h2 className="text-xl font-black">{title}</h2>
                <p className="mt-2.5 max-w-xl text-[0.95rem] leading-relaxed text-ink-mut">
                  {body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How a week goes: one ink tile, stories side by side, names on top */}
      <section className="mx-auto w-full max-w-[1360px] px-4 py-3 sm:px-6">
        <Reveal>
          <div className="tile tile-ink p-7 sm:p-10">
            <h2 className="display max-w-2xl text-[clamp(1.7rem,3.2vw,2.5rem)]">
              How a week of sparring goes.
            </h2>
            <div className="mt-10 grid gap-x-10 gap-y-10 md:grid-cols-3">
              {stories.map(([who, body]) => (
                <figure key={who}>
                  <figcaption className="text-base font-black text-verm">{who}</figcaption>
                  <blockquote className="mt-3 text-[0.95rem] leading-relaxed text-paper-mut">
                    {body}
                  </blockquote>
                </figure>
              ))}
            </div>
            <p className="mt-10 border-t border-line-dark pt-5 text-xs font-semibold text-paper-mut/70">
              Illustrative scenarios, marked for replacement with real customer
              stories at launch.
            </p>
          </div>
        </Reveal>
      </section>

      <div className="pt-3">
        <WaitlistSection />
      </div>
    </>
  );
}
