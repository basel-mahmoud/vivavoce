import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getAuthContext } from '@/lib/auth/context';
import { ok, errors, parseBody } from '@/lib/http';
import { updateProfileInput } from '@/lib/validation/contracts';
import { limiters } from '@/lib/security/ratelimit';
import { db, schema } from '@/lib/db/client';
import { audit } from '@/lib/security/audit';

export const runtime = 'nodejs';

function serialize(u: typeof schema.users.$inferSelect) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    goal: u.goal,
    level: u.level,
    fieldOfStudy: u.fieldOfStudy,
    studyLevel: u.studyLevel,
    examFormats: u.examFormats,
    subjectKeys: u.subjectKeys,
    timezone: u.timezone,
    onboarded: Boolean(u.onboardedAt),
    examName: u.examName,
    examDate: u.examDate,
  };
}

/** The signed-in user's profile (provisioned on first call by getAuthContext). */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return errors.unauthorized();
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, ctx.userId))
    .limit(1);
  if (!user) return errors.notFound();
  return ok({ user: serialize(user) });
}

/** Update the profile (onboarding + settings). Only the caller's own row. */
export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return errors.unauthorized();

  const rl = limiters.generic.check(ctx.userId);
  if (!rl.ok) return errors.tooMany(rl.resetMs);

  const parsed = await parseBody(req, updateProfileInput);
  if (!parsed.ok) return parsed.response;
  const p = parsed.data;

  const patch: Partial<typeof schema.users.$inferInsert> = { updatedAt: new Date() };
  if (p.displayName !== undefined) patch.displayName = p.displayName;
  if (p.goal !== undefined) patch.goal = p.goal;
  if (p.level !== undefined) patch.level = p.level;
  if (p.fieldOfStudy !== undefined) patch.fieldOfStudy = p.fieldOfStudy;
  if (p.studyLevel !== undefined) patch.studyLevel = p.studyLevel;
  if (p.examFormats !== undefined) patch.examFormats = p.examFormats;
  if (p.subjectKeys !== undefined) patch.subjectKeys = p.subjectKeys;
  if (p.timezone !== undefined) patch.timezone = p.timezone;
  if (p.onboarded === true) patch.onboardedAt = new Date();
  if (p.examName !== undefined) patch.examName = p.examName;
  if (p.examDate !== undefined) patch.examDate = p.examDate;

  const [user] = await db
    .update(schema.users)
    .set(patch)
    .where(eq(schema.users.id, ctx.userId))
    .returning();
  if (!user) return errors.notFound();

  await audit({
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    action: 'profile.update',
    resourceType: 'user',
    resourceId: ctx.userId,
    metadata: { onboarded: p.onboarded ?? undefined, fields: Object.keys(p) },
  });

  return ok({ user: serialize(user) });
}
