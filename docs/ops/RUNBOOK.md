# Operations runbook

Day-to-day operational procedures for VivaVoce.

## Health & dashboards

- **Liveness**: `GET /api/v1/health` → `{ status, services: { db, ai } }`.
- **Vercel**: function logs, error rate, p95 latency.
- **Neon**: connection count, CPU, storage, branch list.
- **Signals to chart** (from `model_usage_logs` / `audit_logs`):
  session success rate, transcription/eval failure rate, AI timeout rate,
  fallback rate, onboarding completion, weekly active proxy, waitlist conversion,
  auth-failure anomalies (Clerk dashboard).

## Common procedures

### Gemini is degraded (timeouts / errors rising)
1. Confirm via `model_usage_logs` (`status` in `timeout|error|fallback` climbing).
2. User impact is contained — answers still get heuristic feedback. No outage page.
3. If sustained: lower `GEMINI_TIMEOUT_MS` won't help; consider switching
   `GEMINI_MODEL` to a known-good model (env change, no deploy if using runtime env)
   or pausing question-generation (non-critical) to shed load.
4. Communicate status; full coaching auto-resumes when the provider recovers.

### Rate-limit false positives
- Limits live in `lib/security/ratelimit.ts`. The in-memory limiter is
  per-instance; bursts across instances may under-count. For a legitimate spike,
  raise the relevant limiter or move it to the Redis-backed implementation.

### Database connection pressure
1. Check Neon connection count. Runtime uses the serverless HTTP driver (no long
   connections); migrations/jobs use a small direct pool (`max: 1`).
2. Ensure no job is holding the direct pool; scale Neon compute if storage/CPU bound.

### Run the right-to-be-forgotten sweep
1. Query `deletion_requests` where `status='requested'` and `scheduledFor <= now()`.
2. For each: hard-delete the user's personal data and any retained audio; keep
   minimised audit rows; set `status='completed'`, `completedAt=now()`.
3. Record the action in `audit_logs` (actorType `system`).

### Verify audit-chain integrity
- Walk `audit_logs` ordered by `created_at`; recompute
  `entryHash = sha256(prevHash + canonical(payload))`. A mismatch ⇒ tampering →
  treat as a security incident ([INCIDENT-RESPONSE](INCIDENT-RESPONSE.md)).

### Rotate a secret
1. Generate new value in the provider (Clerk/Neon/Gemini).
2. Update Vercel env for the environment; redeploy.
3. Invalidate the old secret. Confirm `/api/v1/health` and a smoke flow.

## Maintenance

- Weekly: review `npm audit --omit=dev`, dependency updates, error trends.
- Before each release: run the [release checklist](#release-checklist).

## Release checklist

- [ ] `web:typecheck`, `web:lint`, `web:test`, `mobile:typecheck` green.
- [ ] `web:build` succeeds; `npm audit --omit=dev --audit-level=high` clean.
- [ ] Migrations applied to the target branch and reviewed.
- [ ] Security checklist ([SECURITY.md](../SECURITY.md)) reviewed for new surfaces.
- [ ] `/api/v1/health` green post-deploy; smoke the waitlist + a session.
- [ ] Deployment log updated ([DEPLOYMENT.md](../DEPLOYMENT.md)).
