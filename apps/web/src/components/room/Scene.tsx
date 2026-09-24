'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Html, Lightformer, RoundedBox, Text } from '@react-three/drei';
import type { MotionValue } from 'motion/react';
import { configureTextBuilder } from 'troika-three-text';
import { AXES, ROUNDS, weakestIndex, type RoundPhase } from './data';
import { HERO_END, OUTRO, STOPS, STOP_POSES, beatAt, settle, type PoseName } from './story';
import { TypeLine } from './TypeLine';

// Troika builds glyph atlases in a blob-URL worker, which the site's CSP
// (script-src without blob:) forbids. A handful of short labels is cheap to
// build on the main thread, so keep the policy strict and skip the worker.
configureTextBuilder({ useWorker: false });

/* ── World constants ──────────────────────────────────────────────────────── */

const FONT_DISPLAY = '/fonts/archivo-900.woff';
const FONT_MONO = '/fonts/jetbrains-mono-700.woff';

const COLOR = {
  cobalt: '#2E45FF',
  cobaltDeep: '#1F31C9',
  coal: '#1B1917',
  verm: '#FF4D26',
  butter: '#FFC838',
  paper: '#FBFAF8',
} as const;

const FOV = 34;
const SPACING = 2.3;
const XS = [-2, -1, 0, 1, 2].map((i) => i * SPACING);
const TOP = 0.08; // desk surface
const FLOOR = -1.9;
const SEAT_Z = -2.05;
const DESK_W = 11.8;
const DESK_D = 2.5;
/** How far below its raised height a paddle rests: fully under the desk line. */
const PADDLE_DROP = 3.5;
/** Per-examiner silhouettes and clays. Vermilion is reserved for whoever is speaking. */
const BUILD = [
  { body: 1.0, head: 0.46, extra: 'none', clay: '#2B2723', clayDark: '#4A433C', eye: COLOR.paper },
  { body: 1.1, head: 0.44, extra: 'bun', clay: '#FFC838', clayDark: '#FFC838', eye: COLOR.coal },
  { body: 1.32, head: 0.47, extra: 'none', clay: '#EEEAE2', clayDark: '#EEEAE2', eye: COLOR.coal },
  { body: 1.04, head: 0.45, extra: 'glasses', clay: '#C9C4BB', clayDark: '#C9C4BB', eye: COLOR.coal },
  { body: 0.92, head: 0.48, extra: 'none', clay: '#3347FF', clayDark: '#4A5CFF', eye: COLOR.paper },
] as const;

/* ── Motion helpers ───────────────────────────────────────────────────────── */

const damp = THREE.MathUtils.damp;

interface Spring {
  x: number;
  v: number;
}
/** Semi-implicit spring step. A little overshoot reads as a paddle snapped up by hand. */
function stepSpring(s: Spring, target: number, dt: number, k = 150, c = 15) {
  const f = -k * (s.x - target) - c * s.v;
  s.v += f * dt;
  s.x += s.v * dt;
}

/** Live animation targets for one examiner; the director writes, the figure reads. */
interface Rig {
  focus: number;
  recede: number;
  paddle: number;
  hot: number;
  speaking: boolean;
  delay: number;
}

export interface RoundState {
  index: number;
  phase: RoundPhase;
}

/** Where the DOM captions end, as fractions of the stage height (compact layouts). */
export interface Insets {
  hero: number;
  beat: number;
  outro: number;
}

export interface SceneProps {
  progress: MotionValue<number>;
  active: boolean;
  reduce: boolean;
  dark: boolean;
  /** The scripted example round, or null for the still, marked panel. */
  round: RoundState | null;
  insets: Insets;
  onReady: () => void;
}

/* ── Camera: every stop is fitted, never hand-tuned ───────────────────────── */

interface Pose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  /** lens shift as a fraction of the frame: +x moves the subject right, +y down */
  sx: number;
  sy: number;
}

