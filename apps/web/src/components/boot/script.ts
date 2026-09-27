import { approach, decideBoot, progressOf, smoothFrame, type Milestone, type Smoothness } from './logic';
import type { BootApi, BootEvent, BootOutro, OutroContext } from './types';

/**
 * The first-visit loader ("Sounding out"): a motion piece made of the brand mark that covers a room
 * page while the page, the room's cast and its shaders load underneath, and reveals the page through
 * the mark's own square once the room runs smoothly.
 *
 * The controller is one inline script in the root layout, first thing in the body, so it runs before
 * anything is painted and before React. On every page it decides (decideBoot); on a page that opens
 * on the room it keeps the room's milestones (window.__vvBoot, see client.ts); only when it shows
 * does it build the overlay, a <vv-boot> element, as the body's first child. React never claims that
 * node (in the body it skips any node whose tag it does not expect, and it renders no vv-boot), so
 * the script drives it freely without a hydration mismatch, and without script there is no overlay.
 * It changes no attribute React renders: the scroll lock and the hold on the hero's animated type
 * are <style> elements in the head, as the font gate's are.
 *
 * The motion, in the page's paper and the mark's own colours:
 *   pen down   the check's first point in print and its tip in blue ink land on the paper;
 *   sounding   the icon's arcs ripple off the tip four at a time, each louder, the promise's "Say it
 *              out loud" (CSS on its own layers: a busy main thread never stops them);
 *   drawing    the check draws itself towards the tip in step with what has really loaded (the mark
 *              is the progress bar), eased, never backwards;
 *   stamp      at 100% the tip's blue runs back down to meet the print and the vermilion square
 *              stamps down behind the strokes;
 *   portal     once the room runs smoothly the square opens onto the page and grows past the
 *              viewport; the hero's crescendo and the room's first round begin as it clears.
 * The stamp and the portal are outro.ts, which the room page's own code hands over (it is always in
 * before the room is ready), so every page's HTML carries only what the loading itself needs.
 */

/** Pages that open on the 3D room: the only ones the loader covers. */
export const BOOT_PATHS = ['/'] as const;

/** localStorage key of the last completed load's asset key (sessionStorage `<key>-y`: the scroll left behind). */
export const BOOT_STORE = 'vv-boot';

/** What the page waits for: [name, share of the whole, creep time constant in ms (0: it reports its own progress)]. */
export const MILESTONES: readonly (readonly [string, number, number])[] = [
  // the page's own code has run (hydration)
  ['app', 12, 900],
  // the display face, the crescendo's (document.fonts)
  ['font', 4, 700],
  // the room's still, decoded
  ['poster', 4, 700],
  // the room's code (three.js and the scene)
  ['code', 18, 1400],
  // the cast (GLB), by its bytes
  ['model', 34, 0],
  // the detail maps, by count
  ['textures', 6, 0],
  // the 3D labels' two fonts, by count
  ['labels', 2, 0],
  // the cast's shader programs
  ['compile', 12, 900],
  // the room's first frames drawn and cross-faded in (data-ready)
  ['ready', 8, 600],
];

/** Milestones only a live room has: dropped when it will not go live. */
export const ROOM_ONLY = ['code', 'model', 'textures', 'labels', 'compile', 'ready'] as const;
/** The room's critical downloads: once they are in, the rest of the site may warm. */
export const CRITICAL = ['code', 'model', 'textures', 'labels'] as const;

/** Status lines, one per stage (no dashes in copy). */
export const LINES = ['Setting out the paper', 'Seating the panel', 'Warming the lamp', 'The panel is listening'] as const;

export interface BootConfig {
  paths: readonly string[];
  /** The asset key: the room's folder versions. A new version shows the loader again. */
  key: string;
  store: string;
  /** The display face's family, loaded by name (the font gate's first family). */
  face: string;
  milestones: readonly (readonly [string, number, number])[];
  roomOnly: readonly string[];
  critical: readonly string[];
  lines: readonly string[];
  /** The loading marks, in the icon's 100-unit box: the check, the tip drawn backwards, the arcs. */
  check: string;
  back: string;
  arcs: string;
  /** Shortest run, first frame to page (ms). */
  min: number;
  /** Longest wait before the page is revealed anyway (ms). */
  max: number;
  /** Input skips only after this long (ms). */
  skipAfter: number;
  /** The stamp waits for the voice's first phrase (ms). */
  stampAfter: number;
  /** Fastest the check may draw, in whole checks per second. */
  rate: number;
  /** Smoothness: steady frames needed, a steady frame's ceiling (ms), the longest watch (ms). */
  smoothNeed: number;
  smoothFloor: number;
  smoothCap: number;
  /** The portal's length, and its length after a skip (ms). */
  portalMs: number;
  quickMs: number;
  /** How much of the check the progress draws (icon units: the print stops a unit short of the tip's blue). */
  drawn: number;
  /** The tip's length and the square's corner (a share of its side), for the ending. */
  tipLength: number;
  corner: number;
}

