/**
 * The examiners' rig contract for /models/examiners.glb: every node, morph and material name the
 * scene reads, the measured data the build wrote (generated block), recommended poses as data, the
 * conduit-arm solver and the calibrated material recipes.
 *
 * Frames: each examiner faces +z (toward the candidate); x is screen right; y is up; y = 0 is the
 * bench top. L and R always mean SCREEN left and right. Nothing is skinned: every moving part is a
 * rigid node, the mittens have one morph, and the arms are conduits rebuilt by bendArms() whenever a
 * wrist or the body moves (the mitten can never float: the conduit always joins socket to cuff).
 */
import * as THREE from 'three';
import type { FaceState } from './faceMaterial';

/* ── Names ────────────────────────────────────────────────────────────── */

export const EXAMINERS = ['correctness', 'clarity', 'structure', 'conciseness', 'confidence'] as const;
export type ExaminerKey = (typeof EXAMINERS)[number];
export type Side = 'L' | 'R';

/** Node names in the GLB use the title-case axis name. */
export const AXIS_NAME: Record<ExaminerKey, string> = {
  correctness: 'Correctness',
  clarity: 'Clarity',
  structure: 'Structure',
  conciseness: 'Conciseness',
  confidence: 'Confidence',
};

const n = (prefix: string) => (k: ExaminerKey) => `${prefix}_${AXIS_NAME[k]}`;
const ns = (prefix: string) => (k: ExaminerKey, s: Side) => `${prefix}${s}_${AXIS_NAME[k]}`;

export const NODES = {
  /** Seat: position on the arc and a base yaw toward the candidate. Hands hang off this node. */
  root: n('Examiner'),
  /** Body pivot at bench height: lean, breathe (volume-preserving scale), turn toward a speaker. */
  body: n('Body'),
  /** Head pivot at the panel seam: nod, turn and tilt the visor (keep within HEAD_LIMITS). */
  head: n('Head'),
  /** Visor centre frame (+z out of the glass, +y up): look-at targets and the loupe maths. */
  visor: n('Visor'),
  /** The glass face mesh; its material slot is ex_face_<key> (use createFaceMaterial). */
  glass: n('Glass'),
  /** Shoulder sockets on the shell; +y is the direction the conduit leaves the shell. */
  socket: ns('Socket'),
  /** Both conduit arms in one mesh; call bendArms() after moving wrists or the body. */
  arms: n('Arms'),
  /** Hand pivots (children of the root): position + rotate these to pose the hands. */
  wrist: ns('Wrist'),
  /** Mitten meshes (morph 'Curl'); the L mitten is a mirrored instance of the same mesh. */
  mitten: ns('Mitten'),
  /** Paddle flip pivot inside the fist; see setPaddleFlip(). Child of the PADDLE_SIDE wrist. */
  paddle: n('Paddle'),
  /** The bevelled coin (material ex_coin; swap to the vermilion recipe for the examiner in focus). */
  coin: n('Coin'),
  /** Troika anchors: +z out of each face. Front carries the mark, back the axis name. */
  paddleFront: n('PaddleFront'),
  paddleBack: n('PaddleBack'),
  /** Conciseness's metronome needle: rotation.z ticks (about +-0.16 rad at 100 bpm). */
  needle: 'Needle_Conciseness',
  /** Clarity's loupe pivot (in its free hand) and the lens mesh (material ex_lens). */
  loupe: 'Loupe_Clarity',
  loupeLens: 'LoupeLens_Clarity',
  /** The bench root, and per-examiner label anchors on its apron (+z out of the apron). */
  bench: 'Bench',
  benchLabel: n('BenchLabel'),
} as const;

/** Mitten morph: 0 is a flat open mitten, 1 a fist around the grip axis (paddle or loupe handle). */
export const MORPHS = { curl: 'Curl' } as const;

/** Material names in the GLB (the stand-ins are replaced by createExaminerMaterials()). */
export const MATERIALS = {
  shell: (k: ExaminerKey) => `ex_shell_${k}`,
  face: (k: ExaminerKey) => `ex_face_${k}`,
  bisque: 'ex_bisque',
  metal: 'ex_metal',
  lacquer: 'ex_lacquer',
  rubber: 'ex_rubber',
  fabric: 'ex_fabric',
  lens: 'ex_lens',
  coin: 'ex_coin',
  bench: 'ex_bench',
  benchPaper: 'ex_bench_paper',
} as const;

/** Which hand holds the paddle (the other one is free; Clarity's free hand holds the loupe). */
export const PADDLE_SIDE: Record<ExaminerKey, Side> = {
  correctness: 'L',
  clarity: 'L',
  structure: 'R',
  conciseness: 'R',
  confidence: 'R',
};

/** Grip axis in wrist space (runs along x): the paddle and loupe pivots sit here. */
export const GRIP = [0, 0.169, -0.064] as const;
/** Paddle: disc centre along the handle from the grip, coin radius and thickness. */
export const COIN = { discCentre: 0.4, radius: 0.21, thickness: 0.046 } as const;
/** Loupe: lens centre along the handle from the grip, lens radius. */
export const LOUPE = { lensCentre: 0.3, lensRadius: 0.126, magnification: 1.6 } as const;
/** Conduit arms: must match ARM in build_examiners.py. The conduit bows by at most `slack` of the
 * socket-to-cuff distance and never exceeds ARM_LENGTH; farther reaches stretch it straight. */
export const ARM = { radius: 0.04, rings: 18, sides: 12, ribs: 16, cuffDepth: 0.06, flare: 0.16, slack: 1.15 } as const;
/** Head turn limits (rad) that keep the panel seam closed. Structure's head tier can turn more. */
export const HEAD_LIMITS = { yaw: 0.2, pitch: 0.1, roll: 0.08, structureYaw: 0.35 } as const;

