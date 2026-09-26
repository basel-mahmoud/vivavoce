import * as THREE from 'three';
import type { Text } from 'troika-three-text';
import {
  ARM_LENGTH,
  COIN,
  GRIP,
  HEAD_LIMITS,
  LOUPE,
  PADDLE_SIDE,
  POSES,
  REST_POSE,
  VISORS,
  bendArms,
  resolveHand,
  setCurl,
  setPaddleFlip,
  type ArmRig,
  type ExaminerKey,
  type ExaminerNodes,
  type HandPose,
  type Side,
} from '../examiners/rig';
import { lensOnFace, type FaceController, type FaceLens, type FaceState } from '../examiners/faceMaterial';
import type { ExaminerChannel, Gesture, LookAt, PanelChannels } from './channels';

/* ── Motion constants (seconds, radians, world units) ─────────────────── */

/** Anticipation: the paddle hand presses down before it lifts. */
const DIP = 0.1;
const DIP_DEPTH = 0.035;
/** Raise spring: about 0.45 s to arrive, with a small overshoot that settles. */
const RAISE = { k: 105, c: 12.5 };
/** Lowering never bounces (it would push the hand into the bench). */
const LOWER = { k: 70, c: 17 };
/** The flip that shows the mark: quick, with a little wobble at the end. */
const FLIP = { k: 190, c: 15 };
/** When the rising paddle turns its mark to the room. */
const FLIP_AT = 0.8;

/**
 * Waypoints (seat frame) the coin passes between the bench and its raised spot. It rises in front
 * of its own examiner until it clears the neighbours' heads, so no paddle ever sweeps through
 * the examiner beside it on the way up or down.
 */
const PADDLE_PATH: Record<ExaminerKey, readonly (readonly [number, number, number])[]> = {
  correctness: [[-0.5, 0.62, 0.74]],
  clarity: [
    [0.08, 0.52, 0.74],
    [0.06, 1.74, 0.7],
  ],
  structure: [[0.42, 0.56, 0.74]],
  conciseness: [
    [-0.02, 0.4, 0.74],
    [-0.02, 1.4, 0.72],
  ],
  confidence: [[0.62, 0.62, 0.74]],
};
/** Free-hand gesture blend time. */
const GESTURE_TIME = 0.5;
/** Face expression cross-blend time. */
const FACE_TIME = 0.18;

const damp = THREE.MathUtils.damp;
const clamp = THREE.MathUtils.clamp;
const smoothstep = THREE.MathUtils.smoothstep;

interface Spring {
  x: number;
  v: number;
}

