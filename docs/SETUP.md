# Setup & local development

## Prerequisites

- Node 20+ (CI uses 22; repo developed on 25). `nvm use` reads `.nvmrc`.
- npm 10+.
- A Neon project, a Clerk application, and a Google AI Studio (Gemini) key.

## 1. Install

```bash
npm --prefix apps/web install
npm --prefix apps/mobile install   # uses legacy-peer-deps (.npmrc)
```

## 2. Configure environment

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local
```

Fill in (see each `.env.example` for the full list):

- **Web**: `DATABASE_URL` (Neon pooled), `DIRECT_URL` (Neon direct, for
  migrations), `APP_DATABASE_URL` (least-priv role, optional in dev),
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `GEMINI_API_KEY`.
- **Mobile**: `EXPO_PUBLIC_API_URL` (your web origin), `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.

> The marketing site and app both **boot without secrets** — the site runs fully,
> the waitlist accepts in demo mode, and the app falls back to on-device
> evaluation. Add secrets to enable persistence, auth, and real AI coaching.

## 3. Database

```bash
npm run db:generate   # generate SQL from schema.ts
npm run db:migrate    # apply to your Neon branch (uses DIRECT_URL)
npm run db:seed       # starter subjects/decks/questions + prompt versions
# optional hardening (owner connection + APP_ROLE_PASSWORD):
npm --prefix apps/web run db:rls
```

Tip: create a Neon **branch** per environment/PR for cheap, isolated data.

## 4. Run

```bash
npm run web           # http://localhost:3000  (site + API)
npm run mobile        # Expo dev server — press 'a' (Android) / 'w' (web)
```

## 5. Quality gates

```bash
npm run web:typecheck && npm run web:lint && npm run web:test
npm run mobile:typecheck
```

## Project scripts (root)

`web`, `web:build`, `web:lint`, `web:typecheck`, `web:test`, `mobile`,
`mobile:android`, `mobile:typecheck`, `db:generate`, `db:migrate`, `db:seed`.

## Troubleshooting

- **`Invalid environment configuration`** — a required var is missing/malformed;
  the message lists the field. The site itself doesn't require DB/Clerk to boot.
- **CSP errors in dev console** — only `'unsafe-eval'` (React dev) is relaxed in
  development; production CSP is strict. A restart picks up `next.config.ts`.
- **Mobile peer-dep conflicts** — `.npmrc` sets `legacy-peer-deps=true`; ensure
  you installed from `apps/mobile`.