// @generated:begin (build_examiners.py writes this block; do not edit by hand)
export const VISORS = {
  "correctness": {
    "halfWidth": 0.33,
    "halfHeight": 0.152,
    "radius": 0.082,
    "centre": [
      0.0,
      0.8552,
      0.454
    ]
  },
  "clarity": {
    "halfWidth": 0.335,
    "halfHeight": 0.183,
    "radius": 0.14,
    "centre": [
      0.0,
      1.2995,
      0.4998
    ]
  },
  "structure": {
    "halfWidth": 0.335,
    "halfHeight": 0.148,
    "radius": 0.072,
    "centre": [
      -0.035,
      1.2311,
      0.417
    ]
  },
  "conciseness": {
    "halfWidth": 0.19,
    "halfHeight": 0.145,
    "radius": 0.078,
    "centre": [
      0.0,
      1.3714,
      0.2216
    ]
  },
  "confidence": {
    "halfWidth": 0.42,
    "halfHeight": 0.166,
    "radius": 0.126,
    "centre": [
      0.0,
      0.5233,
      0.583
    ]
  }
} as const;

export const SOCKETS = {
  "correctness": {
    "L": {
      "pos": [
        -0.522,
        0.29,
        0.0
      ],
      "dir": [
        -0.9421,
        -0.2073,
        0.2638
      ]
    },
    "R": {
      "pos": [
        0.522,
        0.29,
        0.0
      ],
      "dir": [
        0.9421,
        -0.2073,
        0.2638
      ]
    }
  },
  "clarity": {
    "L": {
      "pos": [
        -0.244,
        0.545,
        0.04
      ],
      "dir": [
        -0.9428,
        -0.0471,
        0.33
      ]
    },
    "R": {
      "pos": [
        0.244,
        0.545,
        0.04
      ],
      "dir": [
        0.9428,
        -0.0471,
        0.33
      ]
    }
  },
  "structure": {
    "L": {
      "pos": [
        -0.408,
        0.56,
        0.0321
      ],
      "dir": [
        -0.9407,
        -0.1881,
        0.2822
      ]
    },
    "R": {
      "pos": [
        0.508,
        0.56,
        -0.0321
      ],
      "dir": [
        0.9407,
        -0.1881,
        0.2822
      ]
    }
  },
  "conciseness": {
    "L": {
      "pos": [
        -0.2794,
        0.56,
        0.0
      ],
      "dir": [
        -0.9407,
        -0.1881,
        0.2822
      ]
    },
    "R": {
      "pos": [
        0.2794,
        0.56,
        0.0
      ],
      "dir": [
        0.9407,
        -0.1881,
        0.2822
      ]
    }
  },
  "confidence": {
    "L": {
      "pos": [
        -0.7376,
        0.12,
        0.0
      ],
      "dir": [
        -0.9567,
        -0.0478,
        0.287
      ]
    },
    "R": {
      "pos": [
        0.7376,
        0.12,
        0.0
      ],
      "dir": [
        0.9567,
        -0.0478,
        0.287
      ]
    }
  }
} as const;

export const SEATS = {
  "correctness": {
    "position": [
      -1.7276,
      0.0,
      -0.6133
    ],
    "yaw": 0.2118,
    "headPivot": [
      0.0,
      0.56,
      0.0
    ],
    "top": 1.36
  },
  "clarity": {
    "position": [
      -0.9139,
      0.0,
      -0.8583
    ],
    "yaw": 0.11,
    "headPivot": [
      0.0,
      0.68,
      0.0
    ],
    "top": 1.8
  },
  "structure": {
    "position": [
      0.0,
      0.0,
      -0.95
    ],
    "yaw": -0.0,
    "headPivot": [
      -0.035,
      0.875,
      0.0
    ],
    "top": 1.64
  },
  "conciseness": {
    "position": [
      0.8145,
      0.0,
      -0.8773
    ],
    "yaw": -0.0979,
    "headPivot": [
      0.0,
      1.04,
      0.0
    ],
    "top": 2.4
  },
  "confidence": {
    "position": [
      1.6634,
      0.0,
      -0.6387
    ],
    "yaw": -0.2035,
    "headPivot": [
      0.0,
      0.235,
      0.0
    ],
    "top": 1.068
  }
} as const;

export const BENCH_LABELS = {
  "correctness": {
    "pos": [
      -1.3161,
      -0.15,
      0.402
    ],
    "yaw": 0.385,
    "curveRadius": 3.5045
  },
  "clarity": {
    "pos": [
      -0.6962,
      -0.32,
      0.2154
    ],
    "yaw": 0.2,
    "curveRadius": 3.5045
  },
  "structure": {
    "pos": [
      0.0,
      -0.15,
      0.1455
    ],
    "yaw": -0.0,
    "curveRadius": 3.5045
  },
  "conciseness": {
    "pos": [
      0.6205,
      -0.32,
      0.2009
    ],
    "yaw": -0.178,
    "curveRadius": 3.5045
  },
  "confidence": {
    "pos": [
      1.2673,
      -0.15,
      0.3827
    ],
    "yaw": -0.37,
    "curveRadius": 3.5045
  }
} as const;

export const REST_POSE = {
  "correctness": {
    "L": {
      "pos": [
        -0.2975,
        0.1451,
        0.4854
      ],
      "quat": [
        -0.35154,
        0.57801,
        0.61353,
        0.40731
      ],
      "curl": 1.0,
      "flip": 3.141592653589793
    },
    "R": {
      "pos": [
        0.36,
        0.1339,
        0.6
      ],
      "quat": [
        -0.04816,
        0.59542,
        0.79981,
        0.05885
      ],
      "curl": 0.22
    }
  },
  "clarity": {
    "L": {
      "pos": [
        -0.2975,
        0.1451,
        0.4854
      ],
      "quat": [
        -0.35154,
        0.57801,
        0.61353,
        0.40731
      ],
      "curl": 1.0,
      "flip": 3.141592653589793
    },
    "R": {
      "pos": [
        0.36,
        0.1339,
        0.6
      ],
      "quat": [
        -0.04816,
        0.59542,
        0.79981,
        0.05885
      ],
      "curl": 0.22
    }
  },
  "structure": {
    "L": {
      "pos": [
        -0.36,
        0.1339,
        0.6
      ],
      "quat": [
        -0.04816,
        -0.59542,
        -0.79981,
        0.05885
      ],
      "curl": 0.22
    },
    "R": {
      "pos": [
        0.2975,
        0.1451,
        0.4854
      ],
      "quat": [
        -0.35154,
        -0.57801,
        -0.61353,
        0.40731
      ],
      "curl": 1.0,
      "flip": 3.141592653589793
    }
  },
  "conciseness": {
    "L": {
      "pos": [
        -0.36,
        0.1339,
        0.6
      ],
      "quat": [
        -0.04816,
        -0.59542,
        -0.79981,
        0.05885
      ],
      "curl": 0.22
    },
    "R": {
      "pos": [
        0.2975,
        0.1451,
        0.4854
      ],
      "quat": [
        -0.35154,
        -0.57801,
        -0.61353,
        0.40731
      ],
      "curl": 1.0,
      "flip": 3.141592653589793
    }
  },
  "confidence": {
    "L": {
      "pos": [
        -0.36,
        0.1339,
        0.6
      ],
      "quat": [
        -0.04816,
        -0.59542,
        -0.79981,
        0.05885
      ],
      "curl": 0.22
    },
    "R": {
      "pos": [
        0.2975,
        0.1451,
        0.4854
      ],
      "quat": [
        -0.35154,
        -0.57801,
        -0.61353,
        0.40731
      ],
      "curl": 1.0,
      "flip": 3.141592653589793
    }
  }
} as const;

