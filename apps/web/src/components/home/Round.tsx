'use client';

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { CornerDownRight, Mic } from 'lucide-react';
import { Paddle } from '@/components/ui/Paddle';
import { Portrait, portraitSrc, type ExaminerAxis, type ExaminerState } from '@/components/ui/Portrait';
import { RedPen } from '@/components/ui/RedPen';
import { EASE } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { useReducedMarkup } from './useHome';

const PANEL: readonly { axis: ExaminerAxis; name: string; mark: number }[] = [
  { axis: 'correctness', name: 'Correctness', mark: 71 },
  { axis: 'clarity', name: 'Clarity', mark: 66 },
  { axis: 'structure', name: 'Structure', mark: 48 },
  { axis: 'conciseness', name: 'Conciseness', mark: 62 },
  { axis: 'confidence', name: 'Confidence', mark: 54 },
];
const WEAKEST: ExaminerAxis = 'structure';

type PhaseId = 'ask' | 'listen' | 'transcript' | 'mark' | 'fix' | 'follow';

interface Phase {
  id: PhaseId;
  /** Who moves at this point: the panel (red pen) or you (blue ink). */
  by: 'panel' | 'you';
  title: string;
  line: string;
  /** Each examiner's face at this point of the round. */
  face: (axis: ExaminerAxis) => ExaminerState;
}

const PHASES: readonly Phase[] = [
  {
    id: 'ask',
    by: 'panel',
    title: 'They ask.',
    line: 'Pick a mode and the panel asks a real exam question, out loud.',
    face: (a) => (a === 'correctness' ? 'speaking' : 'neutral'),
  },
  {
    id: 'listen',
    by: 'you',
    title: 'You answer out loud.',
    line: 'Speak, stop, start again, exactly like the room. All five listen to every word.',
    face: () => 'listening',
  },
  {
    id: 'transcript',
    by: 'you',
    title: 'It becomes a transcript.',
    line: 'Every word is on the page in seconds, the ums included.',
    face: () => 'marking',
  },
  {
    id: 'mark',
    by: 'panel',
    title: 'Five examiners mark it.',
    line: 'Correctness, clarity, structure, conciseness and confidence: 0 to 100 each, in red pen.',
    face: (a) => (a === WEAKEST ? 'sceptical' : 'marking'),
  },
  {
    id: 'fix',
    by: 'panel',
    title: 'One thing to fix first.',
    line: 'The weakest mark, with a stronger answer to steal from.',
    face: (a) => (a === WEAKEST ? 'sceptical' : 'neutral'),
  },
  {
    id: 'follow',
    by: 'panel',
    title: 'Then they go at it.',
    line: 'The next question aims at your weakest mark, and weak spots come back until they hold.',
    face: (a) => (a === WEAKEST ? 'speaking' : 'listening'),
  },
];

const QUESTION = 'Why do candidates who know the material still fail the viva?';
/** The spoken answer, phrase by phrase, with what the examiners will do to it. */
const ANSWER: readonly { w: string; filler?: boolean; hedge?: boolean; claim?: boolean }[] = [
  { w: 'Um,', filler: true },
  { w: 'I think', hedge: true },
  { w: 'they' },
  { w: 'sort of', filler: true },
  { w: 'know it, but' },
  { w: 'like,', filler: true },
  { w: 'when the follow-up comes' },
  { w: 'the structure collapses.', claim: true },
];
const SAID = ANSWER.map((a) => a.w).join(' ');
const STRONGER = 'Their structure collapses under the follow-up. Lead with that, then give the why.';
const FOLLOW_UP = 'You buried your claim. What is the one-line answer?';

/** Faces needed at a moment, so they can be fetched one moment ahead. */
const facesAt = (i: number) => PANEL.map((p) => portraitSrc(p.axis, PHASES[i]!.face(p.axis)));

/** A voice, drawn: bar heights for the listening waveform (fixed, so server and client agree). */
const WAVE = Array.from({ length: 30 }, (_, i) => 0.3 + 0.7 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45)));

