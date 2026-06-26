# VivaVoce — Roadmap & Milestones

Status legend: ✅ done · 🚧 in progress · ⬜ planned

## M1 — Foundation `v0.1-foundation`
- ✅ Monorepo scaffold (apps/web, apps/mobile, packages/tokens, docs, .github)
- ✅ Root configs, .gitignore, editorconfig, CI workflow
- ✅ Shared design tokens (Ink & Ember)
- ✅ Core docs: README, DESIGN, PRODUCT, AGENTS, ADR-0001
- ✅ PR/issue templates, CODEOWNERS, CONTRIBUTING, SECURITY policy

## M2 — Data + AI backbone `v0.2-data-ai`
- ✅ Drizzle schema: full domain (users…waitlist, audit, consent, prompts)
- ✅ Migrations + seed + RLS strategy scripts
- ✅ Gemini provider abstraction: prompt versioning, structured output, retries,
     fallback, redaction, usage logging
- ✅ Zod API contracts (shared request/response schemas)
- ✅ ADRs for DB isolation + AI layer

## M3 — Marketing website `v0.4-website`
- ✅ Premium landing (hero, how-it-works, modes, rubric, proof, waitlist)
- ✅ Features / how-it-works / use-cases / FAQ / contact
- ✅ Privacy / Terms / Accessibility legal pages
- ✅ Waitlist API → Neon, rate-limited, validated, honeypot
- ✅ SEO: metadata, OG, sitemap, robots, JSON-LD; a11y pass
- ✅ Built & verified in browser

## M4 — Mobile app `v0.3-mobile`
- ✅ Design system primitives (Text, Button, Card, tokens, theme)
- ✅ Onboarding flow (goal → level → subjects → consent → profile)
- ✅ Home dashboard
- ✅ Voice session engine UI (all states) + feedback view
- ✅ Progress / analytics, Library, Settings
- ✅ Clerk Expo auth + secure token cache
- ⬜ Wire device mic capture + real upload (needs native build / device)

## M5 — Hardening `v0.5-hardening`
- ✅ Tests: tokens, AI parsing/fallback, waitlist validation, rate limit
- ✅ Security headers / CSP, threat model, security checklist
- ✅ Reliability: retries, idempotency, degraded-mode UX
- ✅ Ops: runbook, incident response, disaster recovery
- ✅ Compliance: privacy, retention, deletion/export, consent
- ✅ Accessibility audit notes

## Backlog (post-MVP)
- ⬜ Async AI job queue + dead-letter (move eval off request path at scale)
- ⬜ Object storage + signed upload URLs for audio retention
- ⬜ Coach/org dashboards (web)
- ⬜ Push notifications (Expo) for scheduled drills
- ⬜ "Compare to my previous best answer" diff view
- ⬜ Multilingual evaluation prompts
- ⬜ Downloadable PDF session reports

## Repository & deployments
- **GitHub:** https://github.com/basel-mahmoud/vivavoce (**public**) — `main` + tags
  `v0.1-foundation` … `v0.5-hardening`.
- **Vercel project:** `basel-mahmouds-projects/vivavoce` (apps/web).
- **Live:** https://vivavoce-kappa.vercel.app — public, `health: { db:true, ai:true }`,
  waitlist persists to a real DB.

### Infrastructure (VivaVoce-owned, isolated from other projects)
- **Database:** its **own** Neon database `vivavoce` (20 tables, seeded). Shares the
  Neon *cluster* with other apps but no shared tables/data. _Optional upgrade:_ move
  to a dedicated Neon project for credential separation.
- **AI:** Gemini (reused account key — project-agnostic quota).
- **Auth:** Clerk **not yet wired** — needs a **dedicated VivaVoce Clerk app** (the
  public site doesn't use Clerk; it's required for the mobile/session API). Until then
  the app runs in demo mode with on-device evaluation.

| Milestone | Environment | URL |
| --------- | ----------- | --- |
| M3 site + API | Vercel **production** | https://vivavoce-kappa.vercel.app |
