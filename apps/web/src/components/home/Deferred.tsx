'use client';

import { Suspense, use, useEffect, useRef, useState, type CSSProperties, type ReactNode, type Usable } from 'react';
import { cn } from '@/lib/cn';

/** A thenable React's use() can read without waiting once it is settled. */
interface Gate extends PromiseLike<void> {
  status: 'pending' | 'fulfilled';
  value?: undefined;
  open: () => void;
}

function makeGate(open: boolean): Gate {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  const gate: Gate = {
    status: open ? 'fulfilled' : 'pending',
    value: undefined,
    then: (onFulfilled, onRejected) => promise.then(onFulfilled, onRejected),
    open: () => {
      if (gate.status === 'fulfilled') return;
      gate.status = 'fulfilled';
      resolve();
    },
  };
  if (open) resolve();
  return gate;
}

/**
 * Once the first page has hydrated, sections mounted later (a client-side
 * visit to this page) render straight away: there is no server markup to
 * keep, and a blank gap would jump.
 */
let hydrated = false;

/** Holds its boundary's hydration until the gate opens. Renders nothing. */
function Wait({ gate }: { gate: Gate }) {
  // A tracked thenable: its status field flips from pending to fulfilled in open().
  use(gate as unknown as Usable<void>);
  return null;
}

/**
 * A section below the first screen that costs nothing until it is near.
 *
 * The server renders it in full, so it is on the page, readable and
 * indexable from the first byte. The browser skips its layout and paint
 * while it is far away (content-visibility), and React leaves its server
 * markup as it is (a dehydrated Suspense boundary) until the reader comes
 * within `ahead` of it or reaches into it with a pointer or focus. Then it
 * hydrates in its own small task, instead of adding to the long one at load.
 * Links in it work before that, as plain links.
 */
export function Deferred({
  children,
  height = '900px',
  ahead = '1200px',
  className,
}: {
  children: ReactNode;
  /** First guess at the rendered height (the browser remembers the real one). */
  height?: string;
  /** How far before the viewport hydration starts. */
  ahead?: string;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  // Decided once: during the first hydration this is a closed gate; afterwards, open.
  const [gate] = useState(() => makeGate(typeof window === 'undefined' || hydrated));

  useEffect(() => {
    hydrated = true;
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el || gate.status === 'fulfilled') return;
    const open = () => gate.open();
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && open(), {
      rootMargin: `${ahead} 0px ${ahead} 0px`,
    });
    io.observe(el);
    el.addEventListener('pointerdown', open, { capture: true });
    el.addEventListener('focusin', open, { capture: true });
    return () => {
      io.disconnect();
      el.removeEventListener('pointerdown', open, { capture: true });
      el.removeEventListener('focusin', open, { capture: true });
    };
  }, [gate, ahead]);

  return (
    <div ref={host} className={cn('vv-defer', className)} style={{ '--defer-h': height } as CSSProperties}>
      <Suspense fallback={null}>
        <Wait gate={gate} />
        {children}
      </Suspense>
    </div>
  );
}
