# Testing strategy

## Layers

| Layer | Tooling | What it covers | Status |
| ----- | ------- | -------------- | ------ |
| Unit | Vitest | Pure logic: AI fallback/parsing, schema clamping, redaction, hashing, rate limiter, contract validation, token integrity | ✅ 33 tests |
| Typecheck | `tsc --noEmit` | Web + mobile compile under strict TS | ✅ CI gate |
| Lint | ESLint (next flat config) | Code quality + React rules | ✅ CI gate |
| Integration | Vitest + Neon test branch | Route handlers against a real DB branch | ▶ scaffolded (run with `DATABASE_URL` set) |
| Contract | Shared Zod schemas | Mobile re-validates the same contracts the server enforces | ✅ by construction |
| E2E | Playwright (web) | Waitlist submit, nav, a11y smoke | ▶ planned |
| Accessibility | manual + axe (planned) | Contrast, focus, reduced-motion, labels | ✅ manual; axe planned |
| Load / stress | k6 / autocannon | `/api/v1/answers` under concurrency; rate-limit behaviour | ▶ planned |
| Resilience / chaos | fault injection | AI timeout/down, DB blip, offline queue | ✅ exercised via fallback paths |

## Run

```bash
# web
npm run web:typecheck && npm run web:lint && npm run web:test
# mobile
npm run mobile:typecheck
```

## What the unit tests assert (highlights)

- **AI fallback**: empty/no-speech → all-zero scores; filler-heavy answers score
  lower on conciseness/confidence; scores always clamp to 0–100; weakest axis is
  the true minimum. (Caught a real bug where silence scored 49 overall.)
- **Structured output**: malformed/out-of-range model JSON is rejected by the
  schema, triggering the fallback instead of corrupting the DB.
- **Security**: `redact()` masks transcripts/tokens/emails recursively; IP hashing
  is deterministic and never echoes the raw IP; constant-time compare.
- **Rate limiter**: blocks past the limit, isolates keys, decrements remaining.
- **Contracts**: honeypot rejection, email normalisation, idempotency-key length,
  transcript length cap, unknown-enum rejection.

## Targeted scenarios (per spec)

Auth/permissions, onboarding, session lifecycle, AI evaluation pipeline, DB
isolation, scheduling, deletion/export, and error states each have (or are slated
for) coverage at the layer above where they're cheapest to test — pure logic in
Vitest, cross-cutting flows in Playwright, isolation in integration tests against
a Neon branch.

## Resilience testing ideas

- Force `GEMINI_API_KEY` empty → verify heuristic path + `source: heuristic`.
- Point `GEMINI_MODEL` at a bad model → verify retries → fallback, `model_usage`
  records `status: error/fallback`.
- Kill network mid-submit on device → verify local queue + idempotent re-send.
