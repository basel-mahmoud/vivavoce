import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/auth/context';
import { ok, errors, parseBody } from '@/lib/http';
import { startSessionInput } from '@/lib/validation/contracts';
import { limiters } from '@/lib/security/ratelimit';
import { audit } from '@/lib/security/audit';
import {
  createSession,
  findSessionByClientKey,
  listRecentSessions,
} from '@/lib/db/sessions.repo';

export const runtime = 'nodejs';

/** Start a practice session (idempotent by clientSessionKey). */
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return errors.unauthorized();

  const rl = limiters.sessionStart.check(ctx.userId);
  if (!rl.ok) return errors.tooMany(rl.resetMs);

  const parsed = await parseBody(req, startSessionInput);
  if (!parsed.ok) return parsed.response;
  const { mode, deckId, clientSessionKey } = parsed.data;

  // Idempotency: a retried "start" returns the existing session.
  const existing = await findSessionByClientKey(ctx.userId, clientSessionKey);
  if (existing) return ok({ session: existing, idempotent: true });

  const session = await createSession({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    mode,
    deckId,
    clientSessionKey,
  });

  await audit({
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    action: 'session.start',
    resourceType: 'practice_session',
    resourceId: session.id,
    metadata: { mode },
  });

  return ok({ session, idempotent: false }, { status: 201 });
}

/** List the caller's recent sessions. */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return errors.unauthorized();
  const sessions = await listRecentSessions(ctx.tenantId, ctx.userId);
  return ok({ sessions });
}
