/**
 * Migration runner. Uses a direct (non-pooled) connection and the owner role,
 * because DDL must not go through the pooler or the restricted app role.
 *
 *   npm run db:generate   # produce SQL from schema.ts
 *   npm run db:migrate    # apply pending migrations
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DIRECT_URL or DATABASE_URL is required for migrations');

  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool);

  console.log('▶ applying migrations…');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('✓ migrations applied');

  await pool.end();
}

main().catch((err) => {
  console.error('✗ migration failed:', err);
  process.exit(1);
});
