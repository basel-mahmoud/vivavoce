import { AXES, type AxisKey } from '@/components/room/data';
import { MAX_CHARS, MIN_CHARS, MIN_WORDS, QUESTIONS } from './questions';
import type { PenResult } from './pen';

/**
 * "Your turn" as a state machine: one pure reducer, so every transition is testable and the
 * component only runs the side effects (the microphone, speech recognition, the request).
 *
 *   idle ──press──▶ requesting ──granted──▶ listening ──release/stop──▶ conferring ──▶ marked
 *     ▲                 │ refused                │ too short / silence       │ failed
 *     └─────────────────┴────────────────────────┴───────────────────────────┘ (with a notice)
 *
 * A quick tap latches the microphone open (tap again to stop); a hold answers while held.
 * Pressing again at any point starts a fresh answer, so nothing ever blocks the candidate.
 */

export type Phase = 'idle' | 'requesting' | 'listening' | 'conferring' | 'marked';
export type Mode = 'voice' | 'text';

/** Why the engine is not where the candidate expected it to be. */
export type Notice =
  | 'denied'
  | 'no-mic'
  | 'unsupported'
  | 'no-speech'
  | 'too-short'
  | 'rate-limited'
  | 'server'
  | 'offline'
  | 'invalid';

/** A press shorter than this latches the microphone open instead of answering while held. */
export const TAP_MS = 320;

export interface Verdict {
  /** In AXES order; null where the examiner could not mark (the heuristic cannot judge correctness). */
  marks: (number | null)[];
  /** AXES index of the axis to fix first. */
  weakest: number;
  overall: number;
  source: 'model' | 'heuristic';
  summary: string;
  improvement: string | null;
}

export interface EngineState {
  phase: Phase;
  mode: Mode;
  /** Index into QUESTIONS. */
  question: number;
  /** The answer so far: final speech, or what was typed. */
  text: string;
  /** Speech still being recognised. */
  interim: string;
  notice: Notice | null;
  /** Seconds until the demo limit lifts (rate-limited only). */
  retryAfter: number | null;
  /** The answer being marked, or last marked, frozen for the red pen. */
  answered: string | null;
  result: Verdict | null;
  /** Id of the request in flight; responses to any other id are stale. */
  request: number;
  /** The microphone stays open after the key comes up (tap-to-toggle). */
  latched: boolean;
}

export type EngineEvent =
  | { type: 'press' }
  | { type: 'release'; heldMs: number }
  | { type: 'granted' }
  | { type: 'refused'; reason: 'denied' | 'no-mic' | 'unsupported' }
  | { type: 'heard'; final: string; interim: string }
  | { type: 'silence' }
  | { type: 'stop' }
  | { type: 'cancel' }
  | { type: 'type'; text: string }
  | { type: 'submit' }
  | { type: 'resolved'; request: number; result: Verdict }
  | { type: 'failed'; request: number; notice: 'rate-limited' | 'server' | 'offline' | 'invalid'; retryAfter?: number | null }
  | { type: 'reset' }
  | { type: 'edit' }
  | { type: 'next' }
  | { type: 'mode'; mode: Mode };

export function initialState(mode: Mode = 'voice'): EngineState {
  return {
    phase: 'idle',
    mode,
    question: 0,
    text: '',
    interim: '',
    notice: null,
    retryAfter: null,
    answered: null,
    result: null,
    request: 0,
    latched: false,
  };
}

export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Long enough to mark: the API's character floor and a few real words. */
export function isAnswer(text: string): boolean {
  const t = text.trim();
  return t.length >= MIN_CHARS && wordCount(t) >= MIN_WORDS;
}

function clip(text: string): string {
  return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;
}

/** Stop listening (or submit typed words) and hand the answer to the panel, if it is one. */
function commit(s: EngineState): EngineState {
  const answer = clip(`${s.text} ${s.interim}`.replace(/\s+/g, ' ').trim());
  if (!isAnswer(answer)) {
    const heardNothing = s.phase === 'listening' && !answer;
    return {
      ...s,
      phase: 'idle',
      text: answer,
      interim: '',
      latched: false,
      notice: heardNothing ? 'no-speech' : 'too-short',
      retryAfter: null,
    };
  }
  return {
    ...s,
    phase: 'conferring',
    text: answer,
    interim: '',
    latched: false,
    notice: null,
    retryAfter: null,
    answered: answer,
    result: null,
    request: s.request + 1,
  };
}

/** A fresh take: clear the answer and anything marked, and invalidate a request in flight. */
function fresh(s: EngineState): EngineState {
  return {
    ...s,
    text: '',
    interim: '',
    notice: null,
    retryAfter: null,
    answered: null,
    result: null,
    request: s.request + 1,
    latched: false,
  };
}

