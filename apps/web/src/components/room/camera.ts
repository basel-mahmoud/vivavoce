import * as THREE from 'three';
import { BENCH_LABELS, EXAMINERS, POSES, SEATS, VISORS, type ExaminerKey } from './examiners/rig';
import type { ShotKind, ShotName } from './story';
import { SHOT_KIND } from './story';

/* ── The fitted frame: solved per aspect ratio, never hand-tuned ─────── */

export interface Pose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  /** vertical field of view, degrees */
  fov: number;
  /** lens shift as a fraction of the frame: +x moves the subject right, +y down */
  sx: number;
  sy: number;
  kind: ShotKind;
  /** world point the depth of field focuses on (close-ups and the shoulder shot) */
  focus: THREE.Vector3;
}

/** The part of the frame left free by the captions, as fractions (x right, y down). */
export interface Region {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const scratch = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
const probe = new THREE.Vector3();

/**
 * Finds the nearest camera distance along `dir` at which every point fits the region, then
 * lens-shifts so the points sit centred in it (or pinned to its top). Holds at any aspect ratio,
 * so nothing the story needs is ever cropped or covered by a caption.
 */
export function frame(
  points: THREE.Vector3[],
  look: THREE.Vector3,
  dir: THREE.Vector3,
  aspect: number,
  r: Region,
  fov: number,
  align: 'center' | 'top' | 'bottom' = 'center',
): Omit<Pose, 'kind' | 'focus'> {
  scratch.fov = fov;
  scratch.aspect = aspect;
  scratch.updateProjectionMatrix();
  const d = dir.clone().normalize();
  const measure = (dist: number) => {
    scratch.position.copy(look).addScaledVector(d, dist);
    scratch.lookAt(look);
    scratch.updateMatrixWorld();
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const p of points) {
      probe.copy(p).project(scratch);
      const fx = (probe.x + 1) / 2;
      const fy = (1 - probe.y) / 2;
      x0 = Math.min(x0, fx);
      x1 = Math.max(x1, fx);
      y0 = Math.min(y0, fy);
      y1 = Math.max(y1, fy);
    }
    return { x0, x1, y0, y1 };
  };
  let lo = 0.6;
  let hi = 180;
  for (let k = 0; k < 36; k++) {
    const mid = (lo + hi) / 2;
    const b = measure(mid);
    // a point behind the camera projects nonsense; treat it as not fitting
    if (b.x1 - b.x0 <= r.x1 - r.x0 && b.y1 - b.y0 <= r.y1 - r.y0 && Number.isFinite(b.x0)) hi = mid;
    else lo = mid;
  }
  const b = measure(hi);
  const sy =
    align === 'top' ? r.y0 - b.y0 : align === 'bottom' ? r.y1 - b.y1 : (r.y0 + r.y1) / 2 - (b.y0 + b.y1) / 2;
  return {
    pos: look.clone().addScaledVector(d, hi),
    look: look.clone(),
    fov,
    sx: (r.x0 + r.x1) / 2 - (b.x0 + b.x1) / 2,
    sy,
  };
}

/* ── The cast, as points (world units, from the build's measurements) ─ */

/** Shell widths from scripts/examiners/build_report.json (rig.width). */
const WIDTH: Record<ExaminerKey, number> = {
  correctness: 1.26,
  clarity: 0.94,
  structure: 1.08,
  conciseness: 0.68,
  confidence: 1.73,
};

/** A point in an examiner's seat frame (x right, y up, z toward the candidate) to world. */
export function seatToWorld(key: ExaminerKey, x: number, y: number, z: number, out = new THREE.Vector3()) {
  const s = SEATS[key];
  const c = Math.cos(s.yaw);
  const sn = Math.sin(s.yaw);
  return out.set(s.position[0] + x * c + z * sn, s.position[1] + y, s.position[2] - x * sn + z * c);
}

/** The examiner's name inlaid on the bench apron (world corners). */
export function labelPoints(key: ExaminerKey): THREE.Vector3[] {
  const l = BENCH_LABELS[key];
  const c = Math.cos(l.yaw);
  const sn = Math.sin(l.yaw);
  return [-0.5, 0.5].flatMap((dx) => [-0.09, 0.09].map((dy) => V(l.pos[0] + dx * c, l.pos[1] + dy, l.pos[2] - dx * sn)));
}

export function visorCentre(key: ExaminerKey, out = new THREE.Vector3()) {
  const v = VISORS[key].centre;
  return seatToWorld(key, v[0], v[1], v[2], out);
}

