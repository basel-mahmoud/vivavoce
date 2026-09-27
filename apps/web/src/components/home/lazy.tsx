'use client';

import { lazy, useEffect, type ComponentType } from 'react';

type Module<P> = { default: ComponentType<P> };

/** One retry after a short pause covers a dropped connection; a second failure goes to the section's boundary. */
function retry<T>(load: () => Promise<T>): Promise<T> {
  return load().catch(
    () =>
      new Promise<T>((resolve, reject) => {
        window.setTimeout(() => load().then(resolve, reject), 1500);
      }),
  );
}

/**
 * A section whose code is not part of the first load. The server still renders it in full (so it is
 * readable, indexable and styled from the first byte), and the browser fetches its code only when
 * the section is about to hydrate (inside a `Deferred`, as it comes near) or, with `WarmSections`,
 * once the page goes quiet after the first screen, whichever comes first. Until then its server
 * markup simply stays. Global and Tailwind styles cover every section; a CSS module that a section
 * imports must also be imported by the page itself (see `engine.module.css` in the pages that show
 * the live engine), so its server markup is styled before the code arrives.
 */
function section<P extends object>(load: () => Promise<ComponentType<P>>) {
  let pending: Promise<Module<P>> | null = null;
  const preload = () =>
    (pending ??= retry(load).then(
      (component) => ({ default: component }),
      (error: unknown) => {
        // let a later render try again rather than keep a failed download
        pending = null;
        throw error;
      },
    ));
  const Lazy = lazy(preload);
  function Section(props: P) {
    return <Lazy {...props} />;
  }
  return Object.assign(Section, { preload });
}

export const LiveEngine = section(() => import('@/components/engine/LiveEngine').then((m) => m.LiveEngine));
export const Modes = section(() => import('./Modes').then((m) => m.Modes));
export const Subjects = section(() => import('./Subjects').then((m) => m.Subjects));
export const Rooms = section(() => import('./Rooms').then((m) => m.Rooms));

const SECTIONS: Record<'engine' | 'modes' | 'subjects' | 'rooms', () => Promise<unknown>> = {
  engine: LiveEngine.preload,
  modes: Modes.preload,
  subjects: Subjects.preload,
  rooms: Rooms.preload,
};
export type SectionName = keyof typeof SECTIONS;

/**
 * Fetches the named sections' code, in page order, once the page has loaded and the browser has a
 * quiet moment, so a reader who scrolls finds them ready. Renders nothing. Skipped when the visitor
 * asks to save data: then each section loads only as it comes near.
 */
export function WarmSections({ names }: { names: readonly SectionName[] }) {
  const key = names.join(',');
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;
    let idle = 0;
    let timer = 0;
    const warm = () =>
      key
        .split(',')
        .reduce<Promise<unknown>>(
          (prev, name) => prev.then(() => SECTIONS[name as SectionName]?.().catch(() => {})),
          Promise.resolve(),
        );
    const start = () => {
      timer = window.setTimeout(() => {
        if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(warm, { timeout: 5000 });
        else warm();
      }, 1500);
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      window.removeEventListener('load', start);
      window.clearTimeout(timer);
      if (idle) window.cancelIdleCallback(idle);
    };
  }, [key]);
  return null;
}
