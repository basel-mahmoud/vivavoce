import { z } from 'zod';

/**
 * Validated environment. Importing this module fails fast (at boot) if a
 * required variable is missing or malformed — we never read `process.env`
 * directly elsewhere. Server-only secrets must never be prefixed NEXT_PUBLIC_.
 */
const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  APP_DATABASE_URL: z.string().url().optional(),

  CLERK_SECRET_KEY: z.string().min(1).optional(),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1).optional(),

  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),

  MOBILE_ALLOWED_ORIGINS: z.string().default(''),
  INTERNAL_JOB_SECRET: z.string().min(16).optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
});

function parse() {
  const server = serverSchema.safeParse(process.env);
  const pub = publicSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  });
  if (!server.success || !pub.success) {
    const issues = [
      ...(server.success ? [] : server.error.issues),
      ...(pub.success ? [] : pub.error.issues),
    ]
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return { ...server.data, ...pub.data };
}

export const env = parse();

export const isProd = env.NODE_ENV === 'production';
export const aiConfigured = Boolean(env.GEMINI_API_KEY);
export const mobileAllowedOrigins = env.MOBILE_ALLOWED_ORIGINS
  ? env.MOBILE_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [];
