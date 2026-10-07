import { coverSide } from './logic';
import type { BootApi, BootOutro, OutroContext } from './types';

/**
 * The first-visit loader's ending, the stamp and the portal. The loader itself is an inline script
 * (script.ts) that must run before anything else, so it carries only what the loading needs; this
 * ending comes with the room page's own code (RoomStory installs it as its module runs), which is
 * always in before the room reports ready. Should the page's code be late (the longest wait, or a
 * skip before it arrives), the loader fades out on its own instead.
 */

/* The icon's strokes, in its 100-unit box (app/icon.svg, components/site/Logo.tsx). */
const V = 'M20 52L40 70L64 42';
const TIP = 'M53.9 53.8L64 42';
const ARC_IN = 'M59.2 29.4A13.5 13.5 0 0 1 76.6 46.8';
const ARC_OUT = 'M56.7 22.9A20.5 20.5 0 0 1 83.1 49.3';

const svg = (cls: string, inner: string) => `<svg class="${cls}" viewBox="0 0 100 100" focusable="false">${inner}</svg>`;

/** A cubic-bezier easing as a function, for motion drawn frame by frame rather than by the browser. */
export function bezier(x1: number, y1: number, x2: number, y2: number) {
  const bx = 3 * (x2 - x1) - 3 * x1;
  const ax = 1 - 3 * x1 - bx;
  const by = 3 * (y2 - y1) - 3 * y1;
  const ay = 1 - 3 * y1 - by;
  return (t: number) => {
    let u = t;
    for (let i = 0; i < 8; i++) {
      const miss = ((ax * u + bx) * u + 3 * x1) * u - t;
      const slope = (3 * ax * u + 2 * bx) * u + 3 * x1;
      if (Math.abs(miss) < 1e-5 || Math.abs(slope) < 1e-6) break;
      u = Math.min(1, Math.max(0, u - miss / slope));
    }
    return ((ay * u + by) * u + 3 * y1) * u;
  };
}

function play(target: Element, frames: Keyframe[], duration: number, delay = 0, easing = 'linear', fill: FillMode = 'both') {
  return target.animate(frames, { duration, delay, easing, fill });
}

/**
 * The stamp: the tip's blue runs back down the check to meet the print, the voice falls quiet and
 * its two arcs hold, and the vermilion square comes down behind the strokes: fast and whole, under a
 * shadow that tightens as it falls, then a squash, a jolt through the paper and a settle.
 */
