'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import {
  animate,
  motion,
  useDragControls,
  useInView,
  useMotionValue,
  useTransform,
  type MotionValue,
  type Transition,
} from 'motion/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { EASE, SPRING } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { MODES, ModePreview } from './ModePreviews';
import { poseFor, isFlick, flickDirection, type Pose } from './deck';
import { useMedia, useReducedMarkup } from './useHome';

const N = MODES.length;

/** How the front card last changed, so each card knows how to travel. */
interface Move {
  kind: 'next' | 'prev' | 'jump';
  /** Which way a flung card leaves. */
  dir: 1 | -1;
  /** Release velocity in px/s after a flick; 0 for buttons and keys. */
  velocity: number;
}

/** Anything inside a card that takes its own pointer input. */
function isControl(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('button, input, a, [role="slider"]'));
}

interface CardProps {
  index: number;
  slot: number;
  narrow: boolean;
  reduce: boolean;
  move: RefObject<Move>;
  dealt: boolean;
  running: boolean;
  tabId: string;
  panelId: string;
  register: (index: number, el: HTMLDivElement | null) => void;
  onFlick: (dir: 1 | -1, velocity: number) => void;
  onPick: (index: number) => void;
  onSettled: (index: number) => void;
  onKey: (e: ReactKeyboardEvent<HTMLDivElement>) => void;
  nudge: boolean;
}