/** The free part of the frame at each stop, clear of the captions (fractions). */
interface Region {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Bounding points of one examiner: body, head, raised paddle, placard. */
function figurePoints(i: number, lift = 0): THREE.Vector3[] {
  const x = XS[i]!;
  const b = BUILD[i]!;
  const crown = 0.35 + b.body + 0.62 + b.head * 1.92 + (b.extra === 'bun' ? 0.2 : 0) + lift;
  const pts: THREE.Vector3[] = [];
  for (const dx of [-0.68, 0.68]) {
    for (const z of [SEAT_Z - 0.64, SEAT_Z + 0.64]) pts.push(V(x + dx, TOP, z), V(x + dx, crown, z));
  }
  for (const dx of [0.44, 1.52]) pts.push(V(x + dx, 2.02 + lift, SEAT_Z + 0.62), V(x + dx, 3.1 + lift, SEAT_Z + 0.62));
  for (const dx of [-0.97, 0.97]) pts.push(V(x + dx, TOP, SEAT_Z + 1.3), V(x + dx, TOP + 0.54, SEAT_Z + 1.05));
  return pts;
}

const scratch = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);
const probe = new THREE.Vector3();

/**
 * Finds the nearest camera distance along `dir` at which every point fits the
 * region, then lens-shifts so the points sit centred in it. Holds at any
 * aspect ratio, so nothing the story needs is ever cropped.
 */
