'use client';

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
import { Mic } from 'lucide-react';
import { Portrait, type ExaminerAxis } from '@/components/ui/Portrait';
import { RedPen } from '@/components/ui/RedPen';
import { cn } from '@/lib/cn';
import { signalLayout, type Anchor, type SignalLayout } from './signal';
import { useReducedMarkup } from './useHome';

const PANEL: { axis: ExaminerAxis; label: string; mark: number }[] = [
  { axis: 'correctness', label: 'Correctness', mark: 71 },
  { axis: 'clarity', label: 'Clarity', mark: 66 },
  { axis: 'structure', label: 'Structure', mark: 48 },
  { axis: 'conciseness', label: 'Conciseness', mark: 62 },
  { axis: 'confidence', label: 'Confidence', mark: 54 },
];
const WEAKEST = 2;
const WORDS = ['Um,', 'candidates', 'fail', 'because,', 'like,', 'structure', 'collapses.'];

const STEPS = [
  ['You answer out loud.', 'Speak, stop, try again. Exactly like the room.'],
  ['It becomes a transcript.', 'Every word, the ums included, marked in seconds.'],
  ['Five examiners mark it.', 'Correctness, clarity, structure, conciseness and confidence, 0 to 100 each.'],
  ['One thing to fix first.', 'The weakest mark, with a stronger answer to steal from.'],
  ['Then the next question.', 'Weak spots come back on a schedule, so the real thing feels familiar.'],
] as const;

/**
 * The practice loop as one signal: your voice leaves the mic in blue ink,
 * becomes a transcript, passes under the five examiners, turns to red pen
 * as they mark it, lands on the one thing to fix, and arrives at the next
 * question. Drawn as you scroll; each stop wakes as the signal reaches it.
 * Reduced motion shows the whole path, drawn and awake.
 */
