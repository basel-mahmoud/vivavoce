import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getAuthContext } from '@/lib/auth/context';
import { ok, errors, fail, parseBody } from '@/lib/http';
import { generateDeckInput } from '@/lib/validation/contracts';
import { limiters, globalLimiters } from '@/lib/security/ratelimit';
import { audit } from '@/lib/security/audit';
import { db, schema } from '@/lib/db/client';
import { generateDeck } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 30; // model call

/**
 * The infinite library: generate a practice deck on any topic, calibrated to
 * the caller's profile (field, study level, confidence, goal), and persist it
 * as their own deck. Strictly rate-limited — every call costs model tokens.
 */
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return errors.unauthorized();

  const rl = limiters.deckGenerate.check(ctx.userId);
  if (!rl.ok) return errors.tooMany(rl.resetMs);
  const grl = await globalLimiters.deckGenerate.check(ctx.userId);
  if (!grl.ok) return errors.tooMany(grl.resetMs);

  const parsed = await parseBody(req, generateDeckInput);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  // Calibration comes from the trusted profile row, never the client.
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

  const { deck, usage } = await generateDeck({
    topic: input.topic,
    count: input.count,
    field: user?.fieldOfStudy ?? null,
    studyLevel: user?.studyLevel ?? null,
    level: user?.level ?? null,
    goal: user?.goal ?? null,
    sourceText: input.sourceText ?? null,
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

  if (!deck) {
    return fail(
      'ai_unavailable',
      'We could not build that deck right now. Please try again in a moment.',
      503,
    );
  }

  const [deckRow] = await db
    .insert(schema.decks)
    .values({
      tenantId: ctx.tenantId,
      ownerId: ctx.userId,
      title: deck.title,
      description: deck.description,
      difficulty: deck.difficulty,
      source: 'user',
      tags: [input.topic.slice(0, 60)],
    })
    .returning();

  const questionRows = await db
    .insert(schema.questions)
    .values(
      deck.questions.map((q) => ({
        tenantId: ctx.tenantId,
        deckId: deckRow!.id,
        prompt: q.prompt,
        referencePoints: q.referencePoints,
        difficulty: deck.difficulty,
      })),
    )
    .returning({ id: schema.questions.id, prompt: schema.questions.prompt });

  await audit({
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    action: 'deck.generated',
    resourceType: 'deck',
    resourceId: deckRow!.id,
    metadata: { topic: input.topic, count: deck.questions.length, model: usage.model },
  });

  return ok(
    {
      deck: {
        id: deckRow!.id,
        title: deckRow!.title,
        description: deckRow!.description ?? '',
        difficulty: deckRow!.difficulty,
        tags: deckRow!.tags,
        createdAt: deckRow!.createdAt.toISOString(),
        questions: questionRows.map((q) => ({ id: q.id, prompt: q.prompt })),
      },
    },
    { status: 201 },
  );
}
