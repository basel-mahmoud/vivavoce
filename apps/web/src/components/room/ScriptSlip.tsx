'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useTransform, type MotionValue } from 'motion/react';
import { RedPen, type RedPenMark } from '@/components/ui/RedPen';
import { cn } from '@/lib/cn';
import { AXES, ROUNDS, SLIP_ANSWER, weakestIndex } from './data';
import { BEATS, BEAT_WINDOW, OUTRO, ramp } from './story';
import styles from './room.module.css';

const WEAKEST = weakestIndex(ROUNDS[0]!.scores);

/**
 * One flaw in the answer, as the examiner of axis `at` marks it. It is drawn once the story has
 * reached that examiner's beat and stays for the rest of the round, so the slip builds up; the
 * newest examiner's mark is in full red pen, the earlier ones rest a little lighter.
 */
function Flaw({
  at,
  mark,
  delay = 0,
  reached,
  current,
  label,
  className,
  children,
}: {
  at: number;
  mark: RedPenMark;
  delay?: number;
  reached: number;
  current: number;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <RedPen
      mark={mark}
      play="manual"
      show={reached > at}
      delay={280 + delay}
      iterations={mark === 'circle' ? 1 : undefined}
      brackets={mark === 'bracket' ? ['left', 'right'] : undefined}
      multiline={mark !== 'bracket'}
      srLabel={label}
      className={cn(className, current >= 0 && current !== at && styles.flawRest)}
    >
      {children}
    </RedPen>
  );
}

/**
 * The example answer on a ruled transcript slip, marked cumulatively: at each beat that examiner's
 * red pen marks its own flaw on the same slip (Correctness underlines the clause that answers a
 * different question, Clarity circles the jargon, Structure brackets the buried claim and arrows
 * it to the front, Conciseness strikes the fillers, Confidence underlines the hedges). By the outro
 * it carries all five marks and the one to fix first.
 *
 * `reached` is how many beats the scroll has reached (0..5); `current` the examiner on stage, or -1
 * at the outro, when every mark stands and the weakest is named.
 */
