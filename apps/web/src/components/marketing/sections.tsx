import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import { DemoTile } from '@/components/board/DemoTile';
import { WaitlistForm } from '@/components/site/WaitlistForm';

/** A real ordered flow: the numbers carry information here. */
const STEPS = [
  ['Pick a mode and a deck', 'A mock viva, an interview, a two-minute warm-up. Choose the subject you are sweating.'],
  ['Answer out loud', 'VivaVoce asks. You speak. Stop, retry, or keep going, exactly like the room.'],
  ['Get marked, not graded', 'Five axes, what worked, what to fix first, and a stronger answer to steal from.'],
  ['Come back sharper', 'Weak areas resurface on a schedule. The real thing starts to feel familiar.'],
] as const;

export function StepsStrip() {
  return (
    <section className="mx-auto w-full max-w-[1360px] px-4 py-16 sm:px-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {STEPS.map(([title, body], i) => (
          <Reveal key={title} delay={Math.min(i * 0.05, 0.15)}>
            <div className="tile tile-lift h-full p-6">
              <span className="marks inline-grid h-9 w-9 place-items-center rounded-full bg-ink text-sm font-bold text-paper">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-black leading-tight">{title}</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-mut">{body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/** The live engine, embedded on inner pages. */
export function DemoSection() {
  return (
    <section className="mx-auto w-full max-w-[1360px] px-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <DemoTile />
      </div>
    </section>
  );
}

/** Early-access banner for inner pages. */
export function WaitlistSection() {
  return (
    <section className="mx-auto w-full max-w-[1360px] px-4 pb-20 sm:px-6">
      <div className="tile tile-verm grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <h2 className="display text-[clamp(1.9rem,3.6vw,2.8rem)]">
            Rehearse before it counts.
          </h2>
          <p className="mt-3 max-w-md font-medium leading-relaxed text-ink/80">
            The app is in private beta. Spots open in small groups, students
            with exam dates first.
          </p>
        </div>
        <div>
          <WaitlistForm />
          <Link
            href="/faq"
            className="group mt-4 inline-flex items-center gap-1 text-sm font-bold text-ink/80 transition-colors duration-150 hover:text-ink"
          >
            Questions first? Read the FAQ
            <ArrowRight size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
