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

/* ── Profile ──────────────────────────────────────────────────────────────── */
export const examFormat = z.enum([
  'oral_exam',
  'written_exam',
  'viva',
  'interview',
  'presentation',
  'language',
]);

export const updateProfileInput = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  goal: z
    .enum(['viva', 'interview', 'language', 'presentation', 'oral_exam'])
    .nullable()
    .optional(),
  level: z.enum(['intro', 'intermediate', 'advanced', 'expert']).optional(),
  fieldOfStudy: z.string().trim().min(1).max(80).nullable().optional(),
  studyLevel: z.enum(['school', 'undergrad', 'postgrad', 'professional']).nullable().optional(),
  examFormats: z.array(examFormat).max(6).optional(),
  subjectKeys: z.array(z.string().trim().min(1).max(60)).max(24).optional(),
  timezone: z.string().max(64).optional(),
  onboarded: z.boolean().optional(),
  examName: z.string().trim().min(1).max(60).nullable().optional(),
  examDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .nullable()
    .optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileInput>;

/* ── AI deck generation ───────────────────────────────────────────────────── */
export const generateDeckInput = z.object({
  topic: z.string().trim().min(3).max(120),
  count: z.number().int().min(4).max(8).default(6),
  // Optional pasted study material — questions are built from it when present.
  sourceText: z.string().trim().min(40).max(8000).optional(),
});
export type GenerateDeckInput = z.infer<typeof generateDeckInput>;

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

// Common audio MIME types Gemini accepts for inline transcription.
const audioMimeType = z.enum([
  'audio/mp4',
  'audio/aac',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/aiff',
  'audio/ogg',
  'audio/flac',
]);

export const submitAnswerInput = z
  .object({
    sessionId: z.string().uuid(),
    clientAnswerKey: z.string().min(8).max(64),
    questionId: z.string().uuid().nullable().optional(),
    questionPrompt: z.string().min(1).max(1000),
    // Provide a client-side transcript OR inline audio to be transcribed server-side.
    transcript: z.string().min(1).max(6000).optional(),
    audioBase64: z.string().min(1).max(9_000_000).optional(), // ~6.7MB audio
    audioMimeType: audioMimeType.optional(),
    durationMs: z.number().int().positive().max(15 * 60 * 1000).optional(),
    orderIndex: z.number().int().min(0).max(200).default(0),
  })
  .refine((v) => Boolean(v.transcript) || Boolean(v.audioBase64 && v.audioMimeType), {
    message: 'Provide either a transcript or audioBase64 with audioMimeType',
    path: ['transcript'],
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
