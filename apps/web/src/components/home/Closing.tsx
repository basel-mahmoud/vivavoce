import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Smartphone } from 'lucide-react';
import { WordStamp } from '@/components/ui/WordStamp';
import { cn } from '@/lib/cn';
import { AdmitSlip } from './AdmitSlip';
import { TranscriptSlip } from './TranscriptSlip';

const PROMISES = [
  ['You choose what is kept.', 'Decide at sign-up whether recordings are retained at all.'],
  ['Yours to take or delete.', 'Review, export or delete your data whenever you like.'],
  ['Never shared across accounts.', 'Audio is the most protected thing we hold, and it stays in yours.'],
] as const;

/**
 * Privacy, said plainly beside a transcript that is not kept: the slip is
 * blacked out word by word and torn up.
 */
export function Privacy({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="privacy-title"
      className={cn('vv-privacy mx-auto w-full max-w-[1360px] px-4 py-20 sm:px-5 sm:py-28', className)}
    >
      <h2 id="privacy-title" className="display max-w-[12ch] text-[clamp(2.4rem,5.4vw,4.6rem)]">
        Your voice stays yours.
      </h2>
      <div className="mt-12 grid gap-14 sm:mt-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-20">
        <TranscriptSlip />
        <div>
          <ul className="vv-promises">
            {PROMISES.map(([lead, body]) => (
              <li key={lead}>
                <p className="text-[1.35rem] font-black leading-tight sm:text-2xl">{lead}</p>
                <p className="mt-2 max-w-md text-[1.02rem] leading-relaxed text-ink-mut">{body}</p>
              </li>
            ))}
          </ul>
          <Link href="/privacy" className="group mt-8 inline-flex items-center gap-1.5 text-lg font-bold">
            <span className="link-quiet">Read the privacy policy</span>
            <ArrowUpRight size={18} aria-hidden className="text-ink-blue" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/** The close: say it before the room does, and take a slip for early access. */
export function Close({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="close-title"
      className={cn('vv-close mx-auto w-full max-w-[1360px] px-4 pb-24 pt-16 sm:px-5 sm:pb-32 sm:pt-24', className)}
    >
      <div className="flex flex-col items-center text-center">
        <h2 id="close-title" className="display text-[clamp(2.7rem,7vw,6rem)] leading-[1.02]">
          Say it before the
          <br />
          <WordStamp words={['viva', 'interview', 'pitch']} suffix="." reserve={false} />
        </h2>
        <p className="mt-6 max-w-lg text-lg font-medium leading-relaxed text-ink-mut">
          The app is in private beta. Spots open in small groups, and students with exam dates go first.
        </p>
        <div className="mt-10 flex w-full justify-center sm:mt-12">
          <AdmitSlip />
        </div>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[0.95rem] font-bold">
          <a href="/download/apk" className="group inline-flex items-center gap-1.5">
            <Smartphone size={16} aria-hidden className="text-ink-blue" />
            <span className="link-quiet">Download the Android beta</span>
          </a>
          <Link href="/faq" className="group inline-flex items-center gap-1.5">
            <span className="link-quiet">Questions first? Read the FAQ</span>
            <ArrowRight size={15} aria-hidden className="text-ink-blue" />
          </Link>
        </div>
      </div>
    </section>
  );
}