/** Semi-implicit spring, sub-stepped so a slow frame never destabilises it. */
function stepSpring(s: Spring, target: number, dt: number, p: { k: number; c: number }) {
  let left = dt;
  while (left > 1e-6) {
    const h = Math.min(left, 1 / 90);
    s.v += (-p.k * (s.x - target) - p.c * s.v) * h;
    s.x += s.v * h;
    left -= h;
  }
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** A deterministic 0..1 hash, so each examiner's idle life is its own and stable across renders. */
function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface Hand {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  curl: number;
}

const hand = (): Hand => ({ pos: new THREE.Vector3(), quat: new THREE.Quaternion(), curl: 0 });
const fromResolved = (h: HandPose, side: Side): Hand => {
  const r = resolveHand(h, side);
  return { pos: r.position, quat: r.quaternion, curl: r.curl };
};
const copyHand = (to: Hand, from: Hand) => {
  to.pos.copy(from.pos);
  to.quat.copy(from.quat);
  to.curl = from.curl;
};

/* ── Scratch (shared by every examiner; update() is synchronous) ──────── */

const _up = new THREE.Vector3();
const _back = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _grip = new THREE.Vector3();
const _basis = new THREE.Matrix4();
const _camR = new THREE.Vector3();
const _coinR = new THREE.Vector3();
const _face = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _tmp2 = new THREE.Vector3();
const _look = new THREE.Vector3();
const _n = new THREE.Vector3();
const _p = new THREE.Vector3();
const GRIP_V = new THREE.Vector3(...GRIP);
const UP_WORLD_L = new THREE.Vector3(0.3, 1, 0);
const UP_WORLD_R = new THREE.Vector3(-0.3, 1, 0);

/**
 * The wrist transform that holds a paddle's coin centre at `coin` with its face toward `facing`
 * (root frame): rig.ts resolveHand() for a held coin, rewritten to fill `out` without allocating.
 */
function holdCoin(coin: THREE.Vector3, facing: THREE.Vector3, up: THREE.Vector3, side: Side, reach: number, out: Hand) {
  _up.copy(up).normalize();
  _back.copy(facing).addScaledVector(_up, -facing.dot(_up)).normalize();
  _x.copy(_up).multiplyScalar(side === 'L' ? -1 : 1);
  _y.crossVectors(_back, _x).normalize();
  _basis.makeBasis(_x, _y, _back);
  out.quat.setFromRotationMatrix(_basis);
  _grip.copy(GRIP_V).applyQuaternion(out.quat);
  out.pos.copy(coin).sub(_grip).addScaledVector(_up, -reach);
  out.curl = 1;
}

/** Everything one examiner needs at runtime, created once by the cast. */
export interface ExaminerParts {
  key: ExaminerKey;
  index: number;
  nodes: ExaminerNodes;
  face: FaceController;
  visor: THREE.Object3D;
  coinMaterial: THREE.MeshPhysicalMaterial;
  markText: Text;
  nameText: Text;
  markMaterial: THREE.MeshPhysicalMaterial;
  front: THREE.Object3D;
  back: THREE.Object3D;
  loupe?: THREE.Object3D;
}

/** Colours the coin and its mark move between (the coal coin and the examiner's red pen). */
export interface CoinLook {
  coal: THREE.Color;
  hot: THREE.Color;
  markPaper: THREE.Color;
  markCoal: THREE.Color;
  coalFinish: { roughness: number; clearcoat: number; clearcoatRoughness: number; specularIntensity: number };
  hotFinish: { roughness: number; clearcoat: number; clearcoatRoughness: number; specularIntensity: number };
}

/**
 * One examiner, animated from its channel. Order of operations each frame: stagger the targets,
 * spring the paddle (anticipation dip, rise along an arc, settle, then the flip), blend the free
 * hand, turn eyes then head then body toward the look target, breathe, then rebuild the arms so
 * the mittens always stay joined to their sockets.
 */
export class ExaminerRuntime {
  readonly key: ExaminerKey;
  readonly index: number;
  readonly parts: ExaminerParts;
  private readonly paddleSide: Side;
  private readonly freeSide: Side;
  private readonly rest: Record<Side, Hand>;
  private readonly gestures: Record<Gesture, Hand>;
  private readonly arms: ArmRig;
  private readonly rootInv = new THREE.Matrix4();
  private readonly visorRoot: THREE.Vector3;
  private readonly headLimit: number;

  private readonly raised = hand();
  private readonly paddleHand = hand();
  /** The coin's path, seat frame: rest, waypoints, raised (the ends are refreshed every frame). */
  private readonly path: THREE.Vector3[];
  private readonly coinLocal: THREE.Vector3;
  private readonly freeHand = hand();
  private readonly gestureFrom = hand();
  private readonly coinW = new THREE.Vector3();
  private coinReady = false;

  private raise: Spring = { x: 0, v: 0 };
  private flip: Spring = { x: Math.PI, v: 0 };
  private paddleGoal = 0;
  private paddleWant = 0;
  private paddleWantAt = 0;
  private dipAt = -10;

  private gesture: Gesture = 'rest';
  private gestureT = 1;

  private look: LookAt = 'camera';
  private lookWant: LookAt = 'camera';
  private lookWantAt = 0;

  private yawBody = 0;
  private yawHead = 0;
  private pitchHead = 0;
  private pitchBody = 0;
  private eyeX = 0;
  private eyeY = 0;
  private sacX = 0;
  private sacY = 0;
  private nextSaccade: number;

  private nextBlink: number;
  private blinkAt = -10;
  private blinkTwice = false;

  private faceA: FaceState = 'neutral';
  private faceB: FaceState = 'neutral';
  private faceT = 1;

  private hot = 0;
  private focus = 0;
  private speaking = 0;
  private mark = -1;
  private lensOn = false;
  private readonly lens: FaceLens = { x: 0, y: 0, radius: 0, magnification: 1 };
  private first = true;

  constructor(parts: ExaminerParts) {
    this.parts = parts;
    this.key = parts.key;
    this.index = parts.index;
    this.paddleSide = PADDLE_SIDE[parts.key];
    this.freeSide = this.paddleSide === 'L' ? 'R' : 'L';
    const r = REST_POSE[parts.key];
    this.rest = {
      L: { pos: new THREE.Vector3(...r.L.pos), quat: new THREE.Quaternion(...r.L.quat), curl: r.L.curl },
      R: { pos: new THREE.Vector3(...r.R.pos), quat: new THREE.Quaternion(...r.R.quat), curl: r.R.curl },
    };
    const f = this.freeSide;
    const poses = POSES[parts.key];
    this.gestures = {
      rest: this.rest[f],
      present: fromResolved(poses.present[f], f),
      chin: fromResolved(poses.chinTap[f], f),
      loupe: parts.key === 'clarity' ? fromResolved(POSES.loupe[f], f) : fromResolved(poses.present[f], f),
    };
    copyHand(this.freeHand, this.rest[f]);
    copyHand(this.gestureFrom, this.rest[f]);
    copyHand(this.paddleHand, this.rest[this.paddleSide]);
    // the coin centre in the wrist's frame: along the handle from the grip
    this.coinLocal = new THREE.Vector3(...GRIP).add(new THREE.Vector3((this.paddleSide === 'L' ? -1 : 1) * COIN.discCentre, 0, 0));
    const restHand = this.rest[this.paddleSide];
    this.path = [
      this.coinLocal.clone().applyQuaternion(restHand.quat).add(restHand.pos),
      ...PADDLE_PATH[parts.key].map((w) => new THREE.Vector3(...w)),
      new THREE.Vector3(),
    ];

    const n = parts.nodes;
    this.arms = { mesh: n.arms, socket: n.socket, wrist: n.wrist, length: ARM_LENGTH[parts.key] };
    n.root.updateWorldMatrix(true, false);
    this.rootInv.copy(n.root.matrixWorld).invert();
    this.visorRoot = new THREE.Vector3(...VISORS[parts.key].centre);
    this.headLimit = parts.key === 'structure' ? HEAD_LIMITS.structureYaw : HEAD_LIMITS.yaw;

    const seed = parts.index + 1;
    this.nextBlink = 1.2 + hash(seed) * 3.5;
    this.nextSaccade = 0.4 + hash(seed * 3.1) * 1.4;
  }

  /** The root frame is fixed; call again only if the panel is moved. */
  refreshRoot() {
    this.parts.nodes.root.updateWorldMatrix(true, false);
    this.rootInv.copy(this.parts.nodes.root.matrixWorld).invert();
  }

  /** World position of this examiner's visor centre (what the others turn to look at). */
  visorWorld(out: THREE.Vector3) {
    return this.parts.visor.getWorldPosition(out);
  }

  update(
    time: number,
    dt: number,
    camera: THREE.Camera,
    ch: ExaminerChannel,
    all: PanelChannels,
    lookTargets: readonly THREE.Vector3[],
    pointerWorld: THREE.Vector3,
  ) {
    const still = all.still || this.first;
    const { nodes, face } = this.parts;
    const i = this.index;

    /* Marks: re-set the paddle's number when a new round is scored. */
    if (ch.mark !== this.mark) {
      this.mark = ch.mark;
      this.parts.markText.text = String(ch.mark);
      this.parts.markText.sync();
    }

    /* Paddle: stagger, anticipation, rise, flip. */
    if (ch.paddle !== this.paddleWant) {
      this.paddleWant = ch.paddle;
      this.paddleWantAt = time;
    }
    if (this.paddleGoal !== this.paddleWant && (still || time - this.paddleWantAt >= ch.delay)) {
      if (this.paddleWant > this.paddleGoal && !still) this.dipAt = time;
      this.paddleGoal = this.paddleWant;
    }
    const dipT = time - this.dipAt;
    const dip = !still && dipT >= 0 && dipT < DIP ? Math.sin((Math.PI * dipT) / DIP) : 0;
    const rising = this.paddleGoal > 0.5;
    if (still) {
      this.raise.x = this.paddleGoal;
      this.raise.v = 0;
      this.flip.x = rising ? 0 : Math.PI;
      this.flip.v = 0;
    } else {
      stepSpring(this.raise, dipT >= 0 && dipT < DIP ? 0 : this.paddleGoal, dt, rising ? RAISE : LOWER);
      stepSpring(this.flip, rising && this.raise.x > FLIP_AT ? 0 : Math.PI, dt, FLIP);
    }

    /* The raised hand faces its mark to the camera wherever the camera is. */
    if (!this.coinReady || still) {
      this.coinW.copy(ch.coin);
      this.coinReady = true;
    } else {
      this.coinW.x = damp(this.coinW.x, ch.coin.x, 5, dt);
      this.coinW.y = damp(this.coinW.y, ch.coin.y, 5, dt);
      this.coinW.z = damp(this.coinW.z, ch.coin.z, 5, dt);
    }
    _coinR.copy(this.coinW).applyMatrix4(this.rootInv);
    _camR.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(this.rootInv);
    _face.copy(_camR).sub(_coinR).normalize();
    _tmp.copy(this.paddleSide === 'L' ? UP_WORLD_L : UP_WORLD_R).transformDirection(this.rootInv);
    // a paddle held above or below the lens tips toward it, so the mark never reads edge-on
    _tmp.addScaledVector(_face, -_tmp.dot(_face) * 0.65).normalize();
    holdCoin(_coinR, _face, _tmp, this.paddleSide, COIN.discCentre, this.raised);

    const rest = this.rest[this.paddleSide];
    const r = Math.max(0, this.raise.x);
    const rc = Math.min(1, r);
    // the coin travels its path (bench, up in front of its own examiner, out to the mark); the
    // paddle turns upright on the way, and the wrist follows from wherever the coin is
    this.path[this.path.length - 1]!.copy(_coinR);
    along(this.path, rc, _p);
    if (r > 1) {
      _tmp.copy(_coinR).sub(this.path[this.path.length - 2]!).normalize();
      _p.addScaledVector(_tmp, (r - 1) * 0.3);
    }
    if (dip > 0) {
      _p.y -= DIP_DEPTH * dip;
      _p.z -= DIP_DEPTH * 0.4 * dip;
    }
    this.paddleHand.quat.slerpQuaternions(rest.quat, this.raised.quat, smoothstep(rc, 0.08, 0.78));
    this.paddleHand.pos.copy(this.coinLocal).applyQuaternion(this.paddleHand.quat).negate().add(_p);
    this.paddleHand.curl = 1;

    /* The free hand: rest, present, chin or loupe, blended from wherever it is now. */
    if (ch.gesture !== this.gesture) {
      copyHand(this.gestureFrom, this.freeHand);
      this.gesture = ch.gesture;
      this.gestureT = still ? 1 : 0;
    }
    this.gestureT = still ? 1 : Math.min(1, this.gestureT + dt / GESTURE_TIME);
    const g = this.gestures[this.gesture];
    const ge = easeInOut(this.gestureT);
    this.freeHand.pos.lerpVectors(this.gestureFrom.pos, g.pos, ge);
    // travel in an arc, so a hand leaving the bench never slides through it
    this.freeHand.pos.y += Math.sin(Math.PI * ge) * 0.06 * (this.gestureT < 1 ? 1 : 0);
    this.freeHand.quat.slerpQuaternions(this.gestureFrom.quat, g.quat, ge);
    this.freeHand.curl = this.gestureFrom.curl + (g.curl - this.gestureFrom.curl) * ge;

    /* Speaking: a small beat of the offered hand, in time with the words. */
    this.speaking = still ? ch.speaking : damp(this.speaking, ch.speaking, 8, dt);
    if (!still && this.speaking > 0.01 && this.gesture === 'present') {
      const beat = this.speaking * (all.speech - 0.35);
      this.freeHand.pos.y += 0.03 * beat;
      this.freeHand.pos.z += 0.015 * beat;
    }

    /* Look: eyes lead, the head follows, the body lags; the stagger delays the turn. */
    if (ch.look !== this.lookWant) {
      this.lookWant = ch.look;
      this.lookWantAt = time;
    }
    if (this.look !== this.lookWant) {
      const steps = typeof this.lookWant === 'number' ? Math.max(1, Math.abs(this.lookWant - i)) : i + 1;
      const wait = typeof this.lookWant === 'number' ? Math.min(0.12, 0.03 + 0.03 * steps) : 0.02 * steps;
      if (still || time - this.lookWantAt >= wait) {
        // a big change of target draws a blink, like a person turning
        if (!still && typeof this.lookWant !== typeof this.look) this.nextBlink = Math.min(this.nextBlink, time + 0.04);
        this.look = this.lookWant;
      }
    }
    const lk = this.look;
    if (lk === 'camera') _look.setFromMatrixPosition(camera.matrixWorld);
    else if (lk === 'pointer') _look.copy(pointerWorld);
    else _look.copy(lookTargets[lk] ?? pointerWorld);
    _look.applyMatrix4(this.rootInv).sub(this.visorRoot);
    const gaze = clamp(Math.atan2(_look.x, _look.z), -0.95, 0.95);
    const pitch = -Math.atan2(_look.y, Math.hypot(_look.x, _look.z));
    let yaw = gaze;
    if (typeof lk === 'number') {
      // turning to another examiner is limited by how far away it sits: a neighbour glances,
      // mostly with its eyes, so no face ever swings out of the camera's view
      _camR.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(this.rootInv).sub(this.visorRoot);
      const toCamera = Math.atan2(_camR.x, _camR.z);
      const reach = Math.min(0.5, 0.13 * Math.abs(lk - i));
      yaw = toCamera + clamp(gaze - toCamera, -reach, reach);
    }
    const bodyYawT = clamp(yaw * 0.42, -0.2, 0.2);
    const headYawT = clamp(yaw - bodyYawT, -this.headLimit * 1.2, this.headLimit * 1.2);
    const headPitchT = clamp(pitch * 0.55, -HEAD_LIMITS.pitch, HEAD_LIMITS.pitch);
    this.focus = still ? ch.focus : damp(this.focus, ch.focus, 5, dt);
    const lean = 0.015 + this.focus * 0.075 + this.speaking * 0.025;
    if (still) {
      this.yawBody = bodyYawT;
      this.yawHead = headYawT;
      this.pitchHead = headPitchT;
      this.pitchBody = lean;
    } else {
      this.yawBody = damp(this.yawBody, bodyYawT, 3.2, dt);
      this.yawHead = damp(this.yawHead, headYawT, 8.5, dt);
      this.pitchHead = damp(this.pitchHead, headPitchT, 8.5, dt);
      this.pitchBody = damp(this.pitchBody, lean, 4.5, dt);
    }

    /* Saccades: small jumps of the gaze every 0.6 to 2.2 s. */
    if (!still && time >= this.nextSaccade) {
      const s = hash(time * 13.7 + i * 7.3);
      this.sacX = (hash(time * 3.1 + i) - 0.5) * 0.06;
      this.sacY = (s - 0.5) * 0.035;
      this.nextSaccade = time + 0.6 + hash(time + i * 1.7) * 1.6;
    }
    const eyeXT = clamp((gaze - this.yawBody - this.yawHead) * 0.5, -0.15, 0.15) + (still ? 0 : this.sacX);
    const eyeYT = clamp((pitch - this.pitchHead) * 0.45, -0.1, 0.1) + (still ? 0 : this.sacY);
    if (still) {
      this.eyeX = eyeXT;
      this.eyeY = eyeYT;
    } else {
      this.eyeX = damp(this.eyeX, eyeXT, 30, dt);
      this.eyeY = damp(this.eyeY, eyeYT, 30, dt);
    }

    /* Idle life: desynchronised breathing (under 2%), a slow sway, a nod while speaking. */
    const period = 3.3 + hash(i * 5.3) * 1.5;
    const breath = still ? 0 : Math.sin((time / period) * Math.PI * 2 + i * 1.9) * 0.011;
    const sway = still ? 0 : Math.sin(time * 0.37 + i * 2.1) * 0.012 + Math.sin(time * 0.81 + i) * 0.005;
    const nod = still ? 0 : this.speaking * (all.speech - 0.45) * 0.05;
    nodes.body.rotation.set(this.pitchBody, this.yawBody + sway, 0, 'YXZ');
    const sy = 1 + breath;
    const sxz = 1 / Math.sqrt(sy);
    nodes.body.scale.set(sxz, sy, sxz);
    nodes.head.rotation.set(this.pitchHead + nod, this.yawHead + sway * 0.6, sway * 0.4, 'YXZ');

    /* Hands. */
    const P = this.paddleSide;
    const F = this.freeSide;
    nodes.wrist[P].position.copy(this.paddleHand.pos);
    nodes.wrist[P].quaternion.copy(this.paddleHand.quat);
    nodes.wrist[F].position.copy(this.freeHand.pos);
    nodes.wrist[F].quaternion.copy(this.freeHand.quat);
    setCurl(nodes.mitten[P], this.paddleHand.curl);
    setCurl(nodes.mitten[F], this.freeHand.curl);
    setPaddleFlip(nodes.paddle, P, this.flip.x);
    if (nodes.needle) {
      const swing = still ? 0.16 : Math.sin(time * Math.PI * 1.6 * all.tempo) * 0.16;
      nodes.needle.rotation.z = swing;
    }
    nodes.root.updateMatrixWorld(true);
    bendArms(this.arms);

    /* Face. */
    const want: FaceState = this.speaking > 0.5 || (still && ch.speaking > 0.5) ? 'speaking' : ch.face;
    if (want !== this.faceB) {
      this.faceA = this.faceT < 0.5 ? this.faceA : this.faceB;
      this.faceB = want;
      this.faceT = still ? 1 : 0;
    }
    this.faceT = still ? 1 : Math.min(1, this.faceT + dt / FACE_TIME);
    if (this.faceT >= 1) this.faceA = this.faceB;
    face.setState(this.faceA, this.faceB, easeOut(this.faceT));
    face.setSpeakLevel(this.speaking > 0.01 ? 0.35 + 0.65 * all.speech : 0);
    face.setWaveform(all.waveLive ? all.wave : null);
    face.setProgress(all.progress);
    face.setTime(still ? 0 : time);
    face.setTally(this.speaking);

    /* Blinks every 2 to 6 s, about one in seven doubled: close 60 ms, hold 30, open 120. */
    let blink = 0;
    if (!still) {
      if (time >= this.nextBlink) {
        this.blinkAt = time;
        this.blinkTwice = hash(time * 0.77 + i) < 0.15;
        this.nextBlink = time + 2 + hash(time * 1.31 + i * 9.1) * 4;
      }
      const bt = time - this.blinkAt;
      blink = blinkCurve(bt) + (this.blinkTwice ? blinkCurve(bt - 0.26) : 0);
    }
    face.setBlink(Math.min(1, blink));
    face.setLook(this.eyeX, this.eyeY);

    /* Clarity's loupe magnifies the eye behind it. */
    if (this.parts.loupe) {
      const peering = this.gesture === 'loupe' && this.gestureT > 0.85;
      if (peering) {
        this.parts.loupe.updateWorldMatrix(true, false);
        _p.set(0, LOUPE.lensCentre, 0).applyMatrix4(this.parts.loupe.matrixWorld);
        const v = VISORS.clarity;
        const hit = lensOnFace(camera, _p, LOUPE.lensRadius, this.parts.visor, v.halfWidth, v.halfHeight, LOUPE.magnification, this.lens);
        face.setLens(hit);
        this.lensOn = Boolean(hit);
      } else if (this.lensOn) {
        face.setLens(null);
        this.lensOn = false;
      }
    }

    /* The coin: coal, or the examiner's red pen. */
    this.hot = still ? ch.hot : damp(this.hot, ch.hot, 9, dt);
    this.paintCoin();

    /* Draw only the paddle face that points at the camera. */
    _camR.setFromMatrixPosition(camera.matrixWorld);
    this.parts.markText.visible = facesCamera(this.parts.front, _camR);
    this.parts.nameText.visible = facesCamera(this.parts.back, _camR);

    this.first = false;
  }

  private coinLook: CoinLook | null = null;

  setCoinLook(look: CoinLook) {
    this.coinLook = look;
    this.paintCoin();
  }

  private paintCoin() {
    const c = this.coinLook;
    if (!c) return;
    const h = clamp(this.hot, 0, 1);
    const m = this.parts.coinMaterial;
    m.color.lerpColors(c.coal, c.hot, h);
    m.roughness = c.coalFinish.roughness + (c.hotFinish.roughness - c.coalFinish.roughness) * h;
    m.clearcoat = c.coalFinish.clearcoat + (c.hotFinish.clearcoat - c.coalFinish.clearcoat) * h;
    m.clearcoatRoughness =
      c.coalFinish.clearcoatRoughness + (c.hotFinish.clearcoatRoughness - c.coalFinish.clearcoatRoughness) * h;
    m.specularIntensity = c.coalFinish.specularIntensity + (c.hotFinish.specularIntensity - c.coalFinish.specularIntensity) * h;
    this.parts.markMaterial.color.lerpColors(c.markPaper, c.markCoal, smoothstep(h, 0.35, 0.65));
  }
}

const _seg = new Float32Array(8);

/** A point at fraction t along a Catmull-Rom curve through `pts`, spaced by chord length. */
function along(pts: THREE.Vector3[], t: number, out: THREE.Vector3) {
  const n = pts.length;
  let total = 0;
  for (let i = 0; i < n - 1; i++) {
    _seg[i] = pts[i]!.distanceTo(pts[i + 1]!);
    total += _seg[i]!;
  }
  let d = Math.min(1, Math.max(0, t)) * total;
  let i = 0;
  while (i < n - 2 && d > _seg[i]!) {
    d -= _seg[i]!;
    i++;
  }
  const u = _seg[i]! > 1e-6 ? Math.min(1, d / _seg[i]!) : 0;
  const p0 = pts[Math.max(0, i - 1)]!;
  const p1 = pts[i]!;
  const p2 = pts[i + 1]!;
  const p3 = pts[Math.min(n - 1, i + 2)]!;
  const u2 = u * u;
  const u3 = u2 * u;
  out.x = 0.5 * (2 * p1.x + (-p0.x + p2.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3);
  out.y = 0.5 * (2 * p1.y + (-p0.y + p2.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3);
  out.z = 0.5 * (2 * p1.z + (-p0.z + p2.z) * u + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * u2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * u3);
  return out;
}

function blinkCurve(t: number) {
  if (t < 0 || t > 0.21) return 0;
  if (t < 0.06) return t / 0.06;
  if (t < 0.09) return 1;
  return 1 - (t - 0.09) / 0.12;
}

function facesCamera(anchor: THREE.Object3D, camWorld: THREE.Vector3) {
  anchor.updateWorldMatrix(true, false);
  _n.set(0, 0, 1).transformDirection(anchor.matrixWorld);
  _tmp2.setFromMatrixPosition(anchor.matrixWorld);
  _tmp.copy(camWorld).sub(_tmp2).normalize();
  return _n.dot(_tmp) > -0.05;
}
