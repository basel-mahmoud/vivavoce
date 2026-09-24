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
  clay: '#F3F0EA',
  verm: '#FF4D26',
  butter: '#FFC838',
  paper: '#FBFAF8',
} as const;

const FOV = 32;
const SPACING = 2.3;
const XS = [-2, -1, 0, 1, 2].map((i) => i * SPACING);
const TOP = 0.08; // desk surface
const FLOOR = -1.9;
const SEAT_Z = -2.05;
const DESK_W = 12.6;
const DESK_D = 2.5;
/** Per-examiner silhouettes: body length, head radius, and one accessory. */
const BUILD = [
  { body: 1.0, head: 0.46, extra: 'none' },
  { body: 1.1, head: 0.44, extra: 'bun' },
  { body: 1.32, head: 0.47, extra: 'none' },
  { body: 1.04, head: 0.45, extra: 'glasses' },
  { body: 0.92, head: 0.48, extra: 'none' },
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

export interface SceneProps {
  progress: MotionValue<number>;
  active: boolean;
  reduce: boolean;
  dark: boolean;
  /** The scripted example round, or null when the hero is not playing. */
  round: RoundState | null;
  onReady: () => void;
}

/* ── Camera poses ─────────────────────────────────────────────────────────── */

interface Pose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  /** lens shift as a fraction of the frame: +x moves the subject right, +y down */
  sx: number;
  sy: number;
}

