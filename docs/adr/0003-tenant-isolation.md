# ADR-0003: Tenant isolation via trusted-context scoping + RLS defense-in-depth

- **Status:** Accepted
- **Date:** 2026-06-26
- **Deciders:** Basel Mahmoud

## Context

VivaVoce is multi-tenant (personal spaces today; organizations/coaches later).
Voice/transcript data is the most sensitive class we hold, so cross-tenant leaks
are the highest-severity risk. Our runtime uses the Neon **serverless HTTP
driver**, where each query is an independent request with no durable session —
so the classic "set a session GUC per transaction, let RLS enforce it" pattern
isn't available on the hot path.

## Decision

Two walls:

1. **Primary — trusted-context scoping (application layer).** `getAuthContext()`
   derives `tenantId` and `userId` from the Clerk session **server-side only**;
   the client never supplies a tenant id. Every user-scoped query filters by that
   `tenantId` *and* checks resource ownership. This is enforced by convention,
   tested (see `docs/TESTING.md`), and reviewed (CODEOWNERS on `lib/db`).
2. **Secondary — Postgres RLS + least-privilege role** (`scripts/apply-rls.ts`).
   Every tenant table has `FORCE ROW LEVEL SECURITY` with a policy keyed on
   `current_setting('app.tenant_id')`. The runtime role `vivavoce_app` has DML
   only — no DDL, cannot disable RLS. Any code path using a **direct TCP session**
   (batch jobs, retention sweeps, future workers) sets `app.tenant_id` and is
   physically prevented from crossing tenants.

## Alternatives considered

- **RLS as the only wall, over HTTP.** Not reliable with the stateless HTTP
  driver; would require a transaction per query. Rejected as primary.
- **Schema-per-tenant.** Strong isolation but heavy operational cost and painful
  cross-tenant analytics; overkill for the current scale. Rejected.
- **App-layer scoping only.** Simpler but single-wall; one missed `where`
  leaks data. Rejected in favour of adding the RLS wall.

## Consequences

- **+** Defense in depth: a forgotten filter is still caught by RLS on the direct
  path; the app role can't escalate.
- **+** Clear, testable invariant: "every user-scoped query carries tenantId".
- **−** Discipline required on the HTTP hot path; mitigated by review + tests + a
  thin data-access layer that always takes `tenantId`.
- **−** Two enforcement mechanisms to keep in sync; documented in SECURITY.md.
