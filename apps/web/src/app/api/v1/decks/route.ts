import { and, desc, eq, isNull, inArray } from 'drizzle-orm';
import { getAuthContext } from '@/lib/auth/context';
import { ok, errors } from '@/lib/http';
import { limiters } from '@/lib/security/ratelimit';
import { db, schema } from '@/lib/db/client';

export const runtime = 'nodejs';

/** The caller's own decks (AI-generated and any future user decks), newest
 *  first, with questions inlined — the mobile app hydrates its registry from
 *  this. Tenant + owner scoped. */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return errors.unauthorized();

  const rl = limiters.generic.check(ctx.userId);
  if (!rl.ok) return errors.tooMany(rl.resetMs);

  const decks = await db
    .select()
    .from(schema.decks)
    .where(
      and(
        eq(schema.decks.tenantId, ctx.tenantId),
        eq(schema.decks.ownerId, ctx.userId),
        isNull(schema.decks.deletedAt),
      ),
    )
    .orderBy(desc(schema.decks.createdAt))
    .limit(50);

  const deckIds = decks.map((d) => d.id);
  const questions = deckIds.length
    ? await db
        .select({
          id: schema.questions.id,
          deckId: schema.questions.deckId,
          prompt: schema.questions.prompt,
        })
        .from(schema.questions)
        .where(
          and(inArray(schema.questions.deckId, deckIds), isNull(schema.questions.deletedAt)),
        )
        .orderBy(schema.questions.createdAt)
    : [];

  return ok({
    decks: decks.map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description ?? '',
      difficulty: d.difficulty,
      tags: d.tags,
      createdAt: d.createdAt.toISOString(),
      questions: questions
        .filter((q) => q.deckId === d.id)
        .map((q) => ({ id: q.id, prompt: q.prompt })),
    })),
  });
}