function frame(points: THREE.Vector3[], look: THREE.Vector3, dir: THREE.Vector3, aspect: number, r: Region): Pose {
  scratch.aspect = aspect;
  scratch.updateProjectionMatrix();
  const measure = (d: number) => {
    scratch.position.copy(look).addScaledVector(dir, d);
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
  let lo = 3;
  let hi = 180;
  for (let k = 0; k < 32; k++) {
    const mid = (lo + hi) / 2;
    const b = measure(mid);
    if (b.x1 - b.x0 <= r.x1 - r.x0 && b.y1 - b.y0 <= r.y1 - r.y0) hi = mid;
    else lo = mid;
  }
  const b = measure(hi);
  return {
    pos: look.clone().addScaledVector(dir, hi),
    look: look.clone(),
    sx: (r.x0 + r.x1) / 2 - (b.x0 + b.x1) / 2,
    sy: (r.y0 + r.y1) / 2 - (b.y0 + b.y1) / 2,
  };
}

function makePoses(aspect: number, insets: Insets): Record<string, Pose> {
  const compact = aspect < 1.05;
  const R = compact
    ? {
        hero: { x0: 0.03, x1: 0.97, y0: insets.hero + 0.02, y1: 0.93 },
        beat: { x0: 0.08, x1: 0.92, y0: insets.beat + 0.03, y1: 0.87 },
        outro: { x0: 0.03, x1: 0.97, y0: insets.outro + 0.02, y1: 0.9 },
      }
    : {
        hero: { x0: 0.47, x1: 0.985, y0: 0.12, y1: 0.9 },
        beat: { x0: 0.5, x1: 0.96, y0: 0.15, y1: 0.86 },
        outro: { x0: 0.47, x1: 0.985, y0: 0.14, y1: 0.88 },
      };

  const panel = XS.flatMap((_, i) => figurePoints(i));
  const half = (DESK_W + 0.34) / 2;
  const deskTop = [V(-half, TOP, 1.4), V(half, TOP, 1.4), V(-half, TOP, -1.4), V(half, TOP, -1.4)];
  const deskBase = [V(-half, FLOOR, 1.3), V(half, FLOOR, 1.3)];
  // Headroom for the examiner's speech bubble above the panel.
  const bubble = XS.map((x) => V(x * (compact ? 0.55 : 0.88), 4.5, SEAT_Z));

  // The hero is the hot seat: low, across the bench, the panel looking back.
  const hero = frame(
    [...panel, ...deskTop, ...bubble],
    V(0, 1.4, -1.2),
    V(0, compact ? 0.22 : 0.14, 1).normalize(),
    aspect,
    R.hero,
  );
  // The outro rises over the whole marked bench.
  const outro = frame([...panel, ...deskTop, ...deskBase], V(0, 0.4, -0.6), V(0.12, 0.9, 1).normalize(), aspect, R.outro);

  const poses: Record<string, Pose> = { hero, outro };
  XS.forEach((x, i) => {
    poses[String(i)] = frame(
      figurePoints(i, 0.3),
      V(x - 0.1, 1.6, SEAT_Z + 0.4),
      V(0.24, 0.17, 1).normalize(),
      aspect,
      R.beat,
    );
  });
  return poses;
}

/* ── Director: scroll + round → camera and examiner targets ───────────────── */

function Director({
  progress,
  round,
  rigsRef,
  micRef,
  dingRef,
  reduce,
  insets,
}: {
  progress: MotionValue<number>;
  round: RoundState | null;
  rigsRef: React.RefObject<Rig[]>;
  micRef: React.RefObject<number>;
  dingRef: React.RefObject<number>;
  reduce: boolean;
  insets: Insets;
}) {
  const size = useThree((s) => s.size);
  const poses = useMemo(
    () => makePoses(size.width / Math.max(1, size.height), insets),
    [size.width, size.height, insets],
  );
  const look = useRef(new THREE.Vector3().copy(poses.hero!.look));
  const shift = useRef({ x: poses.hero!.sx, y: poses.hero!.sy });
  const pointer = useRef({ x: 0, y: 0 });
  const phaseStart = useRef(0);
  const targetRef = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3() });
  const first = useRef(true);

  // Phase edges: remember when each began, ring the bell on a follow-up.
  useEffect(() => {
    phaseStart.current = performance.now();
    if (round?.phase === 'follow') dingRef.current = performance.now();
  }, [round?.index, round?.phase, dingRef]);

  useEffect(() => {
    if (reduce || !window.matchMedia('(pointer: fine)').matches) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduce]);

  useFrame((state, rawDt) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const target = targetRef.current;
    const dt = Math.min(rawDt, 1 / 30);
    const p = reduce ? 0 : progress.get();

    // Camera: blend between the two stops around p, then damp toward it.
    let k = 0;
    while (k < STOPS.length - 2 && p > STOPS[k + 1]!) k++;
    const t = settle((p - STOPS[k]!) / (STOPS[k + 1]! - STOPS[k]!));
    const a = poses[String(STOP_POSES[k] as PoseName)]!;
    const b = poses[String(STOP_POSES[k + 1] as PoseName)]!;
    target.pos.lerpVectors(a.pos, b.pos, t);
    target.look.lerpVectors(a.look, b.look, t);
    const targetSx = a.sx + (b.sx - a.sx) * t;
    const targetSy = a.sy + (b.sy - a.sy) * t;

    const heroW = 1 - THREE.MathUtils.smoothstep(p, HERO_END - 0.02, HERO_END + 0.05);
    target.pos.x += pointer.current.x * 0.6 * heroW;
    target.pos.y -= pointer.current.y * 0.3 * heroW;

    if (first.current || reduce) {
      cam.position.copy(target.pos);
      look.current.copy(target.look);
      shift.current.x = targetSx;
      shift.current.y = targetSy;
      first.current = false;
    } else {
      cam.position.x = damp(cam.position.x, target.pos.x, 4.2, dt);
      cam.position.y = damp(cam.position.y, target.pos.y, 4.2, dt);
      cam.position.z = damp(cam.position.z, target.pos.z, 4.2, dt);
      look.current.x = damp(look.current.x, target.look.x, 4.8, dt);
      look.current.y = damp(look.current.y, target.look.y, 4.8, dt);
      look.current.z = damp(look.current.z, target.look.z, 4.8, dt);
      shift.current.x = damp(shift.current.x, targetSx, 4.2, dt);
      shift.current.y = damp(shift.current.y, targetSy, 4.2, dt);
    }
    cam.lookAt(look.current);
    // Lens shift: render a window offset from centre so the subject sits
    // clear of the captions without changing perspective.
    const w = state.size.width;
    const h = state.size.height;
    cam.setViewOffset(w, h, -shift.current.x * w, -shift.current.y * h, w, h);

    // Examiners.
    const list = rigsRef.current;
    if (!list) return;
    const beat = beatAt(p);
    const outroW = THREE.MathUtils.smoothstep(p, OUTRO - 0.09, OUTRO - 0.03);
    const since = (performance.now() - phaseStart.current) / 1000;
    const r = round ? ROUNDS[round.index % ROUNDS.length]! : null;
    const weakest = weakestIndex(r ? r.scores : ROUNDS[0]!.scores);
    let micLive = 0;

    for (let i = 0; i < list.length; i++) {
      const rig = list[i]!;
      rig.focus = 0;
      rig.recede = 0;
      rig.paddle = 0;
      rig.hot = 0;
      rig.speaking = false;
      rig.delay = i * 0.09;

      if (heroW > 0.5 && round && r) {
        const phase = round.phase;
        if (phase === 'ask') {
          rig.focus = i === 2 ? 1 : 0;
          rig.speaking = i === 2 && since < 2.2;
        } else if (phase === 'listen') {
          micLive = 1;
        } else if (phase === 'mark') {
          rig.paddle = since > rig.delay ? 1 : 0;
        } else if (phase === 'follow') {
          rig.paddle = 1;
          rig.hot = i === weakest ? 1 : 0;
          rig.focus = i === weakest ? 1 : 0;
          rig.recede = i === weakest ? 0 : 1;
          rig.speaking = i === weakest && since < 2.4;
        }
      } else if (heroW > 0.5 && !round) {
        // The still hero (first frame, reduced motion): the marked panel.
        rig.paddle = 1;
        rig.hot = i === weakest ? 1 : 0;
        rig.focus = i === weakest ? 1 : 0;
      } else if (beat >= 0) {
        rig.focus = i === beat ? 1 : 0;
        rig.paddle = i === beat ? 1 : 0;
        rig.recede = i === beat ? 0 : 1;
        rig.delay = 0;
      } else if (outroW > 0.5) {
        rig.paddle = 1;
        rig.hot = i === weakest ? 1 : 0;
        rig.focus = i === weakest ? 1 : 0;
        rig.recede = i === weakest ? 0 : 0.5;
      }
    }
    micRef.current = micLive;
  }, -1);

  return null;
}