export const ARM_LENGTH = {
  "correctness": 0.9,
  "clarity": 0.98,
  "structure": 0.92,
  "conciseness": 0.94,
  "confidence": 0.98
} as const;
// @generated:end

/* ── Arms ─────────────────────────────────────────────────────────────── */

export interface ArmRig {
  mesh: THREE.Mesh;
  socket: Record<Side, THREE.Object3D>;
  wrist: Record<Side, THREE.Object3D>;
  /** conduit rest length (ARM_LENGTH[key]) */
  length: number;
}

interface ArmLayout {
  side: Uint8Array;
  ring: Uint16Array;
  theta: Float32Array;
  position: THREE.BufferAttribute;
  normal: THREE.BufferAttribute;
}

const layouts = new WeakMap<THREE.BufferGeometry, ArmLayout>();

function armLayout(geo: THREE.BufferGeometry): ArmLayout {
  const cached = layouts.get(geo);
  if (cached) return cached;
  const uv = geo.getAttribute('uv');
  const count = uv.count;
  const side = new Uint8Array(count);
  const ring = new Uint16Array(count);
  const theta = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    const right = u >= 1.5;
    side[i] = right ? 1 : 0;
    theta[i] = (u - (right ? 2 : 0)) * Math.PI * 2;
    ring[i] = Math.round((v / ARM.ribs) * (ARM.rings - 1));
  }
  // positions and normals become plain float attributes the solver can rewrite
  const position = new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const normal = new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', position);
  geo.setAttribute('normal', normal);
  const layout = { side, ring, theta, position, normal };
  layouts.set(geo, layout);
  return layout;
}

const _inv = new THREE.Matrix4();
const _m = new THREE.Matrix4();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _p1 = new THREE.Vector3();
const _p2 = new THREE.Vector3();
const _q = new THREE.Vector3();
const _prev = new THREE.Vector3();
// bendArms() inputs and per-vertex scratch (solveArm never writes these)
const _sock = new THREE.Vector3();
const _dirA = new THREE.Vector3();
const _cuff = new THREE.Vector3();
const _dirB = new THREE.Vector3();
const _side = new THREE.Vector3();

function bez(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number, out: THREE.Vector3) {
  const u = 1 - t;
  return out
    .copy(p0)
    .multiplyScalar(u * u * u)
    .addScaledVector(p1, 3 * u * u * t)
    .addScaledVector(p2, 3 * u * t * t)
    .addScaledVector(p3, t * t * t);
}

function bezD(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number, out: THREE.Vector3) {
  const u = 1 - t;
  out.copy(p1).sub(p0).multiplyScalar(3 * u * u);
  out.addScaledVector(_q.copy(p2).sub(p1), 6 * u * t);
  return out.addScaledVector(_q.copy(p3).sub(p2), 3 * t * t);
}

function curveLength(s0: THREE.Vector3, a: THREE.Vector3, e: THREE.Vector3, b: THREE.Vector3, h: number) {
  _p1.copy(s0).addScaledVector(a, h);
  _p2.copy(e).addScaledVector(b, -h);
  let len = 0;
  _prev.copy(s0);
  for (let i = 1; i <= 24; i++) {
    bez(s0, _p1, _p2, e, i / 24, _q);
    len += _q.distanceTo(_prev);
    _prev.copy(_q);
  }
  return len;
}

const RINGS: THREE.Vector3[][] = [0, 1].map(() => Array.from({ length: ARM.rings * 3 }, () => new THREE.Vector3()));
const ARM_SIDES = ['L', 'R'] as const;

function solveArm(s0: THREE.Vector3, a: THREE.Vector3, e: THREE.Vector3, b: THREE.Vector3, length: number, out: THREE.Vector3[]) {
  // handles h so that the conduit keeps its rest length (it bows when the hand comes closer and
  // stretches, with smooth tangent ends, when the hand reaches farther)
  const dist = s0.distanceTo(e);
  const target = Math.min(length, dist * ARM.slack + 0.05); // a springy cord: a gentle bow, never a loop
  let lo = 0.18 * dist;
  let hi = 1.6 * target + dist;
  let h = lo;
  if (curveLength(s0, a, e, b, lo) < target) {
    for (let i = 0; i < 26; i++) {
      const mid = (lo + hi) / 2;
      if (curveLength(s0, a, e, b, mid) < target) lo = mid;
      else hi = mid;
    }
    h = (lo + hi) / 2;
  }
  const p1 = _p1.copy(s0).addScaledVector(a, h);
  const p2 = _p2.copy(e).addScaledVector(b, -h);
  const nr = ARM.rings;
  // out: [X_i, T_i, R_i] per ring (rotation-minimising frames, double reflection)
  for (let i = 0; i < nr; i++) {
    const t = i / (nr - 1);
    bez(s0, p1, p2, e, t, out[i * 3] as THREE.Vector3);
    bezD(s0, p1, p2, e, t, out[i * 3 + 1] as THREE.Vector3).normalize();
  }
  const t0 = out[1] as THREE.Vector3;
  const ref = Math.abs(t0.z) < 0.9 ? _a.set(0, 0, 1) : _a.set(0, 1, 0);
  (out[2] as THREE.Vector3).crossVectors(t0, ref).normalize();
  for (let i = 0; i < nr - 1; i++) {
    const x0 = out[i * 3] as THREE.Vector3;
    const x1 = out[(i + 1) * 3] as THREE.Vector3;
    const ti = out[i * 3 + 1] as THREE.Vector3;
    const t1 = out[(i + 1) * 3 + 1] as THREE.Vector3;
    const ri = out[i * 3 + 2] as THREE.Vector3;
    const v1 = _b.copy(x1).sub(x0);
    const c1 = v1.dot(v1);
    const rL = _p1.copy(ri).addScaledVector(v1, (-2 / c1) * v1.dot(ri));
    const tL = _p2.copy(ti).addScaledVector(v1, (-2 / c1) * v1.dot(ti));
    const v2 = _q.copy(t1).sub(tL);
    const c2 = v2.dot(v2);
    const r1 = out[(i + 1) * 3 + 2] as THREE.Vector3;
    if (c2 > 1e-12) r1.copy(rL).addScaledVector(v2, (-2 / c2) * v2.dot(rL)).normalize();
    else r1.copy(rL).normalize();
  }
}

