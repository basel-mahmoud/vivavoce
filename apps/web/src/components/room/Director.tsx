import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { MotionValue } from 'motion/react';
import { ROUNDS, ROUND_TIMELINE, verdictFace, weakestIndex, type RoundPhase } from './data';
import { HERO_END, OUTRO, SHOT_KIND, STOP_SHOTS, beatAt, smooth, stillAt, stopBlend, type ShotName } from './story';
import { BEAT_COINS, HERO_COINS, HERO_COINS_COMPACT, makeShots, type Insets, type ShotSet } from './camera';
import { EXAMINERS, SEATS, VISORS } from './examiners/rig';
import type { FaceState } from './examiners/faceMaterial';
import type { Gesture, PanelChannels } from './panel/channels';
import type { Cast } from './panel/cast';
import type { FocusLight } from './set/Studio';
import { devRoundStart, devTimeScale } from './dev';

export interface RoundState {
  /** Monotonic round counter (use index % ROUNDS.length for the script). */
  index: number;
  phase: RoundPhase;
}

/** DOM that the director positions every frame (no React renders). */
export interface RoomOverlays {
  tag: HTMLElement | null;
  leader: HTMLElement | null;
  answer: HTMLElement | null;
  fade: HTMLCanvasElement | null;
}

/** Depth of field: where it focuses and how much of it the current shot wants (0..1). */
export interface DofState {
  focus: THREE.Vector3;
  amount: number;
}

const STILL_SHOTS: readonly ShotName[] = ['hero', 'beat0', 'beat1', 'beat2', 'beat3', 'beat4', 'outro'];
/** How each examiner acts its own beat: the face, and what the free hand does. */
const ACT_FACE: readonly FaceState[] = ['pleased', 'attentive', 'sceptical', 'unconvinced', 'listening'];
const ACT_GESTURE: readonly Gesture[] = ['present', 'loupe', 'chin', 'rest', 'rest'];
const TYPE_CPS = 44;
const ANSWER_CPS = 40;

const damp = THREE.MathUtils.damp;

/** The loop opens on the first round's follow-up: the marked panel, the weakest examiner asking. */
function startRound() {
  const at = devRoundStart();
  const loop = ROUND_TIMELINE.next;
  if (at === null) return { index: 0, t: ROUND_TIMELINE.follow, reported: '' };
  const total = ROUND_TIMELINE.follow + at;
  return { index: Math.floor(total / loop), t: total % loop, reported: '' };
}

function phaseAt(t: number): RoundPhase {
  let phase: RoundPhase = 'ask';
  for (const [p, at] of Object.entries(ROUND_TIMELINE) as [RoundPhase, number][]) if (t >= at) phase = p;
  return phase;
}

/** A syllable-ish envelope from the words being typed: vowels open, spaces close. */
function speechAt(text: string, t: number, cps: number): number {
  const i = Math.floor(t * cps);
  if (i < 0 || i >= text.length) return 0;
  const c = text[i]!.toLowerCase();
  if ('aeiouy'.includes(c)) return 1;
  if (c === ' ' || ',.?!…’'.includes(c)) return 0.06;
  return 0.55;
}

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _look = new THREE.Vector3();
const _pos = new THREE.Vector3();

/**
 * Scroll and the scripted round in, camera and panel channels out. Runs before everything else
 * each frame (priority -1). Nothing here renders React: the camera, the channels, the focus light,
 * the depth-of-field target and the DOM tags are all written in place.
 */
