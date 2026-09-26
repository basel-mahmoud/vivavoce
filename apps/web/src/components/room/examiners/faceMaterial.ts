/**
 * Examiner faces as a GPU shader on the black-glass visor.
 *
 * Each examiner's visor is a MeshPhysicalMaterial (dark glass with clearcoat, so it keeps real
 * reflections) whose emissive term is replaced by a signed-distance-field face: eyes, lids,
 * brows, pleased arcs, speaking bars, a listening waveform, a marking progress bar and thinking
 * dots, with an analytic Gaussian glow (no Canvas2D, no bloom pass, no textures).
 *
 * Everything the face does is a uniform, so acting costs no uploads and no redraws:
 * - `setState(a, b, t)` blends two expression states (tween t from 0 to 1 over ~120 to 250 ms);
 * - `setLook`, `setBlink`, `setSpeakLevel`, `setWaveform` (32 live mic samples), `setProgress`;
 * - `setLens` magnifies one region of the face (Clarity's loupe), `setTally` lights the on-air pill;
 * - `setScheme` switches the day and night emission levels.
 *
 * Units match the retired canvas faces: U is the visor height, x runs 0..aspect to the right and
 * y runs 0..1 downward, so the style and expression numbers below are the same values the
 * approved prototype used (the parity sheet renders all 10 states for all 5 styles from this).
 *
 * UV contract (examiners.glb): the glass mesh maps u 0..1 left to right and v 0..1 bottom to top
 * over the visor rectangle. The tally pill shares the glass primitive with v in 2..3.
 */
import * as THREE from 'three';

/* ── States ─────────────────────────────────────────────────────────────── */

/** The ten face states, in shader order. */
export const FACE_STATES = [
  'neutral',
  'attentive',
  'blink',
  'pleased',
  'sceptical',
  'unconvinced',
  'speaking',
  'listening',
  'marking',
  'thinking',
] as const;

export type FaceState = (typeof FACE_STATES)[number];

/** Enum-style access: `FaceState.Speaking === 'speaking'`. */
export const FaceState = {
  Neutral: 'neutral',
  Attentive: 'attentive',
  Blink: 'blink',
  Pleased: 'pleased',
  Sceptical: 'sceptical',
  Unconvinced: 'unconvinced',
  Speaking: 'speaking',
  Listening: 'listening',
  Marking: 'marking',
  Thinking: 'thinking',
} as const satisfies Record<string, FaceState>;

/* ── Eye styles (shape language carries the axis) ─────────────────────── */

/**
 * ew/eh eye size, r corner radius, sep eye-centre distance, ey eye line (0 = top of the visor),
 * all in U. Precise rectangles, wide circles, level squares, short dashes, tall bold pills.
 */
export const EYE_STYLES = {
  correctness: { ew: 0.28, eh: 0.46, r: 0.065, sep: 1.0, ey: 0.52 },
  clarity: { ew: 0.42, eh: 0.42, r: 0.21, sep: 0.86, ey: 0.52 },
  structure: { ew: 0.37, eh: 0.37, r: 0.08, sep: 1.0, ey: 0.51 },
  conciseness: { ew: 0.32, eh: 0.13, r: 0.065, sep: 0.66, ey: 0.47 },
  confidence: { ew: 0.23, eh: 0.52, r: 0.115, sep: 1.04, ey: 0.52 },
} as const;

export type EyeStyle = keyof typeof EYE_STYLES;

/* ── Expression parameters ────────────────────────────────────────────── */

/** One eye. lidT/lidB close from the top/bottom (0..1 of the eye height); tilt angles the top lid
 * (rad, + droops toward the nose); dy lifts or drops the eye (U); brow 0..1 shows a bar above it. */
export interface EyeParams {
  scale: number;
  dy: number;
  lidT: number;
  lidB: number;
  tilt: number;
  brow: number;
  browLift: number;
  browTilt: number;
}

/** L is the examiner's right eye, drawn on the viewer's left. mouth weights: bars (speaking),
 * wave (listening), progress (marking), dots (thinking). arc 1 draws pleased ^ ^ eyes. */
export interface FaceParams {
  L: EyeParams;
  R: EyeParams;
  look: readonly [number, number];
  arc: number;
  mouth: readonly [number, number, number, number];
}

