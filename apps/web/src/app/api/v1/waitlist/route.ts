import { NextRequest } from 'next/server';
import { db, schema } from '@/lib/db/client';
import { dbConfigured } from '@/lib/env';
import { ok, errors, parseBody } from '@/lib/http';
import { waitlistInput } from '@/lib/validation/contracts';
import { limiters } from '@/lib/security/ratelimit';
import { clientIp, hashIp } from '@/lib/security/hash';
import { audit } from '@/lib/security/audit';
import { maskEmail } from '@/lib/security/redact';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const ipHash = hashIp(ip);

  // 1. Rate limit by IP.
  const rl = limiters.waitlist.check(ipHash ?? 'anon');
  if (!rl.ok) return errors.tooMany(rl.resetMs);

  // 2. Validate.
  const parsed = await parseBody(req, waitlistInput);
  if (!parsed.ok) return parsed.response;
  const { email, persona, referrer, utmSource, company } = parsed.data;

  // 3. Honeypot — bots fill `company`. Respond success without persisting.
  if (company && company.length > 0) {
    return ok({ joined: true });
  }

  // 4. Persist (idempotent by unique email). Degrade gracefully if no DB.
  if (!dbConfigured) {
    console.warn('waitlist: DB not configured — accepting in demo mode', {
      email: maskEmail(email),
    });
    return ok({ joined: true, demo: true });
  }

  try {
    await db
      .insert(schema.waitlistLeads)
      .values({ email, persona, referrer, utmSource, ipHash })
      .onConflictDoNothing({ target: schema.waitlistLeads.email });

    await audit({
      action: 'waitlist.join',
      actorType: 'system',
      resourceType: 'waitlist_lead',
      metadata: { persona: persona ?? null },
      ipHash,
    });

    return ok({ joined: true });
  } catch (err) {
    console.error('waitlist_insert_failed', { error: String(err) });
    return errors.server();
  }
}