function stamp(ctx: OutroContext) {
  const { root, quick, tipLength } = ctx;
  const q = <T extends Element>(s: string) => root.querySelector(s) as T;
  const mark = q<HTMLElement>('.vvb-mark');
  const press = q<HTMLElement>('.vvb-press');
  const draw = q<HTMLElement>('.vvb-draw');
  const tip = q<SVGElement>('.vvb-tip');
  mark.insertAdjacentHTML('afterbegin', '<i class="vvb-shadow"></i><i class="vvb-stamp"></i>');
  draw.insertAdjacentHTML('beforeend', svg('vvb-arcs', `<path d="${ARC_IN}"/><path d="${ARC_OUT}"/>`));
  press.insertAdjacentHTML(
    'beforeend',
    svg('vvb-icon', `<path class="c" d="${V}"/><path class="b" d="${TIP}"/><path class="a" d="${ARC_IN}"/><path class="a" d="${ARC_OUT}"/>`),
  );
  const k = quick ? 0.6 : 1;

  // the tip stops speaking where it is and eases home
  let pulse = 1;
  try {
    pulse = new DOMMatrix(getComputedStyle(tip).transform).a || 1;
  } catch {
    // no matrix to read: it is at rest
  }
  tip.getAnimations().forEach((a) => a.cancel());
  play(tip, [{ transform: `scale(${pulse})` }, { transform: 'scale(1)' }], 90, 0, 'ease-out', 'none');
  // its blue runs back down the check to meet the print, a touch too far, and settles
  play(
    q('.vvb-tip path'),
    [{ strokeDasharray: '0.01 200' }, { strokeDasharray: `${tipLength + 2.2} 200`, offset: 0.62 }, { strokeDasharray: `${tipLength} 200` }],
    180 * k,
    0,
    'cubic-bezier(.3,.8,.35,1)',
  );
  // the voice falls quiet; its two arcs hold where the icon has them
  play(q('.vvb-voice'), [{ opacity: 1 }, { opacity: 0 }], 140 * k, 0, 'ease-out');
  play(q('.vvb-arcs'), [{ opacity: 0, transform: 'scale(.84)' }, { opacity: 1, transform: 'scale(1)' }], 240 * k, 20 * k, 'cubic-bezier(.2,.9,.3,1.25)');

  // the square comes down in 100ms, accelerating all the way (no hanging in the air), lands at
  // 200ms, and gives a little
  const hit = 200 * k;
  const drop = 100 * k;
  const give = 300 * k;
  const square = q<HTMLElement>('.vvb-stamp');
  play(
    square,
    [
      { opacity: 0, transform: 'scale(1.5)' },
      { opacity: 0.9, transform: 'scale(1.36)', offset: 0.3, easing: 'cubic-bezier(.55,.085,.68,.53)' },
      { opacity: 1, transform: 'scale(.94)' },
    ],
    drop,
    hit - drop,
    'linear',
    // hidden until it falls (the stylesheet has it at 0), never hanging in the air half-seen
    'forwards',
  );
  play(
    square,
    [
      { transform: 'scale(.94)', easing: 'cubic-bezier(.2,.75,.35,1)' },
      { transform: 'scale(1.022)', offset: 0.27, easing: 'cubic-bezier(.45,0,.55,1)' },
      { transform: 'scale(.996)', offset: 0.6, easing: 'cubic-bezier(.45,0,.55,1)' },
      { transform: 'scale(1)' },
    ],
    give,
    hit,
    'linear',
    'forwards',
  );
  // its shadow: wide and soft while it is high, tight as it comes down, gone on contact
  play(
    q('.vvb-shadow'),
    [
      { opacity: 0, transform: 'translate3d(0,12%,0) scale(1.45)' },
      { opacity: 0.6, transform: 'translate3d(0,7%,0) scale(1.2)', offset: 0.55 },
      { opacity: 1, transform: 'translate3d(0,2%,0) scale(1)', offset: 0.96 },
      { opacity: 0, transform: 'translate3d(0,0,0) scale(.94)' },
    ],
    hit - 40 * k,
    40 * k,
    'cubic-bezier(.5,0,.9,.6)',
  );
  // the strokes rise to meet it and take the blow
  const span = hit + give;
  play(
    press,
    [
      { transform: 'scale(1)', easing: 'cubic-bezier(.25,.7,.4,1)' },
      { transform: 'scale(1.035)', offset: (hit - 50 * k) / span, easing: 'cubic-bezier(.6,0,1,.6)' },
      { transform: 'scale(1.03)', offset: hit / span, easing: 'cubic-bezier(.2,.8,.3,1)' },
      { transform: 'scale(.968)', offset: (hit + 50 * k) / span, easing: 'cubic-bezier(.4,0,.5,1)' },
      { transform: 'scale(1.006)', offset: (hit + 150 * k) / span, easing: 'ease-in-out' },
      { transform: 'scale(1)' },
    ],
    span,
  );
  // the paper takes the weight: a small jolt through the whole mark
  play(
    mark,
    [{ transform: 'none' }, { transform: 'translate3d(0,2px,0)', offset: 0.22 }, { transform: 'translate3d(0,-.6px,0)', offset: 0.55 }, { transform: 'none' }],
    130 * k,
    hit,
    'ease-out',
    'none',
  );
  // on the square the strokes take the icon's own colours (on night paper they were lifted): a cut
  // on the frame of contact, hidden in the impact, never a fade through grey
  play(q('.vvb-icon'), [{ opacity: 0 }, { opacity: 1 }], 1, hit);
  play(draw, [{ opacity: 1 }, { opacity: 0 }], 1, hit);
  // a beat on the finished mark before the portal
  window.setTimeout(ctx.stamped, hit + (quick ? give * 0.4 : give + 80));
}

/**
 * The portal: the strokes lift off the square towards the viewer, a window opens in the square onto
 * the page, and the square, now a thin vermilion rim, grows past the viewport's corners while the
 * page behind comes up to meet the viewer. Drawn frame by frame as an SVG mask: one SVG masks the
 * same everywhere (CSS masks by reference do not, in Safari).
 */
