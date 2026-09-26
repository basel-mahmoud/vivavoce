import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Smartphone } from 'lucide-react';
import { WaitlistForm } from '@/components/site/WaitlistForm';
import { RedPen } from '@/components/ui/RedPen';

export const metadata: Metadata = {
  title: 'Get early access',
  description: 'Join the VivaVoce early-access list. Students with upcoming exams first.',
};

const perks = [
  ['Exam dates jump the queue.', 'First access as spots open, soonest exams first.'],
  ['Founding-user pricing.', 'Locked in for good once you are in.'],
  ['A direct line.', 'Help shape what gets built next.'],
] as const;

export default function WaitlistPage() {
  return (
    <section aria-labelledby="wl-title" className="vv-wl mx-auto w-full max-w-[1360px] px-4 pb-16 sm:px-5 sm:pb-20">
      <div className="vv-wl-grid">
        <div className="vv-wl-copy">
          <h1 id="wl-title" className="vv-hero-title display">
            Get in before the exam{' '}
            <RedPen mark="circle" play="mount" delay={450}>
              does
            </RedPen>
            .
          </h1>
          <p className="vv-hero-intro">
            VivaVoce is in private beta. Write your email on the slip and we will bring you in as spots open.
          </p>
        </div>

        <div className="vv-wl-slip">
          <WaitlistForm />
        </div>

        <div className="vv-wl-more">
          <ul className="vv-perks">
            {perks.map(([lead, body]) => (
              <li key={lead}>
                <p className="text-lg font-black leading-snug">{lead}</p>
                <p className="mt-1 leading-relaxed text-ink-mut">{body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-2 text-[0.95rem] font-bold">
            <a href="/download/apk" className="group inline-flex min-h-11 items-center gap-1.5">
              <Smartphone size={16} aria-hidden className="text-ink-blue" />
              <span className="link-quiet">Download the Android beta</span>
            </a>
            <Link href="/faq" className="group inline-flex min-h-11 items-center gap-1.5">
              <span className="link-quiet">Questions first? Read the FAQ</span>
              <ArrowRight size={15} aria-hidden className="text-ink-blue" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
