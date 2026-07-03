'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Mic, Square, RefreshCcw, ArrowRight } from 'lucide-react';
import Link from 'next/link';

/** Minimal typing for the Web Speech API (not in lib.dom for all targets). */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
}

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

const QUESTIONS = [
  'Why do candidates who know the material still fail the viva?',
  'Explain, to a smart friend outside your field, what you are studying and why it matters.',
  'Tell me about a decision you defended under pressure. Walk me through your reasoning.',
];

const AXES = [
  ['correctness', 'Correctness'],
  ['clarity', 'Clarity'],
  ['structure', 'Structure'],
  ['conciseness', 'Conciseness'],
  ['confidence', 'Confidence'],
] as const;

interface DemoResult {
  source: 'model' | 'heuristic';
  scores: Record<string, number>;
  overall: number;
  weakestAxis: string;
  summary: string;
  improvements: string[];
}

type Phase = 'idle' | 'listening' | 'scoring' | 'marked';

/** The board's centerpiece: the actual marking engine, playable in-page. */
export function DemoTile() {
  const [qIndex, setQIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef('');

  const speechSupported = useSyncExternalStore(
    () => () => {},
    () => {
      const w = window as unknown as Record<string, unknown>;
      return Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition);
    },
    () => false,
  );

  const stopListening = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setPhase('idle');
  }, []);

  const startListening = useCallback(() => {
    const rec = getRecognition();
    if (!rec) return;
    setError(null);
    setResult(null);
    finalRef.current = answer ? `${answer.trim()} ` : '';
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]!;
        if (r.isFinal) finalRef.current += `${r[0].transcript} `;
        else interim += r[0].transcript;
      }
      setAnswer((finalRef.current + interim).trimStart());
    };
    rec.onend = () => setPhase((p) => (p === 'listening' ? 'idle' : p));
    rec.onerror = () => {
      setPhase('idle');
      setError('The microphone did not cooperate. Type your answer instead.');
    };
    recRef.current = rec;
    rec.start();
    setPhase('listening');
  }, [answer]);

  useEffect(() => () => recRef.current?.stop(), []);

  async function mark() {
    if (answer.trim().length < 12) {
      setError('Give it at least a sentence. Short answers are half the problem.');
      return;
    }
    recRef.current?.stop();
    setPhase('scoring');
    setError(null);
    try {
      const res = await fetch('/api/v1/demo-eval', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ questionId: qIndex, answer: answer.slice(0, 700) }),
      });
      const json = await res.json();
      if (res.status === 429) {
        setPhase('idle');
        setError('That is the demo limit for now. The full app has no such patience problem.');
        return;
      }
      if (!res.ok || !json.ok) throw new Error('bad response');
      setResult(json.data as DemoResult);
      setPhase('marked');
    } catch {
      setPhase('idle');
      setError('Marking failed on our end. Try once more.');
    }
  }

  function reset(nextQuestion: boolean) {
    recRef.current?.stop();
    setAnswer('');
    setResult(null);
    setError(null);
    setPhase('idle');
    if (nextQuestion) setQIndex((i) => (i + 1) % QUESTIONS.length);
  }

  const listening = phase === 'listening';

  return (
    <div className="tile tile-ink flex h-full flex-col p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <span className="marks inline-flex items-center gap-2 text-xs font-bold text-paper-mut">
          {listening && <span className="h-2 w-2 animate-pulse rounded-full bg-verm" />}
          LIVE · the real engine, not a mockup
        </span>
        <button
          type="button"
          onClick={() => reset(true)}
          className="pressable inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-paper-mut transition-colors duration-150 hover:text-paper"
        >
          <RefreshCcw size={13} /> new question
        </button>
      </div>

      <p className="mt-5 text-2xl font-black leading-tight text-paper sm:text-[1.8rem]">
        {QUESTIONS[qIndex]}
      </p>

      {phase !== 'marked' ? (
        <div className="mt-5 flex flex-1 flex-col">
          <textarea
            id="demo-answer"
            aria-label="Your answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            maxLength={700}
            placeholder={
              listening
                ? 'Listening. Speak as if the examiner is across the table…'
                : speechSupported
                  ? 'Tap the mic and answer out loud, or type here.'
                  : 'Type your answer in three or four sentences.'
            }
            className="min-h-24 w-full flex-1 resize-none rounded-2xl border border-line-dark bg-transparent p-4 text-base leading-relaxed text-paper placeholder:text-paper-mut/60 focus:border-verm focus:outline-none"
          />
          {error && (
            <p role="alert" className="mt-3 text-sm font-bold text-[#FF9D82]">
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {speechSupported && (
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                className={`pressable inline-flex h-12 cursor-pointer items-center gap-2 rounded-full px-6 text-[0.95rem] font-bold transition-colors duration-150 ${
                  listening ? 'bg-paper text-ink' : 'bg-verm text-ink hover:bg-[#FF6A45]'
                }`}
              >
                {listening ? (
                  <>
                    <Square size={15} /> Stop
                  </>
                ) : (
                  <>
                    <Mic size={17} /> Speak
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={mark}
              disabled={phase === 'scoring'}
              className="pressable inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-paper px-6 text-[0.95rem] font-bold text-ink transition-colors duration-150 hover:bg-butter disabled:cursor-default disabled:opacity-50"
            >
              {phase === 'scoring' ? 'Marking…' : 'Mark my answer'}
              {phase !== 'scoring' && <ArrowRight size={16} />}
            </button>
            <span className="marks ml-auto text-xs text-paper-mut/70">{answer.length}/700</span>
          </div>
        </div>
      ) : (
        result && (
          <div className="mt-5 flex flex-1 flex-col" aria-live="polite">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-paper-mut">
                  Weakest axis: <span className="text-verm">{result.weakestAxis}</span>
                </p>
                <p className="mt-2 line-clamp-3 text-[0.95rem] leading-snug text-paper-mut">
                  {result.summary}
                </p>
              </div>
              <div className="stamp shrink-0 rounded-2xl bg-verm px-4 py-2.5 text-ink">
                <span className="marks block text-3xl font-bold leading-none">{result.overall}</span>
                <span className="marks text-[0.65rem] font-bold">/100</span>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {AXES.map(([key, label]) => {
                const v = result.scores[key] ?? 0;
                return (
                  <div key={key} className="grid grid-cols-[6.5rem_1fr_2.2rem] items-center gap-3">
                    <span className="text-[0.8rem] font-bold text-paper">{label}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-[rgba(251,250,248,0.14)]">
                      <span
                        className="block h-full rounded-full bg-verm transition-[width] duration-500"
                        style={{ width: `${Math.max(3, v)}%` }}
                      />
                    </span>
                    <span className="marks text-right text-[0.8rem] text-paper-mut">{v}</span>
                  </div>
                );
              })}
            </div>

            {result.improvements[0] && (
              <p className="mt-4 text-sm font-bold text-paper">
                <span className="text-verm">Fix first: </span>
                {result.improvements[0]}
              </p>
            )}

            <div className="mt-auto flex flex-wrap gap-3 pt-5">
              <button
                type="button"
                onClick={() => reset(false)}
                className="pressable inline-flex h-11 cursor-pointer items-center rounded-full border-2 border-paper/30 px-5 text-sm font-bold text-paper transition-colors duration-150 hover:border-paper"
              >
                Answer again
              </button>
              <Link
                href="/waitlist"
                className="pressable inline-flex h-11 items-center gap-1.5 rounded-full bg-verm px-5 text-sm font-bold text-ink transition-colors duration-150 hover:bg-[#FF6A45]"
              >
                Get early access <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )
      )}
    </div>
  );
}
