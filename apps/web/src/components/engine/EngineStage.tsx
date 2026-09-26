'use client';

import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { Panel } from '@/components/room/panel/Panel';
import { createChannels, type PanelChannels } from '@/components/room/panel/channels';
import type { Cast } from '@/components/room/panel/cast';
import { Studio, type FocusLight } from '@/components/room/set/Studio';
import { CANVAS, Cyclorama } from '@/components/room/set/Cyclorama';
import { ContactBlot, Lamp } from '@/components/room/set/Props';
import { HERO_COINS, HERO_COINS_COMPACT, bodyPoints, coinPoints, coinVec, frame, labelPoints } from '@/components/room/camera';
import { EXAMINERS, SEATS, VISORS } from '@/components/room/examiners/rig';
import { verdictFace } from '@/components/room/data';
import type { DofState } from '@/components/room/Director';
import { ASK_HOLD, BEAT, beatsAt, conferProgress, speakDuration, speechEnvelope } from './choreo';
import type { Meter } from './useMicMeter';
import { stageNow, type StageCue, type StageOverlays } from './stage';

/** Contact AO and anti-aliasing: the room's post chain, the same lazily loaded chunk. */
const Post = lazy(() => import('@/components/room/Post'));

type Tier = 1 | 2;

/** A lighter canvas than the room: no depth of field, and a lower pixel-ratio cap. */
const DPR: Record<Tier, [number, number]> = { 1: [1, 1.25], 2: [1, 1.5] };

/** Development only: ?tier=1|2 pins the tier for review (production compiles this out). */
function forcedTier(): boolean {
  return process.env.NODE_ENV !== 'production' && new URLSearchParams(window.location.search).has('tier');
}

function guessTier(): Tier {
  if (process.env.NODE_ENV !== 'production') {
    const forced = Number(new URLSearchParams(window.location.search).get('tier'));
    if (forced === 1 || forced === 2) return forced;
  }
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth < 768;
  const cores = navigator.hardwareConcurrency ?? 4;
  return coarse || narrow || cores <= 2 ? 1 : 2;
}

const damp = THREE.MathUtils.damp;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _pos = new THREE.Vector3();

interface Shot {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
  sx: number;
  sy: number;
  coins: THREE.Vector3[];
}

/**
 * One fitted frame for the whole round: the panel, the bench with its inlaid names and every raised
 * paddle, with headroom above for the examiner's note. Paddles rise inside the frame, so the camera
 * never has to move to follow them.
 */
function stageShot(aspect: number, headroom: number): Shot {
  const compact = aspect < 1.2;
  const coins = (compact ? HERO_COINS_COMPACT : HERO_COINS).map(coinVec);
  // the mitten under a raised coin hangs outboard of it, away from its own examiner: keep the
  // hands in frame too, not just the marks
  const hands = coins.map((c, i) => {
    const out = Math.sign(c.x - SEATS[EXAMINERS[i]!].position[0]) || 1;
    return V(c.x + out * 0.5, c.y - 0.3, c.z);
  });
  const pts = [
    ...EXAMINERS.flatMap((k) => bodyPoints(k)),
    ...EXAMINERS.flatMap((k) => labelPoints(k)),
    ...coins.flatMap((c) => coinPoints(c)),
    ...hands,
  ];
  const region = { x0: 0.055, x1: 0.955, y0: Math.min(0.34, headroom), y1: 0.975 };
  const f = frame(pts, V(0, 1.0, -0.5), V(0.03, 0.12, 1), aspect, region, compact ? 25 : 22);
  return { ...f, coins };
}

/**
 * Your answer in, the panel's acting out: the camera, every examiner channel, the lamp and the
 * examiner's note, written in place each frame (priority -1, before the panel reads them).
 */
