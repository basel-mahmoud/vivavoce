'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * A media query as state. The server (and hydration) sees `serverValue`, so
 * render the server's layout first and let the client correct it.
 */
export function useMedia(query: string, serverValue = false) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** A mouse or trackpad: hover exists and is precise. */
export const FINE_POINTER = '(hover: hover) and (pointer: fine)';

/** True while the document is visible (not a background tab). */
export function usePageVisible() {
  return useSyncExternalStore(
    (onChange) => {
      document.addEventListener('visibilitychange', onChange);
      return () => document.removeEventListener('visibilitychange', onChange);
    },
    () => document.visibilityState === 'visible',
    () => true,
  );
}

export interface BeatOptions {
  /** Pause after the last beat before starting over (or before resting), in ms. */
  rest?: number;
  /** Start over after the rest. */
  loop?: boolean;
  /**
   * How many rounds to play before holding still for good (WCAG 2.2.2: a
   * demo that plays by itself stops on its own). Defaults to one round when
   * `loop` is false, and no limit when it is true.
   */
  rounds?: number;
  /** The beat shown while not running or when finished. Defaults to the last (the complete state). */
  still?: number;
}

/**
 * Steps through a short scripted sequence while `running`: beat i lasts
 * `steps[i]` ms, then after a rest the next round starts, until `rounds`
 * rounds have played. While not running (off screen, not the card in front,
 * reduced motion), before its first run and once it has finished, it shows a
 * still beat, the complete state by default, so a preview is never caught
 * half-built. It starts from the first beat the first time it runs; remount
 * it (a new key) to play it again.
 */
export function useBeat(running: boolean, steps: readonly number[], options: BeatOptions = {}) {
  const { rest = 1800, loop = true } = options;
  const rounds = options.rounds ?? (loop ? Infinity : 1);
  const last = steps.length - 1;
  const still = options.still ?? last;
  // beat -1: not started yet.
  const [state, setState] = useState(() => ({ beat: running ? 0 : -1, round: 0, finished: false }));

  useEffect(() => {
    if (!running || state.finished) return;
    if (state.beat < 0) {
      const t = window.setTimeout(() => setState({ beat: 0, round: 0, finished: false }), 0);
      return () => window.clearTimeout(t);
    }
    const atEnd = state.beat >= last;
    const final = atEnd && state.round + 1 >= rounds;
    const wait = atEnd ? rest : (steps[state.beat] ?? 1000);
    const t = window.setTimeout(
      () =>
        setState((s) =>
          s.beat < last
            ? { ...s, beat: s.beat + 1 }
            : final
              ? { ...s, finished: true }
              : { beat: 0, round: s.round + 1, finished: false },
        ),
      wait,
    );
    return () => window.clearTimeout(t);
  }, [running, state.beat, state.round, state.finished, last, rounds, rest, steps]);

  const resting = !running || state.beat < 0 || state.finished;
  return resting ? { beat: still, round: state.round, finished: state.finished } : state;
}

/**
 * True while the element is on screen, for loops that should stop when
 * nobody can see them. Margin follows IntersectionObserver syntax.
 */
export function useSeen<T extends Element>(ref: React.RefObject<T | null>, margin = '0px') {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // A callback can carry several entries (off, then on); the last one is the current state.
    const io = new IntersectionObserver((entries) => setSeen(Boolean(entries[entries.length - 1]?.isIntersecting)), {
      rootMargin: margin,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return seen;
}

const never = () => () => {};

/** False on the server and during hydration, true once the client has taken over. */
export function useHydrated() {
  return useSyncExternalStore(
    never,
    () => true,
    () => false,
  );
}

/**
 * prefers-reduced-motion for choices that change markup. The server cannot
 * know the preference, so this stays false through hydration (the markup
 * matches) and flips right after.
 */
export function useReducedMarkup() {
  const reduce = useReducedMotion() ?? false;
  return useHydrated() && reduce;
}
