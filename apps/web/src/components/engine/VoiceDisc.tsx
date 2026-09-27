'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, svg, utils, type JSAnimation } from 'animejs';
import { motion } from 'motion/react';
import { Loader } from '@/components/ui/Loader';
import { ANIME_EASE } from '@/components/ui/useAnimeScope';
import { EASE, SPRING } from '@/lib/motion';
import { cn } from '@/lib/cn';
import type { Phase } from './engine';
import { stageScale } from './stage';
import { HISTORY, type Meter } from './useMicMeter';
import styles from './engine.module.css';

/* The drawing: a 240 x 140 box. The voice is a band across it; the disc sits in its middle. */
const X0 = 14;
const X1 = 226;
const CY = 70;
const AMP = 52;
const R = 56;
const FLAT = 1.6;

const DISC = `M${120 - R} ${CY} a${R} ${R} 0 1 0 ${R * 2} 0 a${R} ${R} 0 1 0 ${-R * 2} 0 Z`;

/** A closed waveform band: the top edge follows the level, the bottom mirrors it. */
function band(levels: ArrayLike<number>, count: number, amp = AMP): string {
  let top = '';
  let bottom = '';
  for (let i = 0; i < count; i++) {
    const x = X0 + ((X1 - X0) * i) / (count - 1);
    // taper the ends so the band reads as a voice, not a bar
    const taper = Math.sin(Math.PI * (0.06 + (0.88 * i) / (count - 1)));
    const a = FLAT + Math.min(1, levels[i] ?? 0) * amp * taper;
    top += `${i ? 'L' : 'M'}${x.toFixed(1)} ${(CY - a).toFixed(1)}`;
    bottom = `L${x.toFixed(1)} ${(CY + a).toFixed(1)}${bottom}`;
  }
  return `${top}${bottom}Z`;
}

/**
 * At rest the band holds a faint, still sample of a spoken phrase (three words, their syllables),
 * so the empty drawing reads as the place your voice goes rather than a rule. It is the same band,
 * resampled from 24 authored levels.
 */
const PHRASE = [0, 0.18, 0.5, 0.32, 0.62, 0.3, 0.06, 0, 0.24, 0.58, 0.86, 0.52, 0.3, 0.64, 0.4, 0.08, 0, 0.3, 0.72, 0.44, 0.66, 0.28, 0.08, 0];
const REST_BAND = band(
  Float32Array.from({ length: HISTORY }, (_, i) => {
    const x = (i / (HISTORY - 1)) * (PHRASE.length - 1);
    const k = Math.floor(x);
    const f = x - k;
    return (PHRASE[k] ?? 0) * (1 - f) + (PHRASE[k + 1] ?? 0) * f;
  }),
  HISTORY,
  AMP * 0.34,
);

export interface VoiceDiscProps {
  phase: Phase;
  subscribe: (fn: (m: Meter) => void) => () => void;
  reduce: boolean;
  /** The overall mark, once the panel has marked. */
  overall: number | null;
  /** The stamp has landed (the marking sequence's last beat). */
  stamped: boolean;
  /** A few words under the drawing: what it shows right now. */
  caption: string;
  className?: string;
}

/**
 * The candidate's voice, drawn in blue ink while they answer. When they stop it collapses into the
 * mark disc (anime.js morph), the panel's red pen runs round it while they confer, and the overall
 * mark is stamped on it when they are done. Reduced motion: the band holds still (only its
 * thickness follows the voice), and the disc and stamp fade in place.
 */
