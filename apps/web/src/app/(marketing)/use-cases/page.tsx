import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Rewrite } from '@/components/site/Rewrite';
import { PageHero } from '@/components/site/PageHero';
import { Rooms } from '@/components/home/Rooms';
import { Close } from '@/components/home/Closing';
import { Deferred } from '@/components/home/Deferred';
import { Portrait, type ExaminerAxis, type ExaminerState } from '@/components/ui/Portrait';
import { pageMeta } from '@/lib/site';

export const metadata = pageMeta({
  title: 'Use cases',
  description:
    'Oral exams and vivas, interviews, presentations, and language practice. VivaVoce works anywhere the answer is spoken.',
  path: '/use-cases',
});

interface Story {
  who: string;
  body: string;
  axis: ExaminerAxis;
  face: ExaminerState;
  /** The examiner's note in the margin, in red pen. */
  note: ReactNode;
  said: string;
}

const stories: readonly Story[] = [
  {
    who: 'The night before a cardiology viva',
    body: 'Sara runs a Mock Viva on her weakest topic. The follow-up lands exactly where she froze last time: ECG interpretation. She answers it three times until the structure is automatic. The next morning the real examiner asks something close. She is ready.',
    axis: 'structure',
    face: 'pleased',
    note: 'Claim first. Now it lands.',
    said: 'Structure notes: claim first, now it lands.',
  },
  {
    who: 'A week of interview prep',
    body: 'Marcus practises one conflict story every morning on the train, offline, queued, marked when he reconnects. His confidence average climbs from 58 to 79. By Friday the story lands in thirty seconds.',
    axis: 'confidence',
    face: 'pleased',
    note: (
      <>
        <span className="marks">58</span>
        <ArrowRight size={16} strokeWidth={2.6} aria-hidden className="mx-1 inline-block align-[-0.15em]" />
        <span className="marks">79</span>
      </>
    ),
    said: 'Confidence notes: 58, then 79.',
  },
  {
    who: 'Rehearsing a conference talk',
    body: 'Priya uses Explain It to test whether her core idea survives without jargon. Conciseness keeps flagging a rambling middle. She cuts it. The talk lands.',
    axis: 'conciseness',
    face: 'sceptical',
    note: 'Cut the middle.',
    said: 'Conciseness notes: cut the middle.',
  },
];

export default function UseCasesPage() {
  return (
    <>
      <PageHero
        title={
          <>
            Anywhere the answer is <Rewrite from="written" to="spoken" />.
          </>
        }
        intro="Different rooms, one problem: you know the material, but saying it well is its own skill."
        flush
      />

      <Rooms showHeading={false} className="pt-10 sm:pt-14" />

      <section aria-labelledby="week-title" className="mx-auto w-full max-w-[1360px] px-4 pb-24 pt-10 sm:px-5 sm:pb-32 sm:pt-16">
        <div className="max-w-3xl">
          <h2 id="week-title" className="display text-[clamp(2.1rem,4.2vw,3.5rem)]">
            How a week of sparring goes.
          </h2>
          <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-ink-mut">
            Three people, three rooms. The examiner who helped most left a note in the margin.
          </p>
        </div>
        <ol className="vv-journal mt-10 sm:mt-14">
          {stories.map((s) => (
            <li key={s.who} className="vv-entry">
              <div className="vv-entry-margin">
                <Portrait axis={s.axis} state={s.face} size={112} decorative />
                <p className="vv-entry-note" aria-hidden="true">
                  {s.note}
                </p>
                <span className="sr-only">{s.said}</span>
              </div>
              <div className="vv-entry-body">
                <h3 className="text-[1.3rem] font-black leading-tight sm:text-[1.5rem]">{s.who}</h3>
                <p className="mt-3 text-[1.04rem] leading-relaxed text-ink-mut">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-[0.8rem] font-semibold text-ink-mut">Illustrative scenarios.</p>
      </section>

      <Deferred height="1000px">
        <Close />
      </Deferred>
    </>
  );
}
