'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

/** The part of the Web Speech API this page uses (not in every lib.dom). */
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noop = () => () => {};

/** Speech to text exists here. False while hydrating, so the first render matches the server's. */
export function useSpeechSupported(): boolean {
  return useSyncExternalStore(noop, () => ctor() !== null, () => false);
}

export type SpeechFailure = 'denied' | 'no-mic' | 'no-speech' | 'unsupported';

export interface SpeechHandlers {
  /** The whole take so far: settled words, and words still being recognised. */
  onText: (final: string, interim: string) => void;
  /** Recognition is running (the microphone is open). */
  onStart: () => void;
  onFailure: (reason: SpeechFailure) => void;
}

/**
 * Web Speech recognition for one take at a time. Continuous with interim results; if the browser
 * ends a session on its own mid-answer (Chrome does after a pause), it quietly starts another and
 * keeps the words it already had. The audio goes to the browser's recogniser only: this page never
 * records or sends it.
 */
export function useSpeech(handlers: SpeechHandlers) {
  const rec = useRef<Recognition | null>(null);
  const wanted = useRef(false);
  /** Words from sessions the browser has closed mid-answer, and from the open one. */
  const kept = useRef('');
  const session = useRef('');
  const started = useRef(false);
  const h = useRef(handlers);
  useEffect(() => {
    h.current = handlers;
  });

  const spawn = useCallback((): boolean => {
    const Ctor = ctor();
    if (!Ctor) return false;
    const r = new Ctor();
    const lang = typeof navigator !== 'undefined' && /^en\b/i.test(navigator.language) ? navigator.language : 'en-US';
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.onstart = () => {
      if (!started.current) {
        started.current = true;
        h.current.onStart();
      }
    };
    r.onresult = (e) => {
      // Rebuild the take from the session's whole result list on every event (finals never
      // repeat or go missing, whatever resultIndex a browser reports), after the words kept
      // from sessions the browser already closed.
      let settled = '';
      let interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i]!;
        const words = res[0].transcript.trim();
        if (!words) continue;
        if (res.isFinal) settled += `${words} `;
        else interim += `${words} `;
      }
      session.current = settled;
      h.current.onText(`${kept.current}${settled}`.trim(), interim.trim());
    };
    r.onerror = (e) => {
      const reason = e?.error;
      if (reason === 'aborted') return;
      if (reason === 'no-speech') {
        // silence: let onend decide whether to keep listening
        if (!`${kept.current}${session.current}`.trim()) h.current.onFailure('no-speech');
        return;
      }
      wanted.current = false;
      h.current.onFailure(
        reason === 'not-allowed' || reason === 'service-not-allowed' ? 'denied' : reason === 'audio-capture' ? 'no-mic' : 'unsupported',
      );
    };
    r.onend = () => {
      if (rec.current !== r) return;
      kept.current += session.current;
      session.current = '';
      if (wanted.current) {
        // the browser closed the session mid-answer: open another, keep the words
        try {
          r.start();
          return;
        } catch {
          wanted.current = false;
        }
      }
      rec.current = null;
    };
    try {
      r.start();
    } catch {
      return false;
    }
    rec.current = r;
    return true;
  }, []);

  const start = useCallback((): boolean => {
    rec.current?.abort();
    rec.current = null;
    kept.current = '';
    session.current = '';
    started.current = false;
    wanted.current = true;
    const ok = spawn();
    if (!ok) wanted.current = false;
    return ok;
  }, [spawn]);

  /** Stop listening. Whatever was recognised has already been reported. */
  const stop = useCallback(() => {
    wanted.current = false;
    const r = rec.current;
    rec.current = null;
    if (!r) return;
    r.onresult = null;
    try {
      r.stop();
    } catch {
      r.abort();
    }
  }, []);

  useEffect(
    () => () => {
      wanted.current = false;
      rec.current?.abort();
      rec.current = null;
    },
    [],
  );

  return { start, stop };
}