/** The shell above the bench line (hands resting on the bench are inside it). */
export function bodyPoints(key: ExaminerKey, from = -0.02): THREE.Vector3[] {
  const w = WIDTH[key] / 2;
  const top = SEATS[key].top;
  const pts: THREE.Vector3[] = [];
  for (const x of [-w, w]) for (const z of [-0.42, 0.62]) for (const y of [from, top]) pts.push(seatToWorld(key, x, y, z));
  return pts;
}

/** The visor and the head around it, scaled: 1 is the glass alone. */
export function headPoints(key: ExaminerKey, sx = 1.5, syUp = 2.2, syDown = 1.6): THREE.Vector3[] {
  const v = VISORS[key];
  const [cx, cy, cz] = v.centre;
  const pts: THREE.Vector3[] = [];
  for (const x of [-v.halfWidth * sx, v.halfWidth * sx]) {
    for (const y of [-v.halfHeight * syDown, v.halfHeight * syUp]) pts.push(seatToWorld(key, cx + x, cy + y, cz));
  }
  return pts;
}

/** A raised coin (world centre) with room for its rim and the mitten under it. */
export function coinPoints(c: THREE.Vector3, r = 0.25): THREE.Vector3[] {
  return [V(c.x - r, c.y - r, c.z), V(c.x + r, c.y + r, c.z), V(c.x - r, c.y + r, c.z), V(c.x + r, c.y - r, c.z), V(c.x, c.y - 0.45, c.z + 0.1)];
}

/** Clarity's loupe held to its eye, in world space. */
export function loupeCentre(out = new THREE.Vector3()) {
  const h = POSES.loupe.R as { coin: readonly [number, number, number] };
  return seatToWorld('clarity', h.coin[0], h.coin[1], h.coin[2], out);
}

/* ── Where each paddle goes up, per layout and shot ───────────────────── */

type Coins = readonly (readonly [number, number, number])[];

/**
 * Hero and outro: a crown of marks that clears every face, the weakest held low beside its
 * speaker. The outer two raise theirs inboard, so the panel can bleed off the frame's right edge
 * while every mark stays in it.
 */
export const HERO_COINS: Coins = [
  [-1.98, 1.84, -0.34],
  [-1.36, 2.02, -0.55],
  [0.6, 0.98, -0.42],
  [1.3, 1.98, -0.6],
  [1.76, 1.58, -0.32],
];
/** Phones frame the middle three large; the outer two raise their marks inboard and high. */
export const HERO_COINS_COMPACT: Coins = [
  [-1.86, 1.98, -0.3],
  [-1.2, 2.3, -0.5],
  [0.6, 0.98, -0.42],
  [1.24, 2.24, -0.55],
  [1.84, 1.78, -0.3],
];
/** A beat's examiner holds its mark near its face, turned to the camera. */
export const BEAT_COINS: Coins = [
  [-2.28, 1.46, -0.22],
  [-1.3, 2.14, -0.6],
  [0.62, 1.0, -0.3],
  [1.36, 1.74, -0.5],
  [2.26, 1.38, -0.24],
];

export const coinVec = (c: readonly [number, number, number]) => V(c[0], c[1], c[2]);

/* ── The shots ────────────────────────────────────────────────────────── */

/** Where the DOM captions end on compact layouts, as fractions of the stage height. */
export interface Insets {
  hero: number;
  beat: number;
  outro: number;
  /** Where the transcript slip begins under the room on compact layouts (1: not there). */
  floor: number;
  /** Height of the examiner's note over the panel, in px (0 or absent: not measured yet). */
  tag?: number;
}

export interface ShotSet {
  poses: Record<ShotName, Pose>;
  compact: boolean;
  /** Where the candidate's mic stands in the shoulder shot (a soft foreground). */
  mic: { position: THREE.Vector3; quaternion: THREE.Quaternion };
}

const cast = (from = -0.02) => EXAMINERS.flatMap((k) => bodyPoints(k, from));

function withKind(name: ShotName, p: Omit<Pose, 'kind' | 'focus'>, focus: THREE.Vector3): Pose {
  return { ...p, kind: SHOT_KIND[name], focus };
}

/**
 * Every stop of the story, fitted to the aspect ratio and the captions. Compact (captions on top)
 * is the same test the DOM layout uses: portrait-ish or narrower than 600px.
 */