const EYE0: EyeParams = { scale: 1, dy: 0, lidT: 0, lidB: 0, tilt: 0, brow: 0, browLift: 0, browTilt: 0 };

function face(p: {
  both?: Partial<EyeParams>;
  L?: Partial<EyeParams>;
  R?: Partial<EyeParams>;
  look?: readonly [number, number];
  arc?: number;
  mouth?: readonly [number, number, number, number];
}): FaceParams {
  return {
    L: { ...EYE0, ...p.both, ...p.L },
    R: { ...EYE0, ...p.both, ...p.R },
    look: p.look ?? [0, 0],
    arc: p.arc ?? 0,
    mouth: p.mouth ?? [0, 0, 0, 0],
  };
}

/** The expression table (same numbers as the approved canvas prototype). */
export const FACE_PARAMS: Record<FaceState, FaceParams> = {
  neutral: face({}),
  attentive: face({ both: { scale: 1.1 }, look: [0, -0.02] }),
  blink: face({ both: { lidT: 0.94 } }),
  pleased: face({ arc: 1 }),
  sceptical: face({
    L: { scale: 1.06, brow: 1, browLift: 0.05, browTilt: -0.12 },
    R: { lidT: 0.5, lidB: 0.1, tilt: 0.16, dy: 0.03 },
  }),
  unconvinced: face({ both: { lidT: 0.48, tilt: -0.06 }, look: [0.06, 0.02] }),
  speaking: face({ both: { lidB: 0.22 }, mouth: [1, 0, 0, 0] }),
  listening: face({ both: { scale: 1.04 }, mouth: [0, 1, 0, 0] }),
  marking: face({ both: { lidT: 0.36 }, look: [0, 0.06], mouth: [0, 0, 1, 0] }),
  thinking: face({ both: { scale: 0.92 }, look: [0.12, -0.08], mouth: [0, 0, 0, 1] }),
};

/* ── Colours ──────────────────────────────────────────────────────────── */

/** Warm-white phosphor, its amber halo, and the speaking bars (the examiner's red pen). */
export const FACE_COLORS = {
  phosphor: '#fff1da',
  glow: '#ffab5c',
  bars: '#ff4d26',
  barsGlow: '#ff3b10',
  tally: '#ff4d26',
} as const;

/** Emission levels per colour scheme: day faces sit in a bright room, night faces are the glow. */
export const FACE_INTENSITY = { light: 1.55, dark: 1.3 } as const;

/* ── Shader ───────────────────────────────────────────────────────────── */

export const WAVE_SAMPLES = 32;