export function VoiceDisc({ phase, subscribe, reduce, overall, stamped, caption, className }: VoiceDiscProps) {
  const wave = useRef<SVGPathElement>(null);
  const disc = useRef<SVGPathElement>(null);
  const flat = useRef<SVGPathElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  // what the drawing holds: the resting phrase, the live voice, or the mark disc
  const shape = useRef<'rest' | 'voice' | 'disc'>('rest');
  const levels = useRef(new Float32Array(HISTORY));

  // listening: the band follows the voice, every frame, straight into the DOM
  useEffect(() => {
    const el = wave.current;
    if (!el || phase !== 'listening') return;
    shape.current = 'voice';
    utils.remove(el);
    const lv = levels.current;
    let calm = 0;
    let last = performance.now();
    return subscribe((m) => {
      if (reduce) {
        // the thickness only, and slowly: the band breathes with the voice rather than flickering
        const now = performance.now();
        calm += (m.level - calm) * (1 - Math.exp(-(now - last) / 400));
        last = now;
        lv.fill(calm);
        el.setAttribute('d', band(lv, HISTORY, AMP * 0.7));
      } else el.setAttribute('d', band(m.history, HISTORY));
    });
  }, [phase, subscribe, reduce]);

  // stopping: collapse into the disc; otherwise open back out into the resting phrase
  useEffect(() => {
    const el = wave.current;
    const target = disc.current;
    const line = flat.current;
    if (!el || !target || !line) return;
    const toDisc = phase === 'conferring' || phase === 'marked';
    let anim: JSAnimation | null = null;
    if (toDisc && shape.current !== 'disc') {
      shape.current = 'disc';
      if (reduce) el.setAttribute('d', DISC);
      else anim = animate(el, { d: svg.morphTo(target, 0.5), duration: 560 / stageScale(), ease: ANIME_EASE.inOut });
    } else if (!toDisc && phase !== 'listening' && shape.current !== 'rest') {
      // started over after marking, or a take that ended unmarked (too short, nothing heard,
      // cancelled): the drawing settles back into the resting phrase
      shape.current = 'rest';
      if (reduce) el.setAttribute('d', REST_BAND);
      else anim = animate(el, { d: svg.morphTo(line, 0.5), duration: 380 / stageScale(), ease: ANIME_EASE.out });
    }
    return () => {
      // a quick re-press lands on the end shape rather than a half-morphed one
      if (anim && !anim.completed) {
        anim.pause();
        el.setAttribute('d', shape.current === 'disc' ? DISC : REST_BAND);
      }
    };
  }, [phase, reduce]);

  // conferring: the red pen runs round the disc, never quite closing until the marks are in
  useEffect(() => {
    const el = ring.current;
    if (!el) return;
    const [drawable] = svg.createDrawable(el);
    if (!drawable) return;
    let anim: JSAnimation | null = null;
    if (phase === 'conferring') {
      utils.set(drawable, { draw: '0 0' });
      anim = reduce
        ? null
        : animate(drawable, { draw: ['0 0', '0 0.88'], duration: 5200 / stageScale(), delay: 420 / stageScale(), ease: ANIME_EASE.out });
      if (reduce) utils.set(drawable, { draw: '0 0.5' });
    } else if (phase === 'marked') {
      anim = reduce ? null : animate(drawable, { draw: '0 1', duration: 260 / stageScale(), ease: ANIME_EASE.out });
      if (reduce) utils.set(drawable, { draw: '0 1' });
    } else utils.set(drawable, { draw: '0 0' });
    return () => {
      anim?.pause();
    };
  }, [phase, reduce]);

  const collapsed = phase === 'conferring' || phase === 'marked';
  // the last mark stays in the stamp while it fades out on a fresh start
  const [inked, setInked] = useState(overall);
  if (overall !== null && overall !== inked) setInked(overall);

  return (
    <div className={cn(styles.disc, className)} data-phase={phase} data-stamped={stamped ? '' : undefined}>
      <svg viewBox="0 0 240 140" className={styles.discSvg} aria-hidden="true">
        <path ref={disc} d={DISC} className="hidden" />
        <path ref={flat} d={REST_BAND} className="hidden" />
        <path ref={wave} d={REST_BAND} className={styles.wave} />
        <circle ref={ring} cx="120" cy={CY} r={R + 7} className={styles.ring} />
      </svg>
      <span className={cn(styles.discCaption, phase === 'listening' && 'marks')} aria-hidden="true">
        {caption}
      </span>
      <span className={styles.discLoader} aria-hidden={!collapsed || stamped}>
        {phase === 'conferring' ? <Loader kind="conferring" size="sm" showAfter={650} glyphOnly /> : null}
      </span>
      {inked !== null ? (
        <motion.span
          className={styles.stamp}
          initial={false}
          animate={
            stamped
              ? { opacity: 1, scale: 1, rotate: -7 }
              : reduce || overall === null
                ? { opacity: 0, scale: 1, rotate: -7 }
                : { opacity: 0, scale: 1.5, rotate: -18 }
          }
          transition={
            reduce || !stamped ? { duration: 0.2, ease: EASE.out } : { ...SPRING.physical, bounce: 0.28, opacity: { duration: 0.12 } }
          }
          aria-hidden="true"
        >
          <span className={cn('vv-stamp-ink', styles.stampInk)}>
            <span className={styles.stampUnit}>Overall</span>
            <span className={cn('marks', styles.stampMark)}>{inked}</span>
            <span className={styles.stampUnit}>/100</span>
          </span>
        </motion.span>
      ) : null}
    </div>
  );
}
