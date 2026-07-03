import Link from 'next/link';
import { ArrowUpRight, Lock, Smartphone } from 'lucide-react';
import { DemoTile } from './DemoTile';
import { RadarTile, StreakTile, TranscriptTile } from './LiveTiles';
import { WaitlistForm } from '@/components/site/WaitlistForm';

const MODES = [
  ['Mock Viva', 'a chained examiner'],
  ['Interview', 'STAR-scored answers'],
  ['Quick Question', 'the warm-up'],
  ['Flash Recall', 'spaced repetition'],
  ['Explain It', 'teach it simply'],
  ['Rapid Fire', 'composure on a clock'],
] as const;

/**
 * The Practice Room: the landing page IS the product, laid out as a board of
 * live tiles. No hero, no section stack.
 */
export function Board() {
  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 pb-6 sm:px-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-[auto_auto_auto]">
        {/* Statement */}
        <div className="tile flex flex-col justify-between p-6 sm:p-8 md:col-span-2 lg:col-span-5 lg:row-span-1">
          <h1 className="display text-[clamp(2.5rem,4.6vw,4rem)]">
            Say it out loud{' '}
            <span className="inline-block -rotate-2 rounded-xl bg-verm px-3 pb-1 text-paper">
              before
            </span>{' '}
            it counts.
          </h1>
          <p className="mt-6 max-w-md text-lg font-medium leading-relaxed text-ink-mut">
            VivaVoce asks real exam questions, listens to your spoken answer,
            and marks it in seconds. Try it right here, no account needed.
          </p>
        </div>

        {/* The engine */}
        <div className="md:col-span-2 lg:col-span-7 lg:row-span-2">
          <DemoTile />
        </div>

        {/* Radar + streak sit under the statement */}
        <div className="lg:col-span-3">
          <RadarTile />
        </div>
        <div className="lg:col-span-2">
          <StreakTile />
        </div>

        {/* Row three */}
        <div className="lg:col-span-4">
          <TranscriptTile />
        </div>

        <div className="tile tile-lift flex flex-col p-6 lg:col-span-4">
          <h3 className="text-lg font-black">Six ways to spar</h3>
          <ul className="mt-3 flex flex-1 flex-col justify-between gap-1">
            {MODES.map(([name, blurb]) => (
              <li key={name}>
                <Link
                  href="/features"
                  className="group flex items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-card-2"
                >
                  <span className="font-bold">{name}</span>
                  <span className="text-sm text-ink-faint transition-colors duration-150 group-hover:text-verm">
                    {blurb}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="tile tile-verm flex flex-col justify-between p-6 sm:p-7 lg:col-span-4">
          <div>
            <h3 className="text-2xl font-black leading-tight">
              Private beta. Exam dates jump the queue.
            </h3>
            <div className="mt-5">
              <WaitlistForm />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
            <a
              href="/download/apk"
              className="group inline-flex items-center gap-1.5 text-sm font-bold text-ink transition-colors duration-150 hover:text-paper"
            >
              <Smartphone size={14} />
              Download the Android beta
              <ArrowUpRight size={14} className="transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
            <Link
              href="/privacy"
              className="group inline-flex items-center gap-1.5 text-sm font-bold text-ink/80 transition-colors duration-150 hover:text-ink"
            >
              <Lock size={14} />
              Your voice stays yours
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
