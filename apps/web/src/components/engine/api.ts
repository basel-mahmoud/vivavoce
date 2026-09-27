import { AXES, type AxisKey } from '@/components/room/data';
import type { DemoData } from './engine';

/**
 * The client for POST /api/v1/demo-eval: the same marking engine as the app, for one answer to
 * one allowlisted question, with nothing stored. The response is parsed, never trusted; every
 * way it can go wrong becomes one of four plain outcomes the page words for itself.
 */

const AXIS_KEYS: readonly AxisKey[] = AXES.map((a) => a.key);

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isMark = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;
const isAxis = (v: unknown): v is AxisKey => typeof v === 'string' && (AXIS_KEYS as readonly string[]).includes(v);

/**
 * The panel's answer (demo-eval's `data`), checked field by field and copied, so nothing else in
 * the response comes along; null if any part is missing, of the wrong kind or out of range.
 *
 * Written by hand rather than with a schema library: this runs in the page, whose
 * Content-Security-Policy forbids eval, and zod probes for eval on its first parse, which the
 * browser reports as a policy violation (and it would be zod's only use in the page's bundle).
 */
export function readDemo(value: unknown): DemoData | null {
  if (!isRecord(value)) return null;
  const { source, scores, overall, weakestAxis, summary, improvements } = value;
  if (source !== 'model' && source !== 'heuristic') return null;
  if (!isRecord(scores) || !isMark(overall) || !isAxis(weakestAxis) || typeof summary !== 'string') return null;
  if (!Array.isArray(improvements) || !improvements.every((line) => typeof line === 'string')) return null;
  const marks = {} as Record<AxisKey, number>;
  for (const key of AXIS_KEYS) {
    const mark = scores[key];
    if (!isMark(mark)) return null;
    marks[key] = mark;
  }
  return { source, scores: marks, overall, weakestAxis, summary, improvements: [...improvements] as string[] };
}

export type MarkFailure = 'rate-limited' | 'server' | 'offline' | 'invalid';
export type MarkOutcome = { ok: true; data: DemoData } | { ok: false; reason: MarkFailure; retryAfter: number | null };

/** The route may run for up to 30 s; give up a little earlier and say so. */
const TIMEOUT_MS = 26_000;

function retryAfter(res: Response): number | null {
  const v = Number(res.headers.get('retry-after'));
  return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
}

function offline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Ask the panel to mark an answer. Resolves with the marks or a reason it could not; rejects only
 * with an AbortError when the caller cancelled (a fresh answer replaced this one).
 */
export async function requestMarks(
  body: { questionId: number; answer: string },
  { signal, fetcher = fetch, timeoutMs = TIMEOUT_MS }: { signal?: AbortSignal; fetcher?: typeof fetch; timeoutMs?: number } = {},
): Promise<MarkOutcome> {
  if (offline()) return { ok: false, reason: 'offline', retryAfter: null };

  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort(signal?.reason);
  signal?.addEventListener('abort', onAbort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, timeoutMs);

  try {
    const res = await fetcher('/api/v1/demo-eval', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      cache: 'no-store',
    });
    if (res.status === 429) return { ok: false, reason: 'rate-limited', retryAfter: retryAfter(res) };
    if (res.status === 400) return { ok: false, reason: 'invalid', retryAfter: null };
    if (!res.ok) return { ok: false, reason: 'server', retryAfter: null };
    const json: unknown = await res.json().catch(() => null);
    const data = isRecord(json) && json.ok === true ? readDemo(json.data) : null;
    if (!data) return { ok: false, reason: 'server', retryAfter: null };
    return { ok: true, data };
  } catch (err) {
    if (signal?.aborted) throw err;
    if (timedOut) return { ok: false, reason: 'server', retryAfter: null };
    return { ok: false, reason: offline() ? 'offline' : 'server', retryAfter: null };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