/**
 * Rebuild both conduits from the current world matrices of sockets and wrists (call after posing,
 * once per frame at most, and only while something moves). Cost: ~570 vertices per examiner.
 */
export function bendArms(rig: ArmRig): void {
  const { mesh } = rig;
  const geo = mesh.geometry;
  const L = armLayout(geo);
  mesh.updateWorldMatrix(true, false);
  _inv.copy(mesh.matrixWorld).invert();
  // a plain loop over a module constant: this runs every frame while anything moves
  for (let si = 0; si < ARM_SIDES.length; si++) {
    const s = ARM_SIDES[si] as Side;
    const sock = rig.socket[s];
    const wrist = rig.wrist[s];
    sock.updateWorldMatrix(true, false);
    wrist.updateWorldMatrix(true, false);
    _m.multiplyMatrices(_inv, sock.matrixWorld);
    _sock.setFromMatrixPosition(_m);
    _dirA.set(0, 1, 0).transformDirection(_m);
    _m.multiplyMatrices(_inv, wrist.matrixWorld);
    _cuff.set(0, -ARM.cuffDepth, 0).applyMatrix4(_m);
    _dirB.set(0, 1, 0).transformDirection(_m);
    solveArm(_sock, _dirA, _cuff, _dirB, rig.length, RINGS[si] as THREE.Vector3[]);
  }
  const pos = L.position.array as Float32Array;
  const nrm = L.normal.array as Float32Array;
  const sv = _side;
  for (let i = 0; i < L.ring.length; i++) {
    const R = RINGS[L.side[i] as number] as THREE.Vector3[];
    const ri = L.ring[i] as number;
    const X = R[ri * 3] as THREE.Vector3;
    const T = R[ri * 3 + 1] as THREE.Vector3;
    const Rv = R[ri * 3 + 2] as THREE.Vector3;
    sv.crossVectors(T, Rv);
    const th = L.theta[i] as number;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const t = ri / (ARM.rings - 1);
    const rad = ARM.radius * (1 + ARM.flare * Math.exp(-((t / 0.07) ** 2)));
    const nx = Rv.x * c + sv.x * s;
    const ny = Rv.y * c + sv.y * s;
    const nz = Rv.z * c + sv.z * s;
    pos[i * 3] = X.x + nx * rad;
    pos[i * 3 + 1] = X.y + ny * rad;
    pos[i * 3 + 2] = X.z + nz * rad;
    nrm[i * 3] = nx;
    nrm[i * 3 + 1] = ny;
    nrm[i * 3 + 2] = nz;
  }
  L.position.needsUpdate = true;
  L.normal.needsUpdate = true;
  geo.computeBoundingSphere();
}

/* ── Poses ────────────────────────────────────────────────────────────── */

type V3 = readonly [number, number, number];
type Q4 = readonly [number, number, number, number];

/**
 * A hand, in the examiner root frame. Give a quaternion, a gesture, or a held object: `coin` is where
 * the paddle's disc centre (or, with reach = LOUPE.lensCentre, the loupe's lens) should be, `facing`
 * where its printed face (or lens) points, and `up` the handle direction.
 */
export type HandPose =
  | { pos: V3; quat: Q4; curl: number }
  | { pos: V3; gesture: GestureName; curl?: number }
  | { coin: V3; facing: V3; up?: V3; curl?: number; reach?: number };

export interface ExaminerPose {
  /** Body pivot yaw, pitch, roll (rad). */
  body?: V3;
  /** Head pivot yaw, pitch, roll (rad); see HEAD_LIMITS. */
  head?: V3;
  L: HandPose;
  R: HandPose;
  /** Paddle rotation about its handle: 0 shows the mark on the back-of-hand side, PI the axis name. */
  flip: number;
  /** Conciseness needle angle (rad). */
  needle?: number;
  face?: FaceState;
  /** Face gaze offset in visor units (x right, y down). */
  look?: readonly [number, number];
}

/** Named hand orientations for the screen-right hand (the left hand mirrors x). */
export const GESTURES = {
  /** resting flat on the bench, fingers forward */
  flat: { fingers: [0, -0.05, 1], palm: [0, -1, 0], curl: 0.15 },
  /** resting, relaxed */
  rest: { fingers: [0.1, -0.1, 1], palm: [0, -1, 0.06], curl: 0.32 },
  /** a loose fist */
  fist: { fingers: [0, -0.2, 1], palm: [0, -1, 0.1], curl: 0.85 },
  /** fingertips up at the chin, palm toward the face's midline */
  chin: { fingers: [0.1, 1, 0.25], palm: [-1, 0, 0.1], curl: 0.45 },
  /** open palm offered to the candidate */
  present: { fingers: [-0.35, 0.75, 0.55], palm: [0.2, 0.45, 0.85], curl: 0.08 },
  /** a small raised hand */
  wave: { fingers: [0.05, 1, 0.1], palm: [0, 0, 1], curl: 0.05 },
} as const;
export type GestureName = keyof typeof GESTURES;

