'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowRight, Mic, RefreshCcw, Square } from 'lucide-react';
import { AXES } from '@/components/room/data';
import { cn } from '@/lib/cn';
import { useMicMeter } from './useMicMeter';

/** Minimal typing for the Web Speech API (not in lib.dom for all targets). */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
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

/** Must match DEMO_QUESTIONS in the demo-eval route, index for index. */
const QUESTIONS = [
  'Why do candidates who know the material still fail the viva?',
  'Explain, to a smart friend outside your field, what you are studying and why it matters.',
  'Tell me about a decision you defended under pressure. Walk me through your reasoning.',
];

interface DemoResult {
  source: 'model' | 'heuristic';
  scores: Record<string, number>;
  overall: number;
  weakestAxis: string;
  summary: string;
  improvements: string[];
}

type Phase = 'idle' | 'listening' | 'scoring' | 'marked';

const noop = () => () => {};

/* ── A 2D score paddle: face-down until marked, then flipped up by hand ──── */

function Paddle({
  label,
  score,
  up,
  hot,
  waiting,
  index,
}: {
  label: string;
  score: number | null;
  up: boolean;
  hot: boolean;
  waiting: boolean;
  index: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-4 sm:flex-col sm:gap-0">
      <div className="w-12 shrink-0 [perspective:600px] sm:w-full sm:max-w-[6rem]">
        <div
          className={cn(
            'relative aspect-square w-full [transform-style:preserve-3d]',
            'transition-transform duration-[650ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
          )}
          style={{
            transform: up
              ? `rotateY(0deg) scale(${hot ? 1.12 : 1})`
              : 'rotateY(180deg)',
            transitionDelay: up ? `${index * 80}ms` : '0ms',
          }}
        >
          {/* front: the mark */}
          <div
            className={cn(
              'marks absolute inset-0 grid place-items-center rounded-full text-base font-bold [backface-visibility:hidden] sm:text-[clamp(1.1rem,2.6vw,1.7rem)]',
              hot ? 'bg-verm text-coal' : 'bg-paper text-coal',
            )}
          >
            {score ?? ''}
          </div>
          {/* back: blank paddle, waiting */}
          <div
            className={cn(
              'absolute inset-0 rounded-full border-2 border-dashed border-paper/25 bg-coal-2 [backface-visibility:hidden] [transform:rotateY(180deg)]',
              waiting && 'motion-safe:animate-pulse',
            )}
            style={waiting ? { animationDelay: `${index * 120}ms` } : undefined}
          />
        </div>
      </div>
      <span className="mt-1 hidden h-6 w-[3px] rounded-full bg-paper/25 sm:block" aria-hidden />
      <span
        className={cn(
          'text-[0.95rem] font-bold leading-tight sm:mt-2 sm:w-full sm:text-center sm:text-xs',
          hot ? 'text-verm' : 'text-paper-mut',
        )}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * The real marking engine, playable in-page: speak (Web Speech API) or type,
 * get five marks from the same evaluator the app uses. Nothing is stored.
 */
export function LiveEngine({ id = 'live' }: { id?: string }) {
  const [qIndex, setQIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metered, setMetered] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef('');
  const { canvas: meterCanvas, ring: meterRing, start: startMeter, stop: stopMeter } = useMicMeter();

  const speechSupported = useSyncExternalStore(
    noop,
    () => {
      const w = window as unknown as Record<string, unknown>;
      return Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition);
    },
    () => false,
  );

  const stopListening = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    stopMeter();
    setMetered(false);
    setPhase((p) => (p === 'listening' ? 'idle' : p));
  }, [stopMeter]);

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
      setAnswer((finalRef.current + interim).trimStart().slice(0, 700));
    };
    rec.onend = () => {
      stopMeter();
      setMetered(false);
      setPhase((p) => (p === 'listening' ? 'idle' : p));
    };
    rec.onerror = (e) => {
      stopMeter();
      setMetered(false);
      setPhase('idle');
      const reason = e?.error;
      if (reason === 'not-allowed' || reason === 'service-not-allowed') {
        setError('Microphone access is blocked. Allow it in your browser, or type your answer instead.');
      } else if (reason === 'no-speech') {
        setError('We did not hear anything. Try again, or type your answer.');
      } else if (reason === 'audio-capture') {
        setError('No microphone found. Type your answer instead.');
      } else {
        setError('Speech input is not available here. Type your answer and mark it.');
      }
    };
    try {
      rec.start();
      recRef.current = rec;
      setPhase('listening');
      // The live meter is a bonus on precise pointers (desktop), where sharing
      // the mic with speech recognition is reliable.
      if (window.matchMedia('(pointer: fine)').matches) {
        void startMeter().then(setMetered);
      }
    } catch {
      setPhase('idle');
      setError('Could not start the microphone. Type your answer instead.');
    }
  }, [answer, startMeter, stopMeter]);

  useEffect(() => () => recRef.current?.stop(), []);

  async function mark() {
    if (answer.trim().length < 12) {
      setError('Give it at least a sentence. Short answers are half the problem.');
      return;
    }
    stopListening();
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
    stopListening();
    setAnswer('');
    setResult(null);
    setError(null);
    setPhase('idle');
    if (nextQuestion) setQIndex((i) => (i + 1) % QUESTIONS.length);
  }

  const listening = phase === 'listening';
  const marked = phase === 'marked' && result !== null;
  const weakestKey = result?.weakestAxis;
  const weakest = AXES.find((a) => a.key === weakestKey);

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mx-auto w-full max-w-[1360px] scroll-mt-20 px-3 py-3 sm:px-5">
      <div className="tile tile-ink rounded-[2rem] p-5 sm:p-8 lg:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
          {/* The candidate's side */}
          <div className="flex min-w-0 flex-col">
            <div className="flex items-start justify-between gap-4">
              <h2 id={`${id}-title`} className="display text-[clamp(2.4rem,5vw,4rem)] text-paper">
                Your turn.
              </h2>
              <button
                type="button"
                onClick={() => reset(true)}
                disabled={phase === 'scoring'}
                className="btn btn-line-dark mt-1 h-10 shrink-0 px-4 text-sm"
              >
                <RefreshCcw size={14} aria-hidden /> New question
              </button>
            </div>
            <p className="mt-3 max-w-md font-medium leading-relaxed text-paper-mut">
              Speak or type. Same marking engine as the app, no account needed,
              nothing stored.
            </p>

            <p className="mt-8 text-[clamp(1.35rem,2.4vw,1.85rem)] font-black leading-tight text-paper" aria-live="polite">
              {QUESTIONS[qIndex]}
            </p>

            <div
              className={cn(
                'relative mt-6 flex min-h-44 flex-1 flex-col rounded-2xl border bg-[rgb(251_250_248/0.04)] transition-colors duration-200',
                listening ? 'border-verm' : 'border-line-dark focus-within:border-paper/50',
              )}
            >
              <canvas
                ref={meterCanvas}
                aria-hidden
                className={cn(
                  'pointer-events-none mx-4 mt-3 h-10 transition-opacity duration-200',
                  listening && metered ? 'opacity-100' : 'h-0 opacity-0',
                )}
              />
              <label htmlFor={`${id}-answer`} className="sr-only">
                Your answer
              </label>
              <textarea
                id={`${id}-answer`}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={4}
                maxLength={700}
                disabled={phase === 'scoring'}
                placeholder={
                  listening
                    ? 'Listening. Speak as if the examiner is across the table.'
                    : speechSupported
                      ? 'Tap the mic and answer out loud, or type here.'
                      : 'Type your answer in three or four sentences.'
                }
                className="w-full flex-1 resize-none bg-transparent px-4 py-3.5 text-base leading-relaxed text-paper placeholder:text-paper-mut/70 focus:outline-none disabled:opacity-60"
              />
              <span className="marks pointer-events-none absolute bottom-3 right-4 text-xs text-paper-mut/80">
                {answer.length}/700
              </span>
            </div>

            {error && (
              <p role="alert" className="mt-3 text-sm font-bold text-[#FF9D82]">
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {speechSupported && (
                <button
                  type="button"
                  onClick={listening ? stopListening : startListening}
                  disabled={phase === 'scoring'}
                  aria-pressed={listening}
                  className={cn('btn h-13 gap-2.5 pl-2 pr-6', listening ? 'btn-paper' : 'btn-verm')}
                >
                  <span className="relative grid h-9 w-9 place-items-center rounded-full bg-coal text-paper">
                    <span
                      ref={meterRing}
                      aria-hidden
                      className={cn(
                        'absolute inset-0 rounded-full border-2 border-verm',
                        listening ? 'opacity-100' : 'opacity-0',
                        listening && !metered && 'motion-safe:animate-ping',
                      )}
                    />
                    {listening ? <Square size={13} fill="currentColor" aria-hidden /> : <Mic size={16} aria-hidden />}
                  </span>
                  {listening ? 'Stop' : 'Speak'}
                </button>
              )}
              <button
                type="button"
                onClick={mark}
                disabled={phase === 'scoring'}
                className="btn btn-paper h-13 px-6"
              >
                {phase === 'scoring' ? 'Marking…' : 'Mark my answer'}
                {phase !== 'scoring' && <ArrowRight size={16} aria-hidden />}
              </button>
            </div>
          </div>

          {/* The panel's side */}
          <div className="flex min-w-0 flex-col rounded-[1.5rem] bg-coal-2 p-5 sm:p-8">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-5 sm:gap-3" aria-hidden={!marked}>
              {AXES.map((a, i) => (
                <Paddle
                  key={a.key}
                  index={i}
                  label={a.label}
                  score={marked ? (result.scores[a.key] ?? 0) : null}
                  up={marked}
                  hot={marked && a.key === weakestKey}
                  waiting={phase === 'scoring'}
                />
              ))}
            </div>

            <div className="mt-10 flex flex-1 flex-col justify-end" aria-live="polite">
              {marked ? (
                <>
                  <div className="flex items-start gap-4">
                    <div className="stamp shrink-0 rounded-2xl bg-verm px-4 py-2.5 text-coal">
                      <span className="marks block text-4xl font-bold leading-none">{result.overall}</span>
                      <span className="marks text-[0.7rem] font-bold">/100 overall</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-paper">
                        Fix first: <span className="text-verm">{weakest?.label ?? result.weakestAxis}</span>
                      </p>
                      <p className="mt-1.5 text-[0.95rem] leading-snug text-paper-mut">{result.summary}</p>
                    </div>
                  </div>
                  {result.improvements[0] && (
                    <p className="mt-5 border-t border-line-dark pt-5 text-[0.95rem] font-semibold leading-relaxed text-paper">
                      {result.improvements[0]}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap gap-3 pt-6">
                    <button type="button" onClick={() => reset(false)} className="btn btn-line-dark h-11 px-5 text-sm">
                      Answer again
                    </button>
                    <Link href="/waitlist" className="btn btn-verm h-11 px-5 text-sm">
                      Get early access <ArrowRight size={15} aria-hidden />
                    </Link>
                  </div>
                </>
              ) : phase === 'scoring' ? (
                <>
                  <p className="text-xl font-black text-paper">The panel is conferring.</p>
                  <p className="mt-2 leading-relaxed text-paper-mut">
                    Five examiners, one answer. This usually takes a few seconds.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xl font-black text-paper">The panel is waiting.</p>
                  <p className="mt-2 leading-relaxed text-paper-mut">
                    Answer in three or four sentences, then press Mark. You get five
                    marks, the one to fix first, and what to change.
                  </p>
                </>
              )}
              <p className="mt-6 text-xs font-semibold text-paper-mut/80">
                Scores are guidance, not grades.
                {marked &&
                  (result.source === 'model'
                    ? ' Marked by the AI coach.'
                    : ' Marked by the quick fallback while the AI coach is busy.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
