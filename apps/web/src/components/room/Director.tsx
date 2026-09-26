import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { MotionValue } from 'motion/react';
import { ROUNDS, ROUND_TIMELINE, verdictFace, weakestIndex, type RoundPhase } from './data';
import { HANDOFF, HERO_END, OUTRO, SHOT_KIND, STOP_SHOTS, beatAt, smooth, stillAt, stopBlend, type ShotName } from './story';
import { BEAT_COINS, HERO_COINS, HERO_COINS_COMPACT, makeShots, type Insets, type ShotSet } from './camera';
import { EXAMINERS, SEATS, VISORS } from './examiners/rig';
import type { FaceState } from './examiners/faceMaterial';
import type { Gesture, PanelChannels } from './panel/channels';
import type { Cast } from './panel/cast';
import type { FocusLight } from './set/Studio';
import { BENCH, FLOOR } from './set/layout';
import { devRoundStart, devTimeScale } from './dev';

/** What the room's words are doing: the hero's scripted round, or the outro's follow-up. */
export type RoundMode = 'round' | 'outro';

export interface RoundState {
  /** Monotonic round counter (use index % ROUNDS.length for the script). */
  index: number;
  phase: RoundPhase;
  mode: RoundMode;
}

/** DOM that the director positions every frame (no React renders). */
export interface RoomOverlays {
  tag: HTMLElement | null;
  leader: HTMLElement | null;
  answer: HTMLElement | null;
  /** "Example round. Scores are guidance, not grades.", set under the bench on wide layouts. */
  guide: HTMLElement | null;
  fade: HTMLCanvasElement | null;
}

/** Depth of field: where it focuses and how much of it the current shot wants (0..1). */
export interface DofState {
  focus: THREE.Vector3;
  amount: number;
}

const STILL_SHOTS: readonly ShotName[] = ['hero', 'beat0', 'beat1', 'beat2', 'beat3', 'beat4', 'outro', 'handoff'];
/** How each examiner acts its own beat: the face, and what the free hand does. */
const ACT_FACE: readonly FaceState[] = ['pleased', 'attentive', 'sceptical', 'unconvinced', 'listening'];
const ACT_GESTURE: readonly Gesture[] = ['present', 'loupe', 'chin', 'rest', 'rest'];
const TYPE_CPS = 44;
const ANSWER_CPS = 40;
/** The marked panel's paddles rise one after another, this far apart (seconds). */
const OUTRO_STAGGER = 0.06;
const PHASES = Object.entries(ROUND_TIMELINE) as readonly [RoundPhase, number][];
const MODES: readonly RoundMode[] = ['round', 'outro'];
const FIRST = ROUNDS[0]!;
const WEAKEST = weakestIndex(FIRST.scores);

/**
 * Which bench inlays a shot shows: all of them in the wide shots, only the examiner's own in a
 * medium, none in a close-up or over the shoulder (there the bench is cropped, and a name cut
 * mid-word reads as a mistake).
 */
const SHOT_FOCUS: Record<ShotName, number> = { hero: -1, beat0: 0, beat1: 1, beat2: 2, beat3: 3, beat4: 4, outro: -1, handoff: -1 };
function inlayFor(shot: ShotName, i: number): number {
  const kind = SHOT_KIND[shot];
  if (kind === 'wide') return 1;
  return kind === 'medium' && SHOT_FOCUS[shot] === i ? 1 : 0;
}

const damp = THREE.MathUtils.damp;

/** The loop opens on the first round's follow-up: the marked panel, the weakest examiner asking. */
function startRound() {
  const at = devRoundStart();
  const loop = ROUND_TIMELINE.next;
  if (at === null) return { index: 0, t: ROUND_TIMELINE.follow, reported: -1 };
  const total = ROUND_TIMELINE.follow + at;
  return { index: Math.floor(total / loop), t: total % loop, reported: -1 };
}

function phaseAt(t: number): number {
  let k = 0;
  for (let i = 0; i < PHASES.length; i++) if (t >= PHASES[i]![1]) k = i;
  return k;
}