function portal(ctx: OutroContext) {
  const { root, quick, corner: k } = ctx;
  const stampEl = root.querySelector<HTMLElement>('.vvb-stamp');
  const box = stampEl?.getBoundingClientRect();
  if (!box || !(box.width > 0)) return ctx.finish();
  root.insertAdjacentHTML(
    'afterbegin',
    '<svg class="vvb-portal" focusable="false"><defs><mask id="vvb-hole" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%"><rect width="100%" height="100%" fill="#fff"/><rect class="vvb-hole" fill="#000"/></mask></defs><g mask="url(#vvb-hole)"><rect class="vvb-paper" width="100%" height="100%"/><rect class="vvb-verm"/></g></svg>',
  );
  const hole = root.querySelector<SVGRectElement>('.vvb-hole')!;
  const verm = root.querySelector<SVGRectElement>('.vvb-verm')!;
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  const s0 = box.width;
  // the frame left around the window: the whole square at first, then a thin rim
  const rim = Math.max(5, s0 * 0.07);
  const covered = coverSide(cx, cy, window.innerWidth, window.innerHeight, k);
  const zoom = Math.log((covered + 2 * rim + 24) / s0);
  const ms = quick ? ctx.quickMs : ctx.portalMs;
  // the camera: gathers pace while the strokes lift off, travels mid-way, eases off past the edges
  const grow = bezier(0.62, 0.02, 0.22, 1);
  // the window opens inside the square in a quarter of the move
  const open = bezier(0.25, 0.6, 0.3, 1);
  const place = (r: SVGRectElement, side: number, radius: number) => {
    r.setAttribute('x', (cx - side / 2).toFixed(2));
    r.setAttribute('y', (cy - side / 2).toFixed(2));
    r.setAttribute('width', side.toFixed(2));
    r.setAttribute('height', side.toFixed(2));
    r.setAttribute('rx', radius.toFixed(2));
  };
  place(verm, s0, s0 * k);
  place(hole, 0, 0);
  root.classList.add('vvb-open');

  // the strokes lift off the square towards the viewer and are gone before the window opens
  play(
    root.querySelector('.vvb-press')!,
    [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.55)', opacity: 0.18, offset: 0.8 }, { transform: 'scale(1.8)', opacity: 0 }],
    ms * 0.2,
    0,
    'cubic-bezier(.45,0,.75,.45)',
  );
  play(root.querySelector('.vvb-status')!, [{ opacity: 1 }, { opacity: 0, transform: 'translate3d(0,.4em,0)' }], 160, 0, 'ease-out');
  // behind the window the page comes up to meet the viewer and settles: the depth of the move. Only
  // what shows at the top of the page moves (the nav and the room's stage, a viewport each), scaled
  // about the window's centre by the transform alone, so no attribute of React's changes.
  for (const part of Array.from(document.querySelectorAll<HTMLElement>('body > header, [data-room-stage]'))) {
    const r = part.getBoundingClientRect();
    const x = (cx - r.left - r.width / 2).toFixed(1);
    const y = (cy - r.top - r.height / 2).toFixed(1);
    const about = (scale: number) => `translate(${x}px,${y}px) scale(${scale}) translate(${-x}px,${-y}px)`;
    play(part, [{ transform: about(0.955) }, { transform: about(1) }], ms * 1.05, 0, 'cubic-bezier(.25,.55,.2,1)', 'none');
  }

  const t0 = performance.now();
  const tick = () => {
    if (!root.isConnected) return;
    const t = Math.min(1, (performance.now() - t0) / ms);
    const side = s0 * Math.exp(zoom * grow(t));
    // the window opens once the strokes have lifted off, and leaves a thin rim within a quarter
    const frame = s0 / 2 + (rim - s0 / 2) * open(Math.min(1, Math.max(0, t - 0.13) / 0.24));
    const inner = Math.max(0, side - 2 * frame);
    place(verm, side, side * k);
    // concentric corners keep the rim even, and a window just opening is a small rounded square
    place(hole, inner, Math.max(side * k - frame, inner * k));
    // the hero comes into view: its crescendo and the room's first round begin
    if (t >= 0.58) ctx.release();
    // the page is whole once the window covers it: no need to wait for the rim to ease off
    if (t >= 1 || (t > 0.5 && inner >= covered)) ctx.finish();
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export const outro: BootOutro = { stamp, portal };

/** Hands the loader its ending, if it is covering this page. Safe anywhere; runs once per page. */
export function installOutro() {
  if (typeof window === 'undefined') return;
  const boot = (window as Window & { __vvBoot?: BootApi }).__vvBoot;
  if (boot && !boot.outro) boot.outro = outro;
}
