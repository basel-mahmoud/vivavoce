'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'motion/react';
import { Paddle } from '@/components/ui/Paddle';
import { Portrait } from '@/components/ui/Portrait';
import { AXIS_LABEL, AXIS_ORDER, extremes, type AxisKey } from './progress-data';

/** Names with soft hyphens, so a phone's narrow seats break them cleanly. */
const SEAT_NAME: Record<AxisKey, string> = {
  correctness: 'Correct\u00adness',
  clarity: 'Clarity',
  structure: 'Struc\u00adture',
  conciseness: 'Concise\u00adness',
  confidence: 'Confi\u00addence',
};

/**
 * The five examiners with your average on each paddle. The paddles lie
 * face down until the panel is on screen, then turn over one after another;
 * the examiner behind the weakest mark looks sceptical and holds up the red
 * paddle, the one behind the best looks pleased. Drawn for the eye only:
 * the same marks are listed for screen readers beside it. Reduced motion
 * shows the marks from the start.
 */
export function PanelOfMarks({ averages }: { averages: Readonly<Record<string, number>> }) {
  const row = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() ?? false;
  const [shown, setShown] = useState(true);
  const values = AXIS_ORDER.map((k) => averages[k] ?? 0);
  const { lo, hi } = extremes(values);

  // Server-rendered face up; park face down while off screen, turn over on arrival.
  useEffect(() => {
    const el = row.current;
    if (!el || reduce) return;
    let parked = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          io.disconnect();
          if (parked) setShown(true);
        } else if (!parked) {
          parked = true;
          setShown(false);
        }
      },
      { rootMargin: '0px 0px -14% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  return (
    <div ref={row} className="vv-seats" aria-hidden="true">
      {AXIS_ORDER.map((key: AxisKey, i) => {
        const weak = i === lo;
        const best = i === hi && hi !== lo;
        const face = !shown ? 'neutral' : weak ? 'sceptical' : best ? 'pleased' : 'neutral';
        return (
          <div key={key} className="vv-seat" data-weak={weak ? '' : undefined} style={{ '--col': i + 1 } as CSSProperties}>
            <Portrait axis={key} state={face} size={200} decorative className="vv-seat-face" />
            <Paddle
              value={values[i]!}
              label={AXIS_LABEL[key]}
              revealed={shown}
              tone={weak ? 'verm' : 'paper'}
              handle={false}
              delay={180 + i * 110}
              className="vv-seat-paddle"
            />
            <p className="vv-seat-name">{SEAT_NAME[key]}</p>
            <p className="vv-seat-fix">{weak ? 'Fix first' : ' '}</p>
          </div>
        );
      })}
    </div>
  );
}