export interface ResolvedHand {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  curl: number;
}

const basisQuat = (fingers: THREE.Vector3, back: THREE.Vector3) => {
  const y = fingers.clone().normalize();
  const z = back.clone().addScaledVector(y, -back.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
};

/** Turn a HandPose into a wrist transform (root frame). */
export function resolveHand(hand: HandPose, side: Side): ResolvedHand {
  const mx = side === 'L' ? -1 : 1;
  if ('quat' in hand) {
    return {
      position: new THREE.Vector3(...hand.pos),
      quaternion: new THREE.Quaternion(...hand.quat),
      curl: hand.curl,
    };
  }
  if ('gesture' in hand) {
    const g = GESTURES[hand.gesture];
    const f = new THREE.Vector3(g.fingers[0] * mx, g.fingers[1], g.fingers[2]);
    const back = new THREE.Vector3(-g.palm[0] * mx, -g.palm[1], -g.palm[2]);
    return { position: new THREE.Vector3(...hand.pos), quaternion: basisQuat(f, back), curl: hand.curl ?? g.curl };
  }
  // a paddle held up: the back of the fist faces `facing`, the handle points `up`, the coin centre
  // lands on `coin`. The wrist x axis carries the handle (+x right hand, -x the mirrored left).
  const up = new THREE.Vector3(...(hand.up ?? ([0, 1, 0] as const))).normalize();
  const back = new THREE.Vector3(...hand.facing);
  back.addScaledVector(up, -back.dot(up)).normalize();
  const x = up.clone().multiplyScalar(mx);
  const y = new THREE.Vector3().crossVectors(back, x).normalize();
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, back));
  const grip = new THREE.Vector3(...GRIP).applyQuaternion(q);
  const position = new THREE.Vector3(...hand.coin).sub(grip).addScaledVector(up, -(hand.reach ?? COIN.discCentre));
  return { position, quaternion: q, curl: hand.curl ?? 1 };
}

export interface ExaminerNodes {
  root: THREE.Object3D;
  body: THREE.Object3D;
  head: THREE.Object3D;
  wrist: Record<Side, THREE.Object3D>;
  mitten: Record<Side, THREE.Mesh>;
  paddle: THREE.Object3D;
  arms: THREE.Mesh;
  socket: Record<Side, THREE.Object3D>;
  needle?: THREE.Object3D;
}

/** Collect one examiner's rig nodes from the loaded scene (throws if the GLB is out of date). */
export function examinerNodes(scene: THREE.Object3D, key: ExaminerKey): ExaminerNodes {
  const get = <T extends THREE.Object3D>(name: string) => {
    const o = scene.getObjectByName(name);
    if (!o) throw new Error(`examiners.glb: missing node ${name}`);
    return o as T;
  };
  return {
    root: get(NODES.root(key)),
    body: get(NODES.body(key)),
    head: get(NODES.head(key)),
    wrist: { L: get(NODES.wrist(key, 'L')), R: get(NODES.wrist(key, 'R')) },
    mitten: { L: get<THREE.Mesh>(NODES.mitten(key, 'L')), R: get<THREE.Mesh>(NODES.mitten(key, 'R')) },
    paddle: get(NODES.paddle(key)),
    arms: get<THREE.Mesh>(NODES.arms(key)),
    socket: { L: get(NODES.socket(key, 'L')), R: get(NODES.socket(key, 'R')) },
    needle: key === 'conciseness' ? get(NODES.needle) : undefined,
  };
}

const PADDLE_BASE: Record<Side, THREE.Quaternion> = {
  R: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2),
  L: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2),
};
const _flip = new THREE.Quaternion();
const _yAxis = new THREE.Vector3(0, 1, 0);

/** Paddle flip about its handle (0 shows the mark on the back-of-hand side, PI the axis name). */
export function setPaddleFlip(paddle: THREE.Object3D, side: Side, angle: number): void {
  paddle.quaternion.copy(PADDLE_BASE[side]).multiply(_flip.setFromAxisAngle(_yAxis, angle));
}

/** Set the mitten's curl (0 flat .. 1 fist). */
export function setCurl(mitten: THREE.Mesh, curl: number): void {
  const i = mitten.morphTargetDictionary?.[MORPHS.curl];
  if (i !== undefined && mitten.morphTargetInfluences) mitten.morphTargetInfluences[i] = curl;
}

/**
 * Apply a pose: body and head rotations, both wrists, curls, the paddle flip and the needle, then
 * rebuild the arms. Blend two poses yourself by slerping the resolved hands before calling this, or
 * use blendPoses().
 */
export function applyPose(key: ExaminerKey, nodes: ExaminerNodes, pose: ExaminerPose): void {
  const [by, bp, br] = pose.body ?? [0, 0, 0];
  nodes.body.rotation.set(bp, by, br, 'YXZ');
  const [hy, hp, hr] = pose.head ?? [0, 0, 0];
  nodes.head.rotation.set(hp, hy, hr, 'YXZ');
  for (const s of ['L', 'R'] as const) {
    const h = resolveHand(pose[s], s);
    nodes.wrist[s].position.copy(h.position);
    nodes.wrist[s].quaternion.copy(h.quaternion);
    setCurl(nodes.mitten[s], h.curl);
  }
  setPaddleFlip(nodes.paddle, PADDLE_SIDE[key], pose.flip);
  if (nodes.needle) nodes.needle.rotation.z = pose.needle ?? 0;
  nodes.root.updateMatrixWorld(true);
  bendArms({ mesh: nodes.arms, socket: nodes.socket, wrist: nodes.wrist, length: ARM_LENGTH[key] });
}