function makePoses(aspect: number): Record<string, Pose> {
  const compact = aspect < 1.05;
  const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const usable = compact ? 1.02 : 0.56;
  const span = compact ? 9.9 : 13.0;
  const d = THREE.MathUtils.clamp(span / (2 * tan * aspect * usable), 15, 44);

  const heroLook = new THREE.Vector3(0, 1.0, -0.9);
  const hero = {
    pos: heroLook.clone().add(new THREE.Vector3(0, 0.42, 1).normalize().multiplyScalar(d)),
    look: heroLook,
    sx: compact ? 0 : 0.19,
    sy: compact ? 0.21 : 0,
  };
  const outroLook = new THREE.Vector3(0, 0.4, -0.7);
  const outro = {
    pos: outroLook.clone().add(new THREE.Vector3(0.12, 0.95, 1).normalize().multiplyScalar(d * 1.06)),
    look: outroLook,
    sx: compact ? 0 : 0.17,
    sy: compact ? 0.2 : 0,
  };
  const poses: Record<string, Pose> = { hero, outro };
  XS.forEach((x, i) => {
    poses[String(i)] = {
      pos: compact ? new THREE.Vector3(x + 0.9, 3.1, 7.4) : new THREE.Vector3(x + 1.7, 2.75, 5.4),
      look: new THREE.Vector3(x - 0.1, 1.5, SEAT_Z + 0.35),
      sx: compact ? 0 : 0.19,
      sy: compact ? 0.17 : 0,
    };
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
}: {
  progress: MotionValue<number>;
  round: RoundState | null;
  rigsRef: React.RefObject<Rig[]>;
  micRef: React.RefObject<number>;
  dingRef: React.RefObject<number>;
  reduce: boolean;
}) {
  const size = useThree((s) => s.size);
  const poses = useMemo(() => makePoses(size.width / Math.max(1, size.height)), [size.width, size.height]);
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
    target.pos.x += pointer.current.x * 0.9 * heroW;
    target.pos.y -= pointer.current.y * 0.45 * heroW;

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
        // Static hero (reduced motion): the marked state of the first round.
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
}: {
  index: number;
  rigsRef: React.RefObject<Rig[]>;
  score: number;
  reduce: boolean;
}) {
  const x = XS[index]!;
  const build = BUILD[index]!;
  const axis = AXES[index]!;
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const paddle = useRef<THREE.Group>(null);
  const discMat = useRef<THREE.MeshStandardMaterial>(null);
  const clayMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: COLOR.clay, roughness: 0.62, metalness: 0 }),
    [],
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
    () => ({ clay: new THREE.Color(COLOR.clay), verm: new THREE.Color(COLOR.verm), coal: new THREE.Color(COLOR.coal) }),
    [],
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
    paddle.current.visible = pv > 0.01;
    paddle.current.position.y = -2.9 + pv * 2.9;
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
                <meshStandardMaterial color={COLOR.coal} roughness={0.4} />
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
      const sc = 1 + phase * 5.5;
      m.scale.set(sc, sc, sc);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = live.current * (1 - phase) * 0.55;
      m.visible = live.current > 0.02;
    });
  });

  return (
    <group position={[0, TOP, 0.9]}>
      <mesh castShadow receiveShadow position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.3, 0.34, 0.07, 40]} />
        <meshStandardMaterial color={COLOR.coal} roughness={0.45} />
      </mesh>
      <group position={[0, 0.07, 0]} rotation={[0.42, 0, 0]}>
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
              rotation={[-0.42, 0, 0]}
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
  const r = ROUNDS[round.index % ROUNDS.length]!;
  const weakest = weakestIndex(r.scores);
  const speaker = round.phase === 'ask' ? 2 : round.phase === 'follow' ? weakest : -1;
  const answering = round.phase === 'listen' || round.phase === 'mark';

  return (
    <>
      {speaker >= 0 && (
        <Html
          position={[XS[speaker]!, 3.95, SEAT_Z]}
          center
          zIndexRange={[6, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="relative w-[min(17rem,62vw)] -translate-y-3 rounded-2xl border border-line bg-card px-4 py-3 text-[0.92rem] font-bold leading-snug text-ink shadow-[0_18px_40px_-24px_rgb(var(--vv-shadow)/0.6)]">
            <p className="marks mb-1 text-[0.66rem] font-bold text-verm">
              {round.phase === 'ask' ? 'EXAMINER' : AXES[weakest]!.label.toUpperCase()}
            </p>
            <TypeLine key={`${round.index}-${round.phase}`} text={round.phase === 'ask' ? r.question : r.followUp} instant={reduce} cps={44} />
            <span className="absolute -bottom-[7px] left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-b border-r border-line bg-card" />
          </div>
        </Html>
      )}
      {answering && (
        <Html position={[0, -0.5, DESK_D / 2 + 0.2]} center zIndexRange={[6, 0]} style={{ pointerEvents: 'none' }}>
          <div className="w-[min(19rem,70vw)] translate-y-2 rounded-2xl bg-coal px-4 py-3 text-[0.9rem] font-semibold leading-snug text-paper shadow-[0_18px_40px_-20px_rgb(0_0_0/0.5)]">
            <p className="marks mb-1 flex items-center gap-2 text-[0.66rem] font-bold text-paper-mut">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-verm" aria-hidden />
              YOU, ANSWERING
            </p>
            <TypeLine key={`${round.index}-answer`} text={r.answer} instant={reduce} cps={40} />
          </div>
        </Html>
      )}
    </>
  );
}

/* ── The room ────────────────────────────────────────────────────────────── */

function Room({ progress, round, reduce, dark }: Omit<SceneProps, 'active' | 'onReady'>) {
  const rigsRef = useRef<Rig[]>(
    AXES.map(() => ({ focus: 0, recede: 0, paddle: 0, hot: 0, speaking: false, delay: 0 })),
  );
  const micRef = useRef(0);
  const dingRef = useRef(-1e9);
  const scores = ROUNDS[(round?.index ?? 0) % ROUNDS.length]!.scores;

  return (
    <>
      <Director progress={progress} round={round} rigsRef={rigsRef} micRef={micRef} dingRef={dingRef} reduce={reduce} />

      <hemisphereLight args={['#ffffff', dark ? '#3a342e' : '#d9d3c8', dark ? 0.9 : 1.6]} />
      <directionalLight
        position={[5, 12, 9]}
        intensity={dark ? 2.1 : 2.6}
        castShadow
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
      <Environment resolution={128} frames={1} environmentIntensity={dark ? 0.35 : 0.6}>
        <Lightformer form="rect" intensity={2.2} position={[0, 6, 7]} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-9, 3, 2]} rotation-y={Math.PI / 2} scale={[4, 6, 1]} />
        <Lightformer form="circle" intensity={1.4} position={[8, 5, -3]} scale={3} />
      </Environment>

      <Desk />
      {AXES.map((a, i) => (
        <Examiner key={a.key} index={i} rigsRef={rigsRef} score={scores[i]!} reduce={reduce} />
      ))}
      <Mic micRef={micRef} reduce={reduce} />
      <Bell dingRef={dingRef} reduce={reduce} />
      <Notes />

      {round && <Speech round={round} reduce={reduce} />}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <shadowMaterial transparent opacity={dark ? 0.5 : 0.16} />
      </mesh>
      <ContactShadows
        position={[0, FLOOR + 0.005, 0]}
        scale={[DESK_W + 6, 8]}
        blur={2.6}
        far={3}
        opacity={dark ? 0.7 : 0.32}
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
export default function Scene({ progress, active, reduce, dark, round, onReady }: SceneProps) {
  return (
    <Canvas
      shadows="percentage"
      flat
      dpr={[1, 1.75]}
      frameloop={reduce ? 'demand' : active ? 'always' : 'never'}
      camera={{ fov: FOV, near: 0.5, far: 140, position: [0, 8, 24] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      aria-hidden
      tabIndex={-1}
    >
      <Suspense fallback={null}>
        <Room progress={progress} round={round} reduce={reduce} dark={dark} />
        <Ready onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}