/** The transcript on the desk, marked up as far as the round has got. */
function Slip({ marked, fix }: { marked: boolean; fix: boolean }) {
  let pen = 0;
  const next = () => 160 + pen++ * 220;
  return (
    <div className="vv-round-card vv-round-slip">
      <p className="vv-round-slip-head">
        <span>Transcript</span>
        <span>Example round</span>
      </p>
      <p className="vv-round-slip-line">
        <span className="vv-round-slip-who">Q.</span>
        {QUESTION}
      </p>
      <p className="vv-round-slip-line vv-round-said">
        <span className="vv-round-slip-who">You</span>
        {ANSWER.map((a, i) => {
          const gap = i < ANSWER.length - 1 ? ' ' : '';
          if (!a.filler && !a.hedge && !a.claim) {
            return (
              <span key={i}>
                {a.w}
                {gap}
              </span>
            );
          }
          return (
            <span key={i} className={a.claim ? 'vv-round-claim' : undefined}>
              <RedPen
                mark={a.claim ? 'circle' : a.filler ? 'strike-through' : 'underline'}
                play="manual"
                show={marked}
                delay={a.claim ? next() + 200 : next()}
                iterations={1}
              >
                {a.w}
              </RedPen>
              {gap}
            </span>
          );
        })}
      </p>
      <div className="vv-round-verdict" data-on={fix ? '' : undefined}>
        <p className="vv-round-fix">Fix first: Structure.</p>
        <p className="vv-round-stronger">
          <RedPen mark="highlight" play="manual" show={fix} delay={260}>
            {STRONGER}
          </RedPen>
        </p>
      </div>
    </div>
  );
}

/** The desk in front of the panel: what is on paper at this moment of the round. */
function Desk({ phase }: { phase: PhaseId }) {
  if (phase === 'ask' || phase === 'follow') {
    const follow = phase === 'follow';
    return (
      <div className="vv-round-card vv-round-ask">
        <p className="vv-round-who">
          {follow ? <CornerDownRight size={15} strokeWidth={2.4} aria-hidden /> : null}
          {follow ? 'Structure follows up' : 'Correctness asks'}
        </p>
        <p className="vv-round-question">{follow ? FOLLOW_UP : QUESTION}</p>
        {follow ? <p className="vv-round-aside">Aimed at the weakest mark: Structure, 48.</p> : null}
      </div>
    );
  }
  if (phase === 'listen') {
    return (
      <div className="vv-round-card vv-round-listen">
        <div className="vv-round-voice">
          <span className="vv-round-mic">
            <Mic size={20} strokeWidth={2.4} aria-hidden />
          </span>
          <span className="vv-round-wave">
            {WAVE.map((h, i) => (
              <span key={i} style={{ '--i': i, '--h': h.toFixed(3) } as CSSProperties} />
            ))}
          </span>
        </div>
        <p className="vv-round-live">
          <span className="vv-round-you">You</span>
          {SAID}
        </p>
      </div>
    );
  }
  return <Slip marked={phase !== 'transcript'} fix={phase === 'fix'} />;
}

/**
 * One round of VivaVoce, start to finish, as a pinned step-through: the page
 * scrolls through six moments of the same example answer (they ask, you
 * answer, the transcript, the marks, the one thing to fix, the follow-up)
 * while the five examiners, large, react at each one, their paddles turn
 * over when they mark, and the red pen works on the transcript. The steps
 * are keys: each jumps to its moment. The whole round is also written out
 * for screen readers. Reduced motion cuts between moments.
 */
