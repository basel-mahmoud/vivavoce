/**
 * The first-visit loader's contract: what the page's code can ask of it (window.__vvBoot, created by
 * the inline controller in script.ts) and what its ending (outro.ts) is handed.
 */

/** What the ending (outro.ts) is given: the overlay, how quick to be, and when to hand back. */
export interface OutroContext {
  root: HTMLElement;
  /** A skip asked for a quick ending. */
  quick: boolean;
  tipLength: number;
  corner: number;
  portalMs: number;
  quickMs: number;
  /** The stamp has settled: the portal may open once the room runs smoothly. */
  stamped: () => void;
  /** The hero is in view: play its crescendo. */
  release: () => void;
  /** Take the overlay away and give the page back. */
  finish: () => void;
}
export interface BootOutro {
  stamp: (ctx: OutroContext) => void;
  portal: (ctx: OutroContext) => void;
}

/** What the page's code can ask of the loader (window.__vvBoot). */
export interface BootApi {
  /** The overlay is on screen (until the portal has cleared it). */
  showing: boolean;
  /** The room's opening round waits (until the overlay is gone; the room is still until then). */
  held: boolean;
  /**
   * The room has shown it runs smoothly (or the ending began without it): it may hold its frames
   * until the overlay is gone, leaving the stamp and the portal the whole GPU.
   */
  quiet: boolean;
  /** Why it shows or not (decideBoot). */
  why: string;
  /** When each milestone and stage happened (ms since navigation). */
  times: Record<string, number>;
  /** How far the check is drawn (0 to 1). */
  drawn: () => number;
  /** A milestone's progress (0 to 1) or, without a fraction, its end. */
  mark: (name: string, fraction?: number) => void;
  /** The room will not go live (no WebGL, saving data, failed): wait for the page and its poster only. */
  still: (why: string) => void;
  /**
   * `critical`: the room's downloads are in (warm the rest of the site); `quiet`: the room may hold
   * still (see quiet); `reveal`: the hero is in view and its crescendo plays; `done`: the overlay is
   * gone and the room plays on. A past event calls back at once.
   */
  on: (event: BootEvent, callback: () => void) => () => void;
  /** The stamp and the portal, handed over by the room page's code (outro.ts). */
  outro?: BootOutro;
}
export type BootEvent = 'critical' | 'quiet' | 'reveal' | 'done';