const FACE_PARS = /* glsl */ `
uniform vec4 uStyle;      // ew, eh, r, sep
uniform vec2 uStyle2;     // ey, aspect
uniform vec4 uStA[5];     // state A: L (scale, dy, lidT, lidB), L (tilt, brow, lift, btilt), R x2, (lookX, lookY, arc, _)
uniform vec4 uMoA;        // state A mouth weights: bars, wave, progress, dots
uniform vec4 uStB[5];
uniform vec4 uMoB;
uniform float uBlend;
uniform vec2 uLook;
uniform float uBlink;
uniform float uSpeak;
uniform float uWave[${WAVE_SAMPLES}];
uniform float uWaveMix;
uniform float uProgress;
uniform float uTime;
uniform vec4 uLens;       // cx, cy, radius (U), magnification
uniform vec3 uPhosphor;   // display-space (sRGB) colours: the face composites like the prototype's canvas
uniform vec3 uGlowTint;
uniform vec3 uBarCore;
uniform vec3 uBarGlow;
uniform vec3 uTallyColor;
uniform float uTally;
uniform float uIntensity;

float vvRoundRect(vec2 p, vec2 c, vec2 hs, float r) {
  vec2 q = abs(p - c) - hs + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float vvSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);
  return length(pa - ba * h);
}
// ellipse: a distance that is exact on the boundary (enough for masks)
float vvEllipse(vec2 p, vec2 c, vec2 r) {
  vec2 q = (p - c) / r;
  float k = length(q);
  return (k - 1.0) * k / max(length(q / r), 1e-6);
}
// arc of radius ra opening upward (screen up = -y) by +-ha, stroke half-width rb, round caps
float vvArc(vec2 p, vec2 c, float ra, float ha, float rb) {
  vec2 q = p - c;
  q = vec2(abs(q.x), -q.y);
  vec2 sc = vec2(sin(ha), cos(ha));
  return ((sc.y * q.x > sc.x * q.y) ? length(q - sc * ra) : abs(length(q) - ra)) - rb;
}
float vvErf(float x) { return tanh(1.2025 * x); }
vec3 vvDecode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
// Gaussian blur (sigma s) of a slab of thickness w, at signed distance d from its near edge
float vvBlur(float d, float w, float s) {
  float k = 0.70710678 / s;
  return clamp(0.5 * (vvErf(-d * k) - vvErf(-(d + w) * k)), 0.0, 1.0);
}

struct VVLayer { vec3 core; float cover; float g1; float g2; float b1; float b2; };

// draw one element: SDF d, thickness w (for the glow), alpha a, colour class bar (0 phosphor, 1 bars)
void vvDraw(inout VVLayer L, float d, float w, float a, float bar, float aa) {
  float cov = a * clamp(0.5 - d / aa, 0.0, 1.0);
  vec3 col = mix(uPhosphor, uBarCore, bar);
  L.core = mix(L.core, col, cov);
  L.cover = max(L.cover, cov);
  float s1 = vvBlur(d, w, 0.075) * a, s2 = vvBlur(d, w, 0.025) * a;
  L.g1 = max(L.g1, s1 * (1.0 - bar)); L.g2 = max(L.g2, s2 * (1.0 - bar));
  L.b1 = max(L.b1, s1 * bar);         L.b2 = max(L.b2, s2 * bar);
}

void vvEye(inout VVLayer L, vec2 p, float side, vec4 e0, vec4 e1, float arcW, vec2 look, float shift, float aa) {
  float ew0 = uStyle.x, eh0 = uStyle.y, r0 = uStyle.z, sep = uStyle.w, ey = uStyle2.x, asp = uStyle2.y;
  float scale = e0.x, dy = e0.y, lidT = max(e0.z, uBlink), lidB = e0.w;
  float tilt = e1.x, brow = e1.y, lift = e1.z, btilt = e1.w;
  float ew = ew0 * scale, eh = eh0 * scale;
  float cx = asp * 0.5 + side * sep * 0.5 + look.x;
  float cy = ey - 0.08 * shift + look.y + dy;
  // a brow needs headroom under the visor lip: tall eyes drop, then squash from the top
  if (brow > 0.0) {
    float need = 0.26 + lift;
    float top = cy - eh * 0.5;
    float sh = min(0.07, max(need - top, 0.0)) * brow;
    cy += sh; top += sh;
    if (top < need) {
      float bottom = cy + eh * 0.5;
      eh = mix(eh, max(eh * 0.62, bottom - need), brow);
      cy = bottom - eh * 0.5;
    }
  }
  float inward = side < 0.0 ? 1.0 : -1.0;
  float d = vvRoundRect(p, vec2(cx, cy), vec2(ew, eh) * 0.5, min(r0 * scale, min(ew, eh) * 0.5));
  if (lidT > 0.001) {
    vec2 q = p - vec2(cx, cy - eh * 0.5 + lidT * eh);
    float a = inward * tilt;
    d = max(d, q.x * sin(a) - q.y * cos(a));
  }
  if (lidB > 0.001) {
    d = max(d, -vvEllipse(p, vec2(cx, cy + eh * 0.5 + ew * 0.62 - lidB * eh), vec2(ew * 0.95, ew * 0.62)));
  }
  float w = min(ew, eh * max(0.06, 1.0 - lidT - 0.5 * lidB));
  if (arcW > 0.001) {
    float lw = max(0.085, w * 0.36);
    float rr = max(ew * 0.5, 0.12);
    float da = vvArc(p, vec2(cx, cy + rr * 0.5), rr, 0.37 * 3.14159265, lw * 0.5);
    d = mix(d, da, arcW);
    w = mix(w, lw, arcW);
  }
  vvDraw(L, d, w, 1.0, 0.0, aa);
  if (brow > 0.001) {
    float by = cy - eh * 0.5 - (0.09 + lift);
    float t = btilt * inward;
    float db = vvSegment(p, vec2(cx - ew * 0.62, by + t * 0.5), vec2(cx + ew * 0.62, by - t * 0.5)) - 0.0375;
    vvDraw(L, db, 0.075, brow, 0.0, aa);
  }
}

float vvWaveLive(float u) {
  float x = clamp(u, 0.0, 1.0) * float(${WAVE_SAMPLES - 1});
  int i0 = int(floor(x));
  int i1 = min(i0 + 1, ${WAVE_SAMPLES - 1});
  return mix(uWave[i0], uWave[i1], fract(x));
}
float vvWaveY(float x, float asp, float my) {
  float i = (x - (asp * 0.5 - 0.6)) / 1.2 * 60.0;
  float env = sin(3.14159265 * clamp(i / 60.0, 0.0, 1.0));
  float proc = sin(i * 0.55 + uTime * 9.0) * sin(i * 0.17 + 1.3) * 0.085;
  float live = vvWaveLive(i / 60.0) * 0.12;
  return my + mix(proc, live, uWaveMix) * env;
}

vec3 vvFace(vec2 uv) {
  float asp = uStyle2.y;
  vec2 p0 = vec2(uv.x * asp, 1.0 - uv.y);
  float aa = max(fwidth(p0.y), 1e-5) * 1.1;
  vec2 p = p0;
  float lensK = 0.0;
  if (uLens.z > 0.0) {
    vec2 q = p0 - uLens.xy;
    float lq = length(q);
    if (lq < uLens.z) { p = uLens.xy + q / uLens.w; aa /= uLens.w; }
    lensK = smoothstep(uLens.z * 0.72, uLens.z, lq) * step(lq, uLens.z);
  }
  float t = clamp(uBlend, 0.0, 1.0);
  vec4 lA0 = mix(uStA[0], uStB[0], t), lA1 = mix(uStA[1], uStB[1], t);
  vec4 rA0 = mix(uStA[2], uStB[2], t), rA1 = mix(uStA[3], uStB[3], t);
  vec4 g = mix(uStA[4], uStB[4], t);
  vec4 mo = mix(uMoA, uMoB, t);
  float shift = clamp(mo.x + mo.y + mo.z + mo.w, 0.0, 1.0);
  vec2 look = g.xy + uLook;
  VVLayer L = VVLayer(vec3(0.0), 0.0, 0.0, 0.0, 0.0, 0.0);
  vvEye(L, p, -1.0, lA0, lA1, g.z, look, shift, aa);
  vvEye(L, p, 1.0, rA0, rA1, g.z, look, shift, aa);
  float my = uStyle2.x + 0.27;
  if (mo.x > 0.001) {
    // speaking: nine bars, the resting shape at t = 0 matches the canvas prototype
    const float bw = 0.05;
    const float gap = 0.035;
    float x0 = asp * 0.5 - (9.0 * bw + 8.0 * gap) * 0.5 + bw * 0.5;
    float lvl = clamp(uSpeak, 0.0, 1.0);
    for (int i = 0; i < 9; i++) {
      float fi = float(i);
      float base = fi == 0.0 ? 0.35 : fi == 1.0 ? 0.7 : fi == 2.0 ? 1.0 : fi == 3.0 ? 0.62 : fi == 4.0 ? 0.9
        : fi == 5.0 ? 0.48 : fi == 6.0 ? 0.8 : fi == 7.0 ? 0.4 : 0.22;
      float ph = asin(clamp(2.0 * base - 1.0, -1.0, 1.0));
      float amp = lvl * (0.5 + 0.5 * sin(uTime * (7.3 + fi * 1.37) + ph));
      float bh = 0.05 + 0.19 * amp;
      float x = x0 + fi * (bw + gap);
      float d = vvSegment(p, vec2(x, my - bh * 0.5 + bw * 0.5), vec2(x, my + bh * 0.5 - bw * 0.5)) - bw * 0.5;
      vvDraw(L, d, bw, mo.x, 1.0, aa);
    }
  }
  if (mo.y > 0.001) {
    // listening: the candidate's live waveform (or an idle wave when no mic is attached)
    float xa = asp * 0.5 - 0.6, xb = asp * 0.5 + 0.6;
    // nearest point on the curve: coarse samples, then two Newton steps on the squared distance
    float bx = clamp(p.x, xa, xb), bd = 1e3;
    for (int k = -6; k <= 6; k++) {
      float x = clamp(p.x + float(k) * 0.012, xa, xb);
      float dk = length(p - vec2(x, vvWaveY(x, asp, my)));
      if (dk < bd) { bd = dk; bx = x; }
    }
    for (int it = 0; it < 2; it++) {
      float e = 0.003;
      float y = vvWaveY(bx, asp, my);
      float s1 = (vvWaveY(bx + e, asp, my) - vvWaveY(bx - e, asp, my)) / (2.0 * e);
      bx = clamp(bx + ((p.x - bx) + (p.y - y) * s1) / (1.0 + s1 * s1), xa, xb);
    }
    float d = length(p - vec2(bx, vvWaveY(bx, asp, my)));
    vvDraw(L, d - 0.0225, 0.045, mo.y, 0.0, aa);
  }
  if (mo.z > 0.001) {
    // marking: a track and a fill driven by the scoring request
    float bw = min(1.0, asp * 0.56), bh = 0.08;
    vec2 c = vec2(asp * 0.5, my);
    float dt = abs(vvRoundRect(p, c, vec2(bw, bh) * 0.5, bh * 0.5)) - 0.014;
    vvDraw(L, dt, 0.028, 0.32 * mo.z, 0.0, aa);
    float fw = (bw - 0.044) * clamp(uProgress, 0.0, 1.0);
    if (fw > 0.0005) {
      float fh = bh - 0.044;
      vec2 fc = vec2(asp * 0.5 - bw * 0.5 + 0.022 + fw * 0.5, my);
      float df = vvRoundRect(p, fc, vec2(fw, fh) * 0.5, min(fh, fw) * 0.5);
      vvDraw(L, df, fh, mo.z, 0.0, aa);
    }
  }
  if (mo.w > 0.001) {
    // thinking: three dots that pulse in turn (the resting alphas match the prototype)
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float a = 0.45 + 0.55 * (0.5 + 0.5 * sin(uTime * 4.0 + asin(fi - 1.0)));
      float d = length(p - vec2(asp * 0.5 + (fi - 1.0) * 0.13, my)) - 0.038;
      vvDraw(L, d, 0.076, a * mo.w, 0.0, aa);
    }
  }
  // composite as the prototype did: black glass, a faint backlight, additive glow, crisp core on top
  vec2 bc = (p0 - vec2(asp * 0.5, 0.48)) / (asp * 0.55);
  vec3 bg = vec3(1.0, 0.667, 0.431) * 0.05 * max(0.0, 1.0 - length(bc));
  vec3 glow = uGlowTint * (0.55 * L.g1 + 0.7 * L.g2) + uBarGlow * (0.55 * L.b1 + 0.7 * L.b2);
  vec3 col = mix(bg + glow, L.core, L.cover);
  // fine display lines, faded out before they can alias
  float lines = uv.y * 87.0;
  float lw = fwidth(lines);
  float band = smoothstep(0.5 - lw, 0.5 + lw, abs(fract(lines) - 0.5) * 2.0 - 0.3);
  float lineMask = mix(0.35, band, clamp(1.6 - lw * 2.5, 0.0, 1.0));
  col *= 1.0 - 0.22 * lineMask;
  col *= 1.0 - 0.45 * lensK;
  return vvDecode(col);
}

vec3 vvTally(vec2 uv) {
  // the on-air pill (v 2..3): a lit dome of vermilion, dark glass when off
  vec2 q = vec2(uv.x - 0.5, uv.y - 2.5) * 2.0;
  float dome = clamp(1.0 - dot(q, q), 0.0, 1.0);
  return vvDecode(uTallyColor * uTally * (0.55 + 0.45 * dome));
}
`;

