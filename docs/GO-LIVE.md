# Go-live checklist — what's done vs. what needs the owner

Updated 2026-07-08. Everything in "Done" is live and verified; everything in
"Owner steps" needs an account/decision only the project owner can make.

## Done (live)

- **Global rate limiting** on every token-costing surface (answer evaluation,
  AI deck generation, public demo): Postgres fixed-window counters
  (`rate_limits` table) — correct across all serverless instances, fail-open,
  behind the same `RateLimiter` seam an Upstash/Redis swap would use.
  In-memory sliding windows remain as the first line on all surfaces.
- **Least-privilege runtime DB role**: the app connects as `vivavoce_app`
  (DML only — verified: `CREATE TABLE` denied). Migrations/seeds keep using the
  owner role via `DIRECT_URL`. Runtime env: `APP_DATABASE_URL`.
- **Right to be forgotten**: `DELETE /api/v1/me` hard-deletes tenant + user +
  Clerk identity; masked audit hash-chain entry is the surviving record.
- Auth on every endpoint, tenant/user scoping, Zod at boundaries, log
  redaction, audit hash-chain, strict CSP/HSTS, offline answer queue,
  APK wired at `/download/apk`.

## Owner steps (in priority order)

1. **Clerk production instance** — create a production instance in the Clerk
   dashboard, point it at your real domain (DNS CNAMEs), enable Google OAuth
   with production credentials, then swap `pk_test_/sk_test_` for
   `pk_live_/sk_live_` in Vercel env + `eas.json` + rebuild the APK.
2. **Custom domain** — buy/attach in Vercel; update `NEXT_PUBLIC_APP_URL`,
   Clerk allowed origins, and `EXPO_PUBLIC_API_URL` in `eas.json`.
3. **Google Play internal testing** — one-time $25 dev account; then
   `eas build -p android --profile production` (AAB) +
   `eas submit -p android`. Sideloading stops being the distribution story.
4. **Sentry (or another error tracker)** — create the org/project, then wire
   `@sentry/nextjs` + `sentry-expo` with the DSN. Deliberately not vendored-in
   without an account: an SDK with no DSN is dead weight.
5. **Billing (Pro tier)** — decision needed: RevenueCat (mobile-first) vs
   Stripe (web-first). The usage-cap plumbing (per-user counters in
   `rate_limits`) is already the enforcement point for free-tier limits.
6. **Full RLS** — defense-in-depth beyond app-layer scoping requires moving
   the runtime off the stateless HTTP driver to pooled `pg` with a
   per-request transaction that sets `app.tenant_id` (see
   `scripts/apply-rls.ts`). Do this together with a load test; do not enable
   `FORCE ROW LEVEL SECURITY` before the wrapper exists — it will break prod.
