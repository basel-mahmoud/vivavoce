import { getAuthContext } from '@/lib/auth/context';
import { ok, errors } from '@/lib/http';
import { limiters } from '@/lib/security/ratelimit';
import { getUserStats } from '@/lib/db/practice.repo';

export const runtime = 'nodejs';

/** Real per-user progress: streak, axis averages, recent sessions. User-scoped. */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return errors.unauthorized();

  const rl = limiters.generic.check(ctx.userId);
  if (!rl.ok) return errors.tooMany(rl.resetMs);

  try {
    const stats = await getUserStats(ctx.userId);
    return ok({ stats });
  } catch (err) {
    console.error('user_stats_failed', { error: String(err) });
    return errors.server();
  }
}
