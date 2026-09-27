'use client';

import { Suspense, lazy } from 'react';

const Paper = lazy(() => import('./NotOnThePaper').then((m) => ({ default: m.NotOnThePaper })));

/**
 * The 404's content. The root not-found page is part of every page's payload (it is the root
 * layout's not-found boundary), so whatever it imports directly loads on every page; through here
 * its code (the board, the red pen, the portrait) loads only when a 404 is actually shown. The
 * server still renders it in full.
 */
export function NotOnThePaperLazy() {
  return (
    <Suspense fallback={null}>
      <Paper />
    </Suspense>
  );
}
