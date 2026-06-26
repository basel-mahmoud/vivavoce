# ADR-0002: AI behind a versioned provider abstraction with deterministic fallback

- **Status:** Accepted
- **Date:** 2026-06-26
- **Deciders:** Basel Mahmoud

## Context

Answer evaluation is the product's core value and its biggest reliability and
cost risk. We use Google Gemini (free-tier compatible) but must not let model
outages, latency, schema drift, or prompt injection degrade the experience or
corrupt data. We also need auditability of what prompt/model produced each score.

## Decision

- A single module (`src/lib/ai`) is the only place that talks to the model.
  Callers use `evaluateAnswer()` / `generateQuestion()` and never see the client.
- **No SDK** — a `fetch`-based client against the Gemini REST API so we own
  timeouts (AbortController), retries (exponential backoff + full jitter on
  408/429/5xx), and the error taxonomy, immune to SDK version churn.
- **Structured output, always validated.** We request `application/json` and
  parse every response through Zod (`schemas.ts`). Drift → repair/extract → if
  still invalid, fall back.
- **Deterministic fallback** (`fallback.ts`): an offline heuristic evaluation
  (length, pacing, filler-word rate) so the user always gets *something*, clearly
  labelled as a heuristic. `evaluateAnswer()` never throws.
- **Prompt versioning** in the DB (`prompt_versions`); every model call writes a
  `model_usage_logs` row (task, model, tokens, latency, status) for cost and
  abuse observability.
- **Prompt-injection defence** baked into the template: the transcript is framed
  strictly as content to evaluate and the model is told to ignore any
  instructions inside it. Inputs are length-bounded before sending.

## Alternatives considered

- **Official `@google/genai` SDK.** Nicer ergonomics; rejected to avoid version
  drift breaking builds and to keep retry/timeout logic fully under our control.
- **Free-text parsing with regex.** Brittle; rejected in favour of JSON + Zod.
- **Hard-fail when AI is down.** Unacceptable UX for the core loop; rejected in
  favour of the heuristic fallback + queued re-evaluation.

## Consequences

- **+** The core loop degrades gracefully and never corrupts the DB with
  malformed scores; cost and latency are observable per call.
- **+** Swapping providers touches one file; prompts can be A/B'd and rolled back.
- **−** The heuristic cannot judge correctness (no reference), so fallback scores
  are explicitly provisional and re-evaluated when the model returns.
- **−** Evaluation runs on the request path; at scale it must move to a queue
  (backlog) — the abstraction already isolates the call site for that change.
