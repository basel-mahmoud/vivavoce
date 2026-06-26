import { ok } from '@/lib/http';
import { dbConfigured, aiConfigured } from '@/lib/env';

export const runtime = 'nodejs';

/** Liveness + configuration probe (no secrets leaked, booleans only). */
export async function GET() {
  return ok({
    status: 'ok',
    time: new Date().toISOString(),
    services: { db: dbConfigured, ai: aiConfigured },
  });
}
