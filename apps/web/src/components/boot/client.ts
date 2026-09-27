import type { BootApi, BootEvent } from './types';

/**
 * The page's side of the first-visit loader (script.ts): the room reports its milestones here, and
 * whatever waits for the reveal asks here. Every call is safe where there is no loader (the server,
 * a page without the room, a script that never ran): marks go nowhere, nothing is held, and events
 * have already happened. No React here and relative imports only: the room's asset module
 * (room/assets.ts) uses this, and scripts/examiners/render.mjs bundles that with esbuild.
 */

/** Milestones the page reports (script.ts MILESTONES; font and poster the script tracks itself). */
export type BootMilestone = 'app' | 'code' | 'model' | 'textures' | 'labels' | 'compile' | 'ready';

function boot(): BootApi | undefined {
  return typeof window === 'undefined' ? undefined : (window as Window & { __vvBoot?: BootApi }).__vvBoot;
}

/** A milestone's progress (0 to 1), or its end without a fraction. */
export function bootMark(name: BootMilestone, fraction?: number) {
  boot()?.mark(name, fraction);
}

/** The room will not go live on this visit: the loader waits for the page and its poster only. */
export function bootStill(why: string) {
  boot()?.still(why);
}

/** The loader covers the page right now. */
export function bootShowing(): boolean {
  return boot()?.showing ?? false;
}

/** Calls back once the event has happened (at once where there is no loader); returns an unsubscribe. */
export function onBoot(event: BootEvent, callback: () => void): () => void {
  const b = boot();
  if (!b) {
    queueMicrotask(callback);
    return () => {};
  }
  return b.on(event, callback);
}

/** The loader still holds what should play in view (see useBootHeld). */
export function bootHeld(): boolean {
  return boot()?.held ?? false;
}

/** The room may hold its frames while the loader ends (see useBootQuiet). */
export function bootQuiet(): boolean {
  return boot()?.quiet ?? false;
}
