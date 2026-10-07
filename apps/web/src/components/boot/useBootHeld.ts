import { useSyncExternalStore } from 'react';
import { bootHeld, bootQuiet, onBoot } from './client';

const onDone = (cb: () => void) => onBoot('done', cb);

/**
 * True while the first-visit loader holds what should play in view (the room's opening round):
 * until its overlay is gone. False on the server and while hydrating, so both render alike.
 */
export function useBootHeld(): boolean {
  return useSyncExternalStore(onDone, bootHeld, () => false);
}

const onQuiet = (cb: () => void) => {
  const quiet = onBoot('quiet', cb);
  const done = onBoot('done', cb);
  return () => {
    quiet();
    done();
  };
};

/**
 * True while the room may hold its frames: it has shown the loader it runs smoothly and the loader
 * is ending (its stamp and portal then have the GPU to themselves). The room draws again as the
 * overlay goes. False on the server and while hydrating.
 */
export function useBootQuiet(): boolean {
  return useSyncExternalStore(onQuiet, bootQuiet, () => false);
}
