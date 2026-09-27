'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { ArrowRight, Keyboard, Mic, PenLine, RotateCcw } from 'lucide-react';
import { AXES } from '@/components/room/data';
import { TypeLine } from '@/components/room/TypeLine';
import { Keycap } from '@/components/ui/Keycap';
import { Loader } from '@/components/ui/Loader';
import { portraitSrc, type ExaminerState } from '@/components/ui/Portrait';
import { SplitFlap } from '@/components/ui/SplitFlap';
import { cn } from '@/lib/cn';
import { requestMarks } from './api';
import { AnswerSheet, QuestionPaper } from './AnswerSheet';
import { ASK_HOLD, ASKER, beatsAt, CONFER_MIN, speakDuration } from './choreo';
import { followUpFor, initialState, isAnswer, judge, reduce as step } from './engine';
import { markTranscript } from './pen';
import { PortraitBench, type Say } from './PortraitBench';
import { MAX_SECONDS, QUESTIONS } from './questions';
import { createCue, stageNow, stageScale, type StageCue, type StageOverlays } from './stage';
import { useDark, useFinePointer, useOnline, usePageVisible, useReduce, useWebGL } from './useEnv';
import { useMarkClock } from './useMarkClock';
import { useMicMeter } from './useMicMeter';
import { useSpeech, useSpeechSupported } from './useSpeech';
import { VoiceDisc } from './VoiceDisc';
import { BOARD_COLUMNS, NOTICE, boardFor, lastWords, noticeText, whenAgain } from './words';
import styles from './engine.module.css';

const EngineStage = dynamic(() => import('./EngineStage'), { ssr: false });

const noop = () => () => {};
const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);

const BENCH_STATES: readonly ExaminerState[] = ['neutral', 'listening', 'marking', 'pleased', 'sceptical', 'speaking'];

/** Once marked: start over on a clean sheet, or join. */
function AfterMarking({ onReset }: { onReset: () => void }) {
  return (
    <span className={cn('flex flex-wrap items-center gap-2', styles.afterMarking)}>
      <button type="button" onClick={onReset} className="btn btn-ghost btn-sm gap-1.5">
        <RotateCcw size={15} aria-hidden /> Try again
      </button>
      {/* on phones the nav's own "Get early access" is always one tap away */}
      <Link href="/waitlist" className={cn('btn btn-secondary btn-sm gap-1.5', styles.long)}>
        Get early access <ArrowRight size={15} aria-hidden />
      </Link>
    </span>
  );
}

/* ── The section ──────────────────────────────────────────────────────── */

/**
 * "Your turn": the signature moment. The visitor answers a real question out loud (or types it),
 * and the same five examiners who marked the example round mark them for real: the glass faces
 * show their voice while they answer, the voice collapses into the mark disc, the panel confers,
 * paddles rise to the real marks, the weakest examiner leans in with a follow-up, the red pen
 * marks the transcript, the board posts what to fix first and the overall mark is stamped.
 * Same marking engine as the app; no account, and nothing is stored.
 */
