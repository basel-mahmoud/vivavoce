# API contracts

Base path: `/api/v1`. All requests/responses are JSON. Contracts are defined once
as Zod schemas in [`src/lib/validation/contracts.ts`](../apps/web/src/lib/validation/contracts.ts)
and re-validated on the mobile client.

## Envelope

```jsonc
// success
{ "ok": true, "data": { /* ... */ } }
// error
{ "ok": false, "error": { "code": "bad_request", "message": "…", "requestId": "uuid", "fields": { "email": "Invalid email" } } }
```

Error codes: `bad_request` (400), `unauthorized` (401), `forbidden` (403),
`not_found` (404), `conflict` (409), `rate_limited` (429, + `Retry-After`),
`server_error` (500). Messages are intentionally terse; correlate with `requestId`.

## Auth

All `/api/v1/*` except `health` and `waitlist` require a Clerk session
(`Authorization: Bearer <token>` from the app). The server resolves the user and
**tenant** from the verified session — clients never pass a tenant id.

## Endpoints

### `GET /api/v1/health`
Liveness + configuration probe. No auth. → `{ status, time, services: { db, ai } }`.

### `POST /api/v1/waitlist`
Public. Rate-limited 5/hour/IP. Honeypot field `company` must be empty.
```jsonc
// request
{ "email": "you@uni.edu", "persona": "student|interview|language|presentation|other", "referrer": "…", "utmSource": "…" }
// 200 → { "joined": true }
```

### `POST /api/v1/sessions`
Start a session (idempotent by `clientSessionKey`). Rate-limited 20/min/user.
```jsonc
// request
{ "mode": "quick|mock_viva|interview|flash_recall|explain|rapid_fire", "deckId": "uuid|null", "clientSessionKey": "≥8 chars" }
// 201 → { "session": { "id", "mode", "status", "startedAt" }, "idempotent": false }
```

### `GET /api/v1/sessions`
List the caller's recent sessions → `{ "sessions": [...] }`.

### `POST /api/v1/answers`
Submit a spoken answer; returns the evaluation. Idempotent by `clientAnswerKey`.
Rate-limited 30/min/user. Transcript capped at 6000 chars.
```jsonc
// request
{ "sessionId": "uuid", "clientAnswerKey": "≥8 chars", "questionId": "uuid|null",
  "questionPrompt": "…", "transcript": "…", "durationMs": 18000, "orderIndex": 0 }
// 201 → { "result": {
//   "answerId", "source": "model|heuristic",
//   "scores": { "correctness","clarity","structure","conciseness","confidence" },
//   "overall", "weakestAxis", "summary", "strengths", "improvements",
//   "improvedAnswer", "suggestedFollowUp", "fillerWordRate", "wordsPerMinute"
// }, "idempotent": false }
```
Never returns a hard failure for AI outages — `source: "heuristic"` indicates the
deterministic fallback was used and full coaching will follow on retry.

## Versioning

The path carries the major version (`/v1`). Breaking changes ship under `/v2`
with `/v1` maintained through a deprecation window. The mobile app pins a version.

## Idempotency

Mutating endpoints take a client-generated key. A retried request with the same
key returns the original result instead of creating a duplicate — essential for
flaky mobile networks and offline queues.
