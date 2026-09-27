'use client';

import { lazy, useEffect, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { bootShowing, onBoot } from '@/components/boot/client';

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
 * Fetches the named sections' code, in page order, then the named routes (a quick look at the nav's
 * pages), once the page has loaded and the browser has a quiet moment, so a reader who scrolls or
 * moves on finds them ready. Under the first-visit loader (components/boot) it starts as soon as the
 * room's own downloads are in, while the loader still covers the page, so all of it is ready by the
 * reveal without taking bandwidth from the room. Renders nothing. Skipped when the visitor asks to
 * save data: then each section loads only as it comes near.
 */
export function WarmSections({ names, routes = [] }: { names: readonly SectionName[]; routes?: readonly string[] }) {
  const key = names.join(',');
  const paths = routes.join(',');
  const router = useRouter();
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;
    let idle = 0;
    let timer = 0;
    let alive = true;
    const warm = () =>
      key
        .split(',')
        .reduce<Promise<unknown>>(
          (prev, name) => prev.then(() => SECTIONS[name as SectionName]?.().catch(() => {})),
          Promise.resolve(),
        )
        .then(() => {
          if (!alive) return;
          for (const path of paths.split(',')) if (path) router.prefetch(path);
        });
    const soon = (delay: number) => {
      timer = window.setTimeout(() => {
        if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(warm, { timeout: 5000 });
        else warm();
      }, delay);
    };
    const start = () => soon(1500);
    const off = bootShowing() ? onBoot('critical', () => soon(0)) : null;
    if (!off) {
      if (document.readyState === 'complete') start();
      else window.addEventListener('load', start, { once: true });
    }
    return () => {
      alive = false;
      off?.();
      window.removeEventListener('load', start);
      window.clearTimeout(timer);
      if (idle) window.cancelIdleCallback(idle);
    };
  }, [key, paths, router]);
  return null;
}
