'use client';

import { useEffect, useEffectEvent, useRef, type DependencyList, type RefObject } from 'react';
import { createScope, cubicBezier, spring, type Scope } from 'animejs';

/** The house curves as anime.js easing functions (v4 no longer parses strings). */
export const ANIME_EASE = {
  out: cubicBezier(0.23, 1, 0.32, 1),
  inOut: cubicBezier(0.77, 0, 0.175, 1),
  drawer: cubicBezier(0.32, 0.72, 0, 1),
} as const;

/** The motion.ts springs in anime.js terms (duration in ms). */
export const ANIME_SPRING = {
  ui: () => spring({ bounce: 0, duration: 400 }),
  physical: () => spring({ bounce: 0.2, duration: 400 }),
} as const;

export interface AnimeScopeContext<T extends HTMLElement | SVGElement> {
  /** The anime.js scope. Register named methods with `scope.add('name', fn)`. */
  scope: Scope;
  /** The root element; selectors inside the scope resolve within it. */
  root: T;
  /** True under prefers-reduced-motion. Seek timelines to their end state. */
  reduce: boolean;
}

/**
 * A small, StrictMode-safe home for anime.js effects in a client component.
 *
 * Everything created inside `setup` belongs to one `createScope` rooted at
 * the returned ref: selectors resolve inside it, and the whole scope is
 * reverted on unmount, when `deps` change, and (because the scope watches
 * prefers-reduced-motion) re-run when the preference flips. StrictMode's
 * double effect in development simply reverts and rebuilds it.
 *
 *   const { root, scope } = useAnimeScope<HTMLDivElement>(({ scope, reduce }) => {
 *     const tl = createTimeline({ autoplay: !reduce }).add('.tick', { draw: '0 1' });
 *     if (reduce) tl.seek(tl.duration);
 *     scope.add('replay', () => tl.restart());
 *   }, [marks]);
 *   // later: scope.current?.methods.replay?.();
 *
 * `setup` always sees the latest props (it is an effect event), so only list
 * values in `deps` that should rebuild the animation.
 */
export function useAnimeScope<T extends HTMLElement | SVGElement = HTMLDivElement>(
  setup: (ctx: AnimeScopeContext<T>) => void | (() => void),
  deps: DependencyList = [],
): { root: RefObject<T | null>; scope: RefObject<Scope | null> } {
  const root = useRef<T>(null);
  const scope = useRef<Scope | null>(null);

  const build = useEffectEvent((self: Scope, el: T) =>
    setup({ scope: self, root: el, reduce: Boolean(self.matches.reduce) }),
  );

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const created = createScope({
      root,
      mediaQueries: { reduce: '(prefers-reduced-motion: reduce)' },
    }).add((self) => (self ? build(self, el) : undefined));
    scope.current = created;
    return () => {
      created.revert();
      scope.current = null;
    };
    // The caller owns the dependency list, exactly like useEffect's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { root, scope };
}
