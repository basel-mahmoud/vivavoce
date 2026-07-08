import { and, eq } from 'drizzle-orm';
import { getAuthContext } from '@/lib/auth/context';
import { ok, errors, fail } from '@/lib/http';
import { limiters, globalLimiters } from '@/lib/security/ratelimit';
import { audit } from '@/lib/security/audit';
import { db, schema, sqlClient } from '@/lib/db/client';
import { getDueReviews } from '@/lib/db/practice.repo';
import { generateDeck } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * The Daily 5: today's personalized warm-up. Due spaced-repetition reviews go
 * first (up to 3); the remainder is AI-drilled at the caller's weakest axis.
 * Idempotent per day — asking twice returns the same deck.
 */
export async function POST() {
  const ctx = await getAuthContext();
  if (!ctx) return errors.unauthorized();

  const rl = limiters.generic.check(ctx.userId);
  if (!rl.ok) return errors.tooMany(rl.resetMs);

  const today = new Date().toISOString().slice(0, 10);
  const title = `Daily 5 — ${today}`;

  const serialize = async (deckRow: typeof schema.decks.$inferSelect) => {
    const questions = await db
      .select({ id: schema.questions.id, prompt: schema.questions.prompt })
      .from(schema.questions)
      .where(eq(schema.questions.deckId, deckRow.id))
      .orderBy(schema.questions.createdAt);
    return {
      id: deckRow.id,
      title: deckRow.title,
      description: deckRow.description ?? '',
      difficulty: deckRow.difficulty,
      tags: deckRow.tags,
      createdAt: deckRow.createdAt.toISOString(),
      questions,
    };
  };

  // Idempotent: today's Daily 5 already exists → hand it back.
  const [existing] = await db
    .select()
    .from(schema.decks)
    .where(
      and(
        eq(schema.decks.ownerId, ctx.userId),
        eq(schema.decks.tenantId, ctx.tenantId),
        eq(schema.decks.title, title),
      ),
    )
    .limit(1);
  if (existing) return ok({ deck: await serialize(existing), fresh: false });

  const grl = await globalLimiters.dailyFive.check(ctx.userId);
  if (!grl.ok) return errors.tooMany(grl.resetMs);

  // 1. Due reviews first (the debt), capped so fresh material stays in the mix.
  const due = (await getDueReviews(ctx.userId, ctx.timezone)).slice(0, 3);
  const prompts: { prompt: string; referencePoints: string[] }[] = due.map((d) => ({
    prompt: d.prompt,
    referencePoints: [],
  }));

  // 2. Fill the remainder with drills aimed at the weakest axis.
  const axisRows = (await sqlClient`
    select coalesce(round(avg(f.score_correctness)),100)::int as correctness,
           coalesce(round(avg(f.score_clarity)),100)::int as clarity,
           coalesce(round(avg(f.score_structure)),100)::int as structure,
           coalesce(round(avg(f.score_conciseness)),100)::int as conciseness,
           coalesce(round(avg(f.score_confidence)),100)::int as confidence
    from ai_feedback f join answers a on a.id = f.answer_id
    where a.user_id = ${ctx.userId}
  `) as Record<string, number>[];
  const axes = axisRows[0] ?? {};
  const weakest =
    Object.entries(axes).sort((x, y) => Number(x[1]) - Number(y[1]))[0]?.[0] ?? 'structure';

  const [user] = await db
    .select({
      fieldOfStudy: schema.users.fieldOfStudy,
      studyLevel: schema.users.studyLevel,
      level: schema.users.level,
      goal: schema.users.goal,
    })
    .from(schema.users)
    .where(eq(schema.users.id, ctx.userId))
    .limit(1);

  const need = 5 - prompts.length;
  const { deck: generated, usage } = await generateDeck({
    topic: `a short daily warm-up that trains ${weakest} when answering out loud`,
    count: Math.max(4, need) as number,
    field: user?.fieldOfStudy ?? null,
    studyLevel: user?.studyLevel ?? null,
    level: user?.level ?? null,
    goal: user?.goal ?? null,
  });

  await db.insert(schema.modelUsageLogs).values({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    task: 'generate_deck',
    model: usage.model,
    inputTokens: usage.inputTokens ?? null,
    outputTokens: usage.outputTokens ?? null,
    latencyMs: usage.latencyMs,
    status: usage.status,
    errorCode: usage.errorCode ?? null,
  });

  if (generated) prompts.push(...generated.questions.slice(0, need));
  if (prompts.length === 0) {
    return fail('ai_unavailable', 'Your Daily 5 is not ready — try again in a moment.', 503);
  }

  const [deckRow] = await db
    .insert(schema.decks)
    .values({
      tenantId: ctx.tenantId,
      ownerId: ctx.userId,
      title,
      description: `${due.length} review${due.length === 1 ? '' : 's'} due + drills for your ${weakest}.`,
      difficulty: 'intermediate',
      source: 'system',
      tags: ['daily-5', weakest],
    })
    .returning();

  await db.insert(schema.questions).values(
    prompts.slice(0, 5).map((q) => ({
      tenantId: ctx.tenantId,
      deckId: deckRow!.id,
      prompt: q.prompt,
      referencePoints: q.referencePoints,
      difficulty: 'intermediate' as const,
    })),
  );

  await audit({
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    action: 'daily_five.created',
    resourceType: 'deck',
    resourceId: deckRow!.id,
    metadata: { reviews: due.length, weakest },
  });

  return ok({ deck: await serialize(deckRow!), fresh: true }, { status: 201 });
}