/**
 * The controller. Its source is inlined (bootScript), so it must stay self-contained: nothing from
 * module scope, only its parameters (the config and the pure functions from logic.ts) and the
 * platform's globals.
 */
export function bootController(
  cfg: BootConfig,
  decide: typeof decideBoot,
  progress: typeof progressOf,
  ease: typeof approach,
  steady: typeof smoothFrame,
) {
  const w = window as Window & { __vvBoot?: BootApi };
  const d = document;
  const now = () => performance.now();
  const attempt = <T,>(run: () => T, fallback: T): T => {
    try {
      return run();
    } catch {
      return fallback;
    }
  };
  const verdict = decide({
    path: location.pathname,
    search: location.search,
    hash: location.hash,
    reduce: attempt(() => matchMedia('(prefers-reduced-motion: reduce)').matches, true),
    nav: attempt(() => (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type ?? 'navigate', 'navigate'),
    scrolled: attempt(() => Number(sessionStorage.getItem(`${cfg.store}-y`)) > 0, false),
    stored: attempt(() => localStorage.getItem(cfg.store), null),
    key: cfg.key,
    paths: cfg.paths,
  });
  if (!verdict.room) return;

  // a reload or a return restores the scroll: remember whether the page was left scrolled
  w.addEventListener('pagehide', () => attempt(() => sessionStorage.setItem(`${cfg.store}-y`, String(Math.round(w.scrollY))), undefined));

  /* ── Milestones ─────────────────────────────────────────────────────── */

  const M: Record<string, Milestone> = {};
  for (const [name, weight, tau] of cfg.milestones) M[name] = { w: weight, f: 0, at: -1, tau, done: false, off: false };
  M.app!.at = M.font!.at = M.poster!.at = 0;
  let still = false;
  let face = false;
  let watchFrom = -1;
  const times: Record<string, number> = {};
  const log = (name: string) => {
    if (!(name in times)) times[name] = Math.round(now());
  };
  const subs: Record<BootEvent, (() => void)[]> = { critical: [], quiet: [], reveal: [], done: [] };
  const fired: Partial<Record<BootEvent, true>> = {};
  const emit = (event: BootEvent) => {
    if (fired[event]) return;
    fired[event] = true;
    log(event);
    for (const cb of subs[event].splice(0)) attempt(cb, undefined);
  };
  const loaded = () => Object.keys(M).every((n) => M[n]!.off || M[n]!.done);
  const critical = () => still || cfg.critical.every((n) => M[n]!.done);
  const settle = () => {
    if (critical()) emit('critical');
    // the room counts its first frames once the cast's programs are ready
    if (M.compile!.done && M.ready!.at < 0) M.ready!.at = now();
    if (M.ready!.done && !still && watchFrom < 0) watchFrom = now();
    // the next visit finds all this in the cache: no loader again for this asset key
    if (loaded()) attempt(() => localStorage.setItem(cfg.store, cfg.key), undefined);
  };

  const api: BootApi = {
    showing: false,
    held: false,
    quiet: false,
    why: verdict.why,
    times,
    drawn: () => 0,
    mark(name, fraction) {
      const m = M[name];
      if (!m || m.done) return;
      if (m.at < 0) m.at = now();
      if (fraction === undefined || fraction >= 1) {
        m.done = true;
        m.f = 1;
        log(name);
        settle();
      } else if (fraction > m.f) m.f = fraction;
    },
    still(why) {
      if (still) return;
      still = true;
      log(`still:${why}`);
      for (const n of cfg.roomOnly) M[n]!.off = true;
      settle();
    },
    on(event, cb) {
      if (fired[event]) {
        queueMicrotask(cb);
        return () => {};
      }
      subs[event].push(cb);
      return () => {
        const i = subs[event].indexOf(cb);
        if (i >= 0) subs[event].splice(i, 1);
      };
    },
  };
  w.__vvBoot = api;

  // the display face (the crescendo's), loaded by name as the font gate does; a failure never blocks
  try {
    d.fonts.load(`900 1em ${cfg.face}`).then(
      (faces) => {
        face = faces.length > 0;
        api.mark('font');
      },
      () => api.mark('font'),
    );
  } catch {
    api.mark('font');
  }
  // the room's still, once the parser has reached it
  const poster = () => {
    const img = d.querySelector<HTMLImageElement>('img[data-room-poster]');
    const done = () => api.mark('poster');
    if (!img || typeof img.decode !== 'function') return done();
    img.decode().then(done, done);
  };
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', poster, { once: true });
  else poster();

  if (!verdict.show) {
    // nothing covers the page: it is revealed, and nothing waits
    emit('reveal');
    emit('done');
    return;
  }

  /* ── The overlay ────────────────────────────────────────────────────── */

  const start = now();
  api.showing = api.held = true;
  const sheet = (css: string) => {
    const s = d.createElement('style');
    s.textContent = css;
    d.head.appendChild(s);
    return s;
  };
  // the page holds still underneath (the gutter keeps its width, so nothing reflows at the end)
  const lock = sheet('html{overflow:hidden;scrollbar-gutter:stable}');
  // the hero's crescendo holds its first frame (the font gate defers to this while it shows). Set on
  // the heading alone, so letting it go mid-portal restyles that heading, not the whole page.
  const type = sheet('[data-crescendo]{--vv-type-play:paused}');
  // an element of its own kind: hydration matches nodes by tag, and nothing React renders is a vv-boot
  const el = d.createElement('vv-boot');
  el.setAttribute('aria-hidden', 'true');
  const svg = (cls: string, paths: string) => `<svg class="${cls}" viewBox="0 0 100 100" focusable="false">${paths}</svg>`;
  const path = (data: string) => `<path d="${data}"/>`;
  // the loading marks: the check, the voice's four ripples (each the icon's pair of arcs) and the tip
  const ripples = [1, 2, 3, 4].map((i) => svg(`vvb-ripple vvb-r${i}`, cfg.arcs)).join('');
  const status = cfg.lines.map((l) => `<span>${l}</span>`).join('');
  el.innerHTML = `<div class="vvb-mark"><div class="vvb-press"><div class="vvb-draw">${svg('vvb-v', path(cfg.check))}<div class="vvb-voice">${ripples}</div>${svg('vvb-tip', path(cfg.back))}</div></div></div><p class="vvb-status">${status}</p>`;
  d.body.insertBefore(el, d.body.firstChild);
  const release = () => {
    if (fired.reveal) return;
    // the crescendo plays now, on its own face; a face that never came shows the settled frame
    if (face) type.remove();
    else type.textContent = '[data-crescendo]{--vv-type-skip:-60s}';
    emit('reveal');
  };
  // the stylesheet blocks this script, so it is in by now; without it there is no loader, only the page
  if (attempt(() => getComputedStyle(el).position, '') !== 'fixed') {
    el.remove();
    lock.remove();
    type.remove();
    api.showing = api.held = false;
    log('unstyled');
    emit('reveal');
    emit('done');
    return;
  }
  const vPath = el.querySelector('.vvb-v path') as SVGPathElement;
  const lines = Array.from(el.querySelectorAll<HTMLElement>('.vvb-status span'));

  type Phase = 'load' | 'stamp' | 'wait' | 'portal' | 'done';
  let phase: Phase = 'load';
  let shown = 0;
  let forced = false;
  let quick = false;
  let line = -1;
  let lineAt = 0;
  let smooth: Smoothness = { run: 0, vsync: 0, ok: false };
  let last = start;
  api.drawn = () => shown;

  const INPUTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
  const onInput = () => {
    if (now() - start < cfg.skipAfter || quick || phase === 'portal' || phase === 'done') return;
    quick = forced = true;
    log('skip');
  };
  const setLine = (i: number) => {
    if (i === line) return;
    lines[line]?.classList.replace('on', 'off');
    lines[i]?.classList.remove('off');
    lines[i]?.classList.add('on');
    line = i;
    lineAt = now();
  };
  // the line the load has earned: the page set out, the panel's downloads in
  const stage = () => (still ? 0 : critical() ? 2 : M.app!.done && M.font!.done ? 1 : 0);
  // the room has nothing left to prove under the overlay: it may rest until the page is back. The
  // portal then waits two frames, so a slow GPU has worked through the room's last ones first.
  let hushed = -1;
  const hush = () => {
    if (hushed >= 0) return;
    hushed = 0;
    api.quiet = !still;
    emit('quiet');
  };
  const finish = () => {
    if (phase === 'done') return;
    phase = 'done';
    release();
    el.remove();
    lock.remove();
    // the room plays on: its frames, and its first round
    api.showing = api.quiet = api.held = false;
    for (const t of INPUTS) w.removeEventListener(t, onInput, true);
    emit('done');
  };
  const ctx = (): OutroContext => ({
    root: el,
    quick,
    tipLength: cfg.tipLength,
    corner: cfg.corner,
    portalMs: cfg.portalMs,
    quickMs: cfg.quickMs,
    stamped: () => {
      if (phase !== 'stamp') return;
      phase = 'wait';
      log('stamped');
    },
    release,
    finish,
  });
  // without the room page's code (late, or failed) the ending is a plain fade
  const plain: BootOutro = {
    stamp: (c) => c.stamped(),
    portal: (c) => {
      c.release();
      el.style.pointerEvents = 'none';
      attempt(() => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: 'ease-out', fill: 'forwards' }), undefined);
      w.setTimeout(c.finish, 320);
    },
  };
  const ending = () => api.outro ?? plain;

  /* ── The frame loop: the drawing, the status line, the smoothness watch ─ */

  const frame = (t: number) => {
    if (phase === 'portal' || phase === 'done') return;
    // something took the overlay away: the page is the page again
    if (!el.isConnected) return finish();
    // real time, so a slow frame rate never slows the drawing; a long stall eases in over a few frames
    const dt = Math.min(250, Math.max(0, t - last));
    last = t;
    if (watchFrom >= 0 && !smooth.ok) {
      smooth = steady(smooth, dt, cfg.smoothNeed, cfg.smoothFloor);
      if (smooth.ok) log('smooth');
      else if (now() - watchFrom > cfg.smoothCap) {
        smooth = { ...smooth, ok: true };
        log('smooth-cap');
      }
      if (smooth.ok) hush();
    }
    if (phase === 'load') {
      // restored mid-scroll after all: step aside at once
      if (w.scrollY > 2 && verdict.why !== 'intro=1') {
        log('scrolled');
        return finish();
      }
      const target = forced ? 1 : progress(M, now());
      // once everything is in, the last stretch is drawn briskly rather than eased out
      shown = ease(shown, target, dt / 1000, 0.3, quick ? 5 : cfg.rate, target >= 1 ? 0.9 : 0.1);
      vPath.style.strokeDasharray = `${Math.max(0.01, shown * cfg.drawn).toFixed(2)} 200`;
      const s = stage();
      // each line stays long enough to read; the first waits for the entrance and the face
      if (line < 0 ? now() - start > 520 && (face || now() - start > 1100) : s > line && now() - lineAt > 650) setLine(line < 0 ? s : line + 1);
      if (shown >= 1 && (quick || now() - start >= cfg.stampAfter)) {
        phase = 'stamp';
        log('stamp');
        setLine(3);
        ending().stamp(ctx());
      }
    } else if (phase === 'wait' && (forced || still || smooth.ok) && now() - start >= cfg.min - (quick ? cfg.quickMs : cfg.portalMs)) {
      hush();
      if (hushed++ >= 2) {
        phase = 'portal';
        log('portal');
        ending().portal(ctx());
        return;
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  /* ── Skip, the longest wait, a return from the back/forward cache ───── */

  for (const t of INPUTS) w.addEventListener(t, onInput, { capture: true, passive: true });
  w.setTimeout(() => {
    if (phase !== 'portal' && phase !== 'done') {
      forced = true;
      log('max');
    }
  }, cfg.max);
  w.addEventListener('pageshow', (e) => {
    if (e.persisted && api.showing) finish();
  });
}

/* The mark, in the icon's 100-unit box (app/icon.svg, components/site/Logo.tsx). */
const CHECK = 'M20 52L40 70L64 42';
/** The tip drawn backwards from its point, 2.5 units past the icon's, so its snap can overshoot. */
const TIP_BACK = 'M64 42L52.27 55.7';
const ARCS = '<path d="M59.2 29.4A13.5 13.5 0 0 1 76.6 46.8"/><path d="M56.7 22.9A20.5 20.5 0 0 1 83.1 49.3"/>';

/**
 * The inline script: the controller and the pure functions it runs, with its config. `key` is the
 * room's asset versions; `face` the display face's font stack (only its first family is loaded, as
 * in the font gate).
 */
export function bootScript({ key, face }: { key: string; face: string }): string {
  const cfg: BootConfig = {
    paths: BOOT_PATHS,
    key,
    store: BOOT_STORE,
    face: face.split(',')[0]!.trim(),
    milestones: MILESTONES,
    roomOnly: ROOM_ONLY,
    critical: CRITICAL,
    lines: LINES,
    check: CHECK,
    back: TIP_BACK,
    arcs: ARCS,
    min: 2050,
    max: 11000,
    skipAfter: 800,
    stampAfter: 960,
    rate: 1.55,
    smoothNeed: 16,
    smoothFloor: 24,
    smoothCap: 1500,
    portalMs: 820,
    quickMs: 520,
    // the check is 63.79 long: the print stops a unit short of the tip's blue
    drawn: 47.26,
    tipLength: 15.53,
    corner: 0.24,
  };
  // the config is data: escape `<` so no string in it can close the script element
  const config = JSON.stringify(cfg).replace(/</g, '\\u003c');
  const fns = [decideBoot, progressOf, approach, smoothFrame].map(String);
  return `(${String(bootController)})(${[config, ...fns].join(',')});`;
}
