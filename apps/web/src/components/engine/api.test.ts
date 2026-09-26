import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestMarks } from './api';

const body = { questionId: 0, answer: 'Candidates fail because they never lead with the answer.' };
const data = {
  source: 'model',
  scores: { correctness: 71, clarity: 66, structure: 48, conciseness: 62, confidence: 54 },
  overall: 60,
  weakestAxis: 'structure',
  summary: 'Clear idea, buried.',
  improvements: ['Lead with the claim.'],
};

const reply = (status: number, json: unknown, headers: Record<string, string> = {}) =>
  vi.fn(async () => new Response(JSON.stringify(json), { status, headers: { 'content-type': 'application/json', ...headers } }));

afterEach(() => vi.unstubAllGlobals());

describe('requestMarks', () => {
  it('posts the question index and the answer, and returns the parsed marks', async () => {
    const fetcher = reply(200, { ok: true, data });
    const out = await requestMarks(body, { fetcher });
    expect(out).toEqual({ ok: true, data });
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/demo-eval');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual(body);
  });

  it('reads the demo limit and when it lifts', async () => {
    const fetcher = reply(429, { ok: false, error: { code: 'rate_limited' } }, { 'retry-after': '1799' });
    expect(await requestMarks(body, { fetcher })).toEqual({ ok: false, reason: 'rate-limited', retryAfter: 1799 });
  });

  it('words a rejected answer and a server failure differently', async () => {
    expect(await requestMarks(body, { fetcher: reply(400, { ok: false }) })).toMatchObject({ reason: 'invalid' });
    expect(await requestMarks(body, { fetcher: reply(500, { ok: false }) })).toMatchObject({ reason: 'server' });
  });

  it('never trusts a malformed response', async () => {
    expect(await requestMarks(body, { fetcher: reply(200, { ok: true, data: { ...data, overall: 140 } }) })).toMatchObject({ reason: 'server' });
    expect(await requestMarks(body, { fetcher: vi.fn(async () => new Response('<html>', { status: 200 })) })).toMatchObject({ reason: 'server' });
  });

  it('knows when the visitor is offline', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const fetcher = reply(200, { ok: true, data });
    expect(await requestMarks(body, { fetcher })).toEqual({ ok: false, reason: 'offline', retryAfter: null });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('gives up on a hung request', async () => {
    const fetcher = vi.fn(
      (_: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))),
    );
    expect(await requestMarks(body, { fetcher: fetcher as unknown as typeof fetch, timeoutMs: 10 })).toMatchObject({ reason: 'server' });
  });

  it('rethrows when the caller cancels', async () => {
    const ctrl = new AbortController();
    const fetcher = vi.fn(
      (_: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))),
    );
    const pending = requestMarks(body, { fetcher: fetcher as unknown as typeof fetch, signal: ctrl.signal });
    ctrl.abort();
    await expect(pending).rejects.toThrow();
  });
});
