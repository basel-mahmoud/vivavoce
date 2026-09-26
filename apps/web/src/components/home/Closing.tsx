import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Smartphone } from 'lucide-react';
import { WaitlistForm } from '@/components/site/WaitlistForm';
import { Reveal } from '@/components/ui/Reveal';

const PROMISES = [
  ['You choose what is kept.', 'Decide at sign-up whether recordings are retained at all.'],
  ['Yours to take or delete.', 'Review, export or delete your data whenever you like.'],
  ['Never shared across accounts.', 'Audio is the most protected thing we hold, and it stays in yours.'],
] as const;

/** Privacy, said plainly. Quiet on purpose after the loud sections above. */
export function Privacy() {
  return (
    <section aria-labelledby="privacy-title" className="mx-auto w-full max-w-[1360px] px-4 pb-24 sm:px-5 sm:pb-32">
      <div className="grid gap-12 border-t border-line pt-14 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        <Reveal>
          <h2 id="privacy-title" className="display text-[clamp(2.6rem,6vw,5.6rem)]">
            Your voice stays yours.
          </h2>
          <Link
            href="/privacy"
            className="link-quiet mt-6 inline-flex items-center gap-1.5 text-lg font-bold"
          >
            Read the privacy policy <ArrowUpRight size={18} aria-hidden className="text-verm" />
          </Link>
        </Reveal>
        <ul className="space-y-8 lg:pt-3">
          {PROMISES.map(([lead, body], i) => (
            <Reveal as="li" key={lead} delay={i * 0.06}>
              <p className="text-2xl font-black leading-tight">{lead}</p>
              <p className="mt-2 max-w-md text-[1.05rem] leading-relaxed text-ink-mut">{body}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The close: one loud vermilion field, one action. */
export function Close() {
  return (
    <section aria-labelledby="close-title" className="mx-auto w-full max-w-[1360px] px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="tile tile-verm relative overflow-hidden rounded-field px-6 py-14 sm:px-12 sm:py-20 lg:px-16">
        <div className="grid gap-12 lg:grid-cols-[1.45fr_1fr] lg:items-end">
          <div>
            <h2 id="close-title" className="display text-[clamp(2.8rem,5.8vw,5.4rem)]">
              Get in before the exam does.
            </h2>
            <p className="mt-6 max-w-lg text-lg font-semibold leading-relaxed text-coal">
              The app is in private beta. Spots open in small groups, and students
              with exam dates go first.
            </p>
          </div>
          <div>
            <WaitlistForm tone="verm" />
            <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 text-[0.95rem] font-bold">
              <a href="/download/apk" className="group inline-flex items-center gap-1.5 text-coal">
                <Smartphone size={16} aria-hidden />
                <span className="link-quiet">Download the Android beta</span>
              </a>
              <Link href="/faq" className="group inline-flex items-center gap-1.5 text-coal">
                <span className="link-quiet">Questions first? Read the FAQ</span>
                <ArrowRight
                  size={15}
                  aria-hidden
                  className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