export function Round({ className }: { className?: string }) {
  const uid = useId();
  const reduce = useReducedMarkup();
  const section = useRef<HTMLElement>(null);
  const [at, setAt] = useState(0);
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });

  const phaseOf = useCallback((v: number) => Math.min(PHASES.length - 1, Math.max(0, Math.floor(v * PHASES.length))), []);
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const next = phaseOf(v);
    setAt((prev) => (prev === next ? prev : next));
  });
  // Settle on the right moment when the page is restored mid-section.
  useEffect(() => {
    const t = window.setTimeout(() => setAt(phaseOf(scrollYProgress.get())), 0);
    return () => window.clearTimeout(t);
  }, [phaseOf, scrollYProgress]);

  // The next moment's faces, fetched a moment early so every swap is instant.
  useEffect(() => {
    if (at + 1 < PHASES.length) for (const src of facesAt(at + 1)) new Image().src = src;
  }, [at]);

  const jump = (i: number) => {
    const el = section.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + ((i + 0.5) / PHASES.length) * travel, behavior: reduce ? 'auto' : 'smooth' });
  };

  const phase = PHASES[at]!;
  const marked = at >= 3;
  const flagged = at >= 4;
  // The transcript stays on the desk from the moment it is written until the follow-up.
  const deskKey = phase.id === 'transcript' || phase.id === 'mark' || phase.id === 'fix' ? 'slip' : phase.id;

  return (
    <section
      ref={section}
      aria-labelledby={`${uid}-title`}
      className={cn('vv-round', className)}
      data-at={phase.id}
      style={{ '--moments': PHASES.length } as CSSProperties}
    >
      <h2 id={`${uid}-title`} className="sr-only">
        One example round, moment by moment
      </h2>
      <div className="sr-only">
        <p>Correctness asks: {QUESTION}</p>
        <p>You answer: {SAID}</p>
        <p>
          The marks, 0 to 100: {PANEL.map((p) => `${p.name} ${p.mark}`).join(', ')}. The examiners strike the
          fillers, underline the hedge and circle the claim you buried at the end.
        </p>
        <p>Fix first: Structure. A stronger answer: {STRONGER}</p>
        <p>Structure follows up: {FOLLOW_UP}</p>
        <p>Example round. Scores are guidance, not grades.</p>
      </div>

      <div className="vv-round-stage">
        <div className="vv-round-inner">
          <div className="vv-round-script">
            <ol className="vv-round-steps">
              {PHASES.map((p, i) => (
                <li
                  key={p.id}
                  className="vv-round-step"
                  data-by={p.by}
                  data-on={i === at ? '' : undefined}
                  data-done={i < at ? '' : undefined}
                >
                  <button
                    type="button"
                    className="vv-round-key"
                    aria-current={i === at ? 'step' : undefined}
                    onClick={() => jump(i)}
                  >
                    <span className="vv-round-dot" aria-hidden="true" />
                    <span className="vv-round-step-text">
                      <span className="vv-round-step-title">{p.title}</span>
                      <span className="vv-round-step-line">{p.line}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            {/* Phones: the moment on show, written out under the row of step keys. */}
            <div className="vv-round-now" aria-hidden="true">
              <p className="vv-round-now-title">{phase.title}</p>
              <p className="vv-round-now-line">{phase.line}</p>
            </div>
          </div>

          <div className="vv-round-panel" aria-hidden="true">
            <ul className="vv-round-seats">
              {PANEL.map((p, i) => (
                <li key={p.axis} className="vv-round-seat" data-weak={p.axis === WEAKEST ? '' : undefined}>
                  <span className="vv-round-head">
                    <Portrait axis={p.axis} state={phase.face(p.axis)} size={150} priority decorative />
                  </span>
                  <Paddle
                    value={p.mark}
                    label={p.name}
                    revealed={marked}
                    tone={flagged && p.axis === WEAKEST ? 'verm' : 'paper'}
                    handle={false}
                    delay={i * 80}
                    className="vv-round-paddle"
                  />
                  <span className="vv-round-name">{p.name}</span>
                </li>
              ))}
            </ul>
            <div className="vv-round-desk">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={deskKey}
                  className="vv-round-desk-item"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: reduce ? 0.18 : 0.34, ease: EASE.out } }}
                  exit={{ opacity: 0, y: reduce ? 0 : -8, transition: { duration: reduce ? 0.12 : 0.18, ease: EASE.out } }}
                >
                  <Desk phase={phase.id} />
                </motion.div>
              </AnimatePresence>
            </div>
            <p className="vv-round-note">Example round. Scores are guidance, not grades.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
