import type { Metadata } from 'next';
import { Smartphone } from 'lucide-react';
import { PageHero } from '@/components/site/PageHero';
import { WaitlistForm } from '@/components/site/WaitlistForm';

export const metadata: Metadata = {
  title: 'Early access',
  description:
    'Join the VivaVoce early-access list. Students with upcoming exams first.',
};

const perks = [
  ['Exam dates jump the queue.', 'First access as spots open, soonest exams first.'],
  ['Founding-user pricing.', 'Locked in for good once you are in.'],
  ['A direct line.', 'Help shape what gets built next.'],
] as const;

export default function WaitlistPage() {
  return (
    <>
      <PageHero
        title="Get in before the exam *does.*"
        intro="VivaVoce is in private beta. Leave your email and we will bring you in as spots open."
      />
      <section aria-label="Join the early-access list" className="mx-auto w-full max-w-[1360px] px-3 pb-24 sm:px-5 sm:pb-32">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
          <div className="tile tile-verm flex flex-col justify-between gap-10 rounded-field p-7 sm:p-12">
            <p className="display text-[clamp(1.8rem,3.4vw,2.8rem)]">One email. No spam. A spot when it opens.</p>
            <WaitlistForm tone="verm" />
          </div>
          <div className="tile flex flex-col rounded-field p-7 sm:p-12">
            <ul className="space-y-7">
              {perks.map(([lead, body]) => (
                <li key={lead}>
                  <p className="text-xl font-black leading-snug">{lead}</p>
                  <p className="mt-1.5 leading-relaxed text-ink-mut">{body}</p>
                </li>
              ))}
            </ul>
            <a href="/download/apk" className="btn btn-ink mt-10 h-12 self-start px-6">
              <Smartphone size={17} aria-hidden />
              Download the Android beta
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
