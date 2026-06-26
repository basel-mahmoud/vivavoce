import { env, aiConfigured } from '@/lib/env';

/**
 * Minimal, dependency-free Gemini client over the REST API. We avoid an SDK so
 * we fully own timeouts, retries, and error taxonomy, and so model/SDK churn
 * can't break builds. The provider is hidden behind this module — swapping to a
 * different model host means changing only this file.
 */

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export type GeminiStatus = 'ok' | 'timeout' | 'error' | 'not_configured';

export interface GeminiResult {
  status: GeminiStatus;
  text: string | null;
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  errorCode?: string;
}

export interface GeminiCallOptions {
  /** When true, request `application/json` responses. */
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  /** Total attempts including the first. */
  retries?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Exponential backoff with full jitter, capped. */
function backoff(attempt: number): number {
  const base = Math.min(8000, 400 * 2 ** attempt);
  return Math.floor(Math.random() * base);
}

export async function generateContent(
  prompt: string,
  opts: GeminiCallOptions = {},
): Promise<GeminiResult> {
  const model = env.GEMINI_MODEL;
  const started = Date.now();

  if (!aiConfigured) {
    return { status: 'not_configured', text: null, model, latencyMs: 0 };
  }

  const retries = opts.retries ?? 3;
  const timeoutMs = opts.timeoutMs ?? env.GEMINI_TIMEOUT_MS;
  const url = `${BASE}/models/${encodeURIComponent(model)}:generateContent`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxOutputTokens ?? 1024,
      ...(opts.json ? { responseMimeType: 'application/json' } : {}),
    },
    // Keep safety at provider defaults; the prompt enforces our own guardrails.
  };

  let lastErrorCode = 'unknown';

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    if (opts.signal) {
      if (opts.signal.aborted) controller.abort();
      else opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY as string,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        lastErrorCode = `http_${res.status}`;
        if (RETRYABLE.has(res.status) && attempt < retries - 1) {
          await sleep(backoff(attempt));
          continue;
        }
        return {
          status: 'error',
          text: null,
          model,
          latencyMs: Date.now() - started,
          errorCode: lastErrorCode,
        };
      }

      const data = (await res.json()) as GeminiApiResponse;
      const text =
        data.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? '')
          .join('')
          .trim() ?? null;

      return {
        status: 'ok',
        text,
        model,
        latencyMs: Date.now() - started,
        inputTokens: data.usageMetadata?.promptTokenCount,
        outputTokens: data.usageMetadata?.candidatesTokenCount,
      };
    } catch (err) {
      clearTimeout(timer);
      const aborted = err instanceof Error && err.name === 'AbortError';
      lastErrorCode = aborted ? 'timeout' : 'network';
      if (attempt < retries - 1 && !opts.signal?.aborted) {
        await sleep(backoff(attempt));
        continue;
      }
      return {
        status: aborted ? 'timeout' : 'error',
        text: null,
        model,
        latencyMs: Date.now() - started,
        errorCode: lastErrorCode,
      };
    }
  }

  return {
    status: 'error',
    text: null,
    model,
    latencyMs: Date.now() - started,
    errorCode: lastErrorCode,
  };
}

interface GeminiApiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

/** Best-effort extraction of a JSON object from a model response that may be
 *  wrapped in code fences or prose. Returns null if nothing parseable. */
export function extractJson(raw: string | null): unknown | null {
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
