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
  /** Pause after the last beat before starting over, in ms. */
  rest?: number;
  /** Start over after the rest. */
  loop?: boolean;
  /** The beat shown while not running. Defaults to the last (the complete state). */
  still?: number;
}

/**
 * Steps through a short scripted sequence while `running`: beat i lasts
 * `steps[i]` ms, then after a rest the round starts over. While not running
 * (off screen, not the card in front, reduced motion) it shows a still beat,
 * the complete state by default, so a preview is never caught half-built.
 * Mount it already running to start from the first beat.
 */
export function useBeat(running: boolean, steps: readonly number[], options: BeatOptions = {}) {
  const { rest = 1800, loop = true } = options;
  const last = steps.length - 1;
  const still = options.still ?? last;
  const [state, setState] = useState(() => ({ beat: running ? 0 : still, round: 0 }));

  useEffect(() => {
    if (!running) return;
    const atEnd = state.beat >= last;
    if (atEnd && !loop) return;
    const wait = atEnd ? rest : (steps[state.beat] ?? 1000);
    const t = window.setTimeout(
      () =>
        setState((s) =>
          s.beat >= last ? { beat: 0, round: s.round + 1 } : { beat: s.beat + 1, round: s.round },
        ),
      wait,
    );
    return () => window.clearTimeout(t);
  }, [running, state.beat, last, loop, rest, steps]);

  return running ? state : { beat: still, round: state.round };
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
    const io = new IntersectionObserver(([entry]) => setSeen(Boolean(entry?.isIntersecting)), {
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
