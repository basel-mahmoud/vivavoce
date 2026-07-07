/**
 * VivaVoce relational schema (Neon Postgres via Drizzle).
 *
 * Conventions:
 *  - UUID primary keys (`gen_random_uuid()`).
 *  - Every tenant-scoped row carries `tenantId` for isolation + RLS.
 *  - User-generated content soft-deletes via `deletedAt`; operational/audit rows
 *    are append-only and never updated.
 *  - `createdAt`/`updatedAt` on mutable rows; timestamps are `timestamptz`.
 *
 * The trust model and RLS policy live in scripts/apply-rls.ts and docs/SECURITY.md.
 */
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  real,
  boolean,
  jsonb,
  timestamp,
  date,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

/* ─────────────────────────────── enums ──────────────────────────────────── */

export const roleEnum = pgEnum('role', ['learner', 'coach', 'org_admin']);
export const goalEnum = pgEnum('goal', [
  'viva',
  'interview',
  'language',
  'presentation',
  'oral_exam',
]);
export const difficultyEnum = pgEnum('difficulty', [
  'intro',
  'intermediate',
  'advanced',
  'expert',
]);
export const sessionModeEnum = pgEnum('session_mode', [
  'quick',
  'mock_viva',
  'interview',
  'flash_recall',
  'explain',
  'rapid_fire',
]);
export const sessionStatusEnum = pgEnum('session_status', [
  'active',
  'completed',
  'abandoned',
]);
export const answerStatusEnum = pgEnum('answer_status', [
  'recording',
  'transcribing',
  'transcribed',
  'evaluating',
  'evaluated',
  'failed',
]);
export const feedbackStatusEnum = pgEnum('feedback_status', [
  'pending',
  'ready',
  'failed',
]);
export const consentTypeEnum = pgEnum('consent_type', [
  'audio_processing',
  'ai_evaluation',
  'data_retention',
  'marketing',
]);
export const notificationTypeEnum = pgEnum('notification_type', [
  'reminder',
  'streak',
  'schedule',
  'system',
]);
export const deletionStatusEnum = pgEnum('deletion_status', [
  'requested',
  'processing',
  'completed',
  'cancelled',
]);
export const waitlistStatusEnum = pgEnum('waitlist_status', [
  'pending',
  'confirmed',
  'invited',
]);
export const deckSourceEnum = pgEnum('deck_source', ['user', 'system', 'imported']);

/* ─────────────────────────────── tenancy ────────────────────────────────── */

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    kind: text('kind').notNull().default('personal'), // 'personal' | 'organization'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('tenants_slug_uq').on(t.slug)],
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkUserId: text('clerk_user_id').notNull(),
    email: text('email').notNull(),
    displayName: text('display_name'),
    // Personal tenant every user gets on first sign-in.
    primaryTenantId: uuid('primary_tenant_id').references(() => tenants.id, {
      onDelete: 'set null',
    }),
    goal: goalEnum('goal'),
    level: difficultyEnum('level').default('intermediate'),
    // Profile calibration captured at onboarding.
    fieldOfStudy: text('field_of_study'),
    studyLevel: text('study_level'), // school | undergrad | postgrad | professional
    examFormats: jsonb('exam_formats').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    subjectKeys: jsonb('subject_keys').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    locale: text('locale').notNull().default('en'),
    onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
    timezone: text('timezone').notNull().default('UTC'),
    // The exam this user is counting down to (drives the Home countdown tile).
    examName: text('exam_name'),
    examDate: date('exam_date'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('users_clerk_uq').on(t.clerkUserId),
    index('users_email_idx').on(t.email),
  ],
);

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull().default('learner'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('memberships_tenant_user_uq').on(t.tenantId, t.userId),
    index('memberships_user_idx').on(t.userId),
  ],
);

/* ─────────────────────────────── content ────────────────────────────────── */

export const subjects = pgTable(
  'subjects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    color: text('color'),
    isSystem: boolean('is_system').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('subjects_tenant_slug_uq').on(t.tenantId, t.slug),
    index('subjects_tenant_idx').on(t.tenantId),
  ],
);

export const decks = pgTable(
  'decks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id').references(() => subjects.id, {
      onDelete: 'set null',
    }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    difficulty: difficultyEnum('difficulty').notNull().default('intermediate'),
    source: deckSourceEnum('source').notNull().default('user'),
    tags: jsonb('tags').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('decks_tenant_idx').on(t.tenantId),
    index('decks_owner_idx').on(t.ownerId),
    index('decks_subject_idx').on(t.subjectId),
  ],
);

