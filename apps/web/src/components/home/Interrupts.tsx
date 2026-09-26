'use client';

import { useId, useRef, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Portrait, type ExaminerAxis } from '@/components/ui/Portrait';
import { SPRING } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { useBeat, usePageVisible, useReducedMarkup, useSeen } from './useHome';

const FOLLOW_UPS: readonly { axis: ExaminerAxis; name: string; ask: string; r: number }[] = [
  { axis: 'correctness', name: 'Correctness', ask: 'Why?', r: -2.5 },
  { axis: 'conciseness', name: 'Conciseness', ask: 'Say it in one line.', r: 1.6 },
  { axis: 'clarity', name: 'Clarity', ask: 'Give me an example.', r: -1.2 },
];

// The answer, the three cards landing one by one, then a long look.
const STEPS = [1500, 1300, 1300, 3400] as const;

/**
 * Wobbly words: the hedges shake, like a voice that is not sure. The filters
 * have fixed ids (home.css steps through them), so render one Interrupts per page.
 */
function Hedge({ children }: { children: string }) {
  return <span className="vv-hedge">{children}</span>;
}

/**
 * Examiners do not wait for a ramble to end. While it is on screen the
 * examiners' follow-ups land on a hedged answer one after another, and the
 * hedges in it wobble. Off screen everything stops; reduced motion shows
 * the three cards already down and the words still.
 */
export function Interrupts({ className }: { className?: string }) {
  const uid = useId();
  const reduce = useReducedMarkup();
  const visible = usePageVisible();
  const stage = useRef<HTMLDivElement>(null);
  const onScreen = useSeen(stage, '0px 0px -15% 0px');
  const running = onScreen && visible && !reduce;
  const { beat, round } = useBeat(running, STEPS, { rest: 700 });
  const down = running ? beat : FOLLOW_UPS.length;

  return (
    <section
      aria-labelledby={`${uid}-title`}
      className={cn('vv-interrupts mx-auto w-full max-w-[1360px] px-3 py-10 sm:px-5 sm:py-16', className)}
    >
      <div className="tile tile-ink grid gap-12 rounded-field px-5 py-10 sm:p-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16 lg:p-16">
        <div className="lg:pt-4">
          <h2 id={`${uid}-title`} className="display text-[clamp(2.3rem,4.6vw,4rem)] text-paper">
            It interrupts, <span className="text-paper-mut">like the room will.</span>
          </h2>
          <p className="mt-6 max-w-md text-lg font-medium leading-relaxed text-paper-mut">
            Examiners do not wait politely for a ramble to end. Neither does VivaVoce: it stops you where the
            answer goes soft and asks the question that exposes it.
          </p>
        </div>

        <div ref={stage} className="vv-int-stage" data-wobble={running ? '' : undefined}>
          <svg className="absolute h-0 w-0" aria-hidden="true" focusable="false">
            <defs>
              {[0, 1, 2, 3, 4].map((i) => (
                <filter key={i} id={`vv-hedge-${i}`}>
                  <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed={i + 3} result="n" />
                  <feDisplacementMap in="SourceGraphic" in2="n" scale={i % 2 ? 3.2 : 2.6} />
                </filter>
              ))}
            </defs>
          </svg>
          <div className="vv-int-answer">
            <p className="text-[0.75rem] font-bold text-cobalt-deep">You, answering</p>
            <p className="mt-2 text-[1.15rem] font-semibold leading-relaxed text-cobalt-deep sm:text-[1.3rem]">
              <Hedge>I think</Hedge> the main reason is <Hedge>sort of</Hedge> the pressure, and{' '}
              <Hedge>maybe</Hedge> how far it has to pump, and also the valves are
            </p>
          </div>
          <ol className="vv-int-pile" aria-label="Example follow-ups">
            <AnimatePresence initial={false}>
              {FOLLOW_UPS.slice(0, down).map((f, i) => (
                <motion.li
                  key={`${round}-${f.axis}`}
                  className="vv-int-card"
                  style={{ '--i': i, zIndex: i + 1 } as CSSProperties}
                  initial={{ opacity: 0, y: -34, rotate: f.r + 9, scale: 1.08 }}
                  animate={{ opacity: 1, y: 0, rotate: f.r, scale: 1 }}
                  exit={{ opacity: 0, x: 48, transition: { duration: 0.26, delay: (FOLLOW_UPS.length - i) * 0.05 } }}
                  transition={{ ...SPRING.physical, opacity: { duration: 0.14 } }}
                >
                  <span className="flex items-center gap-2">
                    <Portrait axis={f.axis} state="speaking" size={30} decorative />
                    <span className="text-[0.72rem] font-bold text-verm-text">{f.name} asks</span>
                  </span>
                  <span className="mt-2 block text-[1.3rem] font-black leading-tight sm:text-[1.65rem]">{f.ask}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
          <p className="vv-int-caption">Example follow-ups.</p>
        </div>
      </div>
    </section>
  );
}
