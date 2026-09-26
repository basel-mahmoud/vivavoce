'use client';

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import type { MotionValue } from 'motion/react';
import { Panel } from './panel/Panel';
import { createChannels, type PanelChannels } from './panel/channels';
import type { Cast } from './panel/cast';
import { Studio, type FocusLight } from './set/Studio';
import { CANVAS, Cyclorama } from './set/Cyclorama';
import { ContactBlot, Lamp, Mic } from './set/Props';
import { Director, type DofState, type RoomOverlays, type RoundState } from './Director';
import type { Insets, ShotSet } from './camera';
import { stillAt } from './story';

export type { Insets } from './camera';
export type { RoomOverlays, RoundState } from './Director';

/** The post chain (N8AO, SMAA, depth of field) is its own chunk, fetched only on desktop tiers. */
const Post = lazy(() => import('./Post'));

type Tier = 1 | 2 | 3;

/** Device pixel ratio caps per tier. */
const DPR: Record<Tier, [number, number]> = { 1: [1, 1.25], 2: [1, 1.75], 3: [1, 2] };

/**
 * First guess before the performance monitor has measured anything: phones, small screens and
 * low-core machines start on the light tier (no post, no shadow map, baked AO only).
 */
function guessTier(): Tier {
  if (process.env.NODE_ENV !== 'production') {
    const forced = Number(new URLSearchParams(window.location.search).get('tier'));
    if (forced === 1 || forced === 2 || forced === 3) return forced;
  }
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth < 768;
  const cores = navigator.hardwareConcurrency ?? 4;
  return coarse || narrow || cores <= 2 ? 1 : 2;
}

function forcedTier() {
  return process.env.NODE_ENV !== 'production' && new URLSearchParams(window.location.search).has('tier');
}

export interface SceneProps {
  progress: MotionValue<number>;
  /** On screen (or close to it). */
  active: boolean;
  /** The hero's example round may play (in view, tab visible, past the intro). */
  playing: boolean;
  reduce: boolean;
  dark: boolean;
  insets: Insets;
  overlaysRef: React.RefObject<RoomOverlays>;
  onReady: () => void;
  onRound: (r: RoundState) => void;
}

/** Under reduced motion the canvas renders on demand: redraw when the scroll crosses into a new still. */
function StillDriver({ progress }: { progress: MotionValue<number> }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let last = stillAt(progress.get());
    invalidate();
    return progress.on('change', (v) => {
      const k = stillAt(v);
      if (k !== last) {
        last = k;
        invalidate();
      }
    });
  }, [progress, invalidate]);
  return null;
}

/**
 * Development only: draw calls and triangles of the last full frame (shadow pass and every post
 * pass included), read by the perf report as window.__vvRoom.
 */
function DrawCounter({ tier }: { tier: Tier }) {
  useFrame((state) => {
    const info = state.gl.info;
    const w = window as unknown as { __vvRoom?: Record<string, unknown> };
    if (info.autoReset) info.autoReset = false;
    else {
      const cam = state.camera as THREE.PerspectiveCamera;
      w.__vvRoom = {
        ...(w.__vvRoom ?? {}),
        draws: info.render.calls,
        triangles: info.render.triangles,
        tier,
        camera: [cam.position.x, cam.position.y, cam.position.z, cam.fov, cam.view?.offsetX ?? 0, cam.view?.offsetY ?? 0].map((v) => Math.round(v * 100) / 100),
      };
    }
    info.reset();
  }, -10);
  return null;
}

/**
 * Development only: where the four colour-calibrated swatches land on screen (the speaker's red
 * coin, Clarity's butter shell, Confidence's cobalt shell, the bench apron), for the CIEDE2000
 * check in the room's review scripts. Same probe points as the calibration in rig.ts FINISH.
 */
function DevProbe() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    const w = window as unknown as { __vvProbe?: () => Record<string, { x: number; y: number; hit: boolean }> };
    w.__vvProbe = () => {
      const out: Record<string, { x: number; y: number; hit: boolean }> = {};
      const rc = new THREE.Raycaster();
      const cam = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
      const at = (name: string, meshName: string, local: [number, number, number], frame: string | null) => {
        const mesh = scene.getObjectByName(meshName);
        if (!mesh) return;
        const p = new THREE.Vector3(...local);
        if (frame) p.applyMatrix4(scene.getObjectByName(frame)!.matrixWorld);
        rc.set(cam, p.clone().sub(cam).normalize());
        const hit = rc.intersectObject(mesh, false)[0];
        const q = (hit ? hit.point : p).clone().project(camera);
        out[name] = { x: Math.round(((q.x + 1) / 2) * size.width), y: Math.round(((1 - q.y) / 2) * size.height), hit: Boolean(hit) };
      };
      at('verm_paddle', 'Coin_Structure', [-0.1, 0.4 - 0.105, 0], 'Paddle_Structure');
      at('butter_shell', 'Head_Clarity__shell_clarity', [-0.12, 1.62, 0], 'Examiner_Clarity');
      at('cobalt_shell', 'Head_Confidence__shell_confidence', [0.2, 0.84, 0], 'Examiner_Confidence');
      at('cobalt_bench', 'Bench__bench', [-0.35, -0.44, 0.112], null);
      return out;
    };
  }, [scene, camera, size]);
  return null;
}

