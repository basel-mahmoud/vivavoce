/**
 * Log redaction. We never log audio, transcripts, full emails, or tokens.
 * Use `redact()` on any object before it reaches a logger.
 */
const SENSITIVE_KEYS = new Set([
  'transcript',
  'text',
  'audio',
  'audioStorageKey',
  'improvedAnswer',
  'token',
  'authorization',
  'apiKey',
  'secret',
  'password',
]);

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain || !user) return '***';
  const head = user.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(1, user.length - 2))}@${domain}`;
}

export function redact<T>(value: T, depth = 0): T {
  if (depth > 6 || value == null) return value;
  if (typeof value === 'string') return value as T;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1)) as T;
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k)) out[k] = '[redacted]';
      else if (k === 'email' && typeof v === 'string') out[k] = maskEmail(v);
      else out[k] = redact(v, depth + 1);
    }
    return out as T;
  }
  return value;
}
