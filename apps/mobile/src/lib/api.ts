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

/** Server-side profile (mirrors GET/PATCH /api/v1/me). */
export interface MeProfile {
  id: string;
  email: string;
  displayName: string | null;
  goal: string | null;
  level: string;
  fieldOfStudy: string | null;
  studyLevel: string | null;
  examFormats: string[];
  subjectKeys: string[];
  timezone: string;
  onboarded: boolean;
  examName: string | null;
  examDate: string | null;
}

export interface ProfilePatch {
  displayName?: string;
  goal?: string | null;
  level?: string;
  fieldOfStudy?: string | null;
  studyLevel?: string | null;
  examFormats?: string[];
  subjectKeys?: string[];
  timezone?: string;
  onboarded?: boolean;
  examName?: string | null;
  examDate?: string | null;
}

/** Real per-user progress (mirrors GET /api/v1/me/stats). */
export interface UserStats {
  streak: { current: number; longest: number };
  overall: number;
  overallDelta: number;
  sessionsTotal: number;
  answersTotal: number;
  minutesThisWeek: number;
  axisAverages: Record<string, number>;
  confidenceTrend: number[];
  /** Per-day answer counts for the last 12 weeks (practice heat grid). */
  heatmap: { day: string; count: number }[];
  recent: {
    id: string;
    deckTitle: string;
    mode: string;
    overall: number;
    weakest: string;
    when: string;
  }[];
  hasData: boolean;
}

/** One reviewed answer inside a session (mirrors GET /api/v1/sessions/:id). */
export interface SessionAnswer {
  id: string;
  questionPrompt: string;
  transcript: string | null;
  overall: number | null;
  weakestAxis: string | null;
  summary: string | null;
  scores: Record<string, number> | null;
  createdAt: string;
}

export interface SessionDetail {
  session: {
    id: string;
    mode: string;
    startedAt: string;
    completedAt: string | null;
    overallScore: number | null;
  };
  answers: SessionAnswer[];
}

/** An AI-generated deck owned by the caller (mirrors /api/v1/decks). */
export interface ServerDeck {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  tags: string[];
  createdAt: string;
  questions: { id: string; prompt: string }[];
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
      transcript?: string;
      audioBase64?: string;
      audioMimeType?: string;
      durationMs?: number;
      orderIndex?: number;
    }) =>
      request<{ result: EvaluationResult; idempotent: boolean }>('/api/v1/answers', {
        method: 'POST',
        body: JSON.stringify(body),
        retries: 2,
      }),

    recentSessions: () => request<{ sessions: SessionRecord[] }>('/api/v1/sessions'),

    getMe: () => request<{ user: MeProfile }>('/api/v1/me'),

    updateMe: (patch: ProfilePatch) =>
      request<{ user: MeProfile }>('/api/v1/me', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),

    getStats: () => request<{ stats: UserStats }>('/api/v1/me/stats'),

    generateDeck: (body: { topic: string; count?: number }) =>
      request<{ deck: ServerDeck }>('/api/v1/decks/generate', {
        method: 'POST',
        body: JSON.stringify(body),
        retries: 0, // costs tokens; the user retries deliberately
      }),

    listDecks: () => request<{ decks: ServerDeck[] }>('/api/v1/decks'),

    getSession: (id: string) => request<SessionDetail>(`/api/v1/sessions/${id}`),

    completeSession: (id: string) =>
      request<{ session: { id: string; overallScore: number | null } }>(
        `/api/v1/sessions/${id}`,
        { method: 'PATCH' },
      ),
  };
}

export type Api = ReturnType<typeof createApi>;
