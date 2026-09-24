'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { ArrowRight, Mic } from 'lucide-react';
import { RiseText } from '@/components/ui/RiseText';
import { AXES, ROUNDS, ROUND_TIMELINE, type RoundPhase } from './data';
import { BEATS, HERO_END, OUTRO, ramp } from './story';
import { RoomFallback } from './RoomFallback';
import type { Insets, RoundState } from './Scene';

const Scene = dynamic(() => import('./Scene'), { ssr: false });

/* ── Environment probes ───────────────────────────────────────────────────── */

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

/* ── The scripted example round ───────────────────────────────────────────── */

function useExampleRound(playing: boolean): RoundState {
  const [round, setRound] = useState<RoundState>({ index: 0, phase: 'ask' });

  useEffect(() => {
    if (!playing) return;
    const timers = (Object.entries(ROUND_TIMELINE) as [RoundPhase, number][]).map(([phase, at]) =>
      setTimeout(() => {
        if (phase === 'next') setRound((r) => ({ index: r.index + 1, phase: 'ask' }));
        else setRound((r) => ({ ...r, phase }));
      }, at),
    );
    return () => timers.forEach(clearTimeout);
  }, [playing, round.index]);

  return round;
}

/* ── Captions ─────────────────────────────────────────────────────────────── */

function HeroCopy({ progress, still }: { progress: MotionValue<number>; still: boolean }) {
  const opacity = useTransform(progress, (v) => ramp(v, [HERO_END - 0.035, HERO_END + 0.01], [1, 0]));
  const y = useTransform(progress, (v) => ramp(v, [0, HERO_END + 0.01], [0, -40]));
  const pointerEvents = useTransform(opacity, (o) => (o > 0.4 ? 'auto' : 'none'));

  return (
    <motion.div style={still ? undefined : { opacity, y, pointerEvents }} className="max-w-[36rem]">
      <h1 className="display text-[clamp(2.7rem,5.6vw,5.4rem)] text-ink">
        <RiseText text="Say it out loud *before* it counts." />
      </h1>
      <p className="rise mt-5 max-w-[28rem] text-[1.06rem] font-medium leading-relaxed text-ink-mut sm:mt-6 sm:text-xl" style={{ '--i': 7 } as React.CSSProperties}>
        VivaVoce asks real exam questions, listens to your spoken answer, and
        marks it in seconds.
      </p>
      <div className="rise mt-6 flex flex-wrap items-center gap-3 sm:mt-8" style={{ '--i': 8 } as React.CSSProperties}>
        <a href="#live" className="btn btn-verm h-13 px-6 text-base">
          <Mic size={18} aria-hidden />
          Answer a question
        </a>
        <Link href="/waitlist" className="btn btn-line hidden h-13 px-6 text-base sm:inline-flex">
          Get early access
        </Link>
      </div>
    </motion.div>
  );
}

function BeatCaption({ index, progress }: { index: number; progress: MotionValue<number> }) {
  const c = BEATS[index]!;
  const range = [c - 0.085, c - 0.04, c + 0.04, c + 0.085];
  const opacity = useTransform(progress, (v) => ramp(v, range, [0, 1, 1, 0]));
  const y = useTransform(progress, (v) => ramp(v, range, [28, 0, 0, -28]));
  const axis = AXES[index]!;
  const score = ROUNDS[0]!.scores[index]!;

  return (
    <motion.article
      style={{ opacity, y }}
      aria-label={`${axis.label}: ${axis.ask}`}
      className="tile max-w-[30rem] p-6 shadow-[0_6px_14px_-8px_rgb(var(--vv-shadow)/0.35)] sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="display text-[clamp(2rem,3.6vw,3.2rem)]">{axis.label}</h2>
        <span
          className="marks mt-1 grid h-12 w-12 shrink-0 place-items-center rounded-full bg-coal text-base font-bold text-paper"
          title="Example mark"
        >
          {score}
        </span>
      </div>
      <p className="mt-4 text-xl font-black leading-snug sm:text-[1.4rem]">{axis.ask}</p>
      <p className="mt-3 text-[1.02rem] leading-relaxed text-ink-mut">{axis.line}</p>
    </motion.article>
  );
}

