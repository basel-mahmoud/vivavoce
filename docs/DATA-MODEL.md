# Data model

Neon Postgres via Drizzle. Source of truth: [`apps/web/src/lib/db/schema.ts`](../apps/web/src/lib/db/schema.ts).
Conventions: UUID PKs, `timestamptz`, soft delete (`deletedAt`) on user content,
append-only audit/usage rows, `tenantId` on every tenant-scoped table.

## ERD (core)

```mermaid
erDiagram
  tenants ||--o{ memberships : has
  users ||--o{ memberships : in
  tenants ||--o{ subjects : owns
  subjects ||--o{ decks : groups
  users ||--o{ decks : authors
  decks ||--o{ questions : contains
  users ||--o{ practice_sessions : runs
  practice_sessions ||--o{ answers : has
  answers ||--|| transcripts : produces
  answers ||--|| ai_feedback : scored_by
  users ||--o{ schedules : plans
  users ||--o{ notifications : receives
  users ||--|| streaks : tracks
  users ||--o{ analytics_daily : rolls_up
  users ||--o{ consents : grants
  users ||--o{ deletion_requests : files
  prompt_versions ||--o{ ai_feedback : versions
  model_usage_logs }o--|| ai_feedback : measured_by

  tenants { uuid id PK; text slug UK; text kind }
  users { uuid id PK; text clerk_user_id UK; text email; uuid primary_tenant_id FK }
  practice_sessions { uuid id PK; uuid tenant_id FK; uuid user_id FK; enum mode; enum status; text client_session_key }
  answers { uuid id PK; uuid session_id FK; enum status; text client_answer_key; text audio_storage_key }
  ai_feedback { uuid id PK; uuid answer_id FK; int overall_score; text weakest_axis }
  audit_logs { uuid id PK; text action; text prev_hash; text entry_hash }
  waitlist_leads { uuid id PK; text email UK; enum status }
```

## Table groups

- **Tenancy** — `tenants`, `users`, `memberships` (role per tenant).
- **Content** — `subjects`, `decks`, `questions` (with spaced-repetition counters).
- **Sessions** — `practice_sessions`, `answers`, `transcripts`, `ai_feedback`.
- **Engagement** — `schedules`, `notifications`, `streaks`, `analytics_daily`.
- **Governance** — `consents`, `deletion_requests`, `audit_logs` (hash-chained).
- **AI** — `prompt_versions`, `model_usage_logs`.
- **Marketing** — `waitlist_leads`.

## Integrity & performance

- **Idempotency:** `practice_sessions(user_id, client_session_key)` and
  `answers(user_id, client_answer_key)` are unique → safe retries.
- **One-to-one:** `transcripts.answer_id` and `ai_feedback.answer_id` are unique.
- **Indexes:** every FK used in list/lookup paths (`*_user_idx`, `*_tenant_idx`,
  `*_session_idx`), plus `audit_logs(created_at)` and `model_usage(created_at)`
  for time-range analytics.
- **Cascades:** deleting a tenant/user/session cascades to dependent rows;
  optional links (`deck`, `question`) use `set null` so history survives content
  deletion.

## Soft vs hard delete

User content (`tenants`, `users`, `subjects`, `decks`, `questions`) soft-deletes
via `deletedAt` so accidental deletes are recoverable and analytics stay sane.
Right-to-be-forgotten (`deletion_requests`) performs a **hard** delete of personal
data on a scheduled sweep; audit rows are retained in minimised form. See
[COMPLIANCE.md](COMPLIANCE.md).

## Migrations

```bash
npm run db:generate   # diff schema.ts → ./drizzle SQL
npm run db:migrate    # apply (direct connection, owner role)
npm run db:seed       # idempotent starter content + prompt versions
npm run db:rls        # least-privilege app role + RLS policies
```
