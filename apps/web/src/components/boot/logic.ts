/**
 * The first-visit loader's pure parts: whether to show it, how far the page has loaded, how the
 * drawn progress follows that, and when the room is running smoothly. The inline boot script
 * (script.ts) is assembled from these functions' own source, so each one must stay self-contained:
 * no imports, nothing from module scope, only its parameters and the platform's globals.
 */

export interface BootEnv {
  path: string;
  /** location.search, with its `?` */
  search: string;
  /** location.hash, with its `#` */
  hash: string;
  /** prefers-reduced-motion: reduce */
  reduce: boolean;
  /** How the page was reached (PerformanceNavigationTiming.type). */
  nav: string;
  /** The page was left scrolled, so a reload or a return restores it mid-scroll. */
  scrolled: boolean;
  /** The asset key of the last load that completed here, if any. */
  stored: string | null;
  /** The current asset key (the room's folder versions). */
  key: string;
  /** Pages that open on the 3D room. */
  paths: readonly string[];
}

export interface BootVerdict {
  /** The page has the room (the loader's milestones are tracked). */
  room: boolean;
  /** The loader covers the page. */
  show: boolean;
  /** Why, for the timeline log. */
  why: string;
}

/**
 * Whether the loader covers this page: only a page that opens on the room, only when its assets are
 * not already cached (the stored key is the asset versions of the last completed load), never under
 * reduced motion, never over a deep link or a page restored mid-scroll. `?intro=1` forces it and
 * `?intro=0` skips it (reduced motion still wins).
 */
export function decideBoot(env: BootEnv): BootVerdict {
  const room = env.paths.indexOf(env.path) >= 0;
  if (!room) return { room, show: false, why: 'page' };
  if (env.reduce) return { room, show: false, why: 'reduce' };
  const intro = /[?&]intro=([01])(?:&|$)/.exec(env.search);
  if (intro) return { room, show: intro[1] === '1', why: `intro=${intro[1]}` };
  if (env.hash.length > 1) return { room, show: false, why: 'hash' };
  if (env.nav === 'back_forward' || (env.nav === 'reload' && env.scrolled)) return { room, show: false, why: 'restored' };
  if (env.stored === env.key) return { room, show: false, why: 'cached' };
  return { room, show: true, why: 'first' };
}

/** One thing the page waits for. */
export interface Milestone {
  /** Its share of the whole. */
  w: number;
  /** How much of it has arrived, as reported (0 to 1). */
  f: number;
  /** When it started (ms), or -1 before that. */
  at: number;
  /**
   * How an in-flight milestone that reports nothing of its own (a code chunk, a shader compile)
   * seems to advance: towards 0.9, with this time constant in ms. 0 for one that reports its bytes.
   */
  tau: number;
  done: boolean;
  /** Not waited for (the room will not go live). */
  off: boolean;
}

/**
 * How much of the page has loaded, 0 to 1: finished milestones count in full, the others by what
 * they report or, while in flight, by their creep, and none counts in full before it finishes.
 */
export function progressOf(milestones: Record<string, Milestone>, now: number): number {
  let sum = 0;
  let total = 0;
  for (const name in milestones) {
    const m = milestones[name]!;
    if (m.off) continue;
    total += m.w;
    if (m.done) {
      sum += m.w;
      continue;
    }
    let f = m.f;
    if (m.at >= 0 && m.tau > 0) f = Math.max(f, 0.9 * (1 - Math.exp(-Math.max(0, now - m.at) / m.tau)));
    sum += m.w * Math.min(0.96, Math.max(0, f));
  }
  return total > 0 ? sum / total : 1;
}

/**
 * The drawn progress, one frame on (dt in seconds): it eases towards the target (time constant
 * `lag`), never faster than `fast` or, while it has ground to make up, slower than `slow` (per
 * second), and never goes back.
 */
export function approach(shown: number, target: number, dt: number, lag: number, fast: number, slow: number): number {
  const goal = Math.min(1, target);
  if (goal <= shown || dt <= 0) return shown;
  const gap = goal - shown;
  const eased = gap * (1 - Math.exp(-dt / lag));
  return Math.min(goal, shown + Math.min(fast * dt, Math.max(eased, slow * dt)));
}

/** The smoothness watch: the current run of steady frames and the shortest frame seen. */
export interface Smoothness {
  run: number;
  /** The shortest frame interval seen (ms): the display's refresh, near enough. */
  vsync: number;
  ok: boolean;
}

/**
 * Feeds one frame interval (ms) to the smoothness watch. A frame is steady when it is under `floor`
 * ms or 1.45 refreshes of the fastest frame seen (so a 30 Hz screen can pass too); `need` steady
 * frames in a row and the room is running smoothly.
 */
export function smoothFrame(s: Smoothness, dt: number, need: number, floor: number): Smoothness {
  if (!(dt > 0)) return s;
  const vsync = Math.max(4, s.vsync > 0 ? Math.min(s.vsync, dt) : dt);
  const run = dt <= Math.max(floor, vsync * 1.45) ? s.run + 1 : 0;
  return { run, vsync, ok: s.ok || run >= need };
}

/**
 * The side of the smallest rounded square, centred at (cx, cy) with corners `k` of its side, that
 * covers the whole viewport: the portal's final size.
 */
export function coverSide(cx: number, cy: number, width: number, height: number, k: number): number {
  const dx = Math.max(cx, width - cx);
  const dy = Math.max(cy, height - cy);
  const covers = (s: number) => {
    if (dx > s / 2 || dy > s / 2) return false;
    const inset = s * (0.5 - k);
    if (dx <= inset || dy <= inset) return true;
    return (dx - inset) ** 2 + (dy - inset) ** 2 <= (k * s) ** 2;
  };
  let lo = 2 * Math.max(dx, dy);
  let hi = lo * 4;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (covers(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}
