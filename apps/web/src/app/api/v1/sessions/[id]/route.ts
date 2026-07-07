import { NextRequest } from 'next/server';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { getAuthContext } from '@/lib/auth/context';
import { ok, errors } from '@/lib/http';
import { limiters } from '@/lib/security/ratelimit';
import { db, schema } from '@/lib/db/client';
import { getOwnedSession } from '@/lib/db/sessions.repo';

export const runtime = 'nodejs';

/** Full review of one session: every answer with its transcript and marks.
 *  Strictly owner-scoped — the session must belong to the caller. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return errors.unauthorized();

  const rl = limiters.generic.check(ctx.userId);
  if (!rl.ok) return errors.tooMany(rl.resetMs);

  const { id } = await params;
  const session = await getOwnedSession(ctx.tenantId, ctx.userId, id);
  if (!session) return errors.notFound();

  const answers = await db
    .select()
    .from(schema.answers)
    .where(eq(schema.answers.sessionId, session.id))
    .orderBy(asc(schema.answers.createdAt));

  const answerIds = answers.map((a) => a.id);
  const [transcripts, feedback] = answerIds.length
    ? await Promise.all([
        db
          .select({ answerId: schema.transcripts.answerId, text: schema.transcripts.text })
          .from(schema.transcripts)
          .where(inArray(schema.transcripts.answerId, answerIds)),
        db
          .select()
          .from(schema.aiFeedback)
          .where(inArray(schema.aiFeedback.answerId, answerIds)),
      ])
    : [[], []];

  return ok({
    session: {
      id: session.id,
      mode: session.mode,
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt?.toISOString() ?? null,
      overallScore: session.overallScore,
    },
    answers: answers.map((a) => {
      const t = transcripts.find((x) => x.answerId === a.id);
      const f = feedback.find((x) => x.answerId === a.id);
      return {
        id: a.id,
        questionPrompt: a.questionPrompt,
        transcript: t?.text ?? null,
        overall: f?.overallScore ?? null,
        weakestAxis: f?.weakestAxis ?? null,
        summary: f?.summary ?? null,
        scores: f
          ? {
              correctness: f.scoreCorrectness ?? 0,
              clarity: f.scoreClarity ?? 0,
              structure: f.scoreStructure ?? 0,
              conciseness: f.scoreConciseness ?? 0,
              confidence: f.scoreConfidence ?? 0,
            }
          : null,
        createdAt: a.createdAt.toISOString(),
      };
    }),
  });
}

/** Mark a session completed: stamps completedAt and rolls the average of its
 *  answers' marks into overall_score so history reads honestly. Idempotent. */
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return errors.unauthorized();

  const rl = limiters.generic.check(ctx.userId);
  if (!rl.ok) return errors.tooMany(rl.resetMs);

  const { id } = await params;
  const session = await getOwnedSession(ctx.tenantId, ctx.userId, id);
  if (!session) return errors.notFound();

  const answers = await db
    .select({ id: schema.answers.id })
    .from(schema.answers)
    .where(eq(schema.answers.sessionId, session.id));
  const answerIds = answers.map((a) => a.id);

  let overall: number | null = null;
  if (answerIds.length) {
    const marks = await db
      .select({ overall: schema.aiFeedback.overallScore })
      .from(schema.aiFeedback)
      .where(inArray(schema.aiFeedback.answerId, answerIds));
    const vals = marks.map((m) => m.overall).filter((v): v is number => v != null);
    if (vals.length) overall = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  }

  const [updated] = await db
    .update(schema.practiceSessions)
    .set({
      status: 'completed',
      completedAt: session.completedAt ?? new Date(),
      overallScore: overall,
      questionCount: answerIds.length,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.practiceSessions.id, session.id),
        eq(schema.practiceSessions.userId, ctx.userId),
      ),
    )
    .returning({ id: schema.practiceSessions.id, overallScore: schema.practiceSessions.overallScore });

  return ok({ session: { id: updated!.id, overallScore: updated!.overallScore } });
}
