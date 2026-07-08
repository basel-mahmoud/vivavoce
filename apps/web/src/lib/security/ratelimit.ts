/**
 * Sliding-window rate limiter.
 *
 * The default implementation is in-process and therefore per-instance — correct
 * for local/dev and a meaningful first line of defence on a single Vercel
 * instance. For production-grade global limits, back this with Upstash Redis or
 * a Postgres counter behind the same `RateLimiter` interface (see
 * docs/SECURITY.md → "Rate limiting"). The call sites do not change.
 */
export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetMs: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

class InMemorySlidingWindow implements RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  check(key: string): RateLimitResult {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const arr = (this.hits.get(key) ?? []).filter((t) => t > cutoff);

    if (arr.length >= this.limit) {
      const resetMs = arr[0]! + this.windowMs - now;
      this.hits.set(key, arr);
      return { ok: false, remaining: 0, resetMs };
    }

    arr.push(now);
    this.hits.set(key, arr);

    // Opportunistic cleanup to bound memory.
    if (this.hits.size > 5000) {
      for (const [k, v] of this.hits) {
        if (v.every((t) => t <= cutoff)) this.hits.delete(k);
      }
    }

    return { ok: true, remaining: this.limit - arr.length, resetMs: this.windowMs };
  }
}

/** Named limiters tuned per surface. */
export const limiters = {
  waitlist: new InMemorySlidingWindow(5, 60 * 60 * 1000), // 5 / hour / ip
  demoEval: new InMemorySlidingWindow(4, 60 * 60 * 1000), // 4 / hour / ip (costs AI tokens)
  evaluate: new InMemorySlidingWindow(30, 60 * 1000), // 30 / min / user
  sessionStart: new InMemorySlidingWindow(20, 60 * 1000),
  deckGenerate: new InMemorySlidingWindow(6, 60 * 60 * 1000), // 6 / hour / user (costs AI tokens)
  generic: new InMemorySlidingWindow(60, 60 * 1000),
} as const;

/**
 * Globally-correct fixed-window limiter backed by Postgres (one atomic upsert
 * per check), so limits hold across every serverless instance — the property
 * the in-memory windows can't give. Used for the surfaces that cost model
 * tokens. Fails OPEN on database trouble: availability beats strictness for a
 * rate limit, and the in-memory limiter above still applies per instance.
 * The same interface swaps to Upstash/Redis later without touching call sites.
 */
class PgFixedWindow {
  constructor(
    private readonly name: string,
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  async check(id: string): Promise<RateLimitResult> {
    try {
      // Imported lazily so module init never hard-depends on DB config.
      const { sqlClient } = await import('@/lib/db/client');
      const rows = (await sqlClient`
        insert into rate_limits (key, window_start, count)
        values (${`${this.name}:${id}`}, now(), 1)
        on conflict (key) do update set
          count = case
            when rate_limits.window_start < now() - (${this.windowMs} * interval '1 millisecond')
              then 1 else rate_limits.count + 1 end,
          window_start = case
            when rate_limits.window_start < now() - (${this.windowMs} * interval '1 millisecond')
              then now() else rate_limits.window_start end
        returning count, extract(epoch from (now() - window_start)) * 1000 as elapsed_ms
      `) as { count: number; elapsed_ms: number }[];
      const row = rows[0];
      if (!row) return { ok: true, remaining: this.limit, resetMs: this.windowMs };
      const count = Number(row.count);
      const resetMs = Math.max(0, this.windowMs - Number(row.elapsed_ms));
      return { ok: count <= this.limit, remaining: Math.max(0, this.limit - count), resetMs };
    } catch (err) {
      console.error('rate_limit_db_failed', { name: this.name, error: String(err) });
      return { ok: true, remaining: 1, resetMs: this.windowMs };
    }
  }
}

/** Global (cross-instance) limiters for the token-costing surfaces. */
export const globalLimiters = {
  evaluate: new PgFixedWindow('evaluate', 30, 60 * 1000),
  deckGenerate: new PgFixedWindow('deck_generate', 6, 60 * 60 * 1000),
  demoEval: new PgFixedWindow('demo_eval', 4, 60 * 60 * 1000),
  dailyFive: new PgFixedWindow('daily_five', 3, 24 * 60 * 60 * 1000),
} as const;
