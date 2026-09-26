'use client';

import { useEffect, useState } from 'react';

/**
 * True once the page's web fonts have loaded. Marks that measure words (the
 * red pen, the highlighter) wait for it: a mark drawn on the fallback face
 * would miss the words once Archivo arrives, and inline words do not report
 * a resize.
 */
export function useFontsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    void Promise.resolve(typeof document !== 'undefined' ? document.fonts?.ready : undefined).then(() => {
      if (live) setReady(true);
    });
    return () => {
      live = false;
    };
  }, []);
  return ready;
}
