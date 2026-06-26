import { z } from 'zod';

/**
 * Shared API contracts. These Zod schemas are the single definition of every
 * request/response shape; the mobile client mirrors them and re-validates on
 * its side. Documented in docs/API.md.
 */

/* ── Waitlist ─────────────────────────────────────────────────────────────── */
export const waitlistInput = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  persona: z
    .enum(['student', 'interview', 'language', 'presentation', 'other'])
    .optional(),
  referrer: z.string().max(2048).optional(),
  utmSource: z.string().max(128).optional(),
  // Honeypot: real users never fill this. Must be empty.
  company: z.string().max(0).optional().or(z.literal('')),
});
export type WaitlistInput = z.infer<typeof waitlistInput>;

/* ── Sessions ─────────────────────────────────────────────────────────────── */
export const sessionMode = z.enum([
  'quick',
  'mock_viva',
  'interview',
  'flash_recall',
  'explain',
  'rapid_fire',
]);

export const startSessionInput = z.object({
  mode: sessionMode,
  deckId: z.string().uuid().nullable().optional(),
  // Client-generated idempotency key (prevents double-create on retry).
  clientSessionKey: z.string().min(8).max(64),
});
export type StartSessionInput = z.infer<typeof startSessionInput>;

export const submitAnswerInput = z.object({
  sessionId: z.string().uuid(),
  clientAnswerKey: z.string().min(8).max(64),
  questionId: z.string().uuid().nullable().optional(),
  questionPrompt: z.string().min(1).max(1000),
  transcript: z.string().min(1).max(6000),
  durationMs: z.number().int().positive().max(15 * 60 * 1000).optional(),
  orderIndex: z.number().int().min(0).max(200).default(0),
});
export type SubmitAnswerInput = z.infer<typeof submitAnswerInput>;

export const evaluationResponse = z.object({
  answerId: z.string().uuid(),
  source: z.enum(['model', 'heuristic']),
  scores: z.object({
    correctness: z.number(),
    clarity: z.number(),
    structure: z.number(),
    conciseness: z.number(),
    confidence: z.number(),
  }),
  overall: z.number(),
  weakestAxis: z.string(),
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  improvedAnswer: z.string(),
  suggestedFollowUp: z.string(),
  fillerWordRate: z.number().nullable(),
  wordsPerMinute: z.number().nullable(),
});
export type EvaluationResponse = z.infer<typeof evaluationResponse>;
