# Contributing

## Branches & commits

- Branch off `main`: `feat/…`, `fix/…`, `docs/…`, `chore/…`.
- Conventional Commits: `feat(web): add waitlist honeypot`.
- Small, logical commits. Keep `main` releasable.

## Before you push

```bash
npm run web:typecheck && npm run web:lint && npm run web:test
npm run mobile:typecheck
```

## Definition of done

- Boundaries validated with Zod; user-scoped queries check ownership + tenant.
- New UI ships loading/empty/error states, focus-visible, AA contrast, and
  honors reduced motion.
- Tests cover the happy path + at least one failure/edge path.
- Docs/ADRs updated when contracts or architecture change.

## Reviews

PRs require a green CI run and one approval. Changes under `lib/db`, `lib/ai`,
or `lib/security` get extra scrutiny — see [docs/SECURITY.md](docs/SECURITY.md).

## ADRs

Architecture decisions are recorded in [`docs/adr`](docs/adr) using
[`docs/adr/TEMPLATE.md`](docs/adr/TEMPLATE.md). Open an ADR before large changes.