export function Director({
  progress,
  reduce,
  insets,
  playing,
  channelsRef,
  focusRef,
  castRef,
  shotsRef,
  micWeightRef,
  dofRef,
  maskRef,
  overlaysRef,
  onRound,
}: {
  progress: MotionValue<number>;
  reduce: boolean;
  insets: Insets;
  playing: boolean;
  channelsRef: React.RefObject<PanelChannels>;
  focusRef: React.RefObject<FocusLight>;
  castRef: React.RefObject<Cast | null>;
  shotsRef: React.RefObject<ShotSet | null>;
  micWeightRef: React.RefObject<number>;
  dofRef: React.RefObject<DofState>;
  maskRef: React.RefObject<THREE.Vector4>;
  overlaysRef: React.RefObject<RoomOverlays>;
  onRound: (r: RoundState) => void;
}) {
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const shots = useMemo(
    () => makeShots(size.width / Math.max(1, size.height), insets, size.width),
    [size.width, size.height, insets],
  );
  useEffect(() => {
    shotsRef.current = shots;
  }, [shots, shotsRef]);

  const cam = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3(), sx: 0, sy: 0, fov: 22, first: true });
  const pointer = useRef({ x: 0, y: 0, fine: false });
  const round = useRef(startRound());
  // a review start (dev only) shows its phase from the first frame, not the intro's
  const reviewing = useRef(devRoundStart() !== null);
  const timeScale = useRef(devTimeScale());
  const speech = useRef(0);
  const still = useRef(-1);
  // the tags' sizes, kept current by a ResizeObserver: they change only when their words do
  const boxes = useRef({ tagW: 0, tagH: 0, answerW: 0, answerH: 0 });

  useEffect(() => {
    const tag = overlaysRef.current?.tag;
    const answer = overlaysRef.current?.answer;
    if (!tag || !answer) return;
    const measure = () => {
      const b = boxes.current;
      b.tagW = tag.offsetWidth;
      b.tagH = tag.offsetHeight;
      b.answerW = answer.offsetWidth;
      b.answerH = answer.offsetHeight;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(tag);
    ro.observe(answer);
    return () => ro.disconnect();
  }, [overlaysRef]);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    pointer.current.fine = fine && !reduce;
    if (!pointer.current.fine) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduce]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1) * timeScale.current;
    const camera = state.camera as THREE.PerspectiveCamera;
    const ch = channelsRef.current;
    const p = progress.get();
    const w = state.size.width;
    const h = state.size.height;
    const poses = shots.poses;

    /* ── Camera ───────────────────────────────────────────────────────── */
    const c = cam.current;
    let shotA: ShotName;
    let shotB: ShotName;
    let t: number;
    if (reduce) {
      // reduced motion: a cut to the nearest still, covered by a crossfade, never a flight
      const k = stillAt(p);
      shotA = shotB = STILL_SHOTS[k]!;
      t = 0;
      if (k !== still.current) {
        const fade = overlaysRef.current.fade;
        if (fade && still.current >= 0) {
          fade.width = gl.domElement.width;
          fade.height = gl.domElement.height;
          fade.getContext('2d')?.drawImage(gl.domElement, 0, 0);
          fade.style.transition = 'none';
          fade.style.opacity = '1';
          void fade.offsetWidth;
          fade.style.transition = 'opacity 320ms ease';
          fade.style.opacity = '0';
        }
        still.current = k;
      }
    } else {
      const b = stopBlend(p);
      shotA = STOP_SHOTS[b.a]!;
      shotB = STOP_SHOTS[b.b]!;
      t = b.t;
    }
    const A = poses[shotA];
    const B = poses[shotB];
    _pos.lerpVectors(A.pos, B.pos, t);
    _look.lerpVectors(A.look, B.look, t);
    const sx = A.sx + (B.sx - A.sx) * t;
    const sy = A.sy + (B.sy - A.sy) * t;
    const fov = A.fov + (B.fov - A.fov) * t;
    // pointer parallax: the hero only, fine pointers only
    const heroW = 1 - smooth(HERO_END - 0.02, HERO_END + 0.05, p);
    if (pointer.current.fine) {
      _pos.x += pointer.current.x * 0.42 * heroW;
      _pos.y -= pointer.current.y * 0.2 * heroW;
    }
    if (c.first || reduce) {
      c.pos.copy(_pos);
      c.look.copy(_look);
      c.sx = sx;
      c.sy = sy;
      c.fov = fov;
      c.first = false;
    } else {
      c.pos.x = damp(c.pos.x, _pos.x, 4.2, dt);
      c.pos.y = damp(c.pos.y, _pos.y, 4.2, dt);
      c.pos.z = damp(c.pos.z, _pos.z, 4.2, dt);
      c.look.x = damp(c.look.x, _look.x, 4.8, dt);
      c.look.y = damp(c.look.y, _look.y, 4.8, dt);
      c.look.z = damp(c.look.z, _look.z, 4.8, dt);
      c.sx = damp(c.sx, sx, 4.2, dt);
      c.sy = damp(c.sy, sy, 4.2, dt);
      c.fov = damp(c.fov, fov, 4.2, dt);
    }
    camera.position.copy(c.pos);
    camera.fov = c.fov;
    camera.lookAt(c.look);
    camera.setViewOffset(w, h, -c.sx * w, -c.sy * h, w, h);
    camera.updateMatrixWorld();

    // what the shot wants from the lens and the props
    const kindW = (kind: string) => (SHOT_KIND[shotA] === kind ? 1 - t : 0) + (SHOT_KIND[shotB] === kind ? t : 0);
    micWeightRef.current = (shotA === 'beat2' ? 1 - t : 0) + (shotB === 'beat2' ? t : 0);
    const d = dofRef.current;
    if (d) {
      d.amount = kindW('close') + kindW('shoulder');
      d.focus.lerpVectors(A.focus, B.focus, t);
    }

    // where the captions sit, so the wall behind them stays plain page
    if (shots.compact) {
      const inset = p < 0.15 ? insets.hero : p > 0.85 ? insets.outro : insets.beat;
      maskRef.current.set(-2, -1, inset - 0.02, inset + 0.12);
    } else maskRef.current.set(0.3, 0.56, -2, -1);

    if (!ch) return;

    /* ── The scripted round (hero only) ───────────────────────────────── */
    const r = round.current;
    const inHero = heroW > 0.5;
    if (playing && inHero && !reduce) {
      r.t += dt;
      if (r.t >= ROUND_TIMELINE.next) {
        r.t -= ROUND_TIMELINE.next;
        r.index += 1;
      }
    }
    const scripted = (playing || reviewing.current) && !reduce;
    const phase = scripted ? phaseAt(r.t) : 'follow';
    const index = scripted ? r.index : 0;
    const key = `${index}:${phase}`;
    if (key !== r.reported) {
      r.reported = key;
      onRound({ index, phase });
    }
    if (process.env.NODE_ENV !== 'production') {
      const w = window as unknown as { __vvRoom?: Record<string, unknown> };
      w.__vvRoom = { ...(w.__vvRoom ?? {}), round: `${index}:${phase}:${r.t.toFixed(2)}` };
    }
    const script = ROUNDS[index % ROUNDS.length]!;
    const weakest = weakestIndex(script.scores);
    const tp = r.t - ROUND_TIMELINE[phase];
    const liveRound = scripted;

    /* ── Channels ─────────────────────────────────────────────────────── */
    const beat = beatAt(p);
    const outroW = smooth(OUTRO - 0.07, OUTRO - 0.02, p);
    const handoff = p > 0.955;
    const coinsHero = shots.compact ? HERO_COINS_COMPACT : HERO_COINS;
    ch.still = reduce;
    ch.waveLive = false;
    ch.progress = 0;
    ch.tempo = 1;
    let speaker = -1;
    let speakText = '';
    let focusIndex = -1;
    let focusStrength = 0.55;

    for (let i = 0; i < ch.examiners.length; i++) {
      const e = ch.examiners[i]!;
      e.focus = 0;
      e.paddle = 0;
      e.hot = 0;
      e.speaking = 0;
      e.face = 'neutral';
      e.gesture = 'rest';
      e.look = 'camera';
      e.delay = i * 0.09;
      e.mark = ROUNDS[0]!.scores[i]!;
      e.coin.set(...coinsHero[i]!);
    }

    if (inHero) {
      for (let i = 0; i < ch.examiners.length; i++) ch.examiners[i]!.mark = script.scores[i]!;
      if (phase === 'ask') {
        speaker = script.asker;
        speakText = script.question;
      } else if (phase === 'follow') {
        speaker = weakest;
        speakText = script.followUp;
      }
      const typing = speaker >= 0 && (!liveRound || tp < speakText.length / TYPE_CPS + 0.35);
      for (let i = 0; i < ch.examiners.length; i++) {
        const e = ch.examiners[i]!;
        const verdict = verdictFace(script.scores[i]!);
        if (phase === 'ask') {
          e.focus = i === speaker ? 1 : 0;
          e.speaking = i === speaker && typing ? 1 : 0;
          e.gesture = i === speaker ? 'present' : 'rest';
          e.face = 'attentive';
          e.look = i === speaker ? 'camera' : speaker;
        } else if (phase === 'listen') {
          e.face = 'listening';
          e.look = pointer.current.fine ? 'pointer' : 'camera';
        } else if (phase === 'mark') {
          const up = tp > 0.75;
          e.paddle = up ? 1 : 0;
          e.face = tp > 0.75 + e.delay + 0.7 ? verdict : 'marking';
        } else if (phase === 'follow') {
          e.paddle = 1;
          e.hot = i === speaker ? 1 : 0;
          e.focus = i === speaker ? 1 : 0;
          e.speaking = i === speaker && typing ? 1 : 0;
          e.gesture = i === speaker ? 'present' : 'rest';
          e.face = verdict;
          e.look = i === speaker ? 'camera' : speaker;
          // the still first frame (and reduced motion): every paddle is already up
          if (!liveRound) e.delay = 0;
        } else {
          e.face = 'neutral';
          e.look = pointer.current.fine ? 'pointer' : 'camera';
        }
      }
      if (phase === 'listen') {
        ch.waveLive = true;
        const lvl = speechAt(script.answer, tp, ANSWER_CPS);
        speech.current = damp(speech.current, lvl, 16, dt);
        const wave = ch.wave;
        const time = r.t;
        for (let j = 0; j < wave.length; j++) {
          const x = j / (wave.length - 1);
          const env = Math.sin(Math.PI * x);
          wave[j] =
            (0.25 + 0.75 * speech.current) *
            env *
            (0.55 * Math.sin(j * 1.7 + time * 23) + 0.3 * Math.sin(j * 0.63 - time * 11) + 0.15 * Math.sin(j * 3.1 + time * 37));
        }
      }
      if (phase === 'mark') ch.progress = Math.min(1, tp / 0.75);
      if (speaker >= 0) {
        const lvl = liveRound ? speechAt(speakText, tp, TYPE_CPS) : 0.7;
        speech.current = liveRound ? damp(speech.current, lvl, 18, dt) : lvl;
        focusIndex = speaker;
        focusStrength = 1;
      } else {
        focusIndex = 2;
        focusStrength = 0.55;
      }
    } else if (beat >= 0) {
      for (let i = 0; i < ch.examiners.length; i++) {
        const e = ch.examiners[i]!;
        e.delay = 0.05;
        if (i === beat) {
          e.paddle = 1;
          e.hot = 1;
          e.focus = 1;
          e.face = ACT_FACE[i]!;
          e.gesture = ACT_GESTURE[i]!;
          e.coin.set(...BEAT_COINS[i]!);
        } else {
          e.face = 'attentive';
          e.look = beat;
        }
      }
      if (beat === 3) ch.tempo = 1.9;
      focusIndex = beat;
      focusStrength = 1;
    } else if (handoff) {
      for (let i = 0; i < ch.examiners.length; i++) {
        const e = ch.examiners[i]!;
        e.face = 'listening';
        e.look = 'camera';
        e.delay = i * 0.06;
      }
      focusIndex = 2;
      focusStrength = 0.6;
    } else if (outroW > 0.5) {
      const w0 = weakestIndex(ROUNDS[0]!.scores);
      for (let i = 0; i < ch.examiners.length; i++) {
        const e = ch.examiners[i]!;
        e.paddle = 1;
        e.hot = i === w0 ? 1 : 0;
        e.focus = i === w0 ? 0.6 : 0;
        e.face = verdictFace(ROUNDS[0]!.scores[i]!);
        e.coin.set(...coinsHero[i]!);
      }
      focusIndex = w0;
      focusStrength = 0.85;
    } else {
      focusIndex = 2;
      focusStrength = 0.5;
    }
    ch.speech = speaker >= 0 ? speech.current : 0;

    /* ── Focus light and the lamp pool follow whoever has the floor ──── */
    const f = focusRef.current;
    const cs = castRef.current;
    if (f) {
      if (cs && focusIndex >= 0) cs.visorWorld(focusIndex, f.target);
      f.strength = focusStrength;
    }

    /* ── DOM tags: the examiner's margin note and the candidate's words ─ */
    const o = overlaysRef.current;
    if (o && cs) {
      const showTag = inHero && speaker >= 0;
      const showAnswer = inHero && liveRound && (phase === 'listen' || phase === 'mark');
      // Notes above the panel sit clear of its top edge (the highest crown or raised mark), so they
      // never cover a face or a mark; on compact layouts they stay below the hero copy.
      const minTop = shots.compact ? h * (insets.hero + 0.01) : 76;
      let top = Infinity;
      if (showTag || (showAnswer && shots.compact)) {
        for (let i = 0; i < EXAMINERS.length; i++) {
          const s = SEATS[EXAMINERS[i]!];
          _v.set(s.position[0], s.top + 0.06, s.position[2]).project(camera);
          top = Math.min(top, (1 - _v.y) * 0.5 * h);
          const e = ch.examiners[i]!;
          if (e.paddle > 0.5) {
            _v.copy(e.coin).setY(e.coin.y + 0.3).project(camera);
            top = Math.min(top, (1 - _v.y) * 0.5 * h);
          }
        }
      }
      if (o.tag && o.leader) {
        if (showTag) {
          // the examiner's note, its red-pen leader dropping to the speaker's crown
          cs.visorWorld(speaker, _w);
          const vis = VISORS[EXAMINERS[speaker]!];
          _v.copy(_w).setY(_w.y + vis.halfHeight * 2.4).project(camera);
          const ax = (_v.x + 1) * 0.5 * w;
          const ay = (1 - _v.y) * 0.5 * h;
          const tw = boxes.current.tagW;
          const th = boxes.current.tagH;
          const minX = shots.compact ? 12 : w * 0.46;
          const tx = Math.min(Math.max(ax - tw / 2, minX), w - tw - 16);
          const ty = Math.max(top - th - 18, minTop);
          o.tag.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0)`;
          o.tag.style.opacity = '1';
          const ly = ty + th;
          o.leader.style.transform = `translate3d(${ax.toFixed(1)}px, ${ly.toFixed(1)}px, 0) scaleY(${Math.max(0, ay - ly - 6).toFixed(1)})`;
          o.leader.style.opacity = '1';
        } else {
          o.tag.style.opacity = '0';
          o.leader.style.opacity = '0';
        }
      }
      if (o.answer) {
        if (showAnswer) {
          const aw = boxes.current.answerW;
          const ah = boxes.current.answerH;
          let tx: number;
          let ty: number;
          if (shots.compact) {
            // phones: the same slot as the examiners' questions, so the eye never hunts for it
            tx = Math.max(12, (w - aw) / 2);
            ty = Math.max(top - ah - 18, minTop);
          } else {
            // under the bench, clear of the example-round caption along the bottom
            _v.set(0, -0.62, 0.55).project(camera);
            const ax = (_v.x + 1) * 0.5 * w;
            const ay = (1 - _v.y) * 0.5 * h;
            tx = Math.min(Math.max(ax - aw / 2, w * 0.46), w - aw - 16);
            ty = Math.min(ay + 10, h - ah - 68);
          }
          o.answer.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0)`;
          o.answer.style.opacity = '1';
        } else {
          o.answer.style.opacity = '0';
        }
      }
    }
  }, -1);

  return null;
}

