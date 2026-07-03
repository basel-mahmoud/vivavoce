import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, errors, parseBody } from '@/lib/http';
import { limiters } from '@/lib/security/ratelimit';
import { clientIp, hashIp } from '@/lib/security/hash';
import { evaluateAnswer } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Public landing-page demo: mark one short spoken/typed answer for real.
 * Hard-guarded because it spends AI tokens with no auth:
 *  - questions come from a server-side allowlist (no arbitrary prompts)
 *  - answers are length-capped, 4 req/hour/IP, nothing is stored.
 */
export const DEMO_QUESTIONS = [
  'Why do candidates who know the material still fail the viva?',
  'Explain, to a smart friend outside your field, what you are studying and why it matters.',
  'Tell me about a decision you defended under pressure. Walk me through your reasoning.',
] as const;

const demoInput = z.object({
  questionId: z.number().int().min(0).max(DEMO_QUESTIONS.length - 1),
  answer: z.string().trim().min(12).max(700),
});

export async function POST(req: NextRequest) {
  const ipHash = hashIp(clientIp(req.headers)) ?? 'anon';
  const rl = limiters.demoEval.check(ipHash);
  if (!rl.ok) return errors.tooMany(rl.resetMs);

  const parsed = await parseBody(req, demoInput);
  if (!parsed.ok) return parsed.response;

  const question = DEMO_QUESTIONS[parsed.data.questionId]!;
  const { evaluation, source } = await evaluateAnswer({
    mode: 'quick',
    question,
    transcript: parsed.data.answer,
  });

  // Compact, storage-free response: this is a taste of the product, not the product.
  return ok({
    source,
    scores: evaluation.scores,
    overall: evaluation.overall,
    weakestAxis: evaluation.weakestAxis,
    summary: evaluation.summary,
    improvements: evaluation.improvements.slice(0, 2),
  });
}
