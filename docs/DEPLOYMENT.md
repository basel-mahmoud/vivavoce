# Deployment

## Web + API → Vercel

The `apps/web` Next.js app deploys to Vercel (project root = `apps/web`).

```bash
# from apps/web, first time:
vercel link
# preview deploy (every milestone):
vercel deploy
# production (stable milestones):
vercel deploy --prod
```

Or connect the GitHub repo for push-to-deploy: `main` → production, PRs →
preview. Pair each preview with a **Neon branch** so previews never touch prod data.

### Required environment variables (Vercel project settings)

`DATABASE_URL`, `DIRECT_URL`, `APP_DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
`CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `GEMINI_API_KEY`, `GEMINI_MODEL`,
`NEXT_PUBLIC_APP_URL`, `INTERNAL_JOB_SECRET`. Set per-environment (Preview vs
Production); never commit secrets.

### Post-deploy checks

- `GET /api/v1/health` → `{ status: "ok", services: { db: true, ai: true } }`.
- Security headers present (`curl -I` → CSP, HSTS, `X-Content-Type-Options`).
- Waitlist submits and writes a `waitlist_leads` row.

### Deployment log

| Milestone | Env | URL | Notes |
| --------- | --- | --- | ----- |
| M3 website | preview | _record after `vercel deploy`_ | |
| M3 website | prod | _record after `vercel deploy --prod`_ | |

## Mobile (APK) → EAS

```bash
npm i -g eas-cli && eas login
cd apps/mobile
eas build --profile preview --platform android   # → installable .apk
eas build --profile production --platform android # → .aab for Play Store
```

Profiles live in [`eas.json`](../apps/mobile/eas.json): `preview` builds an APK
(internal distribution), `production` builds an app bundle with auto-increment.
Set `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` per profile.

> Replace the placeholder `eas.projectId` in `app.json` and the brand assets in
> `apps/mobile/assets/` (currently generated placeholders) before a store build.

## Database migrations in CI/CD

Run `npm run db:migrate` against the target branch as a deploy step (or manually
for production, with review). Migrations use `DIRECT_URL` + the owner role; the
runtime app role cannot run DDL.

## Rollback

- **Web**: redeploy the previous Vercel build (instant) or `vercel rollback`.
- **DB**: forward-only migrations; ship a compensating migration rather than
  reversing. Restore from a Neon point-in-time branch if data is affected (see
  [DISASTER-RECOVERY](ops/DISASTER-RECOVERY.md)).
- **Mobile**: ship a new build; gate risky changes behind a remote flag.