/** Resolve and interpolate two poses (t 0..1): positions lerp, rotations slerp, curls lerp. */
export function blendPoses(key: ExaminerKey, nodes: ExaminerNodes, a: ExaminerPose, b: ExaminerPose, t: number): void {
  const lerp3 = (p: V3 | undefined, q: V3 | undefined): V3 => {
    const x = p ?? [0, 0, 0];
    const y = q ?? [0, 0, 0];
    return [x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t];
  };
  const hands = {} as Record<Side, HandPose>;
  for (const s of ['L', 'R'] as const) {
    const ha = resolveHand(a[s], s);
    const hb = resolveHand(b[s], s);
    const q = ha.quaternion.clone().slerp(hb.quaternion, t);
    const p = ha.position.clone().lerp(hb.position, t);
    hands[s] = { pos: [p.x, p.y, p.z], quat: [q.x, q.y, q.z, q.w], curl: ha.curl + (hb.curl - ha.curl) * t };
  }
  applyPose(key, nodes, {
    body: lerp3(a.body, b.body),
    head: lerp3(a.head, b.head),
    L: hands.L,
    R: hands.R,
    flip: a.flip + (b.flip - a.flip) * t,
    needle: (a.needle ?? 0) + ((b.needle ?? 0) - (a.needle ?? 0)) * t,
  });
}

const restHand = (key: ExaminerKey, s: Side): HandPose => {
  const r = REST_POSE[key][s];
  return { pos: r.pos, quat: r.quat, curl: r.curl };
};
const restFlip = (key: ExaminerKey) => {
  const r = REST_POSE[key][PADDLE_SIDE[key]] as { flip?: number };
  return r.flip ?? Math.PI;
};
const other = (s: Side): Side => (s === 'L' ? 'R' : 'L');

/** Rest: both hands on the bench, the paddle lying face-down with its axis name up. */
export function restPose(key: ExaminerKey): ExaminerPose {
  return { L: restHand(key, 'L'), R: restHand(key, 'R'), flip: restFlip(key), face: 'neutral' };
}

/** A pose with the paddle hand at rest (paddle face-down) and the free hand doing `free`. */
const freeHandPose = (key: ExaminerKey, free: HandPose, face: FaceState): ExaminerPose => {
  const p = PADDLE_SIDE[key];
  const hands = { [p]: restHand(key, p), [other(p)]: free } as Record<Side, HandPose>;
  return { L: hands.L, R: hands.R, flip: restFlip(key), face };
};
/** A pose with the paddle raised (coin centre and facing in the root frame) and the free hand at rest. */
const raisePose = (key: ExaminerKey, coin: V3, facing: V3, face: FaceState, lean = 0.3): ExaminerPose => {
  const p = PADDLE_SIDE[key];
  // a raised paddle leans in toward the body's midline, so the wrist drops and the conduit hangs
  // naturally from the cuff (an upright paddle in a hammer grip forces a horizontal forearm)
  const up: V3 = [p === 'L' ? lean : -lean, 1, 0];
  const hands = { [p]: { coin, facing, up }, [other(p)]: restHand(key, other(p)) } as Record<Side, HandPose>;
  return { L: hands.L, R: hands.R, flip: 0, face };
};

/**
 * Recommended poses per examiner (root frame). Paddle hands are given by where the coin centre should
 * be and which way the mark faces; free hands by gesture; resting hands come from the build's contact
 * solve (REST_POSE). The raise poses keep every face clear in the hero line-up (a low-high-mid-high-low
 * skyline of marks), and the conduits stay within slack of their sockets.
 */
export const POSES: Record<ExaminerKey, Record<'raise' | 'present' | 'chinTap', ExaminerPose>> & {
  loupe: ExaminerPose;
} = {
  correctness: {
    raise: raisePose('correctness', [-0.8, 1.04, 0.36], [0.2, 0.1, 1], 'neutral'),
    present: freeHandPose('correctness', { pos: [0.5, 0.42, 0.62], gesture: 'present' }, 'attentive'),
    chinTap: freeHandPose('correctness', { pos: [0.16, 0.44, 0.6], gesture: 'chin' }, 'sceptical'),
  },
  clarity: {
    raise: raisePose('clarity', [-0.6, 1.78, 0.3], [0.1, 0.1, 1], 'attentive'),
    present: freeHandPose('clarity', { pos: [0.52, 0.72, 0.62], gesture: 'present' }, 'pleased'),
    chinTap: freeHandPose('clarity', { pos: [0.16, 0.92, 0.62], gesture: 'chin' }, 'thinking'),
  },
  structure: {
    raise: raisePose('structure', [0.6, 0.98, 0.53], [-0.05, 0.1, 1], 'speaking'),
    present: freeHandPose('structure', { pos: [-0.56, 0.72, 0.62], gesture: 'present' }, 'speaking'),
    chinTap: freeHandPose('structure', { pos: [-0.2, 0.9, 0.58], gesture: 'chin' }, 'sceptical'),
  },
  conciseness: {
    raise: raisePose('conciseness', [0.52, 1.8, 0.3], [-0.1, 0.1, 1], 'marking'),
    present: freeHandPose('conciseness', { pos: [-0.4, 0.74, 0.55], gesture: 'present' }, 'attentive'),
    chinTap: freeHandPose('conciseness', { pos: [-0.12, 1.04, 0.4], gesture: 'chin' }, 'unconvinced'),
  },
  confidence: {
    raise: raisePose('confidence', [0.85, 0.98, 0.52], [-0.2, 0.1, 1], 'sceptical'),
    present: freeHandPose('confidence', { pos: [-0.62, 0.4, 0.7], gesture: 'present' }, 'listening'),
    chinTap: freeHandPose('confidence', { pos: [-0.2, 0.18, 0.72], gesture: 'chin' }, 'thinking'),
  },
  /** Clarity peers through its loupe (the face shader magnifies the eye behind the lens). */
  // (keep Body/Head yaw at 0 in this pose: the hands hang off the root, so a turned head would slide
  // its eye out from behind the lens)
  loupe: freeHandPose('clarity', { coin: [0.15, 1.29, 0.62], facing: [0, 0, 1], up: [0.3, 1, 0], reach: LOUPE.lensCentre }, 'attentive'),
};

/* ── DOM sprites (scripts/examiners/render.mjs) ───────────────────────── */

