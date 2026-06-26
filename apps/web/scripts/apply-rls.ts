/**
 * Defense-in-depth database hardening:
 *  1. Create a least-privilege application role (`vivavoce_app`) with DML only —
 *     no DDL, no ability to disable RLS.
 *  2. Enable Row-Level Security on every tenant-scoped table and add a policy
 *     keyed off the `app.tenant_id` session GUC.
 *
 * The serverless HTTP runtime enforces tenancy primarily in application code
 * (every query is scoped by the trusted auth-context tenantId — see
 * docs/SECURITY.md). RLS is the second wall: any code path that connects over a
 * direct TCP session and sets `app.tenant_id` is physically prevented from
 * reading another tenant's rows. Run with the OWNER connection:
 *
 *   DIRECT_URL=... APP_ROLE_PASSWORD=... npm run db:rls
 */
import { Pool } from 'pg';

const TENANT_TABLES = [
  'subjects',
  'decks',
  'questions',
  'practice_sessions',
  'answers',
  'transcripts',
  'ai_feedback',
  'schedules',
  'notifications',
  'analytics_daily',
];

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  const appPassword = process.env.APP_ROLE_PASSWORD;
  if (!url) throw new Error('DIRECT_URL required');
  if (!appPassword) throw new Error('APP_ROLE_PASSWORD required to (re)set the app role password');

  const pool = new Pool({ connectionString: url, max: 1 });
  const c = await pool.connect();
  try {
    await c.query('BEGIN');

    // 1. Least-privilege role
    await c.query(`DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vivavoce_app') THEN
          CREATE ROLE vivavoce_app LOGIN;
        END IF;
      END $$;`);
    await c.query(`ALTER ROLE vivavoce_app WITH PASSWORD '${appPassword.replace(/'/g, "''")}'`);
    await c.query('GRANT USAGE ON SCHEMA public TO vivavoce_app');
    await c.query('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vivavoce_app');
    await c.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vivavoce_app');
    await c.query('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vivavoce_app');

    // 2. RLS policies
    for (const table of TENANT_TABLES) {
      await c.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await c.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
      await c.query(`DROP POLICY IF EXISTS tenant_isolation ON ${table}`);
      await c.query(`
        CREATE POLICY tenant_isolation ON ${table}
        USING (tenant_id::text = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true))
      `);
    }

    await c.query('COMMIT');
    console.log('✓ app role + RLS applied to', TENANT_TABLES.length, 'tables');
  } catch (err) {
    await c.query('ROLLBACK');
    console.error('✗ RLS apply failed:', err);
    process.exitCode = 1;
  } finally {
    c.release();
    await pool.end();
  }
}

main();
