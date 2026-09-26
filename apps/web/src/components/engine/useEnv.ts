'use client';

import { useSyncExternalStore } from 'react';

/*
 * What the page can know only in a browser, read so that hydration always renders the server's
 * answer first (the server snapshot) and the client corrects it straight after. The markup never
 * branches on these while hydrating, so the server and the client always agree.
 */

const noop = () => () => {};

function media(query: string) {
  return (cb: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  };
}

const REDUCE = '(prefers-reduced-motion: reduce)';
const DARK = '(prefers-color-scheme: dark)';
const FINE = '(hover: hover) and (pointer: fine)';
const subReduce = media(REDUCE);
const subDark = media(DARK);
const subFine = media(FINE);

export const useReduce = () => useSyncExternalStore(subReduce, () => window.matchMedia(REDUCE).matches, () => false);
export const useDark = () => useSyncExternalStore(subDark, () => window.matchMedia(DARK).matches, () => false);
/** A mouse or trackpad: hover exists and is precise. */
export const useFinePointer = () => useSyncExternalStore(subFine, () => window.matchMedia(FINE).matches, () => false);

let webgl: boolean | null = null;
function probeWebGL(): boolean {
  if (webgl !== null) return webgl;
  try {
    const c = document.createElement('canvas');
    webgl = Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    webgl = false;
  }
  return webgl;
}
/** null while hydrating. */
export const useWebGL = () => useSyncExternalStore(noop, probeWebGL, () => null);

function subVisible(cb: () => void) {
  document.addEventListener('visibilitychange', cb);
  return () => document.removeEventListener('visibilitychange', cb);
}
export const usePageVisible = () => useSyncExternalStore(subVisible, () => document.visibilityState === 'visible', () => true);

function subOnline(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}
export const useOnline = () => useSyncExternalStore(subOnline, () => navigator.onLine, () => true);
