import { createHash } from 'node:crypto';
import { desc } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { redact } from './redact';

/**
 * Append-only audit trail with a per-row hash chain for tamper evidence:
 * entryHash = sha256(prevHash + canonical(payload)). A gap or altered row breaks
 * the chain, which a periodic verifier can detect (docs/SECURITY.md).
 *
 * Best-effort: auditing must never break the primary action, so failures here
 * are swallowed (and surfaced via monitoring) rather than thrown.
 */
export interface AuditEntry {
  tenantId?: string | null;
  actorUserId?: string | null;
  actorType?: 'user' | 'system' | 'admin';
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipHash?: string | null;
}

function canonical(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as object).sort());
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const [prev] = await db
      .select({ entryHash: schema.auditLogs.entryHash })
      .from(schema.auditLogs)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(1);

    const prevHash = prev?.entryHash ?? 'genesis';
    const payload = {
      tenantId: entry.tenantId ?? null,
      actorUserId: entry.actorUserId ?? null,
      actorType: entry.actorType ?? 'user',
      action: entry.action,
      resourceType: entry.resourceType ?? null,
      resourceId: entry.resourceId ?? null,
      metadata: redact(entry.metadata ?? {}),
    };
    const entryHash = createHash('sha256')
      .update(prevHash + canonical(payload))
      .digest('hex');

    await db.insert(schema.auditLogs).values({
      ...payload,
      ipHash: entry.ipHash ?? null,
      prevHash,
      entryHash,
    });
  } catch (err) {
    console.error('audit_write_failed', { action: entry.action, error: String(err) });
  }
}
