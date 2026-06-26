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
  evaluate: new InMemorySlidingWindow(30, 60 * 1000), // 30 / min / user
  sessionStart: new InMemorySlidingWindow(20, 60 * 1000),
  generic: new InMemorySlidingWindow(60, 60 * 1000),
} as const;