export function Loop({ showHeading = true, className }: { showHeading?: boolean; className?: string }) {
  const uid = useId();
  const reduce = useReducedMarkup();
  const track = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<SignalLayout | null>(null);
  const [passed, setPassed] = useState(0);

  const { scrollYProgress } = useScroll({ target: track, offset: ['start 0.72', 'end 0.55'] });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const vertical = !window.matchMedia('(min-width: 1024px)').matches;
    const attr = vertical ? 'stopV' : 'stopH';
    const anchors: Anchor[] = [];
    el.querySelectorAll<HTMLElement>(vertical ? '[data-stop-v]' : '[data-stop-h]').forEach((node) => {
      const r = node.getBoundingClientRect();
      const edge = node.dataset.edge;
      const x = edge === 'start' ? r.left : edge === 'end' ? r.right : r.left + r.width / 2;
      anchors.push({ key: node.dataset[attr] ?? '', x: x - box.left, y: r.top + r.height / 2 - box.top });
    });
    setLayout(signalLayout(anchors, vertical, { width: box.width, height: box.height }));
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const count = useCallback(
    (v: number) => (layout ? layout.stops.filter((s) => s.at <= v + 0.002).length : 0),
    [layout],
  );
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const n = count(v);
    setPassed((p) => (p === n ? p : n));
  });
  // Settle the stops whenever the wire is measured again under a still page.
  useEffect(() => {
    const t = window.setTimeout(() => setPassed(count(scrollYProgress.get())), 0);
    return () => window.clearTimeout(t);
  }, [count, scrollYProgress]);

  const reached = new Set(layout ? layout.stops.slice(0, passed).map((s) => s.key) : []);
  const awake = (key: string) => reduce || reached.has(key);
  const head = (i: number) => awake(`head-${i}`) || awake('panel');
  const marked = awake('split');

  const blue = useTransform(scrollYProgress, (v) =>
    reduce ? 1 : layout ? Math.min(1, v / Math.max(layout.split, 0.001)) : 0,
  );
  const red = useTransform(scrollYProgress, (v) =>
    reduce ? 1 : layout ? Math.min(1, Math.max(0, (v - layout.split) / Math.max(1 - layout.split, 0.001))) : 0,
  );
  // A zero-length stroke with round caps still paints a dot: hide a segment until it has length.
  const blueShown = useTransform(blue, (v) => (v > 0.002 ? 1 : 0));
  const redShown = useTransform(red, (v) => (v > 0.002 ? 1 : 0));
  // The signal itself: a bead of ink at the tip of the wire.
  const along = useTransform(scrollYProgress, (v) =>
    layout ? layout.start + Math.min(1, Math.max(0, reduce ? 1 : v)) * (layout.end - layout.start) : 0,
  );
  const tipX = useTransform(along, (a) => (layout?.vertical ? layout.cross : a));
  const tipY = useTransform(along, (a) => (layout?.vertical ? a : (layout?.cross ?? 0)));
  const tipInk = useTransform(scrollYProgress, (v) =>
    layout && v > layout.split ? 'var(--color-verm-text)' : 'var(--color-ink-blue)',
  );
  const tipShown = useTransform(scrollYProgress, (v) => (reduce || v <= 0.001 || v >= 0.999 ? 0 : 1));

  return (
    <section
      aria-labelledby={showHeading ? `${uid}-title` : undefined}
      aria-label={showHeading ? undefined : 'How one round works'}
      className={cn('vv-loop mx-auto w-full max-w-[1360px] px-4 py-20 sm:px-5 sm:py-28', className)}
    >
      {showHeading ? (
        <div className="max-w-3xl">
          <h2 id={`${uid}-title`} className="display text-[clamp(2.2rem,4.6vw,3.9rem)]">
            Speak. Get marked. <span className="text-ink-mut">Come back sharper.</span>
          </h2>
          <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-ink-mut">
            No setup and no scheduling another person. One loop takes about a minute, and it gets easier
            every time you run it.
          </p>
        </div>
      ) : null}

      <div ref={track} className={cn('vv-signal', showHeading && 'mt-14 lg:mt-20')}>
        {layout ? (
          <svg
            className="vv-signal-wire"
            width={layout.width}
            height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            aria-hidden="true"
          >
            <path d={layout.full} className="vv-signal-rest" />
            <motion.path d={layout.bluePath} className="vv-signal-blue" style={{ pathLength: blue, opacity: blueShown }} />
            <motion.path d={layout.redPath} className="vv-signal-red" style={{ pathLength: red, opacity: redShown }} />
            <path d={layout.arrow} className="vv-signal-arrow" data-on={awake('next') ? '' : undefined} />
            <motion.circle r={6} cx={tipX} cy={tipY} style={{ fill: tipInk, opacity: tipShown }} />
          </svg>
        ) : null}

        <ol className="vv-signal-stops">
          {/* The mic: the candidate, in blue ink. */}
          <li className="vv-stop" data-awake={awake('mic') ? '' : undefined}>
            <span className="vv-stop-rail" data-stop-v="mic" aria-hidden />
            <div className="vv-stop-visual">
              <span className="vv-mic" data-stop-h="mic" aria-hidden>
                <Mic size={26} />
              </span>
            </div>
            <Caption step={0} />
          </li>

          {/* The transcript, written out in the candidate's blue ink. */}
          <li className="vv-stop" data-awake={awake('transcript') ? '' : undefined}>
            <span className="vv-stop-rail" data-stop-v="transcript" aria-hidden />
            <div className="vv-stop-visual">
              <p className="vv-transcript" data-stop-h="transcript">
                <span className="sr-only">Example transcript: </span>
                {WORDS.map((w, i) => (
                  <span key={w} className="vv-word" style={{ '--i': i } as CSSProperties}>
                    {w}{' '}
                  </span>
                ))}
              </p>
            </div>
            <Caption step={1} />
          </li>

          {/* The panel, sitting on the wire. */}
          <li className="vv-stop vv-stop-panel" data-awake={head(0) ? '' : undefined}>
            <span className="vv-stop-rail" data-stop-v="panel" aria-hidden />
            <div className="vv-stop-visual">
              <ul className="vv-panel" aria-label="Example marks" data-stop-h="split" data-edge="end">
                {PANEL.map((p, i) => (
                  <li key={p.axis} className="vv-panel-seat" style={{ '--i': i } as CSSProperties}>
                    <span data-stop-h={`head-${i}`} className="vv-panel-head">
                      <Portrait
                        axis={p.axis}
                        state={marked ? (i === WEAKEST ? 'sceptical' : 'marking') : head(i) ? 'listening' : 'neutral'}
                        size={64}
                        decorative
                      />
                    </span>
                    <span
                      className="vv-panel-mark"
                      data-weak={i === WEAKEST ? '' : undefined}
                      data-on={marked ? '' : undefined}
                    >
                      <span className="sr-only">{p.label}: </span>
                      <span className="marks">{p.mark}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <span data-stop-v="split" aria-hidden className="vv-split-v" />
            </div>
            <Caption step={2} />
          </li>

          {/* The verdict, in red pen. */}
          <li className="vv-stop" data-awake={awake('verdict') ? '' : undefined}>
            <span className="vv-stop-rail" data-stop-v="verdict" aria-hidden />
            <div className="vv-stop-visual">
              <p className="vv-verdict" data-stop-h="verdict">
                <RedPen mark="box" play="manual" show={awake('verdict')} srLabel="the examiners' verdict">
                  <span className="block text-[0.78rem] font-bold">Fix first</span>
                  <span className="block text-[1.55rem] font-black leading-tight">Structure</span>
                </RedPen>
              </p>
            </div>
            <Caption step={3} />
          </li>

          {/* The next question: the examiners ask again. */}
          <li className="vv-stop" data-awake={awake('next') ? '' : undefined}>
            <span className="vv-stop-rail" data-stop-v="next" aria-hidden />
            <div className="vv-stop-visual">
              <div className="vv-next" data-stop-h="next" data-edge="start">
                <p className="vv-next-label text-[0.72rem] font-bold">Next question</p>
                <p className="mt-1 text-[0.98rem] font-bold leading-snug">
                  Say it again: claim first, then three reasons.
                </p>
              </div>
            </div>
            <Caption step={4} />
          </li>
        </ol>
      </div>
      <p className="mt-10 text-[0.8rem] font-semibold text-ink-mut">Example round. Scores are guidance, not grades.</p>
    </section>
  );
}

function Caption({ step }: { step: number }) {
  const [title, body] = STEPS[step]!;
  return (
    <div className="vv-stop-caption">
      <h3 className="text-[1.1rem] font-black leading-tight">{title}</h3>
      <p className="mt-1.5 max-w-[19rem] text-base leading-relaxed text-ink-mut">{body}</p>
    </div>
  );
}
