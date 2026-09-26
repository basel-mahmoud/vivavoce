'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
import { cn } from '@/lib/cn';
import { AXES } from './data';
import { HERO_END, OUTRO, beatAt, ramp } from './story';
import { HeroCopy, MarginNote, OutroCaption } from './RoomCaptions';
import { Ruler } from './Ruler';
import { RoomTags } from './RoomTags';
import { RoomPoster } from './RoomPoster';
import type { Insets, RoomOverlays, RoundState } from './Scene';
import styles from './room.module.css';

const Scene = dynamic(() => import('./Scene'), { ssr: false });

/* ── Environment probes (server snapshots keep hydration identical) ──── */

let webglCache: boolean | null = null;
function probeWebGL(): boolean {
  if (webglCache !== null) return webglCache;
  try {
    const c = document.createElement('canvas');
    webglCache = Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    webglCache = false;
  }
  return webglCache;
}
const noop = () => () => {};
function useWebGL(): boolean | null {
  return useSyncExternalStore(noop, probeWebGL, () => null);
}

function subscribeDark(cb: () => void) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
function useDark(): boolean {
  return useSyncExternalStore(
    subscribeDark,
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    () => false,
  );
}

const REDUCE = '(prefers-reduced-motion: reduce)';
function subscribeReduce(cb: () => void) {
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
/** Reduced motion, read so that hydration always renders the server's answer first. */
function useReduce(): boolean {
  return useSyncExternalStore(subscribeReduce, () => window.matchMedia(REDUCE).matches, () => false);
}

function subscribeVisibility(cb: () => void) {
  document.addEventListener('visibilitychange', cb);
  return () => document.removeEventListener('visibilitychange', cb);
}
function usePageVisible(): boolean {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === 'visible',
    () => true,
  );
}

/**
 * The home page's first act: the viva room, pinned, while the scroll cuts from the wide hero to
 * each examiner and out to the marked panel. The markup is the same for every preference: reduced
 * motion changes behaviour (cuts instead of flights, a still panel), never the tree, so the server
 * and the client always agree.
 */
export function RoomStory() {
  const section = useRef<HTMLElement>(null);
  // behaviour only, and false while hydrating, so the server and the client render the same tree
  const reduce = useReduce();
  const dark = useDark();
  const webgl = useWebGL();
  const pageVisible = usePageVisible();
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const [inHero, setInHero] = useState(true);
  const [beat, setBeat] = useState(-1);
  const [round, setRound] = useState<RoundState>({ index: 0, phase: 'follow' });
  const captions = useRef<HTMLDivElement>(null);
  const [insets, setInsets] = useState<Insets>({ hero: 0.42, beat: 0.36, outro: 0.36 });
  const overlaysRef = useRef<RoomOverlays>({ tag: null, leader: null, answer: null, fade: null });

  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const hero = v < HERO_END - 0.02;
    setInHero((prev) => (prev === hero ? prev : hero));
    const b = beatAt(v);
    setBeat((prev) => (prev === b ? prev : b));
  });

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setActive(Boolean(entry?.isIntersecting)), {
      rootMargin: '120px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Where each caption ends, so the camera frames the room below it on compact layouts. Layout
  // boxes only (offsets), so scroll transforms never skew the measure.
  useEffect(() => {
    const box = captions.current;
    const stageEl = box?.parentElement;
    if (!box || !stageEl) return;
    const measure = () => {
      const h = stageEl.clientHeight || window.innerHeight;
      const bottomOf = (name: string, fallback: number) => {
        const el = box.querySelector<HTMLElement>(`[data-cap="${name}"]`);
        if (!el) return fallback;
        return Math.min(0.62, (box.offsetTop + el.offsetTop + el.offsetHeight) / h);
      };
      const next = { hero: bottomOf('hero', 0.42), beat: bottomOf('beat', 0.36), outro: bottomOf('outro', 0.36) };
      setInsets((prev) =>
        Math.abs(prev.hero - next.hero) + Math.abs(prev.beat - next.beat) + Math.abs(prev.outro - next.outro) < 0.004 ? prev : next,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    ro.observe(stageEl);
    return () => ro.disconnect();
  }, []);

  const playing = ready && active && inHero && pageVisible && !reduce;
  const onReady = useCallback(() => setReady(true), []);
  const onRound = useCallback((r: RoundState) => {
    setRound((prev) => (prev.index === r.index && prev.phase === r.phase ? prev : r));
  }, []);

  const jump = useCallback(
    (p: number) => {
      const el = section.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const travel = el.offsetHeight - window.innerHeight;
      window.scrollTo({ top: top + p * travel, behavior: reduce ? 'auto' : 'smooth' });
    },
    [reduce],
  );
  // focus never lands on a faded caption: bring its stop on stage first
  const toHero = useCallback(() => {
    if (scrollYProgress.get() > HERO_END - 0.03) jump(0);
  }, [jump, scrollYProgress]);
  const toOutro = useCallback(() => {
    if (Math.abs(scrollYProgress.get() - OUTRO) > 0.03) jump(OUTRO);
  }, [jump, scrollYProgress]);

  // the guidance line shows wherever the whole panel's marks do: the hero and the outro
  const guidance = useTransform(scrollYProgress, (v) => ramp(v, [0, HERO_END, OUTRO - 0.07, OUTRO - 0.025], [1, 0, 0, 1]));

  return (
    <section ref={section} aria-label="VivaVoce, the viva room" data-ready={ready ? 'true' : undefined} className="relative h-[520svh]">
      <div className={styles.stage}>
        <RoomPoster hidden={ready} />
        {webgl === true && (
          <div data-room-canvas className={cn(styles.layer, 'transition-opacity duration-700 ease-out', ready ? 'opacity-100' : 'opacity-0')}>
            <Scene
              progress={scrollYProgress}
              active={active && pageVisible}
              playing={playing}
              reduce={reduce}
              dark={dark}
              insets={insets}
              overlaysRef={overlaysRef}
              onReady={onReady}
              onRound={onRound}
            />
          </div>
        )}
        <canvas
          ref={(el) => {
            overlaysRef.current.fade = el;
          }}
          aria-hidden
          className={cn(styles.layer, 'pointer-events-none size-full opacity-0')}
        />
        <div className={cn('transition-opacity duration-700 ease-out', ready ? 'opacity-100' : 'opacity-0')}>
          <RoomTags round={round} reduce={reduce} overlaysRef={overlaysRef} />
        </div>
        <div aria-hidden className={styles.scrim} />
        <div ref={captions} className={styles.captions}>
          <div data-cap="hero">
            <HeroCopy progress={scrollYProgress} onFocusBack={toHero} />
          </div>
          {AXES.map((a, i) => (
            <div key={a.key} data-cap={i === 0 ? 'beat' : undefined}>
              <MarginNote index={i} progress={scrollYProgress} active={beat === i} />
            </div>
          ))}
          <div data-cap="outro">
            <OutroCaption progress={scrollYProgress} onFocusBack={toOutro} />
          </div>
        </div>
        <Ruler progress={scrollYProgress} current={beat} onJump={jump} />
        <motion.p style={{ opacity: guidance }} className={cn(styles.note, 'pointer-events-none text-[0.78rem] font-semibold text-ink-mut')}>
          Example round. Scores are guidance, not grades.
        </motion.p>
      </div>
    </section>
  );
}