const FACE_EMISSIVE = /* glsl */ `
  totalEmissiveRadiance = (vUv.y > 1.5 ? vvTally(vUv) : vvFace(vUv)) * uIntensity;
`;

/* ── Material factory ─────────────────────────────────────────────────── */

export interface FaceLens {
  /** lens centre in face units (x 0..aspect right, y 0..1 down) */
  x: number;
  y: number;
  /** lens radius in face units */
  radius: number;
  /** magnification, e.g. 1.6 */
  magnification: number;
}

export interface FaceMaterialOptions {
  style: EyeStyle;
  /** visor width / visor height (rig.ts VISORS) */
  aspect: number;
  scheme?: 'light' | 'dark';
}

export interface FaceController {
  readonly material: THREE.MeshPhysicalMaterial;
  /** Blend from state a to state b by t (0 shows a). */
  setState(a: FaceState, b?: FaceState, t?: number): void;
  /** Gaze offset in U (x right, y down); keep within about +-0.15. */
  setLook(x: number, y: number): void;
  /** 0 open to 1 shut, layered over any state. */
  setBlink(v: number): void;
  /** 0..1 speech envelope for the speaking bars. */
  setSpeakLevel(v: number): void;
  /** Up to 32 samples in -1..1 (a live mic meter) for the listening wave; null returns to idle. */
  setWaveform(samples: ArrayLike<number> | null): void;
  /** 0..1 marking progress. */
  setProgress(v: number): void;
  /** Seconds, for the idle wave, the bars and the thinking dots. Freeze it under reduced motion. */
  setTime(seconds: number): void;
  /** Magnify a disc of the face (Clarity's loupe); null removes it. */
  setLens(lens: FaceLens | null): void;
  /** 0..1 on-air tally lamp. */
  setTally(v: number): void;
  setScheme(scheme: 'light' | 'dark'): void;
  dispose(): void;
}

