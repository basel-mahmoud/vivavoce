import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { env } from '@/lib/env';
import * as schema from './schema';

/**
 * Runtime database client (Neon serverless over HTTP — ideal for Vercel
 * functions). We connect with the least-privilege application role
 * (APP_DATABASE_URL) when provided, falling back to DATABASE_URL in dev.
 *
 * Migrations and seeds use a separate direct connection (see migrate.ts) and
 * the owner role; the runtime never runs DDL.
 */
const connectionString = env.APP_DATABASE_URL ?? env.DATABASE_URL;

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });

export type DB = typeof db;
export { schema };