/** States with a head-and-shoulders sprite (transparent WebP, reads on both page canvases). */
export const PORTRAIT_STATES = ['neutral', 'listening', 'pleased', 'sceptical', 'speaking', 'marking'] as const satisfies readonly FaceState[];
export type PortraitState = (typeof PORTRAIT_STATES)[number];
/** Sprite sizes in px (width, height): head and shoulders, and the half body with the paddle raised. */
export const PORTRAIT_SIZE = { head: [360, 360], raised: [480, 600] } as const;
export const portraitSrc = (key: ExaminerKey, state: PortraitState) => `/examiners/${key}-${state}.webp`;
export const raisedSrc = (key: ExaminerKey) => `/examiners/${key}-raised.webp`;

/**
 * The raised sprites hold a blank coin square to the camera: set the live mark over it in JetBrains
 * Mono 700 (paper #f6f6f3), centred on (x, y) as fractions of the sprite's width and height, at a
 * font size of about 0.95 r (r is the coin radius as a fraction of the sprite width).
 */
// @portraits:begin (render.mjs writes this block; do not edit by hand)
export const PORTRAIT_COINS: Record<ExaminerKey, { readonly x: number; readonly y: number; readonly r: number }> = {
  "correctness": {
    "x": 0.2883,
    "y": 0.3577,
    "r": 0.1106
  },
  "clarity": {
    "x": 0.3152,
    "y": 0.2047,
    "r": 0.1227
  },
  "structure": {
    "x": 0.6895,
    "y": 0.3482,
    "r": 0.1189
  },
  "conciseness": {
    "x": 0.6256,
    "y": 0.2827,
    "r": 0.1152
  },
  "confidence": {
    "x": 0.7342,
    "y": 0.4661,
    "r": 0.0992
  }
};
// @portraits:end

/* ── Materials ────────────────────────────────────────────────────────── */

export type Scheme = 'light' | 'dark';

/** Tiling detail maps shipped as separate same-origin files (never inside the GLB). */
export const DETAIL_TEXTURES = {
  /** powder-coat orange peel with pinholes (normal) */
  peel: '/models/examiners-peel-n.webp',
  /** one smooth groove per tile along v (normal): machined grooves, page edges, conduit ribs */
  grooves: '/models/examiners-grooves-n.webp',
  /** fine isotropic grain (normal): ceramic, lacquer, bench */
  grain: '/models/examiners-grain-n.webp',
  /** paper fibre and velvet nap (normal) */
  fibre: '/models/examiners-fibre-n.webp',
  /** speckle (albedo multiplier, mean ~0.92): powder coat and stone */
  speckle: '/models/examiners-speckle.webp',
} as const;
export type DetailName = keyof typeof DETAIL_TEXTURES;
export type DetailTextures = Record<DetailName, THREE.Texture>;

