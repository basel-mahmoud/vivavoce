import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/auth/context';
import { ok, errors, parseBody } from '@/lib/http';
import { submitAnswerInput, type EvaluationResponse } from '@/lib/validation/contracts';
import { limiters } from '@/lib/security/ratelimit';
import { audit } from '@/lib/security/audit';
import { db, schema } from '@/lib/db/client';
import { getOwnedSession, findAnswerByClientKey } from '@/lib/db/sessions.repo';
import { evaluateAnswer, transcribeAudio } from '@/lib/ai';
import { estimateWpm } from '@/lib/ai/fallback';

export const runtime = 'nodejs';
export const maxDuration = 30; // allow time for the model call

/**
 * Submit a spoken answer (transcript provided by the client's ASR or typed),
 * evaluate it, and persist transcript + feedback. Idempotent by clientAnswerKey
 * so a flaky-network retry never double-charges the model or double-writes.
 * Never fails the user: evaluateAnswer falls back to a heuristic if AI is down.
 */
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return errors.unauthorized();

  const rl = limiters.evaluate.check(ctx.userId);
  if (!rl.ok) return errors.tooMany(rl.resetMs);

  const parsed = await parseBody(req, submitAnswerInput);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  // Ownership: the session must belong to this caller (tenant + user scoped).
  const session = await getOwnedSession(ctx.tenantId, ctx.userId, input.sessionId);
  if (!session) return errors.notFound();

  // Idempotency: return the already-stored result for a repeated submission.
  const dup = await findAnswerByClientKey(ctx.userId, input.clientAnswerKey);
  if (dup) {
    const [fb] = await db
      .select()
      .from(schema.aiFeedback)
      .where(eqAnswer(dup.id))
      .limit(1);
    if (fb) return ok({ result: toResponse(dup.id, fb), idempotent: true });
  }

  // 0. Resolve the transcript: use the client's, or transcribe audio via Gemini.
  let transcript = input.transcript?.trim() ?? '';
  if (!transcript && input.audioBase64 && input.audioMimeType) {
    const t = await transcribeAudio(input.audioBase64, input.audioMimeType);
    if (!t.transcript) {
      // Transcription failed or no speech — surface a retry, don't store an empty answer.
      return errors.badRequest('We could not transcribe that audio. Please try again.', {
        transcript: 'transcription_failed',
      });
    }
    transcript = t.transcript;
    await db.insert(schema.modelUsageLogs).values({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      task: 'transcribe',
      model: t.usage.model,
      latencyMs: t.usage.latencyMs,
      status: t.usage.status,
      errorCode: t.usage.errorCode ?? null,
    });
  }

  const wpm = estimateWpm(input.durationMs ?? null, transcript);

  // 1. Persist the answer (transcribed) + transcript.
  const [answer] = await db
    .insert(schema.answers)
    .values({
      tenantId: ctx.tenantId,
      sessionId: session.id,
      userId: ctx.userId,
      questionId: input.questionId ?? null,
      questionPrompt: input.questionPrompt,
      orderIndex: input.orderIndex,
      status: 'evaluating',
      clientAnswerKey: input.clientAnswerKey,
      durationMs: input.durationMs ?? null,
    })
    .returning();

  await db.insert(schema.transcripts).values({
    tenantId: ctx.tenantId,
    answerId: answer!.id,
    text: transcript,
    wordCount: transcript.split(/\s+/).filter(Boolean).length,
  });

  // 2. Evaluate (never throws).
  const { evaluation, source, usage } = await evaluateAnswer({
    mode: session.mode,
    question: input.questionPrompt,
    transcript,
    wpm,
  });

  // 3. Record model usage (cost/latency/abuse observability).
  const [usageRow] = await db
    .insert(schema.modelUsageLogs)
    .values({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      task: 'evaluate',
      model: usage.model,
      inputTokens: usage.inputTokens ?? null,
      outputTokens: usage.outputTokens ?? null,
      latencyMs: usage.latencyMs,
      status: usage.status,
      errorCode: usage.errorCode ?? null,
    })
    .returning();

  // 4. Persist feedback.
  await db
    .insert(schema.aiFeedback)
    .values({
      tenantId: ctx.tenantId,
      answerId: answer!.id,
      status: 'ready',
      scoreCorrectness: evaluation.scores.correctness,
      scoreClarity: evaluation.scores.clarity,
      scoreStructure: evaluation.scores.structure,
      scoreConciseness: evaluation.scores.conciseness,
      scoreConfidence: evaluation.scores.confidence,
      overallScore: evaluation.overall,
      fillerWordRate: evaluation.fillerWordRate,
      wordsPerMinute: wpm,
      summary: evaluation.summary,
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      improvedAnswer: evaluation.improvedAnswer,
      suggestedFollowUp: evaluation.suggestedFollowUp,
      weakestAxis: evaluation.weakestAxis,
      modelUsageId: usageRow!.id,
    })
    .returning();

  await db
    .update(schema.answers)
    .set({ status: 'evaluated', updatedAt: new Date() })
    .where(eqId(answer!.id));

  await audit({
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    action: 'answer.evaluated',
    resourceType: 'answer',
    resourceId: answer!.id,
    metadata: { source, overall: evaluation.overall, model: usage.model },
  });

  return ok(
    {
      result: {
        answerId: answer!.id,
        source,
        scores: evaluation.scores,
        overall: evaluation.overall,
        weakestAxis: evaluation.weakestAxis,
        summary: evaluation.summary,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        improvedAnswer: evaluation.improvedAnswer,
        suggestedFollowUp: evaluation.suggestedFollowUp,
        fillerWordRate: evaluation.fillerWordRate,
        wordsPerMinute: wpm,
      } satisfies EvaluationResponse,
      idempotent: false,
    },
    { status: 201 },
  );
}

/* ── small local helpers to keep drizzle `eq` imports tidy ─────────────────── */
import { eq } from 'drizzle-orm';
function eqAnswer(answerId: string) {
  return eq(schema.aiFeedback.answerId, answerId);
}
function eqId(answerId: string) {
  return eq(schema.answers.id, answerId);
}

function toResponse(
  answerId: string,
  fb: typeof schema.aiFeedback.$inferSelect,
): EvaluationResponse {
  return {
    answerId,
    source: 'model',
    scores: {
      correctness: fb.scoreCorrectness ?? 0,
      clarity: fb.scoreClarity ?? 0,
      structure: fb.scoreStructure ?? 0,
      conciseness: fb.scoreConciseness ?? 0,
      confidence: fb.scoreConfidence ?? 0,
    },
    overall: fb.overallScore ?? 0,
    weakestAxis: fb.weakestAxis ?? 'structure',
    summary: fb.summary ?? '',
    strengths: fb.strengths,
    improvements: fb.improvements,
    improvedAnswer: fb.improvedAnswer ?? '',
    suggestedFollowUp: fb.suggestedFollowUp ?? '',
    fillerWordRate: fb.fillerWordRate ?? null,
    wordsPerMinute: fb.wordsPerMinute ?? null,
  };
}