function OutroCaption({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, (v) => ramp(v, [OUTRO - 0.07, OUTRO - 0.025], [0, 1]));
  const y = useTransform(progress, (v) => ramp(v, [OUTRO - 0.07, OUTRO - 0.025], [28, 0]));
  const pointerEvents = useTransform(opacity, (o) => (o > 0.5 ? 'auto' : 'none'));
  return (
    <motion.div style={{ opacity, y, pointerEvents }} className="max-w-[32rem]">
      <h2 className="display text-[clamp(2.2rem,4.4vw,4rem)]">
        Five marks. One to fix first.
      </h2>
      <p className="mt-5 max-w-[27rem] text-lg font-medium leading-relaxed text-ink-mut">
        Every answer ends with your weakest axis named, a stronger answer to
        steal from, and a follow-up aimed straight at it.
      </p>
      <a href="#live" className="btn btn-ink mt-7 h-13 px-6 text-base">
        Answer a question <ArrowRight size={17} aria-hidden />
      </a>
    </motion.div>
  );
}

/** Five ticks, one per examiner. The live one stands tall. Click to jump. */
function Rail({
  progress,
  onJump,
}: {
  progress: MotionValue<number>;
  onJump: (p: number) => void;
}) {
  const opacity = useTransform(progress, (v) => ramp(v, [HERO_END, HERO_END + 0.05, OUTRO - 0.08, OUTRO - 0.04], [0, 1, 1, 0]));
  const pointerEvents = useTransform(opacity, (o) => (o > 0.5 ? 'auto' : 'none'));
  return (
    <motion.nav
      aria-label="The panel"
      style={{ opacity, pointerEvents }}
      className="absolute inset-x-0 bottom-4 z-20 flex justify-center md:bottom-7"
    >
      <ol className="flex items-end gap-1 rounded-full border border-line bg-card px-2 py-1.5 shadow-[0_12px_32px_-20px_rgb(var(--vv-shadow)/0.5)]">
        {AXES.map((a, i) => (
          <RailTick key={a.key} index={i} label={a.label} progress={progress} onJump={onJump} />
        ))}
      </ol>
    </motion.nav>
  );
}

function RailTick({
  index,
  label,
  progress,
  onJump,
}: {
  index: number;
  label: string;
  progress: MotionValue<number>;
  onJump: (p: number) => void;
}) {
  const c = BEATS[index]!;
  const lit = useTransform(progress, (v) => ramp(v, [c - 0.07, c - 0.03, c + 0.03, c + 0.07], [0, 1, 1, 0]));
  const scaleY = useTransform(lit, (v) => ramp(v, [0, 1], [0.4, 1]));
  return (
    <li>
      <button
        type="button"
        onClick={() => onJump(c)}
        className="group relative flex h-10 cursor-pointer items-center gap-2 rounded-full px-2.5 text-xs font-bold text-ink-mut transition-colors duration-150 hover:text-ink sm:px-3"
      >
        <span className="relative h-4 w-[3px] overflow-hidden rounded-full bg-line">
          <motion.span
            style={{ scaleY, opacity: lit }}
            className="absolute inset-0 origin-bottom rounded-full bg-verm"
          />
        </span>
        <span className="hidden sm:inline">{label}</span>
        <span className="sr-only sm:hidden">{label}</span>
      </button>
    </li>
  );
}

/* ── The story ────────────────────────────────────────────────────────────── */

/**
 * The home page's first act: the viva room, pinned, while scroll walks the
 * camera down the panel one examiner at a time. Reduced motion gets the room
 * standing still and the five axes as plain content below it.
 */