/** Load the detail maps once (they tile; the materials set their own repeat). */
export function loadDetailTextures(loader: THREE.TextureLoader = new THREE.TextureLoader()): DetailTextures {
  const out = {} as DetailTextures;
  for (const [name, url] of Object.entries(DETAIL_TEXTURES) as [DetailName, string][]) {
    const t = loader.load(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    if (name === 'speckle') t.colorSpace = THREE.SRGBColorSpace;
    out[name] = t;
  }
  return out;
}

/** One finish: MeshPhysicalMaterial parameters + detail map, per scheme (colours calibrated). */
export interface Finish {
  color: string;
  roughness: number;
  metalness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  sheen?: number;
  sheenRoughness?: number;
  sheenColor?: string;
  specularIntensity?: number;
  envMapIntensity?: number;
  normal?: DetailName;
  normalScale?: number;
  /** UV repeat for the detail maps (the GLB's UVs run 10 per unit, so repeat 2.5 = a 4 cm tile) */
  repeat?: readonly [number, number];
  /** speckle albedo: its own repeat (0.6 = 17 cm tile, specks of 2 to 3 mm) */
  speckle?: number;
  /** strength of the baked AO (COLOR_0.a) on indirect light */
  ao?: number;
  transparent?: boolean;
  opacity?: number;
}

const F = (f: Finish) => f;

/**
 * Finishes by GLB material name. Shells keep their brand colour here (COLOR_0.rgb multiplies it);
 * accents are white here and get their albedo from COLOR_0.rgb.
 *
 * Calibration: the base colours of ex_shell_clarity, ex_shell_confidence, ex_bench and ex_coin_hot
 * were solved per scheme (render, sample a lit mid-tone patch, correct in linear, repeat) so the
 * rendered swatches land within CIEDE2000 5 of #ffc838, #1f31c9, #1f31c9 and #ff4d26 under Neutral
 * tone mapping (measured in the 1440 hero: light 3.7 / 0.3 / 0.3 / 2.9, dark 3.7 / 0.1 / 3.5 / 2.7).
 * They hold for the hero lighting written down in scripts/examiners/README.md (key 2.7 day / 1.9
 * night, environment 0.78 / 0.62, speaker spot 20 / 34, night lamp 26); re-solve them the same way
 * if the scene's lights change. Vermilion is aimed at #f04a25: Neutral compresses R near 255.
 */
export const FINISH: Record<Scheme, Record<string, Finish>> = {
  light: {
    // speckled graphite powder coat: fine orange peel, light and dark flecks, a soft satin sheen
    ex_shell_correctness: F({ color: '#2a303c', roughness: 0.52, clearcoat: 0.3, clearcoatRoughness: 0.35, sheen: 0.2, sheenColor: '#8a93a6', normal: 'peel', normalScale: 0.09, repeat: [3, 3], speckle: 0.7 }),
    // butter dip glaze: glassy and nearly smooth
    ex_shell_clarity: F({ color: '#ffcc00', roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.05, normal: 'grain', normalScale: 0.025, repeat: [4, 4] }),
    // unglazed bisque under the drips: matte, grainy, speckled
    ex_bisque: F({ color: '#efe2bf', roughness: 0.8, sheen: 0.35, sheenColor: '#fff6de', normal: 'peel', normalScale: 0.16, repeat: [5, 5], speckle: 0.9 }),
    // soft-touch porcelain: satin, a whisper of grain
    ex_shell_structure: F({ color: '#eceef1', roughness: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.4, sheen: 0.35, sheenRoughness: 0.6, sheenColor: '#ffffff', normal: 'grain', normalScale: 0.05, repeat: [5, 5] }),
    // turned stone: fine lathe grooves and flecks
    ex_shell_conciseness: F({ color: '#c8c2b7', roughness: 0.6, clearcoat: 0.1, clearcoatRoughness: 0.45, sheen: 0.25, sheenColor: '#f3eee6', normal: 'grooves', normalScale: 0.22, repeat: [0, 4], speckle: 0.8 }),
    // cobalt satin lacquer
    ex_shell_confidence: F({ color: '#041cb2', roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.25, sheen: 0.15, sheenColor: '#6f7dff', normal: 'peel', normalScale: 0.04, repeat: [3, 3] }),
    // shared accents (albedo from COLOR_0): machined metal, gloss lacquer, ribbed rubber, paper and velvet
    ex_metal: F({ color: '#ffffff', roughness: 0.28, metalness: 1, normal: 'grooves', normalScale: 0.1, repeat: [0, 14] }),
    ex_lacquer: F({ color: '#ffffff', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 }),
    ex_rubber: F({ color: '#ffffff', roughness: 0.55, sheen: 0.45, sheenRoughness: 0.5, sheenColor: '#6b7284', normal: 'grooves', normalScale: 0.7, repeat: [1, 1] }),
    ex_fabric: F({ color: '#ffffff', roughness: 0.74, sheen: 0.55, sheenRoughness: 0.55, sheenColor: '#ffffff', normal: 'fibre', normalScale: 0.12, repeat: [2.5, 2.5] }),
    ex_lens: F({ color: '#e8eef6', roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.16, ao: 0 }),
    ex_coin: F({ color: '#1b1e26', roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.06 }),
    // the examiner's red pen: a satin coat, so reflections never wash the vermilion toward pink
    ex_coin_hot: F({ color: '#e13b0c', roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3, specularIntensity: 0.35 }),
    // the bench: satin cobalt (never gloss: grazing clearcoat washes cobalt toward lavender)
    ex_bench: F({ color: '#3b4bee', roughness: 0.5, clearcoat: 0.15, clearcoatRoughness: 0.5, normal: 'grain', normalScale: 0.04, repeat: [3, 3] }),
    ex_bench_paper: F({ color: '#f6f6f3', roughness: 0.72, sheen: 0.3, sheenColor: '#ffffff', normal: 'grooves', normalScale: 0.4, repeat: [0, 9] }),
  },
  dark: {} as Record<string, Finish>,
};
FINISH.dark = {
  ...FINISH.light,
  // night calibration (the lamp is warmer and lower): the same four swatches, re-solved
  ex_shell_clarity: F({ ...FINISH.light.ex_shell_clarity!, color: '#ffdd00' }),
  ex_shell_confidence: F({ ...FINISH.light.ex_shell_confidence!, color: '#042bd9' }),
  ex_coin_hot: F({ ...FINISH.light.ex_coin_hot!, color: '#dc3e06' }),
  ex_bench: F({ ...FINISH.light.ex_bench!, color: '#4257ff' }),
  // at night the conduits and the coal accents catch the lamp on a lighter sheen, so the arms keep
  // their outline against the blue-black page
  ex_rubber: F({ ...FINISH.light.ex_rubber!, sheen: 0.9, sheenRoughness: 0.42, sheenColor: '#aab3c8', roughness: 0.48 }),
};

const AO_PATCH_KEY = 'vv-examiner-ao';

/** Apply COLOR_0.rgb as albedo and COLOR_0.a as ambient occlusion on indirect light. */
function patchVertexAO(mat: THREE.MeshPhysicalMaterial, strength: number) {
  const u = { uVertexAO: { value: strength } };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uVertexAO;')
      .replace(
        '#include <color_fragment>',
        `#if defined( USE_COLOR_ALPHA ) || defined( USE_COLOR )
          diffuseColor.rgb *= vColor.rgb;
        #endif`,
      )
      .replace(
        '#include <aomap_fragment>',
        `#include <aomap_fragment>
        #if defined( USE_COLOR_ALPHA )
        {
          float vao = mix(1.0, vColor.a, uVertexAO);
          reflectedLight.indirectDiffuse *= vao;
          reflectedLight.indirectSpecular *= mix(1.0, vao, 0.7);
          reflectedLight.directDiffuse *= mix(1.0, vao, 0.35);
          #ifdef USE_SHEEN
            sheenSpecularIndirect *= vao;
          #endif
        }
        #endif`,
      );
  };
  mat.customProgramCacheKey = () => AO_PATCH_KEY;
}

/** Build one material from a finish. */
export function finishMaterial(name: string, f: Finish, maps?: DetailTextures): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    color: f.color,
    roughness: f.roughness,
    metalness: f.metalness ?? 0,
    clearcoat: f.clearcoat ?? 0,
    clearcoatRoughness: f.clearcoatRoughness ?? 0,
    sheen: f.sheen ?? 0,
    sheenRoughness: f.sheenRoughness ?? 0.5,
    sheenColor: f.sheenColor ?? '#ffffff',
    specularIntensity: f.specularIntensity ?? 0.6,
    envMapIntensity: f.envMapIntensity ?? 1,
    transparent: f.transparent ?? false,
    opacity: f.opacity ?? 1,
    vertexColors: true,
  });
  m.name = name;
  if (f.transparent) m.depthWrite = false;
  if (maps && f.normal) {
    const t = maps[f.normal].clone();
    const [rx, ry] = f.repeat ?? [1, 1];
    t.repeat.set(rx || 1e-4, ry || 1e-4);
    m.normalMap = t;
    m.normalScale.setScalar(f.normalScale ?? 0.3);
  }
  if (maps && f.speckle) {
    const t = maps.speckle.clone();
    t.repeat.set(f.speckle, f.speckle);
    m.map = t;
  }
  patchVertexAO(m, f.ao ?? 1);
  return m;
}

/**
 * The cast's materials for a scheme, keyed by GLB material name (faces excluded: see
 * createFaceMaterial). Share the returned map across all five examiners.
 */
export function createExaminerMaterials(scheme: Scheme, maps?: DetailTextures): Map<string, THREE.MeshPhysicalMaterial> {
  const out = new Map<string, THREE.MeshPhysicalMaterial>();
  for (const [name, f] of Object.entries(FINISH[scheme])) out.set(name, finishMaterial(name, f, maps));
  return out;
}
