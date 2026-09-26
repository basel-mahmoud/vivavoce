'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { animate, useInView } from 'motion/react';
import { RotateCcw } from 'lucide-react';
import { EASE } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { useReducedMarkup } from './useHome';

type Phase = 'plain' | 'redacting' | 'redacted' | 'torn';

const QUESTION = 'Why do candidates who know the material still fail the viva?';
const ANSWER =
  'Um, there are lots of reasons, like nerves, and also they sort of know it but freeze when the follow-up comes.';

/** The tear, as points down the slip (x %, y %): ragged, fixed, so server and client agree. */
const TEAR: readonly (readonly [number, number])[] = [
  [57, 0],
  [55.5, 7],
  [58, 13],
  [56, 21],
  [59, 28],
  [56.5, 36],
  [58.5, 44],
  [55, 52],
  [57.5, 59],
  [55.5, 67],
  [58.5, 74],
  [56, 82],
  [58, 90],
  [56.5, 100],
];
const seam = TEAR.map(([x, y]) => `${x}% ${y}%`).join(', ');
const LEFT = `polygon(0% 0%, ${seam}, 0% 100%)`;
const RIGHT = `polygon(${seam}, 100% 100%, 100% 0%)`;

function Words({ text, from }: { text: string; from: number }) {
  return (
    <>
      {text.split(' ').map((w, i) => (
        <span key={i}>
          <span className="vv-redact" style={{ '--i': from + i } as CSSProperties}>
            {w}
          </span>{' '}
        </span>
      ))}
    </>
  );
}

function SlipFace() {
  const qWords = QUESTION.split(' ').length;
  return (
    <div className="vv-slip-face">
      <div className="vv-slip-head">
        <span>Transcript</span>
        <span className="text-ink-faint">Example round</span>
      </div>
      <p className="vv-slip-line font-bold">
        <span className="vv-slip-who">Q.</span>
        <Words text={QUESTION} from={0} />
      </p>
      <p className="vv-slip-line font-semibold text-cobalt-deep">
        <span className="vv-slip-who">You</span>
        <Words text={ANSWER} from={qWords} />
      </p>
    </div>
  );
}

/**
 * A transcript on ruled paper that is not kept: the first time it is seen,
 * black bars run across every word, then the slip is torn in two and the
 * halves drop apart on the desk. Run it again from the button. Reduced
 * motion shows the finished redaction, still and whole.
 */
export function TranscriptSlip({ className }: { className?: string }) {
  const reduce = useReducedMarkup();
  const host = useRef<HTMLDivElement>(null);
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLDivElement>(null);
  const seen = useInView(host, { amount: 0.6, once: true });
  const [phase, setPhase] = useState<Phase>('plain');
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (reduce) return;
    if (!seen) return;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    at(run ? 250 : 500, () => setPhase('redacting'));
    at(run ? 1850 : 2100, () => setPhase('redacted'));
    at(run ? 2650 : 2900, () => setPhase('torn'));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [seen, reduce, run]);

  // The halves part: a little lift as the fibres give, then they drop apart.
  useEffect(() => {
    const a = left.current;
    const b = right.current;
    if (!a || !b || reduce) return;
    if (phase !== 'torn') {
      a.style.transform = '';
      b.style.transform = '';
      return;
    }
    const part = { duration: 0.85, times: [0, 0.18, 0.8, 1], ease: [EASE.out, EASE.inOut, EASE.out] };
    // Offsets in % of the slip, so a phone-width slip stays on screen.
    const ca = animate(a, { x: ['0%', '-0.4%', '-2.8%', '-2.6%'], y: [0, -3, 12, 10], rotate: [0, -0.6, -4.8, -4.5] }, part);
    const cb = animate(b, { x: ['0%', '0.6%', '5%', '4.7%'], y: [0, -5, 29, 26], rotate: [0, 1.2, 7, 6.5] }, part);
    return () => {
      ca.stop();
      cb.stop();
    };
  }, [phase, reduce]);

  const shown: Phase = reduce ? 'redacted' : phase;

  return (
    <div ref={host} className={cn('vv-slip-desk', className)}>
      <div className="vv-slip" data-phase={shown} role="img" aria-label="An example transcript, blacked out word by word, then torn up. Not kept.">
        {/* Whole until it tears: the right piece lies exactly over it, so no seam shows. */}
        <div ref={left} className="vv-slip-piece" style={{ clipPath: shown === 'torn' ? LEFT : undefined }} aria-hidden="true">
          <SlipFace />
        </div>
        <div ref={right} className="vv-slip-piece" style={{ clipPath: RIGHT }} aria-hidden="true">
          <SlipFace />
        </div>
      </div>
      <div className="mt-10 flex min-h-10 items-center gap-4">
        <p className="text-[0.8rem] font-semibold text-ink-mut">
          {shown === 'torn' ? 'Marked, then gone. Nothing kept unless you say so.' : 'An example answer, as a transcript.'}
        </p>
        {shown === 'torn' && !reduce ? (
          <button
            type="button"
            onClick={() => {
              setPhase('plain');
              setRun((r) => r + 1);
            }}
            className="btn btn-ghost btn-sm ml-auto gap-1.5 text-ink-mut pointer-coarse:h-11"
          >
            <RotateCcw size={14} aria-hidden />
            Run it again
          </button>
        ) : null}
      </div>
    </div>
  );
}
