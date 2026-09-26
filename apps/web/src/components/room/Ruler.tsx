'use client';

import { motion, useTransform, type MotionValue } from 'motion/react';
import { cn } from '@/lib/cn';
import { AXES } from './data';
import { BEATS, HERO_END, OUTRO, ramp } from './story';
import styles from './room.module.css';

/** Major tick centres across the ruler, in percent: one per examiner. */
const MAJOR = [10, 30, 50, 70, 90] as const;

/**
 * The scrubber: a ruler along the bottom of the exam script. Five major ticks, one per examiner,
 * with minor ticks between; a blue-ink hairline marks where you are. Every major tick is a key
 * that jumps the story there (aria-current marks the one on stage). It appears after the hero and
 * stays visible whenever a key in it has focus.
 */
export function Ruler({ progress, current, onJump }: { progress: MotionValue<number>; current: number; onJump: (p: number) => void }) {
  const opacity = useTransform(progress, (v) => ramp(v, [HERO_END, HERO_END + 0.05, OUTRO - 0.07, OUTRO - 0.03], [0, 1, 1, 0]));
  const pointerEvents = useTransform(opacity, (o) => (o > 0.5 ? 'auto' : 'none'));
  const x = useTransform(progress, (v) =>
    `${ramp(v, [BEATS[0] - 0.12, ...BEATS, BEATS[4] + 0.12], [0, ...MAJOR, 100])}%`,
  );

  return (
    <motion.nav
      aria-label="The five examiners"
      style={{ opacity, pointerEvents }}
      className={cn(styles.ruler, 'focus-within:!pointer-events-auto focus-within:!opacity-100')}
    >
      <div aria-hidden className="relative h-4">
        {/* the rule, minor ticks every 2.5%, the major ticks drawn by the keys below */}
        <span className="absolute inset-x-0 bottom-0 h-px bg-ink/25" />
        <span className="absolute inset-x-0 bottom-0 h-[5px] bg-[repeating-linear-gradient(to_right,var(--color-ink)_0_1px,transparent_1px_2.5%)] opacity-30" />
        <motion.span style={{ x }} className="absolute inset-y-0 left-0 w-full">
          <span className="absolute -top-1 bottom-0 left-0 w-[2px] -translate-x-1/2 rounded-full bg-ink-blue" />
        </motion.span>
      </div>
      <ol className="grid grid-cols-5">
        {AXES.map((a, i) => {
          const on = current === i;
          return (
            <li key={a.key} className="flex justify-center">
              <button
                type="button"
                onClick={() => onJump(BEATS[i]!)}
                aria-current={on ? 'step' : undefined}
                className={cn(
                  'group relative -mt-4 flex min-h-11 min-w-11 cursor-pointer flex-col items-center px-1 pt-0 text-[0.74rem] font-bold transition-colors duration-150',
                  on ? 'text-ink' : 'text-ink-mut hover:text-ink',
                )}
              >
                <span aria-hidden className={cn('h-4 w-[2px] rounded-full transition-colors duration-150', on ? 'bg-ink' : 'bg-ink/45 group-hover:bg-ink')} />
                <span className="mt-1.5 whitespace-nowrap leading-none">
                  Q{i + 1}
                  <span className={styles.rulerName}> {a.label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </motion.nav>
  );
}