export function RoomStory() {
  const section = useRef<HTMLElement>(null);
  const reduceRaw = useReducedMotion();
  const reduce = Boolean(reduceRaw);
  const dark = useDark();
  const webgl = useWebGL();
  const pageVisible = usePageVisible();
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const [inHero, setInHero] = useState(true);
  // The room opens on the marked panel, paddles up, before the round plays.
  const [intro, setIntro] = useState(true);
  const captions = useRef<HTMLDivElement>(null);
  const [insets, setInsets] = useState<Insets>({ hero: 0.5, beat: 0.42, outro: 0.42 });

  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const next = v < HERO_END - 0.02;
    setInHero((prev) => (prev === next ? prev : next));
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

  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => setIntro(false), 2600);
    return () => clearTimeout(id);
  }, [ready]);

  // Where each caption ends, so the camera can frame the room below it on
  // narrow screens. Layout boxes only (offsets), so scroll transforms don't skew it.
  useEffect(() => {
    const box = captions.current;
    const stageEl = box?.parentElement;
    if (!box || !stageEl) return;
    const measure = () => {
      const h = stageEl.clientHeight || window.innerHeight;
      const bottomOf = (name: string, fallback: number) => {
        const el = box.querySelector<HTMLElement>(`[data-cap="${name}"]`);
        if (!el) return fallback;
        return Math.min(0.72, (box.offsetTop + el.offsetTop + el.offsetHeight) / h);
      };
      const next = { hero: bottomOf('hero', 0.5), beat: bottomOf('beat', 0.42), outro: bottomOf('outro', 0.42) };
      setInsets((prev) =>
        Math.abs(prev.hero - next.hero) + Math.abs(prev.beat - next.beat) + Math.abs(prev.outro - next.outro) < 0.004
          ? prev
          : next,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    ro.observe(stageEl);
    return () => ro.disconnect();
  }, [reduce]);

  const playing = ready && !intro && active && inHero && pageVisible && !reduce;
  const round = useExampleRound(playing);
  const onReady = useCallback(() => setReady(true), []);
  const labelOpacity = useTransform(scrollYProgress, (v) => ramp(v, [0, HERO_END], [1, 0]));

  const jump = useCallback((p: number) => {
    const el = section.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + p * travel, behavior: reduce ? 'auto' : 'smooth' });
  }, [reduce]);

  const stage = (
    <div
      className={`absolute inset-0 transition-opacity duration-700 ease-out ${
        ready || webgl === false ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {webgl === true && (
        <Scene
          progress={scrollYProgress}
          active={active}
          reduce={reduce}
          dark={dark}
          round={inHero && !reduce && !intro ? round : null}
          insets={insets}
          onReady={onReady}
        />
      )}
      {webgl === false && <RoomFallback />}
      <motion.p
        style={reduce ? undefined : { opacity: labelOpacity }}
        className="pointer-events-none absolute bottom-3 right-4 text-xs font-semibold text-ink-mut md:bottom-6 md:right-8"
      >
        Example round. Scores are guidance, not grades.
      </motion.p>
    </div>
  );

  if (reduce) {
    return (
      <>
        <section ref={section} aria-label="VivaVoce" className="relative h-[100svh] min-h-[640px] overflow-hidden">
          {stage}
          <div
            ref={captions}
            className="absolute inset-x-0 top-0 z-10 px-5 pt-20 md:inset-y-0 md:right-auto md:grid md:w-[46%] md:content-center md:pl-10 md:pt-0 lg:pl-16"
          >
            <div data-cap="hero">
              <HeroCopy progress={scrollYProgress} still />
            </div>
          </div>
        </section>
        <section aria-label="The five axes" className="mx-auto grid max-w-[1360px] gap-3 px-3 py-12 sm:px-5 md:grid-cols-2 lg:grid-cols-5">
          {AXES.map((a) => (
            <article key={a.key} className="tile p-6">
              <h2 className="text-2xl font-black">{a.label}</h2>
              <p className="mt-3 font-bold leading-snug">{a.ask}</p>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-mut">{a.line}</p>
            </article>
          ))}
        </section>
      </>
    );
  }

  return (
    <section ref={section} aria-label="VivaVoce, the viva room" className="relative h-[520svh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {stage}
        <div
          ref={captions}
          className="absolute inset-x-0 top-0 z-10 grid px-4 pt-20 [grid-template-areas:'s'] *:[grid-area:s] sm:px-5 md:inset-y-0 md:right-auto md:w-[46%] md:content-center md:pl-10 md:pt-0 lg:pl-16"
        >
          <div data-cap="hero" className="self-start md:self-center">
            <HeroCopy progress={scrollYProgress} still={false} />
          </div>
          {AXES.map((a, i) => (
            <div key={a.key} data-cap={i === 0 ? 'beat' : undefined} className="self-start md:self-center">
              <BeatCaption index={i} progress={scrollYProgress} />
            </div>
          ))}
          <div data-cap="outro" className="self-start md:self-center">
            <OutroCaption progress={scrollYProgress} />
          </div>
        </div>
        <Rail progress={scrollYProgress} onJump={jump} />
      </div>
    </section>
  );
}