function Room({
  progress,
  reduce,
  dark,
  insets,
  playing,
  overlaysRef,
  tier,
  dofRef,
  onRound,
  onPanel,
}: Omit<SceneProps, 'active' | 'onReady'> & {
  tier: Tier;
  dofRef: React.RefObject<DofState>;
  onPanel: (cast: Cast) => void;
}) {
  const channelsRef = useRef<PanelChannels>(createChannels());
  const focusRef = useRef<FocusLight>({ target: new THREE.Vector3(-0.035, 1.23, -0.53), strength: 1 });
  const castRef = useRef<Cast | null>(null);
  const shotsRef = useRef<ShotSet | null>(null);
  const micWeightRef = useRef(0);
  const maskRef = useRef(new THREE.Vector4(-2, -1, -2, -1));
  const shadows = tier >= 2;
  const onCast = useCallback(
    (c: Cast) => {
      castRef.current = c;
      onPanel(c);
    },
    [onPanel],
  );

  return (
    <>
      <Director
        progress={progress}
        reduce={reduce}
        insets={insets}
        playing={playing}
        channelsRef={channelsRef}
        focusRef={focusRef}
        castRef={castRef}
        shotsRef={shotsRef}
        micWeightRef={micWeightRef}
        dofRef={dofRef}
        maskRef={maskRef}
        overlaysRef={overlaysRef}
        onRound={onRound}
      />
      <Studio dark={dark} shadows={shadows} focusRef={focusRef} />
      <Cyclorama dark={dark} shadows={shadows} focusRef={focusRef} maskRef={maskRef} />
      {!shadows && <ContactBlot dark={dark} />}
      <Lamp dark={dark} />
      <Mic shotsRef={shotsRef} weightRef={micWeightRef} />
      <Panel channelsRef={channelsRef} dark={dark} shadows={shadows} onReady={onCast} />
    </>
  );
}

/** Counts rendered frames after the panel is ready, then reveals the canvas. */
function Reveal({ ready, onReady }: { ready: boolean; onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const frames = useRef(-1);
  const done = useRef(false);
  useEffect(() => {
    if (!ready) return;
    // compile every program now, behind the poster, so the first visible frames do not hitch
    gl.compile(scene, camera);
    frames.current = 0;
    invalidate();
  }, [ready, gl, scene, camera, invalidate]);
  useFrame(() => {
    if (done.current || frames.current < 0) return;
    frames.current += 1;
    if (frames.current >= 3) {
      done.current = true;
      onReady();
    } else invalidate();
  });
  return null;
}

/** The viva room. Client-only; loaded lazily by RoomStory. */
export default function Scene({ progress, active, playing, reduce, dark, insets, overlaysRef, onReady, onRound }: SceneProps) {
  const [startTier] = useState<Tier>(guessTier);
  const [tier, setTier] = useState<Tier>(startTier);
  const [locked] = useState(forcedTier);
  const dofRef = useRef<DofState>({ focus: new THREE.Vector3(), amount: 0 });
  const [panel, setPanel] = useState(false);
  const [post, setPost] = useState(tier === 1);
  const onPanel = useCallback(() => setPanel(true), []);
  const onPost = useCallback(() => setPost(true), []);

  // if the post chunk is slow or fails, reveal without it rather than never
  useEffect(() => {
    if (post) return;
    const id = window.setTimeout(() => setPost(true), 5000);
    return () => window.clearTimeout(id);
  }, [post]);

  return (
    <Canvas
      shadows="percentage"
      dpr={DPR[tier]}
      frameloop={reduce ? 'demand' : active ? 'always' : 'never'}
      camera={{ fov: 22, near: 0.25, far: 140, position: [0, 2.2, 12] }}
      // Khronos PBR Neutral keeps the brand colours true below the shoulder and rolls off
      // highlights; the composer replaces it with the same curve on desktop tiers.
      gl={{
        antialias: startTier === 1,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.NeutralToneMapping,
        preserveDrawingBuffer: reduce,
      }}
      onCreated={({ gl }) => gl.setClearColor(dark ? CANVAS.dark : CANVAS.light, 1)}
      aria-hidden
      tabIndex={-1}
    >
      {!reduce && !locked && (
        <PerformanceMonitor
          bounds={(refresh) => [Math.min(45, refresh * 0.72), Math.min(58, refresh * 0.95)]}
          flipflops={3}
          onDecline={() => setTier((t) => (t > 1 ? ((t - 1) as Tier) : t))}
          onIncline={() => setTier((t) => (t < 3 ? ((t + 1) as Tier) : t))}
          onFallback={() => setTier(1)}
        />
      )}
      <Suspense fallback={null}>
        <Room
          progress={progress}
          reduce={reduce}
          dark={dark}
          insets={insets}
          playing={playing}
          overlaysRef={overlaysRef}
          tier={tier}
          dofRef={dofRef}
          onRound={onRound}
          onPanel={onPanel}
        />
        <Reveal ready={panel && post} onReady={onReady} />
      </Suspense>
      {tier >= 2 && (
        <Suspense fallback={null}>
          <Post tier={tier as 2 | 3} dark={dark} dofRef={dofRef} onReady={onPost} />
        </Suspense>
      )}
      {reduce && <StillDriver progress={progress} />}
      {process.env.NODE_ENV !== 'production' && <DrawCounter tier={tier} />}
      {process.env.NODE_ENV !== 'production' && <DevProbe />}
    </Canvas>
  );
}
