# VivaVoce

**Say it out loud before it counts.**

VivaVoce is a voice-first study sparring app. It asks real exam questions,
listens to your spoken answer, and marks it in seconds on *correctness, clarity,
structure, conciseness, and confidence* — so you can rehearse oral exams, vivas,
interviews, and presentations until they feel familiar.

### Live

- 🌐 **Website + live demo:** https://vivavoce-kappa.vercel.app
  — the landing page is a board of live product tiles; try the real marking
  engine (speak or type an answer, no account needed).
- 📱 **Android beta (APK):** https://vivavoce-kappa.vercel.app/download/apk
- 🔌 **API health:** https://vivavoce-kappa.vercel.app/api/v1/health

> VivaVoce is a study-coaching tool. It is **not** an official examiner and its
> scores are not exam grades. See [docs/COMPLIANCE.md](docs/COMPLIANCE.md).

---

## Monorepo layout

```
vivavoce/
├── apps/
│   ├── web/        # Next.js 16 — marketing site + backend API (route handlers)
│   └── mobile/     # Expo SDK 56 — the React Native app (APK via EAS)
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

| Concern    | Choice |
| ---------- | ------ |
| Mobile     | Expo SDK 56, React Native, expo-router, Reanimated 4, EAS build |
| Web + API  | Next.js 16 (App Router), React 19, Tailwind v4 |
| Auth       | Clerk (web + Expo), email/password + Google SSO, secure token cache |
| Database   | Neon Postgres via Drizzle ORM + `@neondatabase/serverless` |
| AI         | Google Gemini behind a versioned provider abstraction |
| Validation | Zod (every boundary) |
| Hosting    | Vercel (web/API, git push → deploy), EAS (mobile APK) |

## The product loop

1. Pick a mode (Mock Viva, Interview, Quick, Flash Recall, Explain, Rapid Fire)
   and a deck from the catalogue.
2. Answer **out loud**. Mobile records via `expo-audio`; the backend transcribes
   it with Gemini and marks it. The web demo uses the browser's speech API.
3. Get a five-axis score, the one axis to fix first, and a stronger answer to
   steal from — plus a follow-up aimed at your weakest point.
4. Weak areas resurface on a schedule; progress and streaks track over time.

Design system: **"The Practice Room"** — a bento board of live tiles on a warm
porcelain canvas, flat ink / vermilion / cobalt blocks, Archivo Black display,
JetBrains Mono for marks. See [DESIGN.md](DESIGN.md).

## Quick start

```bash
# 1. Install
npm --prefix apps/web install
npm --prefix apps/mobile install     # uses legacy-peer-deps (.npmrc)

# 2. Configure env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env      # EXPO_PUBLIC_* vars

# 3. Database (Neon)
npm run db:generate     # build migrations from the Drizzle schema
npm run db:migrate      # apply to your Neon branch/project
npm run db:seed         # subjects, decks, questions, prompt versions

# 4. Run
npm run web             # http://localhost:3000  (site + API)
npm run mobile          # Expo dev server (press 'a' for Android)

# 5. Ship a mobile build
cd apps/mobile && eas build -p android --profile preview   # → installable APK
```

Full setup: [docs/SETUP.md](docs/SETUP.md) · Deployment: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Quality gates

```bash
npm run web:typecheck && npm run web:lint && npm run web:test   # 36 unit tests
npm run mobile:typecheck
```

CI runs the same gates on every push ([.github/workflows/ci.yml](.github/workflows/ci.yml)).

## Documentation

- [Setup & local dev](docs/SETUP.md) · [Deployment](docs/DEPLOYMENT.md)
- [Architecture overview](docs/ARCHITECTURE.md) · [ADRs](docs/adr)
- [API contracts](docs/API.md) · [Data model & ERD](docs/DATA-MODEL.md)
- [Security](docs/SECURITY.md) · [Threat model](docs/THREAT-MODEL.md)
- [Privacy & compliance](docs/COMPLIANCE.md)
- [Testing strategy](docs/TESTING.md)
- [Runbook](docs/ops/RUNBOOK.md) · [Incident response](docs/ops/INCIDENT-RESPONSE.md) · [Disaster recovery](docs/ops/DISASTER-RECOVERY.md)
- [Design system](DESIGN.md) · [Product spec](PRODUCT.md) · [Roadmap](TASKS.md)
