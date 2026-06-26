# Disaster recovery

## Objectives

| Metric | Target | Rationale |
| ------ | ------ | --------- |
| **RPO** (max data loss) | ≤ 5 min | Neon continuous backup / point-in-time restore |
| **RTO** (time to recover) | ≤ 1 hour | Stateless app redeploys instantly; DB restore is the long pole |

Practice data is valuable but not life-critical; audio is opt-in and often
ephemeral. Targets are set accordingly and revisited as usage grows.

## What we depend on

| Component | State | Recovery |
| --------- | ----- | -------- |
| Next.js app (Vercel) | Stateless | Redeploy previous build instantly; no data to restore |
| Neon Postgres | **Stateful — primary asset** | Point-in-time restore to a new branch |
| Clerk | Identity (external) | Managed by Clerk; we hold no password data |
| Gemini | Stateless 3rd party | Heuristic fallback covers outages |
| Object storage (audio) | Stateful (when enabled) | Bucket versioning + lifecycle; references in DB |

## Scenarios & procedures

### Bad migration / data corruption
1. Identify the time just before the bad change.
2. Create a Neon **point-in-time branch** at that timestamp.
3. Validate data on the branch; promote it (repoint `DATABASE_URL`/`DIRECT_URL`).
4. Ship a forward/compensating migration; never reverse-in-place on prod.

### Accidental destructive query
- Same as above: restore via point-in-time branch. Soft-deletes (`deletedAt`)
  already protect most user content from accidental loss.

### Region / provider outage (Vercel)
- Redeploy is instant once the platform recovers; the app is stateless. If
  prolonged, the marketing site can be served statically from a mirror.

### Region / provider outage (Neon)
- The app degrades: reads/writes fail fast with terse errors; the mobile app
  queues answers locally (idempotent) and the on-device heuristic still gives
  feedback. On recovery, queued submissions replay safely (idempotency keys).

### Total loss of an environment
1. Recreate the Vercel project from the repo (infra is code/config).
2. Restore the Neon database from backup to a new project/branch.
3. Restore secrets from the secret manager into Vercel env.
4. Re-point DNS; verify `/api/v1/health` and a smoke flow.

## Backups

- **Neon**: continuous backup + point-in-time restore (provider-managed). Verify
  the retention window matches the RPO target.
- **Audio (when enabled)**: versioned object storage with lifecycle rules.
- **Config/secrets**: stored in the secret manager, not the repo; documented in
  [DEPLOYMENT.md](../DEPLOYMENT.md).

## DR testing

Quarterly: restore a Neon branch to a timestamp, point a preview deploy at it,
and run the smoke flow. Record the actual RTO/RPO achieved and adjust.