/** A syllable-ish envelope from the words being typed: vowels open, spaces close. */
function speechAt(text: string, t: number, cps: number): number {
  const i = Math.floor(t * cps);
  if (i < 0 || i >= text.length) return 0;
  const c = text.charCodeAt(i) | 32;
  // a e i o u y
  if (c === 97 || c === 101 || c === 105 || c === 111 || c === 117 || c === 121) return 1;
  const raw = text.charCodeAt(i);
  // space , . ? ! … ’
  if (raw === 32 || raw === 44 || raw === 46 || raw === 63 || raw === 33 || raw === 8230 || raw === 8217) return 0.06;
  return 0.55;
}

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _look = new THREE.Vector3();
const _pos = new THREE.Vector3();

/** Writes a CSS transform only when it changes, so a still room allocates nothing per frame. */
function place(el: HTMLElement, last: { x: number; y: number; s: number }, x: number, y: number, s = -1) {
  const rx = Math.round(x * 2) / 2;
  const ry = Math.round(y * 2) / 2;
  const rs = Math.round(s * 2) / 2;
  if (rx === last.x && ry === last.y && rs === last.s) return;
  last.x = rx;
  last.y = ry;
  last.s = rs;
  el.style.transform = s < 0 ? `translate3d(${rx}px, ${ry}px, 0)` : `translate3d(${rx}px, ${ry}px, 0) scaleY(${rs})`;
}
function show(el: HTMLElement, on: boolean) {
  const v = on ? '1' : '0';
  if (el.style.opacity !== v) el.style.opacity = v;
}

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
  edgeRef,
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
  edgeRef: React.RefObject<THREE.Vector4>;
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
  const outroAt = useRef(-1);
  const clock = useRef(0);
  // the tags' sizes, kept current by a ResizeObserver: they change only when their words do
  const boxes = useRef({ tagW: 0, tagH: 0, answerW: 0, answerH: 0, guideW: 0, guideH: 0 });
  const placed = useRef({
    tag: { x: NaN, y: NaN, s: NaN },
    leader: { x: NaN, y: NaN, s: NaN },
    answer: { x: NaN, y: NaN, s: NaN },
    guide: { x: NaN, y: NaN, s: NaN },
  });

  useEffect(() => {
    const tag = overlaysRef.current?.tag;
    const answer = overlaysRef.current?.answer;
    const guide = overlaysRef.current?.guide;
    if (!tag || !answer) return;
    const measure = () => {
      const b = boxes.current;
      b.tagW = tag.offsetWidth;
      b.tagH = tag.offsetHeight;
      b.answerW = answer.offsetWidth;
      b.answerH = answer.offsetHeight;
      b.guideW = guide?.offsetWidth ?? 0;
      b.guideH = guide?.offsetHeight ?? 0;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(tag);
    ro.observe(answer);
    if (guide) ro.observe(guide);
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
    clock.current += dt;
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
    const kindA = SHOT_KIND[shotA];
    const kindB = SHOT_KIND[shotB];
    micWeightRef.current = (shotA === 'beat2' ? 1 - t : 0) + (shotB === 'beat2' ? t : 0);
    const d = dofRef.current;
    if (d) {
      d.amount = (kindA === 'close' || kindA === 'shoulder' ? 1 - t : 0) + (kindB === 'close' || kindB === 'shoulder' ? t : 0);
      d.focus.lerpVectors(A.focus, B.focus, t);
    }

    // where the captions sit, so the set behind them fades back to plain page; on wide layouts
    // the exam sheet covers the left side from the first beat on, so the set runs right up to it
    if (shots.compact) {
      const inset = p < 0.15 ? insets.hero : p > 0.85 ? insets.outro : insets.beat;
      maskRef.current.set(-2, -1, inset - 0.01, inset + 0.07);
      edgeRef.current.set(0.03, 0.03, 0.04, 0.05);
    } else {
      const sheet = smooth(HERO_END - 0.005, HERO_END + 0.055, p);
      maskRef.current.set(0.4 + 0.03 * sheet, 0.5 - 0.04 * sheet, -2, -1);
      edgeRef.current.set(0.03, 0.05, 0.07, 0.07);
    }

    const cs = castRef.current;
    // bench inlays fade instead of being cropped mid-word
    if (cs) {
      for (let i = 0; i < cs.labels.length; i++) {
        const o = inlayFor(shotA, i) * (1 - t) + inlayFor(shotB, i) * t;
        const label = cs.labels[i]!;
        label.fillOpacity = o;
        label.visible = o > 0.01;
      }
    }

    if (!ch) return;

    /* ── Stages of the story ──────────────────────────────────────────── */
    const beat = beatAt(p);
    const outroW = smooth(OUTRO - 0.07, OUTRO - 0.02, p);
    const handoff = p >= HANDOFF;
    const inHero = heroW > 0.5;
    const atOutro = beat < 0 && !handoff && outroW > 0.5;

    /* ── The scripted round (hero only) ───────────────────────────────── */
    const r = round.current;
    if (playing && inHero && !reduce) {
      r.t += dt;
      if (r.t >= ROUND_TIMELINE.next) {
        r.t -= ROUND_TIMELINE.next;
        r.index += 1;
      }
    }
    const scripted = (playing || reviewing.current) && !reduce;
    const phaseK = scripted ? phaseAt(r.t) : 3;
    const phase = PHASES[phaseK]![0];
    const index = scripted ? r.index : 0;
    const modeK = atOutro ? 1 : 0;
    const key = (index * 8 + phaseK) * 4 + modeK;
    if (key !== r.reported) {
      r.reported = key;
      onRound({ index, phase, mode: MODES[modeK]! });
    }
    if (process.env.NODE_ENV !== 'production') {
      const g = window as unknown as { __vvRoom?: Record<string, unknown> };
      g.__vvRoom = { ...(g.__vvRoom ?? {}), round: `${index}:${phase}:${r.t.toFixed(2)}:${MODES[modeK]}` };
    }
    const script = ROUNDS[index % ROUNDS.length]!;
    const weakest = weakestIndex(script.scores);
    const tp = r.t - ROUND_TIMELINE[phase];
    const liveRound = scripted;

    const pt = pointer.current;

    /* ── Channels ─────────────────────────────────────────────────────── */
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
      e.mark = FIRST.scores[i]!;
      const hc = coinsHero[i]!;
      e.coin.set(hc[0], hc[1], hc[2]);
    }
    if (!atOutro) outroAt.current = -1;
    else if (outroAt.current < 0) outroAt.current = clock.current;

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
          e.look = pt.fine ? 'pointer' : 'camera';
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
          e.look = pt.fine ? 'pointer' : 'camera';
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
          const bc = BEAT_COINS[i]!;
          e.coin.set(bc[0], bc[1], bc[2]);
        } else {
          e.face = 'attentive';
          e.look = beat;
        }
      }
      if (beat === 3) ch.tempo = 1.9;
      focusIndex = beat;
      focusStrength = 1;
    } else if (handoff) {
      // the hand-off: marks down, all five turn to you and listen
      for (let i = 0; i < ch.examiners.length; i++) {
        const e = ch.examiners[i]!;
        e.face = 'listening';
        e.look = 'camera';
        e.delay = i * 0.06;
      }
      focusIndex = 2;
      focusStrength = 0.6;
    } else if (atOutro) {
      // "Five marks. One to fix first.": every paddle rises face-on in a quick stagger (each with
      // its dip and settle), the weakest in red pen, and it leans in to ask its follow-up
      const since = clock.current - outroAt.current;
      speakText = FIRST.followUp;
      speaker = WEAKEST;
      const typing = !reduce && since < speakText.length / TYPE_CPS + 0.35;
      for (let i = 0; i < ch.examiners.length; i++) {
        const e = ch.examiners[i]!;
        e.paddle = 1;
        e.delay = i * OUTRO_STAGGER;
        e.hot = i === WEAKEST ? 1 : 0;
        e.focus = i === WEAKEST ? 1 : 0;
        e.speaking = i === WEAKEST ? 1 : 0;
        e.gesture = i === WEAKEST ? 'present' : 'rest';
        e.face = verdictFace(FIRST.scores[i]!);
        e.look = i === WEAKEST ? 'camera' : WEAKEST;
      }
      // the words, then a held murmur: it waits for the answer with its speaking face on
      const lvl = reduce ? 0.7 : typing ? speechAt(speakText, since, TYPE_CPS) : 0.3 + 0.12 * Math.sin(since * 5.1);
      speech.current = reduce ? lvl : damp(speech.current, lvl, 18, dt);
      focusIndex = WEAKEST;
      focusStrength = 1;
    } else {
      focusIndex = 2;
      focusStrength = 0.5;
    }

    ch.speech = speaker >= 0 ? speech.current : 0;

    /* ── Focus light and the lamp pool follow whoever has the floor ──── */
    const f = focusRef.current;
    if (f) {
      if (cs && focusIndex >= 0) cs.visorWorld(focusIndex, f.target);
      f.strength = focusStrength;
    }

    /* ── DOM tags: the examiner's margin note and the candidate's words ─ */
    const o = overlaysRef.current;
    if (o?.guide) {
      const pg = placed.current.guide;
      if (shots.compact) {
        // phones: the caption keeps its own place along the bottom edge
        if (!Number.isNaN(pg.x)) {
          o.guide.style.transform = '';
          pg.x = pg.y = pg.s = NaN;
        }
      } else {
        // the figure caption, just under the bench's front edge
        const b = boxes.current;
        _v.set(0, FLOOR, BENCH.centreZ - BENCH.front).project(camera);
        const gx = (_v.x + 1) * 0.5 * w - b.guideW / 2;
        const gy = (1 - _v.y) * 0.5 * h + 14;
        place(o.guide, pg, Math.min(Math.max(gx, w * 0.47), w - b.guideW - 16), Math.min(gy, h - b.guideH - 14));
      }
    }
    if (o && cs) {
      const showTag = (inHero || atOutro) && speaker >= 0;
      const showAnswer = inHero && liveRound && (phase === 'listen' || phase === 'mark');
      // Notes above the panel sit clear of its top edge (the highest crown or raised mark), so they
      // never cover a face or a mark; on compact layouts they stay below the captions.
      // (below the exam sheet's edge, which lies 0.7rem under the note, on compact layouts)
      const minTop = shots.compact ? h * (atOutro ? insets.outro : insets.hero) + 22 : 76;
      let top = Infinity;
      if (showTag || showAnswer) {
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
          const b = boxes.current;
          const tw = b.tagW;
          const th = b.tagH;
          const ty = Math.max(top - th - 18, minTop);
          // the examiner's note, its red-pen leader dropping to the speaker's crown
          cs.visorWorld(speaker, _w);
          const vis = VISORS[EXAMINERS[speaker]!];
          _v.copy(_w).setY(_w.y + vis.halfHeight * 2.4).project(camera);
          const ax = (_v.x + 1) * 0.5 * w;
          const ay = (1 - _v.y) * 0.5 * h;
          const minX = shots.compact ? 12 : w * 0.47;
          const tx = Math.min(Math.max(ax - tw / 2, minX), w - tw - 16);
          place(o.tag, placed.current.tag, tx, ty);
          const ly = ty + th;
          place(o.leader, placed.current.leader, ax, ly, Math.max(0, ay - ly - 6));
          show(o.leader, true);
          show(o.tag, true);
        } else {
          show(o.tag, false);
          show(o.leader, false);
        }
      }
      if (o.answer) {
        if (showAnswer) {
          // the candidate's words take the same slot above the panel, in blue ink
          const b = boxes.current;
          const aw = b.answerW;
          const ah = b.answerH;
          cs.visorWorld(2, _w);
          _v.copy(_w).project(camera);
          const ax = (_v.x + 1) * 0.5 * w;
          const minX = shots.compact ? 12 : w * 0.47;
          const tx = Math.min(Math.max(ax - aw / 2, minX), w - aw - 16);
          const ty = Math.max(top - ah - 18, minTop);
          place(o.answer, placed.current.answer, tx, ty);
          // on a short phone there may be no room between the copy and the panel: then the
          // listening faces carry the answer alone, and the note never covers a head or a mark
          show(o.answer, !shots.compact || ty + ah <= top - 4);
        } else {
          show(o.answer, false);
        }
      }
    }
  }, -1);

  return null;
}
