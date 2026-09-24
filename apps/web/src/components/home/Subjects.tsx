'use client';

import { useEffect, useRef, useState } from 'react';
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useVelocity,
} from 'motion/react';
import { cn } from '@/lib/cn';
import { useOnScreen } from '@/components/ui/hooks';

type Tone = 'card' | 'cobalt' | 'coal' | 'butter';
const Q: [string, string, Tone][] = [
  ['Cardiology', 'Talk me through the causes of atrial fibrillation.', 'card'],
  ['Contract law', 'What separates an offer from an invitation to treat?', 'cobalt'],
  ['Thermodynamics', 'Explain entropy without using the word disorder.', 'card'],
  ['Interview', 'Tell me about a time you disagreed with your manager.', 'coal'],
  ['Pharmacology', 'Why do we avoid NSAIDs in renal impairment?', 'card'],
  ['Economics', 'What happens to prices when a central bank raises rates?', 'butter'],
  ['Presentation', 'Pitch your project to a room that has never heard of it.', 'card'],
];
const R: [string, string, Tone][] = [
  ['Computer science', 'What happens when you type a URL and press enter?', 'card'],
  ['Spanish', 'Describe your weekend, in Spanish, for one minute.', 'butter'],
  ['Anatomy', 'Trace the blood supply of the stomach.', 'card'],
  ['History', 'Was the Treaty of Versailles doomed from the start?', 'cobalt'],
  ['Criminal law', 'When does self-defence stop being a defence?', 'card'],
  ['Engineering', 'Why do bridges need expansion joints?', 'coal'],
  ['Psychology', 'Explain the replication crisis to a first-year.', 'card'],
];

const TONE: Record<Tone, string> = {
  card: 'border border-line bg-card text-ink',
  cobalt: 'bg-cobalt text-paper',
  coal: 'bg-coal text-paper',
  butter: 'bg-butter text-coal',
};
const TAG: Record<Tone, string> = {
  card: 'text-verm-text',
  cobalt: 'text-paper',
  coal: 'text-verm',
  butter: 'text-coal/70',
};

function Chip({ subject, q, tone }: { subject: string; q: string; tone: Tone }) {
  return (
    <li className={cn('flex shrink-0 items-center gap-3 rounded-full px-5 py-3.5', TONE[tone])}>
      <span className={cn('text-[0.82rem] font-bold', TAG[tone])}>{subject}</span>
      <span className="whitespace-nowrap text-[1.02rem] font-bold">{q}</span>
    </li>
  );
}

const wrap = (min: number, max: number, v: number) => {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
};

/**
 * One marquee row. Drifts at a constant linear speed, and scroll velocity
 * pushes it faster in the direction you scroll. Pauses on hover and offscreen.
 */
function Row({ items, speed, running }: { items: typeof Q; speed: number; running: boolean }) {
  const x = useMotionValue(0);
  const copy = useRef<HTMLUListElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState(false);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 300 });

  useEffect(() => {
    const el = copy.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.offsetWidth + 12));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useAnimationFrame((_, delta) => {
    if (!running || hover || !width) return;
    const boost = 1 + Math.min(4, Math.abs(velocity.get()) / 400);
    x.set(wrap(-width, 0, x.get() + speed * boost * (delta / 1000)));
  });

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} className="overflow-hidden">
      <motion.div style={{ x }} className="flex w-max gap-3">
        <ul ref={copy} className="flex gap-3">
          {items.map(([s, q, t]) => (
            <Chip key={q} subject={s} q={q} tone={t} />
          ))}
        </ul>
        <ul className="flex gap-3" aria-hidden>
          {items.map(([s, q, t]) => (
            <Chip key={q} subject={s} q={q} tone={t} />
          ))}
        </ul>
      </motion.div>
    </div>
  );
}

export function Subjects() {
  const reduce = useReducedMotion();
  const [ref, onScreen] = useOnScreen<HTMLElement>('100px 0px');

  return (
    <section ref={ref} aria-labelledby="subjects-title" className="pb-24 sm:pb-32">
      <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-5">
        <h2 id="subjects-title" className="display max-w-4xl text-[clamp(2.3rem,5vw,4.4rem)]">
          Any subject you can say out loud.
        </h2>
        <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-ink-mut">
          Start from the decks, import your own questions, or turn your notes
          into a deck for your topic and level.
        </p>
      </div>
      {reduce ? (
        <div className="mt-12 space-y-3 overflow-x-auto px-4 pb-2 sm:px-5">
          {[Q, R].map((items, i) => (
            <ul key={i} className="flex w-max gap-3">
              {items.map(([s, q, t]) => (
                <Chip key={q} subject={s} q={q} tone={t} />
              ))}
            </ul>
          ))}
        </div>
      ) : (
        <div className="mt-12 space-y-3" aria-label="Example questions">
          <Row items={Q} speed={-38} running={onScreen} />
          <Row items={R} speed={32} running={onScreen} />
        </div>
      )}
    </section>
  );
}
