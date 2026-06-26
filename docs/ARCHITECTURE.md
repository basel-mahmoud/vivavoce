# Architecture

VivaVoce is a two-client product (Expo app + marketing site) over one TypeScript
backend, Neon Postgres, Clerk, and Gemini. See the rationale in
[ADR-0001](adr/0001-architecture.md).

## System context

```mermaid
flowchart TB
  subgraph Clients
    M["📱 Expo app<br/>(React Native)"]
    W["🌐 Marketing site<br/>(Next.js pages)"]
  end

  subgraph Vercel["Vercel — Next.js app (apps/web)"]
    API["/api/v1/* route handlers<br/>auth · validation · rate limit · audit"]
    AI["AI service layer<br/>(prompt versions, fallback)"]
    DAL["Data access<br/>(Drizzle, tenant-scoped)"]
  end

  subgraph External
    CK["Clerk<br/>(identity & sessions)"]
    NE["Neon Postgres<br/>(pooled + branches)"]
    GE["Google Gemini<br/>(generateContent REST)"]
  end

  M -->|"HTTPS + Bearer token"| API
  W -->|"same-origin fetch"| API
  M -->|"sign-in"| CK
  W -->|"(optional) auth"| CK
  API -->|"verify session"| CK
  API --> DAL --> NE
  API --> AI --> GE
```

## Request lifecycle — evaluating a spoken answer

```mermaid
sequenceDiagram
  participant App as Expo app
  participant API as /api/v1/answers
  participant Auth as Clerk
  participant DB as Neon
  participant AI as Gemini

  App->>API: POST answer (transcript, clientAnswerKey, sessionId)
  API->>Auth: verify session → userId
  API->>API: zod validate · rate limit · resolve tenant
  API->>DB: ownership check (session is this user's?)
  alt duplicate clientAnswerKey
    API-->>App: stored result (idempotent)
  else new answer
    API->>DB: insert answer + transcript
    API->>AI: evaluate (JSON, timeout, retries)
    alt model ok & schema valid
      AI-->>API: structured evaluation
    else down / malformed
      API->>API: deterministic heuristic fallback
    end
    API->>DB: insert ai_feedback + model_usage_log
    API->>DB: append audit log (hash-chained)
    API-->>App: evaluation (source: model|heuristic)
  end
```

## Degraded-mode behaviour

```mermaid
flowchart LR
  R[answer submitted] --> Q{network?}
  Q -- offline --> L1[queue locally<br/>idempotent key]
  Q -- online --> A{AI reachable?}
  A -- yes --> M[model evaluation]
  A -- slow/down --> H[heuristic review now<br/>+ re-evaluate later]
  L1 -. on reconnect .-> A
```

## Module boundaries (apps/web)

| Layer            | Path                       | Responsibility                          |
| ---------------- | -------------------------- | --------------------------------------- |
| Route handlers   | `src/app/api/v1/*`         | HTTP, auth, validation, rate limit      |
| Auth context     | `src/lib/auth`             | Clerk → domain user + tenant resolution |
| AI service       | `src/lib/ai`               | prompts, client, schemas, fallback      |
| Data access      | `src/lib/db`               | Drizzle schema + tenant-scoped repos    |
| Security         | `src/lib/security`         | rate limit, hashing, redaction, audit   |
| Validation       | `src/lib/validation`       | shared Zod contracts                    |
| Site UI          | `src/app/(marketing)`, `src/components` | marketing pages + components |

## Key cross-cutting invariants

1. **Every user-scoped query carries `tenantId` + ownership** (ADR-0003).
2. **Every external boundary is Zod-validated.** Client input is never trusted.
3. **The AI call site is isolated** so evaluation can move to a queue later
   without touching callers (ADR-0002).
4. **No secrets or PII/audio content in logs** — `redact()` before logging.
