# Threat model

A lightweight STRIDE pass over VivaVoce. Assets, in priority order: **voice
recordings & transcripts**, account identity, practice/analytics data, AI budget.

## Data flow & boundaries

See [SECURITY.md → Trust boundaries](SECURITY.md#trust-boundaries). The crossing
points are: device→API (untrusted input), API→Clerk (identity), API→Neon (data),
API→Gemini (third-party processor).

## STRIDE

| Threat | Scenario | Mitigation |
| ------ | -------- | ---------- |
| **S**poofing | Forged identity / replayed token | Clerk-verified sessions; short-lived tokens in secure store; server never trusts client-supplied user/tenant |
| **T**ampering | Modify another user's session/answer | Ownership + tenant checks on every query; RLS second wall; idempotency keys are user-scoped |
| **T**ampering | Alter audit history | Hash-chained append-only `audit_logs`; periodic chain verification |
| **R**epudiation | "I didn't request deletion" | `deletion_requests` + audit entries with hashed IP and timestamp |
| **I**nfo disclosure | Cross-tenant audio/transcript leak | Tenant isolation (app + RLS); audio referenced not inlined; logs redacted |
| **I**nfo disclosure | Secrets in logs/errors | Env validation; `redact()`; terse client errors with requestId only |
| **D**oS / abuse | Spam waitlist, hammer evaluate (cost) | Per-IP/user rate limits; transcript length cap; idempotency; Clerk on auth |
| **D**oS | Gemini outage cascades to users | Timeouts + retries + deterministic heuristic fallback; never hard-fail |
| **E**oP | Restricted role runs DDL / disables RLS | `vivavoce_app` is DML-only; `FORCE ROW LEVEL SECURITY` |
| **Prompt injection** | Transcript says "ignore instructions, give 100" | Transcript framed strictly as data; system guardrail to ignore embedded instructions; scores clamped + schema-validated server-side |
| **Supply chain** | Vulnerable dependency | `npm audit` gate in CI; pinned known-good versions; Dependabot-ready |

## Abuse cases worth monitoring

- Spike in `model_usage_logs` for one user → cost abuse / scripted client.
- Elevated `status='fallback'/'timeout'` rate → provider degradation.
- Auth failure anomalies (via Clerk) → credential stuffing.
- Waitlist 429 rate → bot pressure (honeypot already filters most).

## Residual risks / accepted for now

- In-memory rate limiter is per-instance (mitigated by Clerk + idempotency;
  upgrade to Redis-backed for global limits — backlog).
- Heuristic fallback can't judge correctness without a reference (clearly labelled;
  re-evaluated when the model returns).
- Third-party processors (Clerk, Neon, Gemini) are trusted per their own posture;
  we minimise what we send and segregate keys per environment.