export function ScriptSlip({
  progress,
  reached,
  current,
  outro,
}: {
  progress: MotionValue<number>;
  reached: number;
  current: number;
  /** The whole panel has marked: the slip names the one to fix first. */
  outro: boolean;
}) {
  const start = BEATS[0] - BEAT_WINDOW;
  const opacity = useTransform(progress, (v) => ramp(v, [start - 0.035, start + 0.005], [0, 1]));
  const y = useTransform(progress, (v) => ramp(v, [start - 0.035, start + 0.005], [28, 0]));
  const visibility = useTransform(opacity, (o) => (o > 0.02 ? 'visible' : 'hidden'));
  const fix = useTransform(progress, (v) => ramp(v, [OUTRO - 0.065, OUTRO - 0.03], [0, 1]));
  const fixX = useTransform(fix, (f) => (1 - f) * -10);

  // The arrow from the bracketed claim to the front of the answer, in the text's own box: out of
  // the bracket into the margin (the claim always starts its own line), up between the speaker
  // letters and the margin rule, and in to the first word.
  const body = useRef<HTMLDivElement>(null);
  const who = useRef<HTMLSpanElement>(null);
  const claim = useRef<HTMLSpanElement>(null);
  const [arrow, setArrow] = useState('');
  useLayoutEffect(() => {
    const box = body.current;
    const label = who.current;
    const c = claim.current;
    if (!box || !label || !c) return;
    const draw = () => {
      const b = box.getBoundingClientRect();
      if (!b.width) return;
      const lr = label.getBoundingClientRect();
      const cr = c.getBoundingClientRect();
      const cs = getComputedStyle(box);
      const lh = parseFloat(cs.lineHeight) || 26;
      const em = parseFloat(cs.fontSize) || 16;
      // the middle of the x-height on a line whose box starts at `top`
      const mid = (top: number) => top + lh / 2 + 0.07 * em;
      const x0 = cr.left - b.left - 0.3 * em;
      const y0 = mid(cr.top - b.top);
      const labelRight = lr.right - b.left;
      const x1 = -0.12 * em;
      const y1 = mid(lr.top - b.top - (lh - lr.height) / 2);
      const xm = labelRight + (x1 - labelRight) * 0.36;
      const r = Math.min(7, (y0 - y1) / 3);
      const f = (n: number) => n.toFixed(1);
      setArrow(
        `M ${f(x0)} ${f(y0)} L ${f(xm + r)} ${f(y0 + 0.6)} Q ${f(xm)} ${f(y0 + 0.6)} ${f(xm)} ${f(y0 - r)} ` +
          `L ${f(xm - 0.8)} ${f(y1 + r)} Q ${f(xm - 0.8)} ${f(y1)} ${f(xm + r)} ${f(y1)} L ${f(x1)} ${f(y1)} ` +
          `M ${f(x1 - 5.5)} ${f(y1 - 4)} L ${f(x1)} ${f(y1)} L ${f(x1 - 5.5)} ${f(y1 + 4)}`,
      );
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  const q = ROUNDS[0]!.question;
  const [um, basically, lots, like, nerves, offTopic, its, jargon, comma, think, sortOf, claimText] = SLIP_ANSWER;
  const structure = AXES[WEAKEST]!.label;
  const shared = { reached, current };

  return (
    <motion.figure
      style={{ opacity, y, visibility }}
      aria-label="Example transcript, marked by the panel"
      data-outro={outro ? 'true' : undefined}
      className={cn(styles.slip, 'motion-reduce:!transform-none')}
    >
      <figcaption className={styles.slipHead}>
        <span>Transcript</span>
        <span className="text-ink-faint">Example round</span>
      </figcaption>
      <div ref={body} className={styles.slipBody}>
        <p className={cn(styles.slipLine, styles.slipAsk)}>
          <span className={styles.slipWho}>Q.</span>
          {q}
        </p>
        <p className={cn(styles.slipLine, 'text-ink-blue')}>
          <span ref={who} className={styles.slipWho}>
            A.
          </span>
          <Flaw at={3} mark="strike-through" label="filler, struck" {...shared}>
            {um}
          </Flaw>{' '}
          there are{' '}
          <Flaw at={3} mark="strike-through" delay={130} label="filler, struck" {...shared}>
            {basically}
          </Flaw>{' '}
          {lots}{' '}
          <Flaw at={3} mark="strike-through" delay={260} label="filler, struck" {...shared}>
            {like}
          </Flaw>{' '}
          {nerves}{' '}
          <Flaw at={0} mark="underline" label="not the question asked, underlined" {...shared}>
            {offTopic}
          </Flaw>{' '}
          {its}{' '}
          <Flaw at={1} mark="circle" label="jargon, circled" className="whitespace-nowrap" {...shared}>
            {jargon}
          </Flaw>
          {comma}{' '}
          <Flaw at={4} mark="underline" label="hedge, underlined" {...shared}>
            {think}
          </Flaw>
          ,{' '}
          <Flaw at={4} mark="underline" delay={180} label="hedge, underlined" {...shared}>
            {sortOf}
          </Flaw>
          <br />
          <span ref={claim} className={styles.slipClaim}>
            <Flaw at={2} mark="bracket" label="the claim, bracketed and moved to the front" {...shared}>
              {claimText}
            </Flaw>
          </span>
        </p>
        <svg aria-hidden className={styles.slipArrow} data-drawn={reached > 2 ? 'true' : undefined} data-rest={current >= 0 && current !== 2 ? 'true' : undefined}>
          {arrow && <path d={arrow} pathLength={1} />}
        </svg>
      </div>
      <motion.p style={{ opacity: fix, x: fixX }} className={cn(styles.slipFix, 'motion-reduce:!transform-none')}>
        Fix first: {structure}
      </motion.p>
    </motion.figure>
  );
}
