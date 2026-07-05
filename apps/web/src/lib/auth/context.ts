import { auth, currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';

/**
 * Resolves the authenticated principal into our domain user + primary tenant,
 * provisioning a personal tenant on first contact (just-in-time). Returns null
 * when Clerk is not configured or the request is anonymous, so callers can
 * respond 401 without throwing. Every authorization check downstream uses the
 * returned `tenantId` to scope queries — never trust a client-supplied tenant.
 */
export interface AuthContext {
  userId: string; // our internal users.id
  clerkUserId: string;
  tenantId: string;
  email: string;
  role: 'learner' | 'coach' | 'org_admin';
  timezone: string;
}

const clerkConfigured = Boolean(process.env.CLERK_SECRET_KEY);

export async function getAuthContext(): Promise<AuthContext | null> {
  if (!clerkConfigured) return null;

  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  // Fast path: existing user.
  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.clerkUserId, clerkUserId))
    .limit(1);

  if (existing && existing.primaryTenantId) {
    const [membership] = await db
      .select({ role: schema.memberships.role })
      .from(schema.memberships)
      .where(eq(schema.memberships.userId, existing.id))
      .limit(1);
    return {
      userId: existing.id,
      clerkUserId,
      tenantId: existing.primaryTenantId,
      email: existing.email,
      role: membership?.role ?? 'learner',
      timezone: existing.timezone ?? 'UTC',
    };
  }

  // Provision: create a personal tenant + user + membership atomically-ish.
  const cu = await currentUser();
  const email =
    cu?.primaryEmailAddress?.emailAddress ?? existing?.email ?? `${clerkUserId}@placeholder.local`;
  const displayName = cu?.firstName ?? null;

  const [tenant] = await db
    .insert(schema.tenants)
    .values({ name: displayName ? `${displayName}'s space` : 'Personal', slug: `u-${clerkUserId.slice(-12)}`, kind: 'personal' })
    .returning();

  let userId: string;
  if (existing) {
    await db
      .update(schema.users)
      .set({ primaryTenantId: tenant!.id, updatedAt: new Date() })
      .where(eq(schema.users.id, existing.id));
    userId = existing.id;
  } else {
    const [created] = await db
      .insert(schema.users)
      .values({ clerkUserId, email, displayName, primaryTenantId: tenant!.id })
      .returning();
    userId = created!.id;
  }

  await db
    .insert(schema.memberships)
    .values({ tenantId: tenant!.id, userId, role: 'learner' })
    .onConflictDoNothing();

  return { userId, clerkUserId, tenantId: tenant!.id, email, role: 'learner', timezone: 'UTC' };
}
