/**
 * High-level AI service. Callers use these functions, never the raw client.
 * Responsibilities: render versioned prompts, call Gemini, validate structured
 * output, fall back deterministically, and emit a usage record for every call.
 */
import { generateContent, extractJson } from './gemini';
import {
  EVALUATE_ANSWER_PROMPT,
  GENERATE_QUESTION_PROMPT,
  renderPrompt,
} from './prompts';
import { evaluationSchema, generatedQuestionSchema, type Evaluation, type GeneratedQuestion } from './schemas';
import { heuristicEvaluation } from './fallback';

export interface UsageRecord {
  task: 'evaluate' | 'generate_question';
  model: string;
  status: 'ok' | 'timeout' | 'error' | 'fallback' | 'not_configured';
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  errorCode?: string;
}

export interface EvaluateInput {
  mode: string;
  question: string;
  referencePoints?: string[];
  transcript: string;
  wpm?: number | null;
}

export interface EvaluateOutput {
  evaluation: Evaluation;
  source: 'model' | 'heuristic';
  usage: UsageRecord;
}

/** Never throws — always returns a usable evaluation (model or heuristic). */
export async function evaluateAnswer(input: EvaluateInput): Promise<EvaluateOutput> {
  const prompt = renderPrompt(EVALUATE_ANSWER_PROMPT, {
    mode: input.mode,
    question: input.question,
    referencePoints: input.referencePoints ?? [],
    transcript: input.transcript.slice(0, 6000), // bound input → cost & abuse
    wpm: input.wpm ?? null,
  });

  const res = await generateContent(prompt, { json: true, temperature: 0.3, maxOutputTokens: 1200 });
  const baseUsage: UsageRecord = {
    task: 'evaluate',
    model: res.model,
    status: res.status === 'ok' ? 'ok' : res.status,
    latencyMs: res.latencyMs,
    inputTokens: res.inputTokens,
    outputTokens: res.outputTokens,
    errorCode: res.errorCode,
  };

  if (res.status === 'ok') {
    const parsed = evaluationSchema.safeParse(extractJson(res.text));
    if (parsed.success) {
      return { evaluation: parsed.data, source: 'model', usage: baseUsage };
    }
    baseUsage.status = 'fallback';
    baseUsage.errorCode = 'schema_mismatch';
  } else if (res.status !== 'not_configured') {
    baseUsage.status = 'fallback';
  }

  return {
    evaluation: heuristicEvaluation(input.transcript, input.wpm ?? null),
    source: 'heuristic',
    usage: { ...baseUsage, status: baseUsage.status === 'ok' ? 'fallback' : baseUsage.status },
  };
}

export interface TranscribeOutput {
  transcript: string | null;
  usage: UsageRecord;
}

const TRANSCRIBE_PROMPT =
  'Transcribe this spoken answer verbatim into plain text. Return only the transcript, with no commentary, labels, or quotation marks. If there is no discernible speech, return an empty string.';

/** Transcribe inline audio via Gemini (multimodal). Never throws; returns null
 *  transcript on failure so the caller can surface a retry. */
export async function transcribeAudio(
  audioBase64: string,
  mimeType: string,
): Promise<TranscribeOutput> {
  const res = await generateContent(TRANSCRIBE_PROMPT, {
    audio: { data: audioBase64, mimeType },
    temperature: 0,
    maxOutputTokens: 1024,
    retries: 2,
  });
  const usage: UsageRecord = {
    task: 'evaluate', // usage table groups by task; transcription is part of the eval flow
    model: res.model,
    status: res.status === 'ok' ? 'ok' : res.status,
    latencyMs: res.latencyMs,
    inputTokens: res.inputTokens,
    outputTokens: res.outputTokens,
    errorCode: res.errorCode,
  };
  const transcript = res.status === 'ok' ? (res.text ?? '').trim() : null;
  return { transcript: transcript && transcript.length > 0 ? transcript : null, usage };
}

export interface GenerateQuestionInput {
  mode: string;
  topic: string;
  difficulty: string;
  recent?: string[];
  weakness?: string | null;
}

export interface GenerateQuestionOutput {
  question: GeneratedQuestion | null;
  usage: UsageRecord;
}

export async function generateQuestion(
  input: GenerateQuestionInput,
): Promise<GenerateQuestionOutput> {
  const prompt = renderPrompt(GENERATE_QUESTION_PROMPT, {
    mode: input.mode,
    topic: input.topic,
    difficulty: input.difficulty,
    recent: input.recent ?? [],
    weakness: input.weakness ?? null,
  });

  const res = await generateContent(prompt, { json: true, temperature: 0.8, maxOutputTokens: 400 });
  const usage: UsageRecord = {
    task: 'generate_question',
    model: res.model,
    status: res.status === 'ok' ? 'ok' : res.status,
    latencyMs: res.latencyMs,
    inputTokens: res.inputTokens,
    outputTokens: res.outputTokens,
    errorCode: res.errorCode,
  };

  if (res.status === 'ok') {
    const parsed = generatedQuestionSchema.safeParse(extractJson(res.text));
    if (parsed.success) return { question: parsed.data, usage };
    usage.status = 'fallback';
    usage.errorCode = 'schema_mismatch';
  }
  return { question: null, usage };
}

export type { Evaluation, GeneratedQuestion };
