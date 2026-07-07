import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';
import { getAuthContext } from '@/lib/auth/context';
import { ok, errors, parseBody } from '@/lib/http';
import { updateProfileInput } from '@/lib/validation/contracts';
import { limiters } from '@/lib/security/ratelimit';
import { db, schema } from '@/lib/db/client';
import { audit } from '@/lib/security/audit';
import { maskEmail } from '@/lib/security/redact';

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

/**
 * Right to be forgotten — immediate hard delete. The personal tenant cascade
 * removes every piece of content (sessions, answers, transcripts, feedback,
 * decks, analytics); the user row cascade removes streaks/consents/memberships;
 * the Clerk identity is deleted so sign-in is gone too. Only a masked audit
 * record remains (no foreign keys, compliance evidence).
 */
export async function DELETE() {
  const ctx = await getAuthContext();
  if (!ctx) return errors.unauthorized();

  const rl = limiters.generic.check(ctx.userId);
  if (!rl.ok) return errors.tooMany(rl.resetMs);

  // Compliance record first — deletion_requests cascades away with the user,
  // so the surviving evidence is the FK-free audit hash-chain entry below.
  await db.insert(schema.deletionRequests).values({
    userId: ctx.userId,
    status: 'processing',
    reason: 'user_requested_in_app',
    scheduledFor: new Date(),
  });

  await db.delete(schema.tenants).where(eq(schema.tenants.id, ctx.tenantId));
  await db.delete(schema.users).where(eq(schema.users.id, ctx.userId));

  // Revoke the identity. If Clerk is briefly unreachable the DB is already
  // clean; a re-sign-in would provision a fresh empty account, never resurrect
  // old data — log and continue rather than failing the user's deletion.
  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(ctx.clerkUserId);
  } catch (err) {
    console.error('clerk_user_delete_failed', { error: String(err) });
  }

  await audit({
    tenantId: null,
    actorUserId: null,
    actorType: 'system',
    action: 'account.deleted',
    resourceType: 'user',
    resourceId: ctx.userId,
    metadata: { email: maskEmail(ctx.email), requested: 'in_app' },
  });

  return ok({ deleted: true });
}
