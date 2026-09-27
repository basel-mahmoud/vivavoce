'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from 'motion/react';
import { Pause } from 'lucide-react';
import { cn } from '@/lib/cn';
import { AXES, ROUNDS, weakestIndex } from './data';
import { BEATS, HERO_END, OUTRO, beatAt, marksAt, ramp } from './story';
import { HeroCopy, MarginNote, OutroCaption } from './RoomCaptions';
import { ScriptSlip } from './ScriptSlip';
import { Ruler } from './Ruler';
import { RoomTags } from './RoomTags';
import { RoomPoster } from './RoomPoster';
import { SceneBoundary } from './SceneBoundary';
import type { Insets, RoomCue, RoomOverlays, RoundState } from './Scene';
import styles from './room.module.css';

const Scene = dynamic(() => import('./Scene'), { ssr: false });

const SCORES = ROUNDS[0]!.scores;
const WEAKEST = weakestIndex(SCORES);

/** What a screen reader hears when the ruler brings an examiner's note on stage. */
const NOTE_SAID = AXES.map(
  (a, i) => `${a.label}, example mark ${SCORES[i]}${i === WEAKEST ? ', the one to fix first' : ''}. ${a.ask}`,
);

/* ── Environment probes (server snapshots keep hydration identical) ──── */

