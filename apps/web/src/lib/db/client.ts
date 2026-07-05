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
// A syntactically valid placeholder keeps module import safe when the DB is not
// configured (preview/demo). Routes check `dbConfigured` before issuing queries.
const connectionString =
  env.APP_DATABASE_URL ??
  env.DATABASE_URL ??
  'postgresql://placeholder:placeholder@localhost:5432/placeholder';

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });

/**
 * Raw Neon tagged-template client for hand-written aggregation SQL. Interpolated
 * `${values}` are parameterized by the driver (no string concatenation), so it
 * is safe from injection. Use only for read-only analytics; all mutations go
 * through Drizzle. Returns an array of row objects.
 */
export const sqlClient = sql;

export type DB = typeof db;
export { schema };
