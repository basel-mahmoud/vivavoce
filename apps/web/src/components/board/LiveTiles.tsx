'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/* ── Radar: the five axes, alive ─────────────────────────────────────────── */

const AXES = [
  ['Correctness', 88],
  ['Clarity', 74],
  ['Structure', 61],
  ['Conciseness', 79],
  ['Confidence', 72],
] as const;

const CX = 130;
const CY = 118;
const R = 86;

function pt(i: number, value: number) {
  const a = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
  const r = (value / 100) * R;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
}
const fullPoly = (scale: number) => AXES.map((a, i) => pt(i, a[1] * scale).join(',')).join(' ');

export function RadarTile() {
  const [active, setActive] = useState(2);
  const [pinned, setPinned] = useState(false);
  const reduce = useReducedMotion();

  // Auto-tour the axes until the visitor takes over.
  useEffect(() => {
    if (pinned || reduce) return;
    const id = setInterval(() => setActive((a) => (a + 1) % AXES.length), 2200);
    return () => clearInterval(id);
  }, [pinned, reduce]);

  return (
    <div className="tile tile-cobalt tile-lift flex h-full flex-col p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-black">Marked on five axes</h3>
        <span className="marks text-sm text-paper-mut">
          {AXES[active]![1]}
          <span className="opacity-60">/100</span>
        </span>
      </div>

      <svg viewBox="-40 -8 340 248" className="mt-2 w-full flex-1" role="img" aria-label="Example marks across five axes">
        {[100, 66, 33].map((r) => (
          <polygon
            key={r}
            points={AXES.map((_, i) => pt(i, r).join(',')).join(' ')}
            fill="none"
            stroke="rgba(251,250,248,0.22)"
            strokeWidth="1"
          />
        ))}
        <motion.polygon
          initial={reduce ? { points: fullPoly(1) } : { points: fullPoly(0.25), opacity: 0 }}
          whileInView={{ points: fullPoly(1), opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          fill="rgba(251,250,248,0.22)"
          stroke="#FBFAF8"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {AXES.map(([label, value], i) => {
          const [x, y] = pt(i, value);
          const [lx, ly] = pt(i, 118);
          const on = i === active;
          return (
            <g
              key={label}
              className="cursor-pointer"
              onMouseEnter={() => {
                setPinned(true);
                setActive(i);
              }}
              onClick={() => {
                setPinned(true);
                setActive(i);
              }}
            >
              <circle cx={x} cy={y} r={on ? 6 : 3.5} fill={on ? '#FFC838' : '#FBFAF8'} />
              <text
                x={lx}
                y={ly}
                textAnchor={lx < CX - 6 ? 'end' : lx > CX + 6 ? 'start' : 'middle'}
                dominantBaseline={ly < CY ? 'auto' : 'hanging'}
                fill={on ? '#FBFAF8' : 'rgba(251,250,248,0.62)'}
                fontSize="12"
                fontWeight={on ? 800 : 600}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="mt-1 text-sm font-semibold leading-snug text-paper-mut">
        Plus the one to fix first, every answer.
      </p>
    </div>
  );
}

/* ── Streak: a practice heat grid ────────────────────────────────────────── */

const HEAT = [
  0, 1, 2, 0, 3, 2, 1, 2, 0, 1, 3, 2, 0, 2, 1, 3, 2, 1, 0, 2, 3, 1, 2, 0, 3, 2, 2, 1,
];
const HEAT_BG = ['#E2DFD6', '#FFD2C2', '#FF8B66', '#FF4D26'];

export function StreakTile() {
  const reduce = useReducedMotion();
  return (
    <div className="tile tile-lift flex h-full flex-col justify-between p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-black">Kept streak</h3>
        <span className="marks text-sm text-ink-mut">4 wks</span>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {HEAT.map((level, i) => (
          <motion.span
            key={i}
            initial={reduce ? false : { opacity: 0.35, scale: 0.7 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.015, ease: [0.23, 1, 0.32, 1] }}
            className="aspect-square rounded-md"
            style={{ backgroundColor: HEAT_BG[level] }}
          />
        ))}
      </div>
      <p className="mt-3 text-sm font-semibold leading-snug text-ink-mut">
        Weak areas come back on a schedule, so the streak actually compounds.
      </p>
    </div>
  );
}

/* ── Transcript: the coaching, typing itself ─────────────────────────────── */

const SCRIPT = [
  ['YOU', 'Um, so, there are many reasons, like nerves, and also…'],
  ['VIVAVOCE', 'Stop. You buried your claim. Lead with it, then defend it.'],
  ['YOU', 'Candidates fail because structure collapses under pressure. Three reasons. First…'],
  ['VIVAVOCE', 'That is an opening an examiner can follow. Again, faster.'],
] as const;

export function TranscriptTile() {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? SCRIPT.length : 0);
  const [chars, setChars] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (reduce) return;
    if (shown >= SCRIPT.length) {
      timer.current = setTimeout(() => {
        setShown(0);
        setChars(0);
      }, 5200);
      return () => {
        if (timer.current) clearTimeout(timer.current);
      };
    }
    const line = SCRIPT[shown]![1];
    if (chars < line.length) {
      timer.current = setTimeout(() => setChars((c) => c + 2), 24);
    } else {
      timer.current = setTimeout(() => {
        setShown((s) => s + 1);
        setChars(0);
      }, 650);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [shown, chars, reduce]);

  return (
    <div className="tile tile-ink tile-lift flex h-full flex-col p-6" aria-label="Example coaching exchange">
      <h3 className="text-lg font-black">It interrupts, like the room will</h3>
      <div className="mt-4 flex flex-1 flex-col gap-3.5">
        {SCRIPT.slice(0, reduce ? SCRIPT.length : shown + 1).map(([who, text], i) => {
          const isTyping = !reduce && i === shown;
          const body = isTyping ? text.slice(0, chars) : text;
          const coach = who === 'VIVAVOCE';
          if (isTyping && shown >= SCRIPT.length) return null;
          return (
            <p key={i} className="text-[0.95rem] leading-snug">
              <span className={`marks mr-2 text-[0.7rem] font-bold ${coach ? 'text-verm' : 'text-paper-mut'}`}>
                {who}
              </span>
              <span className={`${coach ? 'font-bold text-paper' : 'font-medium text-paper-mut'} ${isTyping ? 'caret' : ''}`}>
                {body}
              </span>
            </p>
          );
        })}
      </div>
    </div>
  );
}