export function LiveEngine({ id = 'live' }: { id?: string }) {
  const reduce = useReduce();
  const dark = useDark();
  const webgl = useWebGL();
  const fine = useFinePointer();
  const pageVisible = usePageVisible();
  const online = useOnline();
  const hydrated = useHydrated();
  const speechSupported = useSpeechSupported();
  const [state, dispatch] = useReducer(step, undefined, () => initialState('voice'));

  // Speaking needs speech-to-text; without it (or once the microphone is refused) the sheet takes typing.
  const voice = state.mode === 'voice' && (!hydrated || speechSupported);
  const { phase, result } = state;

  const section = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  const [inView, setInView] = useState(false);
  const spaceArmed = useRef(false);
  // the panel asks the question aloud when the section arrives, and again for each new question
  const [ask, setAsk] = useState<{ q: number; n: number } | null>(null);
  const questionRef = useRef(0);
  useEffect(() => {
    questionRef.current = state.question;
  }, [state.question]);
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    let asked = false;
    // A busy page can be handed several entries in one callback (the first report, and a scroll
    // that came before it was delivered): the last entry is where the section is now. Reading only
    // the first left the stage unmounted for good when a visitor arrived mid-hydration.
    const now = (entries: IntersectionObserverEntry[]) => entries[entries.length - 1];
    const ioNear = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: '100% 0px' });
    const ioView = new IntersectionObserver((entries) => setInView(Boolean(now(entries)?.isIntersecting)), { rootMargin: '80px 0px' });
    // Space answers (and the panel asks its question) once the section holds the screen: a third
    // of it in view, or half the viewport filled by it when it is taller than a short screen
    const ioKeys = new IntersectionObserver(
      (entries) => {
        const e = now(entries);
        if (!e) return;
        const cover = e.intersectionRect.height / Math.max(1, e.rootBounds?.height ?? window.innerHeight);
        spaceArmed.current = e.intersectionRatio >= 0.3 || cover >= 0.5;
        if (spaceArmed.current && !asked) {
          asked = true;
          setAsk({ q: questionRef.current, n: 1 });
        }
      },
      { threshold: [0, 0.1, 0.2, 0.3, 0.45, 0.6, 0.8, 1] },
    );
    ioNear.observe(el);
    ioView.observe(el);
    ioKeys.observe(el);
    return () => {
      ioNear.disconnect();
      ioView.disconnect();
      ioKeys.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!ask) return;
    const t = window.setTimeout(() => setAsk(null), ((speakDuration(QUESTIONS[ask.q]!) + ASK_HOLD) * 1000) / stageScale());
    return () => window.clearTimeout(t);
  }, [ask]);
  const next = useCallback(() => {
    dispatch({ type: 'next' });
    setAsk((a) => ({ q: (questionRef.current + 1) % QUESTIONS.length, n: (a?.n ?? 1) + 1 }));
  }, []);

  /* ── The microphone and speech ─────────────────────────────────────── */
  const { meter, start: micStart, startVoice, pulse, stop: micStop, subscribe } = useMicMeter();
  const { start: speechStart, stop: speechStop } = useSpeech({
    onText: (final, interim) => {
      pulse(1);
      dispatch({ type: 'heard', final, interim });
    },
    onStart: () => dispatch({ type: 'granted' }),
    onFailure: (reason) => dispatch(reason === 'no-speech' ? { type: 'silence' } : { type: 'refused', reason }),
  });

  useEffect(() => {
    if (phase !== 'requesting') return;
    let cancelled = false;
    void (async () => {
      if (fine) {
        // desktop: open the microphone first (the permission prompt, and the live meter)
        const r = await micStart();
        if (cancelled) return;
        if (r !== 'granted') {
          dispatch({ type: 'refused', reason: r === 'denied' ? 'denied' : 'no-mic' });
          return;
        }
        if (!speechStart()) dispatch({ type: 'refused', reason: 'unsupported' });
        else dispatch({ type: 'granted' });
      } else {
        // phones: recognition owns the microphone; the meter follows what it hears
        startVoice();
        if (!speechStart()) dispatch({ type: 'refused', reason: 'unsupported' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, fine, micStart, startVoice, speechStart]);

  useEffect(() => {
    if (phase === 'requesting' || phase === 'listening') return;
    speechStop();
    micStop();
  }, [phase, micStop, speechStop]);

  // the answer's clock; an answer stops itself after MAX_SECONDS (and at MAX_CHARS, in the reducer)
  const [tick, setTick] = useState({ take: -1, s: 0 });
  const take = state.request;
  useEffect(() => {
    if (phase !== 'listening') return;
    const started = performance.now();
    const id = window.setInterval(() => {
      const s = Math.floor((performance.now() - started) / 1000);
      setTick({ take, s });
      if (s >= MAX_SECONDS) dispatch({ type: 'stop' });
    }, 250);
    return () => window.clearInterval(id);
  }, [phase, take]);
  const seconds = tick.take === take ? tick.s : 0;

  /* ── Hold to answer: the key, and Space anywhere in the section ─────── */
  const pressedAt = useRef(0);
  const pressStart = useCallback(() => {
    pressedAt.current = performance.now();
    dispatch({ type: 'press' });
  }, []);
  const pressEnd = useCallback(() => dispatch({ type: 'release', heldMs: performance.now() - pressedAt.current }), []);

  /* ── Typing instead: the answer box takes the focus the key had ─────── */
  const focusAnswer = useCallback(() => {
    window.requestAnimationFrame(() => document.getElementById(`${id}-answer`)?.focus());
  }, [id]);
  const typeInstead = useCallback(() => {
    dispatch({ type: 'mode', mode: 'text' });
    focusAnswer();
  }, [focusAnswer]);
  const refused = state.mode === 'text' && (state.notice === 'denied' || state.notice === 'no-mic' || state.notice === 'unsupported');
  useEffect(() => {
    // the microphone was refused mid-press: carry a keyboard user straight on to typing (a phone
    // keeps its keyboard down until they choose to type)
    if (refused && fine) focusAnswer();
  }, [refused, fine, focusAnswer]);

  useEffect(() => {
    if (!voice) return;
    let holding = false;
    const busy = (t: EventTarget | null) =>
      t instanceof HTMLElement && Boolean(t.closest('input, textarea, select, button, a, summary, [contenteditable="true"], [role="button"]'));
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        dispatch({ type: 'cancel' });
        return;
      }
      if (e.code !== 'Space' || e.repeat || !spaceArmed.current || busy(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      holding = true;
      pressStart();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || !holding) return;
      e.preventDefault();
      holding = false;
      pressEnd();
    };
    const blur = () => {
      if (!holding) return;
      holding = false;
      pressEnd();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [voice, pressStart, pressEnd]);

  /* ── Marking ───────────────────────────────────────────────────────── */
  useEffect(() => {
    if (phase !== 'conferring' || !state.answered) return;
    const ctrl = new AbortController();
    const request = state.request;
    const started = performance.now();
    const minimum = ((reduce ? 0.45 : CONFER_MIN) * 1000) / stageScale();
    void requestMarks({ questionId: state.question, answer: state.answered }, { signal: ctrl.signal })
      .then(async (out) => {
        const wait = minimum - (performance.now() - started);
        if (wait > 0) await new Promise((r) => window.setTimeout(r, wait));
        if (ctrl.signal.aborted) return;
        if (out.ok) dispatch({ type: 'resolved', request, result: judge(out.data) });
        else dispatch({ type: 'failed', request, notice: out.reason, retryAfter: out.retryAfter });
      })
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [phase, state.request, state.answered, state.question, reduce]);

  const pen = useMemo(() => markTranscript(state.answered ?? ''), [state.answered]);
  const followUp = result ? followUpFor(result.weakest, pen) : '';
  const clock = useMarkClock(phase === 'marked' ? state.request : null, reduce, followUp);
  const b = beatsAt(clock);

  /* ── The 3D stage ──────────────────────────────────────────────────── */
  const use3D = webgl === true && !reduce;
  const [stageReady, setStageReady] = useState(false);
  const onStageReady = useCallback(() => setStageReady(true), []);
  const cue = useRef<StageCue>(createCue());
  const overlays = useRef<StageOverlays>({ tag: null, leader: null });
  useEffect(() => {
    const c = cue.current;
    const now = stageNow();
    if (c.phase !== phase) {
      c.phase = phase;
      c.since = now;
      if (phase === 'marked') c.markedAt = now;
    }
    c.marks = result?.marks ?? [null, null, null, null, null];
    c.weakest = result?.weakest ?? -1;
    c.followUp = followUp;
  }, [phase, result, followUp]);
  const asking = ask !== null && phase === 'idle' && ask.q === state.question;
  useEffect(() => {
    const c = cue.current;
    if (!asking || !ask) {
      c.askWho = -1;
      return;
    }
    c.askWho = ASKER[ask.q] ?? 0;
    c.askText = QUESTIONS[ask.q]!;
    c.askAt = stageNow();
  }, [asking, ask]);
  const showing3D = use3D && stageReady;

  // where the portrait bench is the panel (no WebGL, reduced motion), fetch every expression it will
  // wear before it needs them, so a face never blanks while the next one loads
  const benchLive = webgl === false || reduce;
  useEffect(() => {
    if (!benchLive || !near) return;
    for (const a of AXES) for (const st of BENCH_STATES) new window.Image().src = portraitSrc(a.key, st);
  }, [benchLive, near]);

  /* ── Words for screen readers ──────────────────────────────────────── */
  const announce =
    phase === 'requesting'
      ? 'Allow the microphone to answer out loud.'
      : phase === 'listening'
        ? 'Listening.'
        : phase === 'conferring'
          ? 'The panel is conferring.'
          : phase === 'marked' && result
            ? `Marked. ${AXES.map((a, i) => `${a.label} ${result.marks[i] ?? 'not marked'}`).join(', ')}. Overall ${result.overall} out of 100. Fix first: ${AXES[result.weakest]!.label}. The ${AXES[result.weakest]!.label} examiner asks: ${followUp}`
            : '';

  // who is speaking, for the note above the panel: the follow-up once marked, or the question
  const say: Say | null =
    phase === 'marked' && result && b.spoken
      ? { who: result.weakest, label: `${AXES[result.weakest]!.label}, follow-up`, text: followUp, key: `f${state.request}`, talking: b.speaking(followUp) }
      : asking && ask
        ? { who: ASKER[ask.q] ?? 0, label: `${AXES[ASKER[ask.q] ?? 0]!.label}, asking`, text: QUESTIONS[ask.q]!, key: `a${ask.n}`, talking: true }
        : null;

  const board = boardFor(state, clock);
  // phones: the words being heard, pinned above the panel (the sheet with the whole answer is below)
  const heard = lastWords(`${state.text} ${state.interim}`, 96);
  const listening = phase === 'listening';
  const requesting = phase === 'requesting';
  const conferring = phase === 'conferring';
  const marked = phase === 'marked' && result !== null;
  const error = noticeText(state.notice, state.retryAfter) || (!online && !marked ? NOTICE.offline : '');

  const legend = requesting
    ? 'Allow the microphone'
    : listening
      ? state.latched
        ? 'Tap to finish'
        : 'Let go to mark'
      : marked || conferring
        ? 'Hold to answer again'
        : 'Hold to answer';
  // the sticky key on a phone has room for two words beside "Try again"
  const again = !requesting && !listening && (marked || conferring);
  // a spoken answer that failed to be marked (our side, or the connection) can be handed in again
  const retry = phase === 'idle' && (state.notice === 'server' || state.notice === 'offline') && isAnswer(state.text);

  return (
    <section
      ref={section}
      id={id}
      aria-labelledby={`${id}-title`}
      className={styles.section}
      data-phase={phase}
      data-stage={showing3D ? '3d' : 'portraits'}
    >
      <header className={styles.head}>
        <h2 id={`${id}-title`} className={cn(styles.title, 'display')}>
          Your turn.
        </h2>
        <p className={styles.lede}>
          Answer out loud and the same five examiners mark you. No account needed, nothing stored.
        </p>
      </header>

      <div className={styles.questionArea}>
        <QuestionPaper id={id} state={state} onNext={next} />
      </div>

      <div className={styles.stageArea}>
        <div className={styles.stageSticky}>
          <div className={styles.canvasBox}>
            <PortraitBench
              phase={phase}
              clock={clock}
              marks={result?.marks ?? null}
              weakest={result?.weakest ?? -1}
              say={say}
              reduce={reduce}
              hidden={showing3D}
            />
            {use3D && near ? (
              <div className={styles.canvas} data-ready={stageReady ? '' : undefined}>
                <EngineStage
                  cueRef={cue}
                  meterRef={meter}
                  overlaysRef={overlays}
                  dark={dark}
                  active={inView && pageVisible}
                  fine={fine}
                  onReady={onStageReady}
                />
              </div>
            ) : null}
            <div aria-hidden className={styles.liveTag} data-show={(listening || requesting) && heard ? '' : undefined}>
              <p className="text-[0.72rem] font-bold text-ink-blue">You, answering</p>
              <p className="mt-0.5 text-[0.92rem] font-semibold leading-snug text-ink-blue">{heard}</p>
            </div>
            <div aria-hidden className={styles.overlay} data-on={showing3D ? '' : undefined}>
              <span
                ref={(el) => {
                  overlays.current.leader = el;
                }}
                className={styles.leader}
              />
              <div
                ref={(el) => {
                  overlays.current.tag = el;
                }}
                className={styles.tag}
              >
                <p className="text-[0.72rem] font-bold text-verm-text">{say?.label ?? '\u00a0'}</p>
                <p className="mt-0.5 min-h-[2.5em] text-[0.94rem] font-bold leading-snug text-ink">
                  {say ? <TypeLine key={say.key} text={say.text} instant={reduce} cps={44} caret={false} /> : null}
                </p>
              </div>
            </div>
          </div>

          <div className={styles.rail}>
            <VoiceDisc
              phase={phase}
              subscribe={subscribe}
              reduce={reduce}
              overall={result?.overall ?? null}
              stamped={marked && b.stamp}
              caption={
                listening
                  ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
                  : conferring || (marked && !b.stamp)
                    ? 'Conferring'
                    : marked
                      ? ''
                      : 'Your voice'
              }
            />
            <div className={styles.verdict}>
              <SplitFlap rows={board.rows} label={board.label} play="inview" size="md" columns={BOARD_COLUMNS} lines={2} flips={4} className={styles.board} />
              <p className={styles.fix} data-show={marked && b.board ? '' : undefined}>
                {marked ? (result.improvement ?? result.summary) : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.sheetArea}>
        <AnswerSheet
          id={id}
          state={state}
          pen={pen}
          clock={clock}
          reduce={reduce}
          speechReady={voice}
          onType={(text) => dispatch({ type: 'type', text })}
          onSubmit={() => dispatch({ type: 'submit' })}
          onNext={next}
        />
      </div>

      <div className={styles.controls}>
        {voice ? (
          <>
            <div className={styles.keyRow}>
              <Keycap
                size="lg"
                wide
                tone="cobalt"
                pressed={listening || requesting}
                // the take's time budget: the cap fills as the answer nears the limit
                progress={listening ? Math.min(1, seconds / MAX_SECONDS) : undefined}
                onPressStart={pressStart}
                onPressEnd={pressEnd}
                label={fine ? `${legend}. Or hold the Space bar.` : legend}
                className={styles.key}
              >
                <span className="inline-flex items-center gap-2.5">
                  {requesting ? <Loader kind="listening" size="sm" glyphOnly /> : <Mic size={19} aria-hidden />}
                  {again ? (
                    <>
                      <span className={styles.long}>{legend}</span>
                      <span className={styles.short}>Answer again</span>
                    </>
                  ) : (
                    legend
                  )}
                </span>
              </Keycap>
              {listening ? (
                <button type="button" onClick={() => dispatch({ type: 'stop' })} className={cn('btn btn-secondary', styles.side)}>
                  <span className={styles.long}>Stop and mark</span>
                  <span className={styles.short}>Stop</span>
                </button>
              ) : marked ? (
                <AfterMarking onReset={() => dispatch({ type: 'reset' })} />
              ) : retry ? (
                // the answer survived a failed marking: hand the same words in again
                <button type="button" onClick={() => dispatch({ type: 'submit' })} className={cn('btn btn-secondary gap-1.5', styles.side)}>
                  <RotateCcw size={15} aria-hidden />
                  <span className={styles.long}>Mark it again</span>
                  <span className={styles.short}>Mark again</span>
                </button>
              ) : !requesting && !conferring ? (
                <button type="button" onClick={typeInstead} className={cn('btn btn-ghost btn-sm gap-1.5 text-ink-mut', styles.side)}>
                  <Keyboard size={16} aria-hidden />
                  <span className={styles.long}>Type instead</span>
                  <span className={styles.short}>Type</span>
                </button>
              ) : null}
            </div>
            <p className={styles.hint} data-quiet={marked || error ? '' : undefined}>
              {listening ? (
                state.latched ? (
                  fine ? (
                    <>
                      The mic stays open. Press <Keycap size="sm" wide>Space</Keycap> or the key when you are done.
                    </>
                  ) : (
                    'The mic stays open. Tap the key again when you are done.'
                  )
                ) : (
                  'Let go when you are done, and the panel marks it.'
                )
              ) : requesting ? (
                'Your browser asks for the microphone once. Nothing you say is stored.'
              ) : fine ? (
                <>
                  Or hold <Keycap size="sm" wide>Space</Keycap>. A quick tap keeps the mic open.
                </>
              ) : (
                'Press and hold, or tap once to start and again to finish.'
              )}
            </p>
          </>
        ) : (
          <>
          <div className={styles.keyRow}>
            {marked ? (
              // the marked words go back on the page to improve; marking them unchanged would only
              // spend one of the demo's answers
              <button type="button" onClick={() => dispatch({ type: 'edit' })} className="btn btn-primary btn-lg gap-2">
                <PenLine size={17} aria-hidden /> Edit my answer
              </button>
            ) : (
              <button
                type="button"
                onClick={() => dispatch({ type: 'submit' })}
                disabled={conferring}
                aria-busy={conferring || undefined}
                className="btn btn-primary btn-lg"
              >
                {conferring ? (
                  <>
                    <Loader kind="marking" size="sm" glyphOnly /> Marking
                  </>
                ) : (
                  <>
                    Mark my answer <ArrowRight size={17} aria-hidden />
                  </>
                )}
              </button>
            )}
            {marked ? <AfterMarking onReset={() => dispatch({ type: 'reset' })} /> : null}
            {!marked && hydrated && speechSupported && state.notice !== 'denied' && state.notice !== 'no-mic' ? (
              <button type="button" onClick={() => dispatch({ type: 'mode', mode: 'voice' })} className="btn btn-ghost btn-sm gap-1.5 text-ink-mut" disabled={conferring}>
                <Mic size={16} aria-hidden /> Answer out loud instead
              </button>
            ) : null}
          </div>
          <p className={styles.hint} data-quiet={marked || error ? '' : undefined}>
            {marked
              ? 'Rework your words and mark them again, or start a clean sheet.'
              : hydrated && !speechSupported
              ? 'This browser cannot turn speech into text, so type your answer. The panel marks it the same way.'
              : fine
                ? (
                  <>
                    Or press <Keycap size="sm">Ctrl</Keycap> <Keycap size="sm">Enter</Keycap> in the answer.
                  </>
                )
                : 'Three or four sentences is plenty.'}
          </p>
          </>
        )}

        <p role="alert" className={styles.notice} style={{ '--show': error ? 1 : 0 } as CSSProperties}>
          {state.notice === 'rate-limited' ? (
            <>
              {NOTICE['rate-limited']} {whenAgain(state.retryAfter)}{' '}
              <Link href="/waitlist" className="link-inline">
                get early access
              </Link>{' '}
              to the full app.
            </>
          ) : (
            error
          )}
        </p>
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </div>
    </section>
  );
}