export function reduce(s: EngineState, e: EngineEvent): EngineState {
  switch (e.type) {
    case 'press': {
      if (s.mode !== 'voice') return s;
      if (s.phase === 'listening') return s.latched ? commit(s) : s;
      if (s.phase === 'requesting') return s;
      return { ...fresh(s), phase: 'requesting' };
    }
    case 'release': {
      if (s.phase === 'requesting') return { ...s, latched: true };
      if (s.phase !== 'listening' || s.latched) return s;
      if (e.heldMs < TAP_MS) return { ...s, latched: true };
      return commit(s);
    }
    case 'granted':
      return s.phase === 'requesting' ? { ...s, phase: 'listening' } : s;
    case 'refused':
      if (s.phase !== 'requesting' && s.phase !== 'listening') return s;
      return { ...s, phase: 'idle', mode: 'text', notice: e.reason, latched: false, interim: '' };
    case 'heard': {
      if (s.phase !== 'listening') return s;
      const next = { ...s, text: clip(e.final), interim: e.interim };
      // the panel reads up to MAX_CHARS: a take that reaches it is handed in
      return `${e.final} ${e.interim}`.trim().length >= MAX_CHARS ? commit(next) : next;
    }
    case 'silence':
      if (s.phase !== 'listening') return s;
      return commit(s);
    case 'stop':
      return s.phase === 'listening' ? commit(s) : s;
    case 'cancel':
      if (s.phase !== 'listening' && s.phase !== 'requesting') return s;
      return { ...fresh(s), phase: 'idle' };
    case 'type':
      if (s.phase === 'conferring' || s.phase === 'listening' || s.phase === 'requesting') return s;
      return {
        ...s,
        text: clip(e.text),
        // once there is enough, the "too short" note has done its job
        notice: s.notice === 'too-short' && isAnswer(e.text) ? null : s.notice,
        phase: s.phase === 'marked' ? 'idle' : s.phase,
        result: s.phase === 'marked' ? null : s.result,
        answered: s.phase === 'marked' ? null : s.answered,
      };
    case 'submit':
      if (s.phase === 'conferring' || s.phase === 'listening' || s.phase === 'requesting') return s;
      return commit({ ...s, interim: '' });
    case 'resolved':
      if (s.phase !== 'conferring' || e.request !== s.request) return s;
      return { ...s, phase: 'marked', result: e.result };
    case 'failed':
      if (s.phase !== 'conferring' || e.request !== s.request) return s;
      return { ...s, phase: 'idle', notice: e.notice, retryAfter: e.retryAfter ?? null };
    case 'reset':
      return { ...fresh(s), phase: 'idle' };
    case 'edit':
      // a marked answer back on the page as words to improve, then mark again
      if (s.phase !== 'marked' || !s.answered) return s;
      return { ...fresh(s), phase: 'idle', mode: 'text', text: s.answered };
    case 'next':
      return { ...fresh(s), phase: 'idle', question: (s.question + 1) % QUESTIONS.length };
    case 'mode':
      if (s.phase === 'listening' || s.phase === 'requesting' || s.phase === 'conferring') return s;
      return { ...s, mode: e.mode, notice: null, retryAfter: null };
  }
}

/* ── Reading the panel's answer ───────────────────────────────────────── */

export interface DemoData {
  source: 'model' | 'heuristic';
  scores: Record<AxisKey, number>;
  overall: number;
  weakestAxis: AxisKey;
  summary: string;
  improvements: string[];
}

const clampMark = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * The API's marks, as the panel shows them. The quick heuristic (used while the AI coach is busy)
 * has no reference answer, so it cannot judge correctness: that paddle stays down, and the axis
 * to fix first and the overall mark come only from what it measured.
 */
export function judge(d: DemoData): Verdict {
  const heuristic = d.source === 'heuristic';
  const marks = AXES.map((a) => (heuristic && a.key === 'correctness' ? null : clampMark(d.scores[a.key])));
  const judged = marks.map((m, i) => ({ m, i })).filter((x): x is { m: number; i: number } => x.m !== null);
  const lowest = judged.reduce((lo, x) => (x.m < lo.m ? x : lo), judged[0]!).i;
  const named = AXES.findIndex((a) => a.key === d.weakestAxis);
  const weakest = heuristic || named < 0 || marks[named] === null ? lowest : named;
  const overall = heuristic ? clampMark(judged.reduce((sum, x) => sum + x.m, 0) / judged.length) : clampMark(d.overall);
  return {
    marks,
    weakest,
    overall,
    source: d.source,
    summary: d.summary,
    improvement: d.improvements[0] ?? null,
  };
}

const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);

/**
 * What the weakest examiner asks next. The API sends marks, not questions, so each examiner has
 * its own follow-up, sharpened by what the red pen found.
 */
export function followUpFor(axis: number, pen: Pick<PenResult, 'hedges' | 'fillers' | 'claim'>): string {
  switch (AXES[axis]?.key) {
    case 'correctness':
      return 'Answer the question I asked. What is your one-line answer to it?';
    case 'clarity':
      return 'Say that again for someone outside your field. Plain words.';
    case 'structure':
      return pen.claim ? 'You buried your claim. What is the one-line answer?' : 'Give me your answer first, then two reasons.';
    case 'conciseness':
      return pen.fillers >= 2 ? 'Good material, too much filler. Thirty seconds, again.' : 'Good material, too long. Give it to me in thirty seconds.';
    case 'confidence':
      return pen.hedges ? `You hedged ${times(pen.hedges)}. Say it again like you mean it.` : 'Say it again like you mean it. No softeners.';
    default:
      return 'Once more, from the top.';
  }
}
