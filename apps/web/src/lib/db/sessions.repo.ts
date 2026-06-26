/**
 * Session data-access. Every function takes a trusted `tenantId`/`userId` from
 * the auth context and scopes queries by both — the single chokepoint that makes
 * the "every user-scoped query carries tenantId" invariant (ADR-0003) testable.
 */
import { and, eq, desc } from 'drizzle-orm';
import { db, schema } from './client';

export async function findSessionByClientKey(
  userId: string,
  clientSessionKey: string,
) {
  const [row] = await db
    .select()
    .from(schema.practiceSessions)
    .where(
      and(
        eq(schema.practiceSessions.userId, userId),
        eq(schema.practiceSessions.clientSessionKey, clientSessionKey),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createSession(input: {
  tenantId: string;
  userId: string;
  mode: (typeof schema.sessionModeEnum.enumValues)[number];
  deckId?: string | null;
  clientSessionKey: string;
}) {
  const [row] = await db
    .insert(schema.practiceSessions)
    .values({
      tenantId: input.tenantId,
      userId: input.userId,
      mode: input.mode,
      deckId: input.deckId ?? null,
      clientSessionKey: input.clientSessionKey,
    })
    .returning();
  return row!;
}

/** Ownership-checked fetch: returns null if the session isn't this user's. */
export async function getOwnedSession(
  tenantId: string,
  userId: string,
  sessionId: string,
) {
  const [row] = await db
    .select()
    .from(schema.practiceSessions)
    .where(
      and(
        eq(schema.practiceSessions.id, sessionId),
        eq(schema.practiceSessions.tenantId, tenantId),
        eq(schema.practiceSessions.userId, userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function findAnswerByClientKey(userId: string, clientAnswerKey: string) {
  const [row] = await db
    .select()
    .from(schema.answers)
    .where(
      and(
        eq(schema.answers.userId, userId),
        eq(schema.answers.clientAnswerKey, clientAnswerKey),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listRecentSessions(tenantId: string, userId: string, limit = 10) {
  return db
    .select()
    .from(schema.practiceSessions)
    .where(
      and(
        eq(schema.practiceSessions.tenantId, tenantId),
        eq(schema.practiceSessions.userId, userId),
      ),
    )
    .orderBy(desc(schema.practiceSessions.startedAt))
    .limit(limit);
}
