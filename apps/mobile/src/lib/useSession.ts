import { useCallback, useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import type { Api, EvaluationResult } from './api';
import { localEvaluate } from './local-eval';

/**
 * Voice-session state machine. Mirrors PRODUCT.md:
 *   idle → listening → processing → feedback   (with retry / error edges)
 *
 * Mic capture (expo-audio) is the one piece that needs a development build on a
 * real device; until then `captureTranscript` yields a representative answer so
 * the full pipeline — timing, evaluation, fallback, feedback UI — is exercisable.
 * Evaluation goes to the backend when available and degrades to an on-device
 * heuristic when offline or unconfigured, so the user is never blocked.
 */
export type SessionState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'feedback'
  | 'error';

export type SessionError = 'evaluation_failed' | 'no_speech';

interface UseSessionArgs {
  sessionId: string;
  questionPrompt: string;
  api?: Api | null;
  online?: boolean;
  /** Inject real ASR output here once device capture is wired. */
  captureTranscript?: () => string;
}

const SIMULATED_ANSWER =
  'Acute chest pain — my priority is to exclude life-threatening causes first. I would take a focused history, get an ECG within ten minutes, place the patient on a monitor, secure IV access, and send troponin. In parallel I would give aspirin if an acute coronary syndrome is suspected, and reassess after the ECG to decide on further management.';

export function useSession({
  sessionId,
  questionPrompt,
  api,
  online = true,
  captureTranscript,
}: UseSessionArgs) {
  const [state, setState] = useState<SessionState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<SessionError | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const startedAt = useRef<number>(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const answerKey = useRef<string>(Crypto.randomUUID());

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const start = useCallback(() => {
    setError(null);
    setResult(null);
    setUsedFallback(false);
    setElapsedMs(0);
    startedAt.current = Date.now();
    answerKey.current = Crypto.randomUUID();
    setState('listening');
    clearTimer();
    timer.current = setInterval(() => {
      setElapsedMs(Date.now() - startedAt.current);
    }, 100);
  }, [clearTimer]);

  const cancel = useCallback(() => {
    clearTimer();
    setState('idle');
    setElapsedMs(0);
  }, [clearTimer]);

  const stop = useCallback(async () => {
    clearTimer();
    const duration = Date.now() - startedAt.current;
    setState('processing');

    const transcript = (captureTranscript?.() ?? SIMULATED_ANSWER).trim();
    if (!transcript) {
      setError('no_speech');
      setState('error');
      return;
    }

    // Prefer the backend; fall back to on-device heuristic if offline/unconfigured.
    if (api && online) {
      const res = await api.submitAnswer({
        sessionId,
        clientAnswerKey: answerKey.current,
        questionPrompt,
        transcript,
        durationMs: duration,
      });
      if (res.ok) {
        setResult(res.data.result);
        setUsedFallback(res.data.result.source === 'heuristic');
        setState('feedback');
        return;
      }
      // Backend unreachable → graceful local review rather than a dead end.
      setResult(localEvaluate(transcript, duration));
      setUsedFallback(true);
      setState('feedback');
      return;
    }

    setResult(localEvaluate(transcript, duration));
    setUsedFallback(true);
    setState('feedback');
  }, [api, online, sessionId, questionPrompt, captureTranscript, clearTimer]);

  const retry = useCallback(() => {
    setResult(null);
    setError(null);
    start();
  }, [start]);

  /** Return to idle for the next question, clearing the previous result. */
  const reset = useCallback(() => {
    clearTimer();
    setResult(null);
    setError(null);
    setUsedFallback(false);
    setElapsedMs(0);
    setState('idle');
  }, [clearTimer]);

  return { state, elapsedMs, result, error, usedFallback, start, stop, cancel, retry, reset };
}