let webglCache: boolean | null = null;
function probeWebGL(): boolean {
  if (webglCache !== null) return webglCache;
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null;
    webglCache = Boolean(gl);
    // hand the probe's context straight back: browsers cap live contexts, and the room needs one
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
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

/**
 * Whether to start the live room at all, and when: never without WebGL or when the visitor asks
 * to save data, and otherwise only after the first paint, once the browser is idle (or within two
 * seconds), so the poster and the words are what the page paints first.
 */
function useLiveRoom(webgl: boolean | null): boolean {
  const [start, setStart] = useState(false);
  useEffect(() => {
    if (webgl !== true) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;
    let idle = 0;
    let timer = 0;
    const frame = requestAnimationFrame(() => {
      if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(() => setStart(true), { timeout: 2000 });
      else timer = window.setTimeout(() => setStart(true), 300);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (idle) window.cancelIdleCallback(idle);
      window.clearTimeout(timer);
    };
  }, [webgl]);
  return start;
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
 * The exam sheet the notes are written on. Once the marking starts it slides in over the room, a
 * straight paper edge with a soft shadow, so an examiner that reaches behind it is covered by paper
 * rather than fogged: down the left side on wide layouts, across the top on compact ones (its edge
 * just under the note). Under reduced motion it fades in place.
 */
function Sheet({ progress, depth }: { progress: MotionValue<number>; depth: number }) {
  const k = useTransform(progress, (v) => ramp(v, [HERO_END - 0.005, HERO_END + 0.055], [0, 1]));
  const opacity = useTransform(k, (t) => Math.min(1, t * 3));
  const visibility = useTransform(k, (t) => (t > 0.001 ? 'visible' : 'hidden'));
  return (
    <motion.div
      aria-hidden
      style={{ '--k': k, '--sheet-depth': `${(depth * 100).toFixed(2)}%`, opacity, visibility } as never}
      className={styles.sheet}
    />
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
  const live = useLiveRoom(webgl);
  const pageVisible = usePageVisible();
  const [ready, setReady] = useState(false);
  // a live room that failed (a chunk, the model, the WebGL context) hands back to its poster for good
  const [failed, setFailed] = useState(false);
  // "Pause the room": the example round and the panel's idle life stop (WCAG 2.2.2)
  const [paused, setPaused] = useState(false);
  const [said, setSaid] = useState('');
  const sayTimer = useRef(0);
  const [active, setActive] = useState(true);
  const [inHero, setInHero] = useState(true);
  const [beat, setBeat] = useState(-1);
  const [reached, setReached] = useState(0);
  const [outro, setOutro] = useState(false);
  const [round, setRound] = useState<RoundState>({ index: 0, phase: 'follow', mode: 'round' });
  const captions = useRef<HTMLDivElement>(null);
  const [insets, setInsets] = useState<Insets>({ hero: 0.42, beat: 0.36, outro: 0.36, floor: 1, tag: 0 });
  const overlaysRef = useRef<RoomOverlays>({ tag: null, tagSizer: null, leader: null, answer: null, guide: null, fade: null });
  const cueRef = useRef<RoomCue>({ listen: false, x: 0, y: 0, wake: null });

  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const hero = v < HERO_END - 0.02;
    setInHero((prev) => (prev === hero ? prev : hero));
    const b = beatAt(v);
    setBeat((prev) => (prev === b ? prev : b));
    const n = marksAt(v);
    setReached((prev) => (prev === n ? prev : n));
    const o = v >= OUTRO - 0.07;
    setOutro((prev) => (prev === o ? prev : o));
    // the keys that cue the panel to listen live in the hero and the outro only
    if (!hero && !o && cueRef.current.listen) {
      cueRef.current.listen = false;
      cueRef.current.wake?.();
    }
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

  // Where each caption ends and, on compact layouts, where the slip under the room begins, so
  // the camera frames the room in the space between. Layout boxes only (offsets), so scroll
  // transforms never skew the measure. Re-measured when the outro moves the slip down.
  useEffect(() => {
    const box = captions.current;
    const stageEl = box?.parentElement;
    if (!box || !stageEl) return;
    const measure = () => {
      const h = stageEl.clientHeight || window.innerHeight;
      const topOf = (el: HTMLElement) => {
        let y = 0;
        for (let n: HTMLElement | null = el; n && n !== stageEl; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
        return y;
      };
      // the lowest of every caption of that kind (the notes differ in length)
      const bottomOf = (name: string, fallback: number) => {
        let bottom = 0;
        box.querySelectorAll<HTMLElement>(`[data-cap="${name}"]`).forEach((el) => {
          bottom = Math.max(bottom, topOf(el) + el.offsetHeight);
        });
        return bottom ? Math.min(0.62, bottom / h) : fallback;
      };
      // on compact layouts the slip lies under the room, pinned above the ruler
      const slip = box.querySelector<HTMLElement>('[data-cap="slip"]');
      const under = slip !== null && getComputedStyle(slip).position === 'absolute';
      // the examiner's note needs its own room above the panel (as tall as its longest line makes
      // it), so it never covers a mark
      const tag = overlaysRef.current.tagSizer?.offsetHeight ?? 0;
      const next: Insets = {
        hero: bottomOf('hero', 0.42),
        beat: bottomOf('beat', 0.36),
        outro: bottomOf('outro', 0.36),
        floor: under && slip ? Math.max(0.5, topOf(slip) / h) : 1,
        tag,
      };
      setInsets((prev) =>
        Math.abs(prev.hero - next.hero) + Math.abs(prev.beat - next.beat) + Math.abs(prev.outro - next.outro) + Math.abs(prev.floor - next.floor) < 0.004 &&
        Math.abs((prev.tag ?? 0) - (next.tag ?? 0)) < 2
          ? prev
          : next,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    ro.observe(stageEl);
    box.querySelectorAll('[data-cap]').forEach((el) => ro.observe(el));
    const sizer = overlaysRef.current.tagSizer;
    if (sizer) ro.observe(sizer);
    return () => ro.disconnect();
  }, [outro]);

  useEffect(() => () => window.clearTimeout(sayTimer.current), []);

  const playing = ready && active && inHero && pageVisible && !reduce && !paused;
  const onReady = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => {
    setFailed(true);
    setReady(false);
  }, []);
  const togglePause = useCallback(() => setPaused((p) => !p), []);
  const onRound = useCallback((r: RoundState) => {
    setRound((prev) => (prev.index === r.index && prev.phase === r.phase && prev.mode === r.mode ? prev : r));
  }, []);
  // someone is about to answer: the panel turns to listen (the Director reads the cue each frame)
  const onListen = useCallback((on: boolean, key?: HTMLElement) => {
    const cue = cueRef.current;
    if (key) {
      const r = key.getBoundingClientRect();
      cue.x = ((r.left + r.width / 2) / window.innerWidth) * 2 - 1;
      cue.y = 1 - ((r.top + r.height / 2) / window.innerHeight) * 2;
    }
    if (cue.listen === on) return;
    cue.listen = on;
    cue.wake?.();
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
  // a key on the ruler: take the story there, then say which note is on stage (focus stays on the key)
  const onKey = useCallback(
    (i: number) => {
      jump(BEATS[i]!);
      window.clearTimeout(sayTimer.current);
      setSaid('');
      sayTimer.current = window.setTimeout(() => setSaid(NOTE_SAID[i]!), reduce ? 80 : 900);
    },
    [jump, reduce],
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
  const guideVisibility = useTransform(guidance, (o) => (o > 0.02 ? 'visible' : 'hidden'));
  // the slip's newest mark: the examiner on stage, the last one reached between beats, and the
  // one to fix first once the whole panel has marked
  const current = outro ? WEAKEST : beat >= 0 ? beat : reached - 1;

  return (
    <section ref={section} aria-label="VivaVoce, the viva room" data-ready={ready ? 'true' : undefined} className="relative h-[520svh]">
      <div className={styles.stage}>
        <RoomPoster hidden={ready} />
        {live && !failed && (
          <div data-room-canvas className={cn(styles.layer, 'transition-opacity duration-700 ease-out', ready ? 'opacity-100' : 'opacity-0')}>
            <SceneBoundary onError={onFail}>
              <Scene
                progress={scrollYProgress}
                active={active && pageVisible}
                playing={playing}
                reduce={reduce}
                paused={paused}
                dark={dark}
                insets={insets}
                overlaysRef={overlaysRef}
                cueRef={cueRef}
                onReady={onReady}
                onRound={onRound}
                onLost={onFail}
              />
            </SceneBoundary>
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
          <RoomTags round={round} still={reduce || paused} overlaysRef={overlaysRef} />
        </div>
        <Sheet progress={scrollYProgress} depth={outro ? insets.outro : insets.beat} />
        <div ref={captions} className={styles.captions}>
          <div data-cap="hero" className={styles.heroCap}>
            <HeroCopy progress={scrollYProgress} onFocusBack={toHero} onListen={onListen} />
          </div>
          {/* the five notes, for screen readers: the visible ones appear only as the scroll reaches them */}
          <div className="sr-only">
            <p>In the example round, five examiners mark one spoken answer:</p>
            <ol>
              {AXES.map((a, i) => (
                <li key={a.key}>
                  {a.label}, example mark {SCORES[i]}
                  {i === WEAKEST ? ', the one to fix first' : ''}. {a.ask} {a.line}
                </li>
              ))}
            </ol>
          </div>
          <div className={styles.script}>
            <div className={styles.notes}>
              {AXES.map((a, i) => (
                <div key={a.key} data-cap="beat">
                  <MarginNote index={i} progress={scrollYProgress} active={beat === i} />
                </div>
              ))}
              <div data-cap="outro">
                <OutroCaption progress={scrollYProgress} onFocusBack={toOutro} onListen={onListen} />
              </div>
            </div>
            <div data-cap="slip" data-outro={outro ? 'true' : undefined} className={styles.slipSlot}>
              <ScriptSlip progress={scrollYProgress} reached={reached} current={current} outro={outro} />
            </div>
          </div>
        </div>
        <Ruler progress={scrollYProgress} current={beat} onJump={onKey} />
        <p aria-live="polite" className="sr-only">
          {said}
        </p>
        <motion.div
          ref={(el) => {
            overlaysRef.current.guide = el;
          }}
          style={{ opacity: guidance, visibility: guideVisibility }}
          data-live={ready ? 'true' : undefined}
          className={styles.guide}
        >
          <p className={styles.guideNote}>Example round. Scores are guidance, not grades.</p>
          <button type="button" aria-pressed={paused} onClick={togglePause} className={cn(styles.pause, 'pressable')}>
            <Pause aria-hidden size={13} strokeWidth={2.4} />
            <span className={styles.pauseLabel}>Pause the room</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