function StageDirector({
  cueRef,
  meterRef,
  channelsRef,
  focusRef,
  castRef,
  overlaysRef,
  maskRef,
  fine,
}: {
  maskRef: React.RefObject<THREE.Vector4>;
  cueRef: React.RefObject<StageCue>;
  meterRef: React.RefObject<Meter>;
  channelsRef: React.RefObject<PanelChannels>;
  focusRef: React.RefObject<FocusLight>;
  castRef: React.RefObject<Cast | null>;
  overlaysRef: React.RefObject<StageOverlays>;
  fine: boolean;
}) {
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const [tagH, setTagH] = useState(96);
  useEffect(() => {
    const tag = overlaysRef.current?.tag;
    if (!tag) return;
    const ro = new ResizeObserver(() => setTagH(Math.max(72, tag.offsetHeight)));
    ro.observe(tag);
    return () => ro.disconnect();
  }, [overlaysRef]);
  const shot = useMemo(
    () => stageShot(size.width / Math.max(1, size.height), (tagH + 30) / Math.max(1, size.height)),
    [size.width, size.height, tagH],
  );
  // beside the copy (desktop) the stage's left edge is mid-page: fade the pool and the rules out
  // before it; on phones the stage runs edge to edge
  useEffect(() => {
    const full = size.width >= window.innerWidth - 4;
    maskRef.current.set(full ? -2 : 0, full ? -1 : 0.2, 0, 0.14);
  }, [size.width, maskRef]);
  const cam = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3(), first: true, listen: 0 });
  // the pointer in the stage's device coordinates: the panel follows it anywhere in the section
  // (over the answer sheet they glance toward it), the camera only while it is over the stage
  const pointer = useRef({ x: 0, y: 0, seen: false, over: false });
  const speech = useRef(0);

  useEffect(() => {
    if (!fine) return;
    const el = gl.domElement;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
      const y = -(((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1);
      const p = pointer.current;
      p.x = THREE.MathUtils.clamp(x, -1.6, 1.2);
      p.y = THREE.MathUtils.clamp(y, -1, 1);
      p.seen = true;
      p.over = Math.abs(x) <= 1 && Math.abs(y) <= 1;
    };
    const onLeave = () => {
      pointer.current.over = false;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [fine, gl]);

  useFrame((state, rawDt) => {
    // never step backwards, and never more than a tenth of a second after a stall
    const dt = THREE.MathUtils.clamp(rawDt, 0, 0.1);
    const camera = state.camera as THREE.PerspectiveCamera;
    const cue = cueRef.current;
    const ch = channelsRef.current;
    const now = stageNow();
    const phase = cue.phase;
    const w = state.size.width;
    const h = state.size.height;

    /* ── Camera: one fitted frame; the panel leans closer while it listens ── */
    const c = cam.current;
    c.listen = damp(c.listen, phase === 'listening' ? 1 : 0, 2.2, dt);
    const p = pointer.current;
    const px = fine && p.seen ? p.x : 0;
    const py = fine && p.seen ? p.y : 0;
    _pos.copy(shot.pos).sub(shot.look).multiplyScalar(1 - 0.045 * c.listen).add(shot.look);
    if (fine && p.over) {
      _pos.x += px * 0.22;
      _pos.y += py * 0.1;
    }
    if (c.first) {
      c.pos.copy(_pos);
      c.look.copy(shot.look);
      c.first = false;
    } else {
      c.pos.x = damp(c.pos.x, _pos.x, 3.2, dt);
      c.pos.y = damp(c.pos.y, _pos.y, 3.2, dt);
      c.pos.z = damp(c.pos.z, _pos.z, 3.2, dt);
      c.look.lerp(shot.look, 1 - Math.exp(-4 * dt));
    }
    camera.position.copy(c.pos);
    camera.fov = shot.fov;
    camera.lookAt(c.look);
    camera.setViewOffset(w, h, -shot.sx * w, -shot.sy * h, w, h);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    if (!ch) return;

    /* ── The panel ──────────────────────────────────────────────────── */
    const since = now - cue.since;
    const marked = phase === 'marked' ? now - cue.markedAt : -1;
    const b = beatsAt(marked);
    const weakest = cue.weakest;
    const meter = meterRef.current;
    ch.still = false;
    ch.waveLive = false;
    ch.tempo = 1;
    ch.progress = 0;
    ch.pointer.set(px, py);
    let focusIndex = 2;
    let focusStrength = 0.55;
    let speaking = false;
    // idle, the question being asked aloud by its examiner
    const askT = now - cue.askAt;
    const asking = phase === 'idle' && cue.askWho >= 0 && askT >= 0 && askT < speakDuration(cue.askText) + ASK_HOLD;
    const askTalking = asking && askT < speakDuration(cue.askText) + 0.35;

    for (let i = 0; i < ch.examiners.length; i++) {
      const e = ch.examiners[i]!;
      const mark = cue.marks[i] ?? null;
      e.coin.copy(shot.coins[i]!);
      e.focus = 0;
      e.paddle = 0;
      e.hot = 0;
      e.speaking = 0;
      e.gesture = 'rest';
      e.look = 'camera';
      e.delay = i * 0.05;
      e.face = 'attentive';
      if (asking) {
        const asker = i === cue.askWho;
        e.focus = asker ? 1 : 0;
        e.speaking = asker && askTalking ? 1 : 0;
        e.gesture = asker ? 'present' : 'rest';
        e.look = asker ? 'camera' : cue.askWho;
        if (asker) speaking = askTalking;
      } else if (phase === 'idle' || phase === 'requesting') {
        e.look = fine && p.seen && phase === 'idle' ? 'pointer' : 'camera';
      } else if (phase === 'listening') {
        e.face = 'listening';
        e.focus = 0.3;
      } else if (phase === 'conferring') {
        e.face = 'marking';
        // they confer: glances between neighbours and the middle, each on its own clock
        const beat = Math.floor(since / 1.15 + i * 0.45) % 2;
        e.look = i === 2 ? (beat ? 1 : 3) : beat ? 2 : i < 2 ? i + 1 : i - 1;
        e.gesture = i === 1 ? 'loupe' : i === 2 ? 'chin' : 'rest';
      } else if (phase === 'marked') {
        const up = mark !== null;
        e.mark = mark ?? 0;
        e.paddle = up ? 1 : 0;
        e.delay = BEAT.raise + i * BEAT.stagger;
        e.face = !up ? 'thinking' : b.verdict(i) ? verdictFace(mark) : 'marking';
        if (b.hot) {
          e.hot = i === weakest ? 1 : 0;
          e.focus = i === weakest ? 1 : 0;
          e.look = i === weakest ? 'camera' : weakest;
        }
        if (i === weakest) {
          e.speaking = b.speaking(cue.followUp) ? 1 : 0;
          e.gesture = b.spoken ? 'present' : 'rest';
          speaking = e.speaking > 0;
        }
      }
    }
    if (asking) {
      focusIndex = cue.askWho;
      focusStrength = 1;
    }
    if (phase === 'listening') {
      ch.waveLive = true;
      if (meter) ch.wave.set(meter.wave);
      focusStrength = 0.8;
    } else if (phase === 'conferring') {
      ch.progress = conferProgress(since);
      ch.tempo = 1.6;
      focusStrength = 0.62;
    } else if (phase === 'marked') {
      ch.progress = 1;
      if (b.hot) {
        focusIndex = weakest;
        focusStrength = 1;
      }
    }
    const env = !speaking ? 0 : asking ? speechEnvelope(cue.askText, askT) : speechEnvelope(cue.followUp, marked - BEAT.speak);
    speech.current = damp(speech.current, env, 18, dt);
    ch.speech = speech.current;

    const f = focusRef.current;
    const cs = castRef.current;
    if (f && cs) {
      cs.visorWorld(focusIndex, f.target);
      f.strength = focusStrength;
    }

    /* ── The examiner's note, pinned above the panel with a red leader to the speaker ── */
    const o = overlaysRef.current;
    if (o?.tag && o.leader && cs) {
      const who = asking ? cue.askWho : phase === 'marked' && b.spoken ? weakest : -1;
      if (who >= 0) {
        let top = Infinity;
        for (let i = 0; i < EXAMINERS.length; i++) {
          const s = SEATS[EXAMINERS[i]!];
          _v.set(s.position[0], s.top + 0.06, s.position[2]).project(camera);
          top = Math.min(top, (1 - _v.y) * 0.5 * h);
          if (ch.examiners[i]!.paddle > 0.5) {
            _v.copy(shot.coins[i]!).setY(shot.coins[i]!.y + 0.3).project(camera);
            top = Math.min(top, (1 - _v.y) * 0.5 * h);
          }
        }
        cs.visorWorld(who, _w);
        const vis = VISORS[EXAMINERS[who]!];
        _v.copy(_w).setY(_w.y + vis.halfHeight * 2.4).project(camera);
        const ax = (_v.x + 1) * 0.5 * w;
        const ay = (1 - _v.y) * 0.5 * h;
        const tw = o.tag.offsetWidth;
        const th = o.tag.offsetHeight;
        const tx = Math.min(Math.max(ax - tw / 2, 12), w - tw - 12);
        const ty = Math.max(8, top - th - 16);
        o.tag.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0)`;
        o.tag.dataset.show = 'true';
        const ly = ty + th;
        o.leader.style.transform = `translate3d(${ax.toFixed(1)}px, ${ly.toFixed(1)}px, 0) scaleY(${Math.max(0, ay - ly - 6).toFixed(1)})`;
        o.leader.dataset.show = 'true';
      } else {
        delete o.tag.dataset.show;
        delete o.leader.dataset.show;
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      const w = window as unknown as { __vvEngine?: Record<string, unknown> };
      w.__vvEngine = { ...(w.__vvEngine ?? {}), phase };
    }
  }, -1);

  return null;
}

/**
 * Development only: draw calls and triangles of the last whole frame (the shadow pass and every post
 * pass included) and a running frame count, read by the review scripts as window.__vvEngine.
 */
function DrawCounter({ tier }: { tier: Tier }) {
  const frames = useRef(0);
  useFrame((state) => {
    const info = state.gl.info;
    const w = window as unknown as { __vvEngine?: Record<string, unknown> };
    frames.current += 1;
    if (info.autoReset) info.autoReset = false;
    else w.__vvEngine = { ...(w.__vvEngine ?? {}), draws: info.render.calls, triangles: info.render.triangles, frame: frames.current, tier };
    info.reset();
  }, -10);
  return null;
}

/** Counts rendered frames once the panel (and post) are ready, then reveals the canvas. */
function Reveal({ ready, onReady }: { ready: boolean; onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const frames = useRef(-1);
  const done = useRef(false);
  useEffect(() => {
    if (!ready) return;
    gl.compile(scene, camera);
    frames.current = 0;
  }, [ready, gl, scene, camera]);
  useFrame(() => {
    if (done.current || frames.current < 0) return;
    frames.current += 1;
    if (frames.current >= 3) {
      done.current = true;
      onReady();
    }
  });
  return null;
}

export interface EngineStageProps {
  cueRef: React.RefObject<StageCue>;
  meterRef: React.RefObject<Meter>;
  overlaysRef: React.RefObject<StageOverlays>;
  dark: boolean;
  /** In view and the tab visible: render. Otherwise the frame loop stops. */
  active: boolean;
  fine: boolean;
  onReady: () => void;
}

/**
 * "Your turn": the same five examiners as the room, in a second, lighter canvas. Client only,
 * loaded when the section comes near; the frame loop runs only while it is on screen, and
 * unmounting disposes the renderer and the cast.
 */
export default function EngineStage({ cueRef, meterRef, overlaysRef, dark, active, fine, onReady }: EngineStageProps) {
  const [tier, setTier] = useState<Tier>(guessTier);
  const [locked] = useState(forcedTier);
  const channelsRef = useRef<PanelChannels>(createChannels());
  const focusRef = useRef<FocusLight>({ target: new THREE.Vector3(-0.035, 1.23, -0.53), strength: 0.55 });
  const castRef = useRef<Cast | null>(null);
  // where the lamp pool and the ruled wall fade out (StageDirector sets it from the layout)
  const maskRef = useRef(new THREE.Vector4(-2, -1, 0, 0.14));
  const dofRef = useRef<DofState>({ focus: new THREE.Vector3(), amount: 0 });
  const [panel, setPanel] = useState(false);
  const [post, setPost] = useState(tier === 1);
  const shadows = tier >= 2;
  const onCast = useCallback((c: Cast) => {
    castRef.current = c;
    setPanel(true);
  }, []);
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
      frameloop={active ? 'always' : 'never'}
      camera={{ fov: 22, near: 0.25, far: 140, position: [0, 2.2, 12] }}
      gl={{ antialias: tier === 1, alpha: false, powerPreference: 'high-performance', toneMapping: THREE.NeutralToneMapping }}
      onCreated={({ gl }) => gl.setClearColor(dark ? CANVAS.dark : CANVAS.light, 1)}
      aria-hidden
      tabIndex={-1}
    >
      {!locked && (
        <PerformanceMonitor
          bounds={(refresh) => [Math.min(40, refresh * 0.66), Math.min(58, refresh * 0.95)]}
          flipflops={2}
          onDecline={() => setTier(1)}
          onFallback={() => setTier(1)}
        />
      )}
      <Suspense fallback={null}>
        <StageDirector
          cueRef={cueRef}
          meterRef={meterRef}
          channelsRef={channelsRef}
          focusRef={focusRef}
          castRef={castRef}
          overlaysRef={overlaysRef}
          maskRef={maskRef}
          fine={fine}
        />
        <Studio dark={dark} shadows={shadows} focusRef={focusRef} />
        <Cyclorama dark={dark} shadows={shadows} focusRef={focusRef} maskRef={maskRef} />
        {!shadows && <ContactBlot dark={dark} />}
        <Lamp dark={dark} />
        <Panel channelsRef={channelsRef} dark={dark} shadows={shadows} onReady={onCast} />
        <Reveal ready={panel && post} onReady={onReady} />
        {process.env.NODE_ENV !== 'production' && <DrawCounter tier={tier} />}
      </Suspense>
      {tier >= 2 && (
        <Suspense fallback={null}>
          <Post tier={2} dark={dark} dofRef={dofRef} onReady={onPost} />
        </Suspense>
      )}
    </Canvas>
  );
}
