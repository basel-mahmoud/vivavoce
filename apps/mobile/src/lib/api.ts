import { config } from './config';

/** Mirrors the backend envelope (apps/web src/lib/http.ts). */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; requestId: string } };

export interface EvaluationResult {
  answerId: string;
  source: 'model' | 'heuristic';
  scores: {
    correctness: number;
    clarity: number;
    structure: number;
    conciseness: number;
    confidence: number;
  };
  overall: number;
  weakestAxis: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  improvedAnswer: string;
  suggestedFollowUp: string;
  fillerWordRate: number | null;
  wordsPerMinute: number | null;
}

export interface SessionRecord {
  id: string;
  mode: string;
  status: string;
  startedAt: string;
}

type GetToken = () => Promise<string | null>;

/**
 * Typed backend client with timeout + one retry on transient failure. The auth
 * token is injected per request from Clerk; requests are validated server-side.
 */
export function createApi(getToken: GetToken) {
  async function request<T>(
    path: string,
    init: RequestInit & { retries?: number } = {},
  ): Promise<ApiResult<T>> {
    const retries = init.retries ?? 1;
    let attempt = 0;
    let lastError = 'network';

    while (attempt <= retries) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25_000);
      try {
        const token = await getToken();
        const res = await fetch(`${config.apiUrl}${path}`, {
          ...init,
          signal: controller.signal,
          headers: {
            'content-type': 'application/json',
            ...(token ? { authorization: `Bearer ${token}` } : {}),
            ...init.headers,
          },
        });
        clearTimeout(timer);
        const json = (await res.json()) as ApiResult<T>;
        if (!res.ok && res.status >= 500 && attempt < retries) {
          attempt++;
          continue;
        }
        return json;
      } catch {
        clearTimeout(timer);
        lastError = 'network';
        attempt++;
      }
    }
    return {
      ok: false,
      error: { code: lastError, message: 'Could not reach VivaVoce', requestId: 'local' },
    };
  }

  return {
    startSession: (body: { mode: string; deckId?: string | null; clientSessionKey: string }) =>
      request<{ session: SessionRecord; idempotent: boolean }>('/api/v1/sessions', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    submitAnswer: (body: {
      sessionId: string;
      clientAnswerKey: string;
      questionId?: string | null;
      questionPrompt: string;
      transcript: string;
      durationMs?: number;
      orderIndex?: number;
    }) =>
      request<{ result: EvaluationResult; idempotent: boolean }>('/api/v1/answers', {
        method: 'POST',
        body: JSON.stringify(body),
        retries: 2,
      }),

    recentSessions: () => request<{ sessions: SessionRecord[] }>('/api/v1/sessions'),
  };
}

export type Api = ReturnType<typeof createApi>;
