# VivaVoce

**Practice out loud. Think clearly under pressure.**

VivaVoce is a voice-first study sparring app. It asks you questions, listens to
your spoken answers, and gives structured coaching on *correctness, clarity,
structure, conciseness, and confidence* — so you can rehearse oral exams, vivas,
interviews, and presentations until they feel inevitable.

> VivaVoce is a study-coaching tool. It is **not** an official examiner and its
> scores are not exam grades. See [docs/COMPLIANCE.md](docs/COMPLIANCE.md).

---

## Monorepo layout

```
vivavoce/
├── apps/
│   ├── web/        # Next.js 16 — marketing site + backend API (route handlers)
│   └── mobile/     # Expo SDK 56 — the React Native app (APK export path)
├── packages/
│   └── tokens/     # Shared design tokens (colors, type scale, spacing, motion)
├── docs/           # ADRs, architecture, ERD, security, ops, compliance
└── .github/        # CI, PR/issue templates, CODEOWNERS
```

Why `apps/web` hosts the API: a single TypeScript backend on Vercel keeps the
trust boundary small, shares Zod contracts and DB access with the marketing
site's waitlist, and lets the mobile app talk to one versioned origin. See
[docs/adr/0001-architecture.md](docs/adr/0001-architecture.md).

## Stack

| Concern        | Choice                                              |
| -------------- | --------------------------------------------------- |
| Mobile         | Expo SDK 56, React Native, expo-router, Reanimated 4 |
| Web + API      | Next.js 16 (App Router), React 19, Tailwind v4      |
| Auth           | Clerk (web + Expo), session-based, role-aware        |
| Database       | Neon Postgres via Drizzle ORM + `@neondatabase/serverless` |
| AI             | Google Gemini behind a versioned provider abstraction |
| Validation     | Zod (every boundary)                                |
| Hosting        | Vercel (web/API), EAS (mobile APK)                  |

## Quick start

```bash
# 1. Install
npm --prefix apps/web install
npm --prefix apps/mobile install

# 2. Configure env (copy and fill)
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local

# 3. Database (Neon)
npm run db:generate     # build migrations from the Drizzle schema
npm run db:migrate      # apply to your Neon branch
npm run db:seed         # demo subjects, decks, questions

# 4. Run
npm run web             # http://localhost:3000  (site + API)
npm run mobile          # Expo dev server (press 'a' for Android)
```

Full setup: [docs/SETUP.md](docs/SETUP.md) · Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Documentation

- [Setup & local dev](docs/SETUP.md)
- [Architecture overview](docs/ARCHITECTURE.md) · [ADRs](docs/adr)
- [API contracts](docs/API.md)
- [Data model & ERD](docs/DATA-MODEL.md)
- [Security](docs/SECURITY.md) · [Threat model](docs/THREAT-MODEL.md)
- [Privacy & compliance](docs/COMPLIANCE.md)
- [Testing strategy](docs/TESTING.md)
- [Operations runbook](docs/ops/RUNBOOK.md) · [Incident response](docs/ops/INCIDENT-RESPONSE.md) · [Disaster recovery](docs/ops/DISASTER-RECOVERY.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Design system](DESIGN.md) · [Product spec](PRODUCT.md)
- [Roadmap & milestones](TASKS.md)