/** sRGB components of a hex colour, uploaded as-is (the shader composites in display space). */
const srgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

function packState(state: FaceState, eyes: THREE.Vector4[], mouth: THREE.Vector4) {
  const f = FACE_PARAMS[state];
  const e = (i: number) => eyes[i] as THREE.Vector4;
  e(0).set(f.L.scale, f.L.dy, f.L.lidT, f.L.lidB);
  e(1).set(f.L.tilt, f.L.brow, f.L.browLift, f.L.browTilt);
  e(2).set(f.R.scale, f.R.dy, f.R.lidT, f.R.lidB);
  e(3).set(f.R.tilt, f.R.brow, f.R.browLift, f.R.browTilt);
  e(4).set(f.look[0], f.look[1], f.arc, 0);
  mouth.set(f.mouth[0], f.mouth[1], f.mouth[2], f.mouth[3]);
}

/**
 * Create one examiner's visor material. Each examiner needs its own instance (uniforms differ);
 * all instances share one compiled program.
 */
export function createFaceMaterial(options: FaceMaterialOptions): FaceController {
  const st = EYE_STYLES[options.style];
  const vec4s = () => Array.from({ length: 5 }, () => new THREE.Vector4());
  const u = {
    uStyle: { value: new THREE.Vector4(st.ew, st.eh, st.r, st.sep) },
    uStyle2: { value: new THREE.Vector2(st.ey, options.aspect) },
    uStA: { value: vec4s() },
    uMoA: { value: new THREE.Vector4() },
    uStB: { value: vec4s() },
    uMoB: { value: new THREE.Vector4() },
    uBlend: { value: 0 },
    uLook: { value: new THREE.Vector2() },
    uBlink: { value: 0 },
    uSpeak: { value: 1 },
    uWave: { value: new Float32Array(WAVE_SAMPLES) },
    uWaveMix: { value: 0 },
    uProgress: { value: 0.62 },
    uTime: { value: 0 },
    uLens: { value: new THREE.Vector4(0, 0, 0, 1) },
    uPhosphor: { value: srgb(FACE_COLORS.phosphor) },
    uGlowTint: { value: srgb(FACE_COLORS.glow) },
    uBarCore: { value: srgb(FACE_COLORS.bars) },
    uBarGlow: { value: srgb(FACE_COLORS.barsGlow) },
    uTallyColor: { value: srgb(FACE_COLORS.tally) },
    uTally: { value: 0 },
    uIntensity: { value: FACE_INTENSITY[options.scheme ?? 'light'] },
  };
  packState('neutral', u.uStA.value, u.uMoA.value);
  packState('neutral', u.uStB.value, u.uMoB.value);

  // Black glass: env reflections read as glass; direct specular is dropped so no round hot spot
  // can read as a third eye.
  const material = new THREE.MeshPhysicalMaterial({
    color: '#030305',
    roughness: 0.08,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    specularIntensity: 1,
    emissive: '#ffffff',
  });
  material.name = `face_${options.style}`;
  material.defines = { ...material.defines, USE_UV: '' };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FACE_PARS}`)
      .replace('#include <emissivemap_fragment>', FACE_EMISSIVE)
      .replace(
        '#include <aomap_fragment>',
        `#include <aomap_fragment>
        reflectedLight.directSpecular *= 0.0;
        #ifdef USE_CLEARCOAT
          clearcoatSpecularDirect *= 0.0;
        #endif`,
      );
  };
  material.customProgramCacheKey = () => 'vv-face-v1';

  let stateA: FaceState = 'neutral';
  let stateB: FaceState = 'neutral';
  return {
    material,
    setState(a, b = a, t = 0) {
      if (a !== stateA) packState((stateA = a), u.uStA.value, u.uMoA.value);
      if (b !== stateB) packState((stateB = b), u.uStB.value, u.uMoB.value);
      u.uBlend.value = t;
    },
    setLook(x, y) {
      u.uLook.value.set(x, y);
    },
    setBlink(v) {
      u.uBlink.value = v;
    },
    setSpeakLevel(v) {
      u.uSpeak.value = v;
    },
    setWaveform(samples) {
      if (!samples) {
        u.uWaveMix.value = 0;
        return;
      }
      const w = u.uWave.value;
      const n = Math.min(samples.length, WAVE_SAMPLES);
      for (let i = 0; i < WAVE_SAMPLES; i++) {
        // resample to 32 (nearest), clamp to -1..1
        const s = n > 0 ? (samples[Math.min(n - 1, Math.floor((i / WAVE_SAMPLES) * n))] ?? 0) : 0;
        w[i] = Math.max(-1, Math.min(1, s));
      }
      u.uWaveMix.value = 1;
    },
    setProgress(v) {
      u.uProgress.value = v;
    },
    setTime(seconds) {
      u.uTime.value = seconds;
    },
    setLens(lens) {
      if (!lens) u.uLens.value.set(0, 0, 0, 1);
      else u.uLens.value.set(lens.x, lens.y, lens.radius, Math.max(1, lens.magnification));
    },
    setTally(v) {
      u.uTally.value = v;
    },
    setScheme(scheme) {
      u.uIntensity.value = FACE_INTENSITY[scheme];
    },
    dispose() {
      material.dispose();
    },
  };
}