export const questions = pgTable(
  'questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    deckId: uuid('deck_id')
      .notNull()
      .references(() => decks.id, { onDelete: 'cascade' }),
    prompt: text('prompt').notNull(),
    // Optional rubric/reference points the evaluator may use, never shown raw.
    referencePoints: jsonb('reference_points').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    difficulty: difficultyEnum('difficulty').notNull().default('intermediate'),
    tags: jsonb('tags').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    // Spaced-repetition / weakness reinforcement bookkeeping per question.
    timesAsked: integer('times_asked').notNull().default(0),
    lastAskedAt: timestamp('last_asked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('questions_deck_idx').on(t.deckId),
    index('questions_tenant_idx').on(t.tenantId),
  ],
);

/* ─────────────────────────────── sessions ───────────────────────────────── */

export const practiceSessions = pgTable(
  'practice_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deckId: uuid('deck_id').references(() => decks.id, { onDelete: 'set null' }),
    mode: sessionModeEnum('mode').notNull(),
    status: sessionStatusEnum('status').notNull().default('active'),
    // Idempotency key supplied by the client so a retried "start" can't double-create.
    clientSessionKey: text('client_session_key'),
    questionCount: integer('question_count').notNull().default(0),
    overallScore: integer('overall_score'), // 0..100 once completed
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('sessions_user_idx').on(t.userId),
    index('sessions_tenant_idx').on(t.tenantId),
    uniqueIndex('sessions_client_key_uq').on(t.userId, t.clientSessionKey),
  ],
);

export const answers = pgTable(
  'answers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => practiceSessions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id').references(() => questions.id, {
      onDelete: 'set null',
    }),
    // For adaptive/generated questions not tied to a stored question row:
    questionPrompt: text('question_prompt').notNull(),
    orderIndex: integer('order_index').notNull().default(0),
    status: answerStatusEnum('status').notNull().default('recording'),
    // Idempotency: client assigns this before upload; retried uploads dedupe.
    clientAnswerKey: text('client_answer_key'),
    // Audio is referenced, never inlined. Storage key in object store (if retained).
    audioStorageKey: text('audio_storage_key'),
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('answers_session_idx').on(t.sessionId),
    index('answers_user_idx').on(t.userId),
    uniqueIndex('answers_client_key_uq').on(t.userId, t.clientAnswerKey),
  ],
);

export const transcripts = pgTable(
  'transcripts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    answerId: uuid('answer_id')
      .notNull()
      .references(() => answers.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    language: text('language').notNull().default('en'),
    wordCount: integer('word_count'),
    confidence: real('confidence'), // 0..1 ASR confidence if available
    isPartial: boolean('is_partial').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('transcripts_answer_uq').on(t.answerId)],
);

export const aiFeedback = pgTable(
  'ai_feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    answerId: uuid('answer_id')
      .notNull()
      .references(() => answers.id, { onDelete: 'cascade' }),
    status: feedbackStatusEnum('status').notNull().default('pending'),
    // Five-axis rubric (0..100 each).
    scoreCorrectness: integer('score_correctness'),
    scoreClarity: integer('score_clarity'),
    scoreStructure: integer('score_structure'),
    scoreConciseness: integer('score_conciseness'),
    scoreConfidence: integer('score_confidence'),
    overallScore: integer('overall_score'),
    // Derived delivery signals.
    fillerWordRate: real('filler_word_rate'),
    wordsPerMinute: integer('words_per_minute'),
    summary: text('summary'),
    strengths: jsonb('strengths').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    improvements: jsonb('improvements').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    improvedAnswer: text('improved_answer'),
    suggestedFollowUp: text('suggested_follow_up'),
    weakestAxis: text('weakest_axis'),
    promptVersionId: uuid('prompt_version_id'),
    modelUsageId: uuid('model_usage_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('ai_feedback_answer_uq').on(t.answerId),
    index('ai_feedback_tenant_idx').on(t.tenantId),
  ],
);

/* ─────────────────────────── scheduling & streaks ───────────────────────── */

export const schedules = pgTable(
  'schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    mode: sessionModeEnum('mode'),
    deckId: uuid('deck_id').references(() => decks.id, { onDelete: 'set null' }),
    // RRULE-like cadence stored as structured JSON (days, time, tz).
    cadence: jsonb('cadence').$type<{
      days: number[];
      time: string;
      timezone: string;
    }>(),
    examDate: date('exam_date'),
    nextRunAt: timestamp('next_run_at', { withTimezone: true }),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('schedules_user_idx').on(t.userId)],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    readAt: timestamp('read_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('notifications_user_idx').on(t.userId, t.readAt)],
);

