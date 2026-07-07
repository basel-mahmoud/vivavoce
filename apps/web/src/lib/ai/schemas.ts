import { z } from 'zod';

/** Structured-output contracts. Model responses are parsed against these; any
 *  drift is caught and triggers the repair/fallback path rather than corrupting
 *  the database. Scores clamp to 0..100. */

const score = z.coerce.number().int().min(0).max(100);

export const evaluationSchema = z.object({
  scores: z.object({
    correctness: score,
    clarity: score,
    structure: score,
    conciseness: score,
    confidence: score,
  }),
  overall: score,
  weakestAxis: z.enum([
    'correctness',
    'clarity',
    'structure',
    'conciseness',
    'confidence',
  ]),
  summary: z.string().min(1).max(600),
  strengths: z.array(z.string().min(1)).max(6).default([]),
  improvements: z.array(z.string().min(1)).max(6).default([]),
  improvedAnswer: z.string().min(1).max(2000),
  suggestedFollowUp: z.string().min(1).max(400),
  fillerWordRate: z.coerce.number().min(0).max(1).nullable().default(null),
});

export type Evaluation = z.infer<typeof evaluationSchema>;

export const generatedQuestionSchema = z.object({
  prompt: z.string().min(4).max(600),
  referencePoints: z.array(z.string().min(1)).max(8).default([]),
});

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

export const generatedDeckSchema = z.object({
  title: z.string().min(3).max(80),
  description: z.string().min(3).max(220),
  difficulty: z.enum(['intro', 'intermediate', 'advanced', 'expert']),
  questions: z.array(generatedQuestionSchema).min(4).max(8),
});

export type GeneratedDeck = z.infer<typeof generatedDeckSchema>;
