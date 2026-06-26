import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Uniform API envelope + helpers. Errors are deliberately terse to the client
 * (no stack traces, no internal detail) and carry a stable `code` plus a
 * request id for correlation in logs.
 */
export type ApiError = {
  ok: false;
  error: { code: string; message: string; requestId: string; fields?: Record<string, string> };
};
export type ApiOk<T> = { ok: true; data: T };

export function requestId(): string {
  return crypto.randomUUID();
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiOk<T>>({ ok: true, data }, init);
}

export function fail(
  code: string,
  message: string,
  status: number,
  extra?: { fields?: Record<string, string>; requestId?: string; headers?: HeadersInit },
) {
  const id = extra?.requestId ?? requestId();
  return NextResponse.json<ApiError>(
    { ok: false, error: { code, message, requestId: id, fields: extra?.fields } },
    { status, headers: extra?.headers },
  );
}

/** Common error shortcuts. */
export const errors = {
  badRequest: (msg = 'Invalid request', fields?: Record<string, string>) =>
    fail('bad_request', msg, 400, { fields }),
  unauthorized: () => fail('unauthorized', 'Authentication required', 401),
  forbidden: () => fail('forbidden', 'You do not have access to this resource', 403),
  notFound: () => fail('not_found', 'Not found', 404),
  conflict: (msg = 'Already exists') => fail('conflict', msg, 409),
  tooMany: (resetMs: number) =>
    fail('rate_limited', 'Too many requests — please slow down', 429, {
      headers: { 'retry-after': String(Math.ceil(resetMs / 1000)) },
    }),
  server: () => fail('server_error', 'Something went wrong on our end', 500),
};

/** Parse + validate a JSON body, returning a typed result or an error response. */
export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: errors.badRequest('Body must be valid JSON') };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join('.') || '_'] = issue.message;
    }
    return { ok: false, response: errors.badRequest('Validation failed', fields) };
  }
  return { ok: true, data: parsed.data };
}