export const streaks = pgTable(
  'streaks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    current: integer('current').notNull().default(0),
    longest: integer('longest').notNull().default(0),
    lastPracticedOn: date('last_practiced_on'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('streaks_user_uq').on(t.userId)],
);

/* daily per-user rollups for fast analytics (denormalized, recomputable). */
export const analyticsDaily = pgTable(
  'analytics_daily',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    day: date('day').notNull(),
    sessionsCount: integer('sessions_count').notNull().default(0),
    answersCount: integer('answers_count').notNull().default(0),
    practiceMinutes: integer('practice_minutes').notNull().default(0),
    avgOverall: real('avg_overall'),
    avgConfidence: real('avg_confidence'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('analytics_daily_user_day_uq').on(t.userId, t.day)],
);

/* ─────────────────────────── governance & audit ─────────────────────────── */

export const consents = pgTable(
  'consents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: consentTypeEnum('type').notNull(),
    granted: boolean('granted').notNull(),
    policyVersion: text('policy_version').notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ipHash: text('ip_hash'), // hashed, never raw IP
  },
  (t) => [index('consents_user_type_idx').on(t.userId, t.type)],
);

export const deletionRequests = pgTable(
  'deletion_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: deletionStatusEnum('status').notNull().default('requested'),
    reason: text('reason'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    // Honour window: hard delete runs after this date unless cancelled.
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [index('deletion_requests_status_idx').on(t.status)],
);

/* append-only audit trail; never updated, never deleted by app code. */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id'),
    actorUserId: uuid('actor_user_id'),
    actorType: text('actor_type').notNull().default('user'), // user | system | admin
    action: text('action').notNull(),
    resourceType: text('resource_type'),
    resourceId: text('resource_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    ipHash: text('ip_hash'),
    // Hash chain for tamper-evidence: hash(prevHash + row payload).
    prevHash: text('prev_hash'),
    entryHash: text('entry_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_logs_tenant_idx').on(t.tenantId),
    index('audit_logs_action_idx').on(t.action),
    index('audit_logs_created_idx').on(t.createdAt),
  ],
);

/* ───────────────────────────── AI governance ────────────────────────────── */

export const promptVersions = pgTable(
  'prompt_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull(), // e.g. 'evaluate_answer'
    version: integer('version').notNull(),
    template: text('template').notNull(),
    notes: text('notes'),
    active: boolean('active').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('prompt_versions_key_version_uq').on(t.key, t.version)],
);

/* one row per model call for cost/latency/abuse observability. */
export const modelUsageLogs = pgTable(
  'model_usage_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id'),
    userId: uuid('user_id'),
    task: text('task').notNull(), // 'evaluate' | 'generate_question' | 'summarize'
    model: text('model').notNull(),
    promptVersionId: uuid('prompt_version_id'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    latencyMs: integer('latency_ms'),
    status: text('status').notNull(), // 'ok' | 'timeout' | 'error' | 'fallback'
    errorCode: text('error_code'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('model_usage_user_idx').on(t.userId),
    index('model_usage_created_idx').on(t.createdAt),
  ],
);

/* ───────────────────────────── website leads ────────────────────────────── */

export const waitlistLeads = pgTable(
  'waitlist_leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    persona: text('persona'), // student | interview | language | presentation | other
    referrer: text('referrer'),
    utmSource: text('utm_source'),
    status: waitlistStatusEnum('status').notNull().default('pending'),
    ipHash: text('ip_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    invitedAt: timestamp('invited_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('waitlist_email_uq').on(t.email)],
);

/* ─────────────────────────────── relations ──────────────────────────────── */

export const usersRelations = relations(users, ({ one, many }) => ({
  primaryTenant: one(tenants, {
    fields: [users.primaryTenantId],
    references: [tenants.id],
  }),
  memberships: many(memberships),
  sessions: many(practiceSessions),
  streak: one(streaks),
}));

export const sessionsRelations = relations(practiceSessions, ({ one, many }) => ({
  user: one(users, { fields: [practiceSessions.userId], references: [users.id] }),
  deck: one(decks, { fields: [practiceSessions.deckId], references: [decks.id] }),
  answers: many(answers),
}));

export const answersRelations = relations(answers, ({ one }) => ({
  session: one(practiceSessions, {
    fields: [answers.sessionId],
    references: [practiceSessions.id],
  }),
  transcript: one(transcripts),
  feedback: one(aiFeedback),
}));

export const decksRelations = relations(decks, ({ one, many }) => ({
  subject: one(subjects, { fields: [decks.subjectId], references: [subjects.id] }),
  owner: one(users, { fields: [decks.ownerId], references: [users.id] }),
  questions: many(questions),
}));
