import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Hash an IP (or any low-entropy identifier) with a server-side pepper before
 * storing it. We never persist raw IPs — only salted hashes for abuse analysis.
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const pepper = process.env.INTERNAL_JOB_SECRET ?? 'vivavoce-dev-pepper';
  return createHash('sha256').update(`${pepper}:${ip}`).digest('hex').slice(0, 32);
}

/** Constant-time string comparison for secrets (job tokens, webhook checks). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Pull the best-effort client IP from request headers (behind Vercel/proxy). */
export function clientIp(headers: Headers): string | null {
  const xff = headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return headers.get('x-real-ip');
}