function DeckCard({
  index,
  slot,
  narrow,
  reduce,
  move,
  dealt,
  running,
  tabId,
  panelId,
  register,
  onFlick,
  onPick,
  onSettled,
  onKey,
  nudge,
}: CardProps) {
  const mode = MODES[index]!;
  const start = poseFor(slot, narrow);
  const x = useMotionValue(start.x);
  const y = useMotionValue(start.y);
  const rotate = useMotionValue(start.rotate);
  const scale = useMotionValue(start.scale);
  const z = useMotionValue(N - slot);
  // The hand's pull, separate from the resting pose, with a tilt that follows it.
  const pull = useMotionValue(0);
  const tilt = useTransform(pull, [-360, 0, 360], [-10, 0, 10]);
  const controls = useDragControls();
  const shell = useRef<HTMLDivElement | null>(null);
  const was = useRef({ slot, narrow });
  const token = useRef(0);
  const front = slot === 0;

  useEffect(() => {
    const prev = was.current;
    was.current = { slot, narrow };
    const id = ++token.current;
    const stale = () => token.current !== id;
    const target = poseFor(slot, narrow);
    const all = (p: Pose, t: Transition) =>
      Promise.all([
        animate(x, p.x, t),
        animate(y, p.y, t),
        animate(rotate, p.rotate, t),
        animate(scale, p.scale, t),
      ]);
    const place = () => {
      x.set(target.x);
      y.set(target.y);
      rotate.set(target.rotate);
      scale.set(target.scale);
      z.set(N - slot);
    };
    const arrived = () => {
      if (stale()) return;
      z.set(N - slot);
      if (slot === 0) onSettled(index);
    };

    if (prev.slot === slot) {
      // The layout changed (a phone turned sideways): no travel.
      if (prev.narrow !== narrow) place();
      return;
    }
    if (reduce) {
      place();
      arrived();
      return;
    }

    const m = move.current;
    if (prev.slot === 0 && slot === N - 1 && m.kind === 'next') {
      // Thrown: it leaves the way it was flung, then tucks in under the pile.
      z.set(N + 2);
      const away = narrow ? 460 : 640;
      const out: Transition = m.velocity
        ? { type: 'spring', bounce: 0.2, visualDuration: 0.34, velocity: m.velocity }
        : { duration: 0.34, ease: EASE.inOut };
      void Promise.all([
        animate(x, m.dir * away, out),
        animate(y, -24, { duration: 0.34, ease: EASE.out }),
        animate(rotate, m.dir * 13, { duration: 0.34, ease: EASE.out }),
      ]).then(() => {
        if (stale()) return;
        z.set(N - slot);
        void all(target, { duration: 0.5, ease: EASE.inOut }).then(arrived);
      });
      return;
    }
    if (prev.slot === N - 1 && slot === 0 && m.kind === 'prev') {
      // Drawn from the bottom: out past the pile, then laid on top.
      const side = narrow ? 1 : -1;
      void animate(x, x.get() + side * (narrow ? 300 : 240), { duration: 0.24, ease: EASE.out }).then(() => {
        if (stale()) return;
        z.set(N + 2);
        void all(target, SPRING.ui).then(arrived);
      });
      return;
    }
    z.set(slot === 0 ? N + 1 : N - slot);
    void all(target, slot === 0 ? SPRING.ui : { duration: 0.46, ease: EASE.inOut }).then(arrived);
    // Travel only when the slot or the layout changes; the rest is read fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot, narrow, reduce]);

  // A small tug the first time the deck is seen, to say the card moves.
  useEffect(() => {
    if (!nudge || !front || reduce) return;
    const ctrl = animate(pull, [0, -34, 6, 0], {
      duration: 1.1,
      times: [0, 0.4, 0.75, 1],
      ease: EASE.inOut,
      delay: 0.5,
    });
    // Cut short (the card was dealt away mid-tug): let it settle back, never stay offset.
    return () => {
      ctrl.stop();
      if (pull.get() !== 0) void animate(pull, 0, SPRING.ui);
    };
  }, [nudge, front, reduce, pull]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!front || reduce || isControl(e.target)) return;
    controls.start(e);
  };

  return (
    <motion.div
      ref={(el) => {
        shell.current = el;
        register(index, el);
      }}
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      aria-roledescription="slide"
      aria-hidden={front ? undefined : true}
      tabIndex={front ? 0 : -1}
      onKeyDown={front ? onKey : undefined}
      onClick={front ? undefined : () => onPick(index)}
      className={cn('vv-deck-card', !front && 'vv-deck-card-back')}
      style={{ x, y, rotate, scale, zIndex: z as MotionValue<number> }}
    >
      <motion.div
        drag={front && !reduce ? 'x' : false}
        dragListener={false}
        dragControls={controls}
        dragMomentum={false}
        onPointerDown={onPointerDown}
        onDragEnd={(_, info) => {
          const width = shell.current?.offsetWidth ?? 560;
          if (isFlick(info.offset.x, info.velocity.x, width)) {
            // Hand the pull over to the pose in one frame, so nothing jumps.
            x.set(x.get() + pull.get());
            rotate.set(rotate.get() + tilt.get());
            pull.set(0);
            onFlick(flickDirection(info.offset.x, info.velocity.x), info.velocity.x);
          } else {
            void animate(pull, 0, SPRING.ui);
          }
        }}
        className="vv-deck-grip"
        style={{ x: pull, rotate: tilt }}
      >
        <article className="vv-index-card" inert={!front}>
          <header className="vv-index-card-head">
            <h3 className="text-[1.3rem] font-black leading-tight tracking-[-0.01em] sm:text-[1.45rem]">
              {mode.name}
            </h3>
            <p className="mt-0.5 text-[0.9rem] font-medium leading-snug text-ink-mut">{mode.blurb}</p>
          </header>
          <div className="vv-index-card-body">
            <ModePreview id={mode.id} running={running} dealt={dealt} />
          </div>
        </article>
      </motion.div>
    </motion.div>
  );
}

/**
 * Six modes as a deck of question cards you can handle. Drag or flick the
 * front card away and it tucks in at the back; the rest fan out behind it.
 * The buttons, the mode list and the arrow keys deal cards too. The card in
 * front plays a small working version of its mode while it is on screen.
 */
export function Modes({ className }: { className?: string }) {
  const uid = useId();
  const reduce = useReducedMarkup();
  const narrow = useMedia('(max-width: 1023px)');
  const [front, setFront] = useState(0);
  const [settled, setSettled] = useState(0);
  const [touched, setTouched] = useState(false);
  const [said, setSaid] = useState('');
  const move = useRef<Move>({ kind: 'jump', dir: 1, velocity: 0 });
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const deck = useRef<HTMLDivElement>(null);
  const seen = useInView(deck, { amount: 0.35 });
  const firstLook = useInView(deck, { amount: 0.6, once: true });

  const go = useCallback(
    (to: number, m: Move, focus?: 'card' | 'tab') => {
      const i = ((to % N) + N) % N;
      if (i === front) return;
      move.current = m;
      setTouched(true);
      setFront(i);
      setSettled(-1);
      setSaid(`${MODES[i]!.name}, card ${i + 1} of ${N}`);
      if (focus) {
        requestAnimationFrame(() =>
          (focus === 'card' ? cards.current[i] : tabs.current[i])?.focus({ preventScroll: true }),
        );
      }
    },
    [front],
  );

  const next = (focus?: 'card' | 'tab') => go(front + 1, { kind: 'next', dir: 1, velocity: 0 }, focus);
  const prev = (focus?: 'card' | 'tab') => go(front - 1, { kind: 'prev', dir: -1, velocity: 0 }, focus);

  const onCardKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      next('card');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev('card');
    }
  };

  const onTabKey = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    let to: number;
    let kind: Move['kind'] = 'jump';
    if (e.key === 'ArrowRight') {
      to = front + 1;
      kind = 'next';
    } else if (e.key === 'ArrowLeft') {
      to = front - 1;
      kind = 'prev';
    } else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = N - 1;
    else return;
    e.preventDefault();
    go(to, { kind, dir: kind === 'prev' ? -1 : 1, velocity: 0 }, 'tab');
  };

  const register = useCallback((i: number, el: HTMLDivElement | null) => {
    cards.current[i] = el;
  }, []);
  const onSettled = useCallback((i: number) => setSettled(i), []);

  return (
    <section
      aria-labelledby={`${uid}-title`}
      className={cn('vv-modes mx-auto w-full max-w-[1360px] px-4 py-20 sm:px-5 sm:py-28', className)}
    >
      <h2 id={`${uid}-title`} className="display max-w-[17ch] text-[clamp(2.1rem,3.9vw,3.3rem)] lg:max-w-none">
        Six ways to spar. <span className="text-ink-mut">Deal yourself the room you are facing.</span>
      </h2>

      <div role="region" aria-roledescription="carousel" aria-label="Practice modes" className="mt-10 sm:mt-14">
        <div ref={deck} className="vv-deck" data-narrow={narrow ? '' : undefined}>
          {MODES.map((m, i) => {
            const slot = (i - front + N) % N;
            const dealt = slot === 0 && settled === i;
            return (
              <DeckCard
                key={m.id}
                index={i}
                slot={slot}
                narrow={narrow}
                reduce={reduce}
                move={move}
                dealt={dealt}
                running={dealt && seen && !reduce}
                tabId={`${uid}-tab-${i}`}
                panelId={`${uid}-card-${i}`}
                register={register}
                onFlick={(dir, velocity) => go(front + 1, { kind: 'next', dir, velocity })}
                onPick={(pick) => go(pick, { kind: 'jump', dir: 1, velocity: 0 })}
                onSettled={onSettled}
                onKey={onCardKey}
                nudge={firstLook && !touched}
              />
            );
          })}
        </div>

        <div className="vv-deck-controls">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => prev()} aria-label="Previous mode" className="btn btn-secondary btn-icon">
              <ArrowLeft size={18} aria-hidden />
            </button>
            <p className="min-w-[3.4rem] text-center text-sm font-bold text-ink-mut" aria-hidden>
              <span className="marks text-ink">{front + 1}</span> / <span className="marks">{N}</span>
            </p>
            <button type="button" onClick={() => next()} aria-label="Next mode" className="btn btn-secondary btn-icon">
              <ArrowRight size={18} aria-hidden />
            </button>
          </div>

          <div role="tablist" aria-label="Modes" className="vv-mode-list">
            {MODES.map((m, i) => (
              <button
                key={m.id}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${uid}-tab-${i}`}
                aria-selected={i === front}
                aria-controls={`${uid}-card-${i}`}
                tabIndex={i === front ? 0 : -1}
                onClick={() => go(i, { kind: 'jump', dir: 1, velocity: 0 })}
                onKeyDown={onTabKey}
                className="vv-mode-tab pointer-coarse:min-h-11"
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-[0.8rem] font-semibold text-ink-mut">
          <span className="vv-hint-fine">Drag or flick the card, or use the arrow keys.</span>
          <span className="vv-hint-touch">Swipe the card for the next one.</span>
          <span>Example previews. Scores are guidance, not grades.</span>
        </p>
        <p className="sr-only" aria-live="polite">
          {said}
        </p>
      </div>
    </section>
  );
}
