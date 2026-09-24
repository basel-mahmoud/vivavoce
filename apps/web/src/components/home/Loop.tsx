'use client';

import { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { cn } from '@/lib/cn';

const STEPS = [
  ['Pick a mode and a deck', 'A mock viva, an interview, a two-minute warm-up. Choose the subject you are sweating.'],
  ['Answer out loud', 'VivaVoce asks. You speak. Stop, retry, or keep going, exactly like the room.'],
  ['Get marked, not graded', 'Five axes, what worked, what to fix first, and a stronger answer to steal from.'],
  ['Come back sharper', 'Weak areas resurface on a schedule, so the real thing starts to feel familiar.'],
] as const;

// A stadium-shaped loop: along the bottom through the four stations, then
// back over the top to the start. Stations sit on the bottom run.
const XS = [150, 450, 750, 1050];
const Y = 124;
const TOP_Y = 30;
const LOOP = `M150,${Y} L1050,${Y} C1150,${Y} 1150,${TOP_Y} 1050,${TOP_Y} L150,${TOP_Y} C50,${TOP_Y} 50,${Y} 150,${Y}`;
// Share of the loop's length covered by the bottom run (900 of ~2130).
const RUN = 900 / 2128;

/**
 * The practice loop, drawn by scroll: a vermilion line runs through the four
 * stations, lights each one as it passes, then loops back to the start.
 */
export function Loop() {
  const reduce = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const [progressReached, setReached] = useState(0);

  const { scrollYProgress } = useScroll({ target: track, offset: ['start 0.8', 'end 0.3'] });
  const drawn = useTransform(scrollYProgress, (v) => (reduce ? 1 : v));
  const runScale = useTransform(drawn, (v) => Math.min(1, v / RUN));

  useMotionValueEvent(drawn, 'change', (v) => {
    const el = path.current;
    const c = dot.current;
    if (el && c) {
      const p = el.getPointAtLength(v * el.getTotalLength());
      c.setAttribute('cx', p.x.toFixed(1));
      c.setAttribute('cy', p.y.toFixed(1));
    }
    const n = XS.filter((_, i) => v >= (i / 3) * RUN - 0.001).length;
    setReached((r) => (r === n ? r : n));
  });

  const reached = reduce ? XS.length : progressReached;

  return (
    <section aria-labelledby="loop-title" className="mx-auto w-full max-w-[1360px] px-4 pb-24 sm:px-5 sm:pb-32">
      <div className="tile px-5 py-12 sm:px-10 sm:py-16 lg:px-14">
        <h2 id="loop-title" className="display max-w-4xl text-[clamp(2.3rem,5vw,4.4rem)]">
          Speak. Get marked. Come back sharper.
        </h2>
        <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-ink-mut">
          No setup and no scheduling another person. One loop takes about a
          minute, and it gets easier every time you run it.
        </p>

        <div ref={track} className="mt-14">
          {/* Desktop: the loop */}
          <div className="hidden md:block">
            <svg viewBox="0 0 1200 160" className="w-full overflow-visible" aria-hidden>
              <path d={LOOP} fill="none" stroke="var(--color-line)" strokeWidth="4" strokeLinecap="round" />
              <motion.path
                ref={path}
                d={LOOP}
                fill="none"
                stroke="var(--color-verm)"
                strokeWidth="4"
                strokeLinecap="round"
                style={{ pathLength: drawn }}
              />
              {XS.map((x, i) => (
                <g key={x}>
                  <circle
                    cx={x}
                    cy={Y}
                    r="22"
                    className="transition-[fill] duration-300"
                    fill={i < reached ? 'var(--color-verm)' : 'var(--color-card)'}
                    stroke={i < reached ? 'var(--color-verm)' : 'var(--color-line)'}
                    strokeWidth="3"
                  />
                  <text
                    x={x}
                    y={Y + 6}
                    textAnchor="middle"
                    className="marks"
                    fontSize="17"
                    fontWeight="700"
                    fill={i < reached ? '#161412' : 'var(--color-ink-mut)'}
                  >
                    {i + 1}
                  </text>
                </g>
              ))}
              <circle ref={dot} cx="150" cy={Y} r="7" fill="var(--color-ink)" />
            </svg>
            <ol className="mt-6 grid grid-cols-4 gap-6">
              {STEPS.map(([title, body], i) => (
                <li key={title} className="px-2 text-center">
                  <h3
                    className={cn(
                      'text-xl font-black leading-tight transition-colors duration-300',
                      i < reached ? 'text-ink' : 'text-ink-mut',
                    )}
                  >
                    {title}
                  </h3>
                  <p className="mx-auto mt-2 max-w-[17rem] text-[0.98rem] leading-relaxed text-ink-mut">{body}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Mobile: the same run, vertical */}
          <ol className="relative space-y-8 md:hidden">
            <span aria-hidden className="absolute bottom-6 left-[21px] top-6 w-[3px] rounded-full bg-line" />
            <motion.span
              aria-hidden
              style={{ scaleY: runScale }}
              className="absolute bottom-6 left-[21px] top-6 w-[3px] origin-top rounded-full bg-verm"
            />
            {STEPS.map(([title, body], i) => (
              <li key={title} className="relative grid grid-cols-[2.8rem_1fr] gap-4">
                <span
                  className={cn(
                    'marks relative grid h-11 w-11 place-items-center rounded-full border-[3px] text-base font-bold transition-colors duration-300',
                    i < reached ? 'border-verm bg-verm text-coal' : 'border-line bg-card text-ink-mut',
                  )}
                >
                  {i + 1}
                </span>
                <div className="pt-1.5">
                  <h3 className="text-xl font-black leading-tight">{title}</h3>
                  <p className="mt-1.5 text-[0.98rem] leading-relaxed text-ink-mut">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
