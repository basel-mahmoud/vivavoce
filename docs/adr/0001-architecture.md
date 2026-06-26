# ADR-0001: Monorepo with a single Next.js backend serving web + mobile

- **Status:** Accepted
- **Date:** 2026-06-26
- **Deciders:** Basel Mahmoud

## Context

VivaVoce ships two clients (an Expo mobile app and a marketing website) that
share: auth (Clerk), a domain database (Neon Postgres), an AI evaluation pipeline
(Gemini), and a set of request/response contracts. We need one trust boundary to
secure, one place for Zod contracts and DB access, and a fast path to ship and
deploy. The team is one engineer; operational simplicity matters more than
premature service decomposition.

## Decision

A single npm monorepo:

- `apps/web` — **Next.js 16 (App Router)** hosts both the marketing site **and**
  the backend API as route handlers (`/api/v1/*`) and server actions. It owns DB
  access, the AI service layer, auth verification, rate limiting, and audit logs.
- `apps/mobile` — **Expo SDK 56** app, a pure client of that API, using Clerk for
  identity and short-lived session tokens.
- `packages/tokens` — shared design tokens (the only shared code that both a
  Next and an Expo bundler can consume without friction).

Deployed on Vercel (web/API) and EAS (mobile APK). Neon provides Postgres with
cheap database branches for preview environments.

## Alternatives considered

- **Separate backend service (NestJS/Fastify).** Cleaner long-term boundaries but
  another deploy target, another auth integration, and more ops for a solo build.
  Rejected now; revisit if/when AI evaluation moves to an async worker fleet.
- **Supabase instead of Neon + custom API.** Fast, but the product needs bespoke
  AI orchestration, prompt versioning, and audit semantics that fit better in
  owned route handlers. Neon gives plain Postgres + branches without lock-in.
- **Turborepo workspaces.** Nice caching, but adds config weight; npm-prefix
  scripts are enough at two apps. Revisit when a third app or CI time demands it.

## Consequences

- **+** One TypeScript codebase for contracts, validation, and data access; the
  mobile app and the website call the exact same Zod-validated endpoints.
- **+** One trust boundary to secure and audit; one place for rate limiting.
- **+** Preview deploys (Vercel) pair with Neon DB branches for safe testing.
- **−** The AI evaluation runs on the request path initially; under load this must
  move to a queue + worker (tracked in the backlog) to protect latency/cost.
- **−** No build-time type sharing between `apps/web` and `apps/mobile` beyond
  tokens; API types are shared by copying the published Zod contract shapes and
  validated at runtime on the mobile side. Acceptable for a versioned HTTP API.
