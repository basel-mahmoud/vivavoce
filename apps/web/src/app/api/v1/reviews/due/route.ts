import { getAuthContext } from '@/lib/auth/context';
import { ok, errors } from '@/lib/http';
import { limiters } from '@/lib/security/ratelimit';
import { getDueReviews } from '@/lib/db/practice.repo';

export const runtime = 'nodejs';

/** Questions due for spaced-repetition review (user-scoped, oldest first). */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return errors.unauthorized();

  const rl = limiters.generic.check(ctx.userId);
  if (!rl.ok) return errors.tooMany(rl.resetMs);

  const reviews = await getDueReviews(ctx.userId, ctx.timezone);
  return ok({ reviews });
}