export function makeShots(aspect: number, insets: Insets, width = Infinity): ShotSet {
  const compact = aspect < 1.05 || width < 600;
  // compact: every stop between the captions and the slip (and so above the ruler under it); the
  // hero and the outro keep a slot above the panel for the examiner's note (its own height, plus
  // the gap to the copy above and to the marks below), so the note never covers a mark
  const floor = Math.min(1, insets.floor);
  const stageH = Number.isFinite(width) ? width / aspect : 900;
  const tagRoom = ((insets.tag || 80) + 44) / stageH;
  // wide: nothing the story needs goes under the nav, however short the screen, and the hero keeps
  // the note's room between the nav and the marks; a short screen (a phone held sideways) lets the
  // bench come down toward the bottom edge instead of shrinking the panel further
  const navClear = Number.isFinite(width) ? Math.min(0.3, 78 / stageH) : 0;
  const short = stageH <= 540;
  // where the exam sheet's edge lies on wide layouts (room.module.css .sheet)
  const sheet = short ? 0.5 : 0.46;
  const heroTop = Math.max(0.22, navClear + ((insets.tag || 80) + 26) / stageH);
  const R = compact
    ? {
        hero: { x0: 0.03, x1: 0.97, y0: insets.hero + tagRoom, y1: 0.93 },
        beat: { x0: 0.06, x1: 0.94, y0: insets.beat + 0.04, y1: Math.min(0.86, floor - 0.025) },
        close: { x0: 0.1, x1: 0.9, y0: insets.beat + 0.05, y1: Math.min(0.84, floor - 0.03) },
        outro: { x0: 0.04, x1: 0.96, y0: insets.outro + tagRoom, y1: Math.min(0.9, floor - 0.02) },
        handoff: { x0: 0.04, x1: 0.96, y0: insets.outro + 0.05, y1: Math.min(0.9, floor - 0.02) },
      }
    : {
        // the panel bleeds off the right edge (the lamp, the bench end, Confidence's headset)
        hero: { x0: 0.465, x1: 1.02, y0: heroTop, y1: short ? 0.86 : 0.74 },
        // right of the exam sheet's edge (46%, or 50% on a short screen)
        beat: { x0: sheet + 0.06, x1: 0.94, y0: Math.max(0.15, navClear), y1: 0.85 },
        close: { x0: sheet + 0.06, x1: 0.93, y0: Math.max(0.16, navClear), y1: 0.84 },
        outro: { x0: sheet + 0.04, x1: 0.99, y0: Math.max(0.25, heroTop), y1: short ? 0.86 : 0.76 },
        handoff: { x0: sheet + 0.04, x1: 0.97, y0: Math.max(0.2, navClear), y1: 0.86 },
      };

  const coinsHero = (compact ? HERO_COINS_COMPACT : HERO_COINS).map(coinVec);
  const coinsBeat = BEAT_COINS.map(coinVec);
  const visor = EXAMINERS.map((k) => visorCentre(k));

  // Hero: the whole panel from the hot seat, with headroom for the examiner's margin note.
  // phones frame the middle three large and the apron under them, so the guidance line below
  // the room never lands on the bench
  const apron = [-1.2, 1.2].flatMap((x) => [V(x, -0.5, 0.45), V(x, -0.5, 0.2)]);
  const heroPts = compact
    ? [
        ...(['clarity', 'structure', 'conciseness'] as const).flatMap((k) => bodyPoints(k)),
        ...coinsHero.flatMap((c) => coinPoints(c)),
        ...apron,
      ]
    : [...cast(), ...coinsHero.flatMap((c) => coinPoints(c))];
  const hero = compact
    ? frame(heroPts, V(0, 1.0, -0.6), V(0, 0.14, 1), aspect, R.hero, 26, 'bottom')
    : frame(heroPts, V(0, 1.05, -0.5), V(0.03, 0.12, 1), aspect, R.hero, 22, 'bottom');

  // Beats: longer lenses from where nothing stands between the lens and the face, so a close-up
  // is a face and not a neighbour's shoulder. Beat 0, Correctness, a medium from the front left.
  const b0 = frame(
    [...bodyPoints('correctness'), ...coinPoints(coinsBeat[0]!), ...labelPoints('correctness')],
    V(-1.8, 0.75, -0.4),
    V(-0.3, 0.1, 1),
    aspect,
    R.beat,
    compact ? 22 : 16,
  );
  // Beat 1, Clarity, a close-up from the right (Correctness, in front, slides out of frame):
  // the face, the loupe on its eye and the mark beside it.
  const lens = loupeCentre();
  const b1 = frame(
    [...headPoints('clarity', 1.3, 2.3, 1.4), lens.clone().add(V(0.15, -0.15, 0)), ...coinPoints(coinsBeat[1]!, 0.22)],
    visor[1]!.clone(),
    V(0.42, 0.12, 1),
    aspect,
    R.close,
    compact ? 16 : 12,
  );
  // Beat 2, Structure, over the candidate's shoulder: straight from the hot seat at eye level,
  // the mic soft in the near corner.
  const b2 = frame(
    [...bodyPoints('structure', 0.25), ...coinPoints(coinsBeat[2]!)],
    V(0.05, 1.05, -0.6),
    V(0.05, 0.04, 1),
    aspect,
    R.beat,
    compact ? 24 : 18,
  );
  // Beat 3, Conciseness, a close-up from below and to the right: the metronome over the face, its
  // needle's tip in frame at either end of the swing.
  const b3 = frame(
    [
      ...headPoints('conciseness', 1.7, 2.4, 1.5),
      seatToWorld('conciseness', -0.12, 2.44, -0.1),
      seatToWorld('conciseness', 0.12, 2.44, -0.1),
      ...coinPoints(coinsBeat[3]!, 0.23),
    ],
    visor[3]!.clone().add(V(0, 0.2, 0)),
    V(0.22, -0.12, 1),
    aspect,
    R.close,
    compact ? 18 : 13,
  );
  // Beat 4, Confidence, a medium from the front right.
  const b4 = frame(
    [...bodyPoints('confidence'), ...coinPoints(coinsBeat[4]!), ...labelPoints('confidence')],
    V(1.8, 0.6, -0.4),
    V(0.32, 0.1, 1),
    aspect,
    R.beat,
    compact ? 22 : 16,
  );
  // The bench's front edge at the floor: compact layouts keep the whole bench above the slip, so
  // no inlay is ever cut mid-word by the paper.
  const bench = compact ? [V(0, -0.5, 0.18), V(-1.84, -0.5, 0.71), V(1.84, -0.5, 0.71)] : [];
  // Outro: the marked panel, a little higher, the bench top in view.
  const outroPts = [...cast(-0.1), ...coinsHero.flatMap((c) => coinPoints(c)), ...bench];
  const outro = frame(outroPts, V(0, 0.95, -0.5), V(0.02, 0.2, 1), aspect, R.outro, compact ? 30 : 23, compact ? 'center' : 'bottom');
  // Hand-off: paddles down, the five turn to you; the camera settles in closer on the faces.
  const handoff = frame(
    [...EXAMINERS.flatMap((k) => headPoints(k, 1.3, 2.6, 2.2)), ...cast(0.2), ...bench],
    V(0, 1.0, -0.6),
    V(0, 0.14, 1),
    aspect,
    R.handoff,
    compact ? 26 : 20,
  );

  const poses: Record<ShotName, Pose> = {
    hero: withKind('hero', hero, visor[2]!),
    beat0: withKind('beat0', b0, visor[0]!),
    beat1: withKind('beat1', b1, visor[1]!),
    beat2: withKind('beat2', b2, visor[2]!),
    beat3: withKind('beat3', b3, visor[3]!),
    beat4: withKind('beat4', b4, visor[4]!),
    outro: withKind('outro', outro, visor[2]!),
    handoff: withKind('handoff', handoff, visor[2]!),
  };

  // The mic: a soft foreground in the frame's lower left, its head turned to Structure.
  scratch.fov = b2.fov;
  scratch.aspect = aspect;
  scratch.position.copy(b2.pos);
  scratch.lookAt(b2.look);
  scratch.setViewOffset(aspect, 1, -b2.sx * aspect, -b2.sy, aspect, 1);
  scratch.updateMatrixWorld();
  const at = compact ? V(-0.5, -0.84, 0.5) : V(0.16, -0.78, 0.5);
  const ray = at.unproject(scratch).sub(b2.pos).normalize();
  const micPos = b2.pos.clone().addScaledVector(ray, compact ? 2.6 : 3.3);
  // tilted up at the speaker, so from behind the lens reads its profile, not its end
  const aimAt = visor[2]!.clone().sub(micPos).normalize();
  const micQuat = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), aimAt.add(V(0.35, 1.1, 0)).normalize());
  scratch.clearViewOffset();

  return { poses, compact, mic: { position: micPos, quaternion: micQuat } };
}

