import { z } from '@/lib/zod-client';
import type { DemoData } from './engine';

/**
 * The client for POST /api/v1/demo-eval: the same marking engine as the app, for one answer to
 * one allowlisted question, with nothing stored. The response is parsed, never trusted; every
 * way it can go wrong becomes one of four plain outcomes the page words for itself.
 */

const mark = z.number().check(z.minimum(0), z.maximum(100));
const axis = z.enum(['correctness', 'clarity', 'structure', 'conciseness', 'confidence']);

/** The panel's answer (demo-eval's `data`). Parsing copies only these fields. */
export const demoDataSchema = z.object({
  source: z.enum(['model', 'heuristic']),
  scores: z.object({
    correctness: mark,
    clarity: mark,
    structure: mark,
    conciseness: mark,
    confidence: mark,
  }),
  overall: mark,
  weakestAxis: axis,
  summary: z.string(),
  improvements: z.array(z.string()),
});

const envelope = z.object({ ok: z.literal(true), data: demoDataSchema });

/** The panel's answer, or null if any part is missing, of the wrong kind or out of range. */
export function readDemo(value: unknown): DemoData | null {
  const parsed = demoDataSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
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
    const parsed = envelope.safeParse(await res.json().catch(() => null));
    if (!parsed.success) return { ok: false, reason: 'server', retryAfter: null };
    return { ok: true, data: parsed.data.data };
  } catch (err) {
    if (signal?.aborted) throw err;
    if (timedOut) return { ok: false, reason: 'server', retryAfter: null };
    return { ok: false, reason: offline() ? 'offline' : 'server', retryAfter: null };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