/* ── Loupe helper ─────────────────────────────────────────────────────── */

const _ray = new THREE.Ray();
const _plane = new THREE.Plane();
const _m = new THREE.Matrix4();
const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _hit = new THREE.Vector3();
const _rim = new THREE.Vector3();

/**
 * Where a lens (world centre and radius) lands on a visor, as seen from the camera: cast rays from
 * the camera through the lens centre and one rim point onto the visor plane. `visor` is the
 * Visor_<Axis> node (origin at the visor centre, +z out of the glass, +x to the examiner's left
 * = screen right); halfWidth/halfHeight come from rig.ts VISORS. Returns null when the lens is
 * not over the visor.
 */
export function lensOnFace(
  camera: THREE.Camera,
  lensCentre: THREE.Vector3,
  lensRadius: number,
  visor: THREE.Object3D,
  halfWidth: number,
  halfHeight: number,
  magnification = 1.6,
): FaceLens | null {
  visor.updateWorldMatrix(true, false);
  _n.set(0, 0, 1).transformDirection(visor.matrixWorld);
  _plane.setFromNormalAndCoplanarPoint(_n, _v.setFromMatrixPosition(visor.matrixWorld));
  const toLocal = _m.copy(visor.matrixWorld).invert();
  const cam = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
  const project = (target: THREE.Vector3, out: THREE.Vector3) => {
    _ray.set(cam, _v.copy(target).sub(cam).normalize());
    if (!_ray.intersectPlane(_plane, _hit)) return null;
    return out.copy(_hit).applyMatrix4(toLocal);
  };
  const c = project(lensCentre, new THREE.Vector3());
  if (!c) return null;
  // a rim point perpendicular to the view ray, so the radius survives any lens tilt
  const side = _rim.copy(lensCentre).sub(cam).cross(camera.up).normalize().multiplyScalar(lensRadius).add(lensCentre);
  const r = project(side, new THREE.Vector3());
  if (!r) return null;
  const U = 2 * halfHeight;
  const x = (c.x + halfWidth) / U;
  const y = (halfHeight - c.y) / U;
  const radius = Math.hypot(r.x - c.x, r.y - c.y) / U;
  if (x < -radius || y < -radius || x > (2 * halfWidth) / U + radius || y > 1 + radius) return null;
  return { x, y, radius, magnification };
}