/* ── One examiner ─────────────────────────────────────────────────────────── */

function Examiner({
  index,
  rigsRef,
  score,
  reduce,
  dark,
}: {
  index: number;
  rigsRef: React.RefObject<Rig[]>;
  score: number;
  reduce: boolean;
  dark: boolean;
}) {
  const x = XS[index]!;
  const build = BUILD[index]!;
  const axis = AXES[index]!;
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const paddle = useRef<THREE.Group>(null);
  const discMat = useRef<THREE.MeshStandardMaterial>(null);
  const restClay = dark ? build.clayDark : build.clay;
  const clayMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: restClay, roughness: 0.62, metalness: 0 }),
    [restClay],
  );
  const s = useRef({
    focus: { x: 0, v: 0 },
    paddle: { x: 0, v: 0 },
    recede: 0,
    hot: 0,
    nextBlink: 1.5 + index * 0.9,
    blink: 0,
  });
  const colors = useMemo(
    () => ({ clay: new THREE.Color(restClay), verm: new THREE.Color(COLOR.verm), coal: new THREE.Color(COLOR.coal) }),
    [restClay],
  );
  const bodyY = 0.35 + build.body / 2;
  const headY = 0.35 + build.body + 0.62 + build.head * 0.92;

  useEffect(() => () => clayMat.dispose(), [clayMat]);

  useFrame((state, rawDt) => {
    const rig = rigsRef.current?.[index];
    if (!rig || !body.current || !head.current || !paddle.current) return;
    const dt = Math.min(rawDt, 1 / 30);
    const st = s.current;
    const time = state.clock.elapsedTime;

    if (reduce) {
      st.focus.x = rig.focus;
      st.paddle.x = rig.paddle;
      st.recede = rig.recede;
      st.hot = rig.hot;
    } else {
      stepSpring(st.focus, rig.focus, dt, 120, 16);
      stepSpring(st.paddle, rig.paddle, dt, 150, 14);
      st.recede = damp(st.recede, rig.recede, 5, dt);
      st.hot = damp(st.hot, rig.hot, 8, dt);
    }
    const f = st.focus.x;

    // Rise, lean in, swell; neighbours recede a step.
    const breathe = reduce ? 0 : Math.sin(time * 1.5 + index * 1.3) * 0.012;
    body.current.position.y = f * 0.26 - st.recede * 0.06;
    body.current.rotation.x = f * 0.14;
    const sc = 1 + f * 0.05 - st.recede * 0.03;
    body.current.scale.set(sc, sc * (1 + breathe), sc);

    // Heads follow the camera: the panel watches you.
    const cam = state.camera.position;
    const yaw = Math.atan2(cam.x - x, cam.z - SEAT_Z) * 0.45;
    const nod = rig.speaking && !reduce ? Math.sin(time * 10) * 0.07 : 0;
    head.current.rotation.y = reduce ? yaw : damp(head.current.rotation.y, yaw, 4, dt);
    head.current.rotation.x = reduce ? 0 : damp(head.current.rotation.x, nod - f * 0.08, 12, dt);

    // Blink every few seconds.
    if (eyes.current && !reduce) {
      if (time > st.nextBlink) {
        st.blink = 1;
        st.nextBlink = time + 2.6 + ((index * 7919) % 30) / 10;
      }
      st.blink = Math.max(0, st.blink - dt * 8);
      eyes.current.scale.y = 1 - Math.sin(st.blink * Math.PI) * 0.9;
    }

    clayMat.color.lerpColors(colors.clay, colors.verm, THREE.MathUtils.clamp(f, 0, 1));

    // Paddle: up from behind the desk and flipped to face the room.
    const pv = st.paddle.x;
    paddle.current.visible = pv > 0.04;
    paddle.current.position.y = -PADDLE_DROP + pv * PADDLE_DROP;
    paddle.current.rotation.y = (1 - THREE.MathUtils.clamp(pv, 0, 1.2)) * Math.PI;
    paddle.current.rotation.z = -0.08 * pv;
    if (discMat.current) discMat.current.color.lerpColors(colors.coal, colors.verm, st.hot);
  });

  return (
    <group position={[x, 0, SEAT_Z]}>
      <group ref={body} position={[0, 0, 0]}>
        <mesh castShadow receiveShadow position={[0, bodyY, 0]} material={clayMat}>
          <capsuleGeometry args={[0.64, build.body, 8, 24]} />
        </mesh>
        <group ref={head} position={[0, headY, 0]}>
          <mesh castShadow receiveShadow material={clayMat}>
            <sphereGeometry args={[build.head, 40, 28]} />
          </mesh>
          {build.extra === 'bun' && (
            <mesh castShadow position={[0, build.head * 0.82, -build.head * 0.42]} material={clayMat}>
              <sphereGeometry args={[build.head * 0.42, 28, 20]} />
            </mesh>
          )}
          <group ref={eyes} position={[0, 0.05, build.head * 0.9]}>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * 0.15, 0, 0]}>
                <sphereGeometry args={[0.05, 16, 12]} />
                <meshStandardMaterial color={build.eye} roughness={0.4} />
              </mesh>
            ))}
          </group>
          {build.extra === 'glasses' && (
            <group position={[0, 0.05, build.head * 0.96]}>
              {[-1, 1].map((side) => (
                <mesh key={side} position={[side * 0.16, 0, 0]}>
                  <torusGeometry args={[0.12, 0.022, 10, 32]} />
                  <meshStandardMaterial color={COLOR.coal} roughness={0.35} />
                </mesh>
              ))}
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.014, 0.014, 0.1, 8]} />
                <meshStandardMaterial color={COLOR.coal} />
              </mesh>
            </group>
          )}
        </group>
      </group>

      {/* Score paddle */}
      <group ref={paddle} position={[0.98, 0, 0.62]}>
        <group position={[0, 2.55, 0]}>
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.06, 48]} />
            <meshStandardMaterial ref={discMat} color={COLOR.coal} roughness={0.5} />
          </mesh>
          {/* paper rim: the paddle keeps its edge on any ground */}
          <mesh>
            <torusGeometry args={[0.5, 0.035, 10, 56]} />
            <meshStandardMaterial color={COLOR.paper} roughness={0.55} />
          </mesh>
          <Text
            font={FONT_MONO}
            fontSize={0.42}
            position={[0, -0.01, 0.035]}
            color={COLOR.paper}
            anchorX="center"
            anchorY="middle"
          >
            {String(score)}
          </Text>
          <mesh castShadow position={[0, -1.02, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 1.5, 12]} />
            <meshStandardMaterial color={COLOR.coal} roughness={0.5} />
          </mesh>
        </group>
      </group>

      {/* Name placard on the desk */}
      <group position={[0, TOP + 0.25, 1.15]} rotation={[-0.3, 0, 0]}>
        <RoundedBox args={[1.9, 0.52, 0.06]} radius={0.025} smoothness={3} castShadow receiveShadow>
          <meshStandardMaterial color={COLOR.paper} roughness={0.7} />
        </RoundedBox>
        <Text
          font={FONT_DISPLAY}
          fontSize={0.2}
          letterSpacing={-0.01}
          position={[0, 0, 0.035]}
          color={COLOR.coal}
          anchorX="center"
          anchorY="middle"
        >
          {axis.label}
        </Text>
      </group>
    </group>
  );
}

/* ── Props on the candidate's side ────────────────────────────────────────── */

function Mic({ micRef, reduce }: { micRef: React.RefObject<number>; reduce: boolean }) {
  const ringMat = useRef<THREE.MeshStandardMaterial>(null);
  const waves = useRef<(THREE.Mesh | null)[]>([]);
  const live = useRef(0);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    live.current = reduce ? (micRef.current ?? 0) : damp(live.current, micRef.current ?? 0, 6, dt);
    const t = state.clock.elapsedTime;
    const wobble = reduce ? 0.5 : 0.55 + 0.45 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1));
    if (ringMat.current) ringMat.current.emissiveIntensity = live.current * (0.4 + wobble * 0.9);
    waves.current.forEach((m, k) => {
      if (!m) return;
      const phase = reduce ? 0.5 : (t * 0.75 + k / 3) % 1;
      const sc = 1 + phase * 2.6;
      m.scale.set(sc, sc, sc);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = live.current * (1 - phase) * 0.45;
      m.visible = live.current > 0.02;
    });
  });

  // The candidate's mic: on the near edge of the bench, angled at you.
  return (
    <group position={[SPACING / 2, TOP, 1.1]} scale={1.3}>
      <mesh castShadow receiveShadow position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.3, 0.34, 0.07, 40]} />
        <meshStandardMaterial color={COLOR.coal} roughness={0.45} />
      </mesh>
      <group position={[0, 0.07, 0]} rotation={[0.62, 0, 0]}>
        <mesh castShadow position={[0, 0.34, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.68, 12]} />
          <meshStandardMaterial color={COLOR.coal} roughness={0.4} />
        </mesh>
        <group position={[0, 0.78, 0]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.15, 0.16, 8, 24]} />
            <meshStandardMaterial color={COLOR.coal} roughness={0.55} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.165, 0.028, 12, 40]} />
            <meshStandardMaterial
              ref={ringMat}
              color={COLOR.verm}
              emissive={COLOR.verm}
              emissiveIntensity={0}
              roughness={0.4}
            />
          </mesh>
          {[0, 1, 2].map((k) => (
            <mesh
              key={k}
              ref={(m) => {
                waves.current[k] = m;
              }}
              rotation={[-0.62, 0, 0]}
              visible={false}
            >
              <torusGeometry args={[0.2, 0.012, 8, 48]} />
              <meshBasicMaterial color={COLOR.verm} transparent opacity={0} depthWrite={false} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

function Bell({ dingRef, reduce }: { dingRef: React.RefObject<number>; reduce: boolean }) {
  const button = useRef<THREE.Mesh>(null);
  const dome = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const since = (performance.now() - (dingRef.current ?? -1e9)) / 1000;
    const hit = reduce ? 0 : Math.max(0, 1 - since / 0.18);
    const wave = reduce ? 1 : Math.min(1, since / 0.7);
    if (button.current) button.current.position.y = 0.36 - hit * 0.05;
    if (dome.current) {
      const wob = reduce ? 0 : Math.sin(since * 40) * Math.max(0, 1 - since / 0.5) * 0.04;
      dome.current.scale.set(1 + wob, 1 - wob, 1 + wob);
    }
    if (ring.current) {
      ring.current.scale.setScalar(1 + wave * 3.2);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - wave) * 0.6;
      ring.current.visible = wave < 1;
    }
  });

  return (
    <group position={[3.1, TOP, 0.55]}>
      <mesh castShadow receiveShadow position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.3, 0.32, 0.06, 40]} />
        <meshStandardMaterial color={COLOR.coal} roughness={0.5} />
      </mesh>
      <mesh ref={dome} castShadow position={[0, 0.06, 0]}>
        <sphereGeometry args={[0.24, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={COLOR.butter} roughness={0.28} metalness={0.15} />
      </mesh>
      <mesh ref={button} castShadow position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 0.08, 16]} />
        <meshStandardMaterial color={COLOR.coal} roughness={0.4} />
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} visible={false}>
        <torusGeometry args={[0.32, 0.012, 8, 48]} />
        <meshBasicMaterial color={COLOR.butter} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Notes() {
  return (
    <group position={[-3.0, TOP, 0.6]} rotation={[0, 0.2, 0]}>
      <mesh receiveShadow castShadow position={[0.08, 0.01, 0.05]} rotation={[0, -0.12, 0]}>
        <boxGeometry args={[1.05, 0.02, 1.4]} />
        <meshStandardMaterial color="#E9E6DF" roughness={0.9} />
      </mesh>
      <mesh receiveShadow castShadow position={[0, 0.03, 0]}>
        <boxGeometry args={[1.05, 0.02, 1.4]} />
        <meshStandardMaterial color={COLOR.paper} roughness={0.9} />
      </mesh>
      {[0, 1, 2, 3, 4].map((l) => (
        <mesh key={l} position={[-0.08 + (l === 4 ? -0.14 : 0), 0.042, -0.45 + l * 0.2]}>
          <boxGeometry args={[l === 4 ? 0.5 : 0.78, 0.004, 0.05]} />
          <meshStandardMaterial color={l === 0 ? COLOR.verm : '#C9C4BB'} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Desk() {
  return (
    <group>
      {/* the bench: a solid cobalt block with a lighter top slab */}
      <RoundedBox
        args={[DESK_W, TOP - FLOOR - 0.12, DESK_D]}
        radius={0.08}
        smoothness={4}
        position={[0, (TOP - 0.12 + FLOOR) / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={COLOR.cobaltDeep} roughness={0.7} />
      </RoundedBox>
      <RoundedBox
        args={[DESK_W + 0.34, 0.16, DESK_D + 0.3]}
        radius={0.06}
        smoothness={4}
        position={[0, TOP - 0.08, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={COLOR.cobalt} roughness={0.55} />
      </RoundedBox>
    </group>
  );
}

/* ── Speech ──────────────────────────────────────────────────────────────── */

function Speech({ round, reduce }: { round: RoundState; reduce: boolean }) {
  const size = useThree((st) => st.size);
  // Pull edge bubbles toward the middle so they never leave the frame.
  const pull = size.width / Math.max(1, size.height) < 1.05 ? 0.55 : 0.88;
  const r = ROUNDS[round.index % ROUNDS.length]!;
  const weakest = weakestIndex(r.scores);
  const speaker = round.phase === 'ask' ? 2 : round.phase === 'follow' ? weakest : -1;
  const answering = round.phase === 'listen' || round.phase === 'mark';

  return (
    <>
      {speaker >= 0 && (
        <Html
          position={[XS[speaker]! * pull, 3.95, SEAT_Z]}
          center
          zIndexRange={[6, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="relative w-[min(16rem,62vw)] -translate-y-3 rounded-2xl border border-line bg-card px-4 py-3 text-[0.92rem] font-bold leading-snug text-ink shadow-[0_10px_24px_-14px_rgb(var(--vv-shadow)/0.55)]">
            <p className="mb-1 text-xs font-bold text-verm-text">
              {round.phase === 'ask' ? 'Examiner' : `${AXES[weakest]!.label} examiner`}
            </p>
            <TypeLine key={`${round.index}-${round.phase}`} text={round.phase === 'ask' ? r.question : r.followUp} instant={reduce} cps={44} />
            <span className="absolute -bottom-[7px] left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-b border-r border-line bg-card" />
          </div>
        </Html>
      )}
      {answering && (
        <Html position={[SPACING / 2, -1.15, DESK_D / 2 + 0.2]} center zIndexRange={[6, 0]} style={{ pointerEvents: 'none' }}>
          <div className="w-[min(19rem,70vw)] translate-y-2 rounded-2xl bg-coal px-4 py-3 text-[0.9rem] font-semibold leading-snug text-paper shadow-[0_18px_40px_-20px_rgb(0_0_0/0.5)]">
            <p className="mb-1 flex items-center gap-2 text-xs font-bold text-paper-mut">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-verm" aria-hidden />
              You, answering
            </p>
            <TypeLine key={`${round.index}-answer`} text={r.answer} instant={reduce} cps={40} />
          </div>
        </Html>
      )}
    </>
  );
}

/* ── The room ────────────────────────────────────────────────────────────── */

function Room({ progress, round, reduce, dark, insets }: Omit<SceneProps, 'active' | 'onReady'>) {
  const lampTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 0.6, -1.2);
    return o;
  }, []);
  const rigsRef = useRef<Rig[]>(
    AXES.map(() => ({ focus: 0, recede: 0, paddle: 0, hot: 0, speaking: false, delay: 0 })),
  );
  const micRef = useRef(0);
  const dingRef = useRef(-1e9);
  const scores = ROUNDS[(round?.index ?? 0) % ROUNDS.length]!.scores;

  return (
    <>
      <Director
        progress={progress}
        round={round}
        rigsRef={rigsRef}
        micRef={micRef}
        dingRef={dingRef}
        reduce={reduce}
        insets={insets}
      />

      <hemisphereLight args={['#ffffff', dark ? '#2c2723' : '#d9d3c8', dark ? 0.42 : 1.5]} />
      {/* Lights off: one warm lamp over the bench, pooling on the table and the
          panel while the ends fall away into the dark. */}
      {dark && (
        <>
          <primitive object={lampTarget} />
          <spotLight
            position={[0, 11, 5.5]}
            target={lampTarget}
            angle={0.56}
            penumbra={0.95}
            decay={0}
            intensity={3.4}
            color="#FFF1DC"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0004}
            shadow-normalBias={0.03}
          />
        </>
      )}
      <directionalLight
        position={[5, 12, 9]}
        intensity={dark ? 0.35 : 2.5}
        castShadow={!dark}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={8}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-radius={5}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
      />
      <Environment resolution={128} frames={1} environmentIntensity={dark ? 0.22 : 0.55}>
        <Lightformer form="rect" intensity={2.2} position={[0, 6, 7]} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-9, 3, 2]} rotation-y={Math.PI / 2} scale={[4, 6, 1]} />
        <Lightformer form="circle" intensity={1.4} position={[8, 5, -3]} scale={3} />
      </Environment>

      <Desk />
      {AXES.map((a, i) => (
        <Examiner key={a.key} index={i} rigsRef={rigsRef} score={scores[i]!} reduce={reduce} dark={dark} />
      ))}
      <Mic micRef={micRef} reduce={reduce} />
      <Bell dingRef={dingRef} reduce={reduce} />
      <Notes />

      {round && <Speech round={round} reduce={reduce} />}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <shadowMaterial transparent opacity={dark ? 0.32 : 0.16} />
      </mesh>
      <ContactShadows
        position={[0, FLOOR + 0.005, 0]}
        scale={[DESK_W + 6, 8]}
        blur={2.6}
        far={3}
        opacity={dark ? 0.42 : 0.32}
        frames={1}
        color={dark ? '#000000' : '#2a2520'}
      />
    </>
  );
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
}

/** The viva room. Client-only; loaded lazily by RoomStory. */
export default function Scene({ progress, active, reduce, dark, round, insets, onReady }: SceneProps) {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.75]}
      frameloop={reduce ? 'demand' : active ? 'always' : 'never'}
      camera={{ fov: FOV, near: 0.5, far: 140, position: [0, 8, 24] }}
      // Khronos PBR Neutral keeps the brand colours true below the shoulder and
      // rolls off highlights, so the clay never clips to flat white.
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.NeutralToneMapping,
      }}
      aria-hidden
      tabIndex={-1}
    >
      <Suspense fallback={null}>
        <Room progress={progress} round={round} reduce={reduce} dark={dark} insets={insets} />
        <Ready onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}

