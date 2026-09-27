import { describe, expect, it } from 'vitest';
import { DEMO_QUESTIONS } from '@/app/api/v1/demo-eval/route';
import { AXES } from '@/components/room/data';
import { QUESTIONS } from './questions';
import { TAP_MS, followUpFor, initialState, isAnswer, judge, reduce, type EngineEvent, type EngineState, type Verdict } from './engine';
import { ASKER, BEAT, CONFER_MIN, beatsAt, conferProgress, penAt, speakDuration, speechEnvelope } from './choreo';
import { markTranscript } from './pen';

const run = (events: EngineEvent[], from: EngineState = initialState()) => events.reduce(reduce, from);
const ANSWER = 'Candidates fail because they never lead with the answer they know.';
const verdict: Verdict = { marks: [71, 66, 48, 62, 54], weakest: 2, overall: 60, source: 'model', summary: 's', improvement: 'i' };

describe('the questions', () => {
  it('match the server allowlist index for index', () => {
    expect([...QUESTIONS]).toEqual([...DEMO_QUESTIONS]);
  });
});

describe('the askers', () => {
  it('give every question an examiner to ask it', () => {
    expect(ASKER).toHaveLength(QUESTIONS.length);
    ASKER.forEach((who) => expect(AXES[who]).toBeDefined());
  });
});

describe('engine state machine: speaking', () => {
  it('asks for the microphone, listens, and hands a held answer to the panel', () => {
    let s = run([{ type: 'press' }]);
    expect(s.phase).toBe('requesting');
    s = run([{ type: 'granted' }, { type: 'heard', final: ANSWER, interim: '' }, { type: 'release', heldMs: 4200 }], s);
    expect(s.phase).toBe('conferring');
    expect(s.answered).toBe(ANSWER);
    expect(s.request).toBe(2);
  });

  it('latches the microphone open on a quick tap, and stops on the next', () => {
    let s = run([{ type: 'press' }, { type: 'granted' }, { type: 'release', heldMs: TAP_MS - 1 }]);
    expect(s).toMatchObject({ phase: 'listening', latched: true });
    s = run([{ type: 'heard', final: 'The viva tests', interim: ' how you think out loud' }, { type: 'release', heldMs: 2000 }], s);
    expect(s.phase).toBe('listening');
    s = reduce(s, { type: 'press' });
    expect(s.phase).toBe('conferring');
    expect(s.answered).toBe('The viva tests how you think out loud');
  });

  it('keeps listening if the key comes up while the browser is still asking for the microphone', () => {
    const s = run([{ type: 'press' }, { type: 'release', heldMs: 900 }, { type: 'granted' }]);
    expect(s).toMatchObject({ phase: 'listening', latched: true });
  });

  it('offers typing when the microphone is refused', () => {
    const s = run([{ type: 'press' }, { type: 'refused', reason: 'denied' }]);
    expect(s).toMatchObject({ phase: 'idle', mode: 'text', notice: 'denied' });
  });

  it('says so when it heard nothing, and when the answer is too short', () => {
    expect(run([{ type: 'press' }, { type: 'granted' }, { type: 'release', heldMs: 3000 }])).toMatchObject({ phase: 'idle', notice: 'no-speech' });
    expect(run([{ type: 'press' }, { type: 'granted' }, { type: 'heard', final: 'um yes', interim: '' }, { type: 'release', heldMs: 3000 }])).toMatchObject({
      phase: 'idle',
      notice: 'too-short',
      text: 'um yes',
    });
  });

  it('hands in a take that reaches the length the panel reads', () => {
    const s = run([{ type: 'press' }, { type: 'granted' }, { type: 'heard', final: 'word '.repeat(150), interim: 'and more' }]);
    expect(s.phase).toBe('conferring');
    expect(s.answered!.length).toBe(700);
  });

  it('discards a take on cancel', () => {
    const s = run([{ type: 'press' }, { type: 'granted' }, { type: 'heard', final: ANSWER, interim: '' }, { type: 'cancel' }]);
    expect(s).toMatchObject({ phase: 'idle', text: '', notice: null });
  });

  it('never blocks: pressing while the panel confers starts a fresh answer and drops the old request', () => {
    let s = run([{ type: 'press' }, { type: 'granted' }, { type: 'heard', final: ANSWER, interim: '' }, { type: 'release', heldMs: 3000 }]);
    const stale = s.request;
    s = reduce(s, { type: 'press' });
    expect(s).toMatchObject({ phase: 'requesting', text: '', answered: null });
    s = run([{ type: 'granted' }, { type: 'resolved', request: stale, result: verdict }], s);
    expect(s.phase).toBe('listening');
    expect(s.result).toBeNull();
  });
});

describe('engine state machine: typing and results', () => {
  const typed = (text: string) => run([{ type: 'mode', mode: 'text' }, { type: 'type', text }]);

  it('marks a typed answer', () => {
    let s = run([{ type: 'submit' }], typed(ANSWER));
    expect(s.phase).toBe('conferring');
    s = reduce(s, { type: 'resolved', request: s.request, result: verdict });
    expect(s).toMatchObject({ phase: 'marked', result: verdict, answered: ANSWER });
  });

  it('refuses a typed answer that is too short, and clears the note once it is long enough', () => {
    let s = run([{ type: 'submit' }], typed('Nerves.'));
    expect(s).toMatchObject({ phase: 'idle', notice: 'too-short' });
    s = reduce(s, { type: 'type', text: ANSWER });
    expect(s.notice).toBeNull();
  });

  it('caps an answer at the API limit', () => {
    expect(typed('word '.repeat(300)).text.length).toBe(700);
  });

  it('keeps the answer and words the failure', () => {
    let s = run([{ type: 'submit' }], typed(ANSWER));
    s = reduce(s, { type: 'failed', request: s.request, notice: 'rate-limited', retryAfter: 1800 });
    expect(s).toMatchObject({ phase: 'idle', notice: 'rate-limited', retryAfter: 1800, text: ANSWER });
  });

  it('hands a spoken answer in again after marking failed, without asking for it twice', () => {
    let s = run([{ type: 'press' }, { type: 'granted' }, { type: 'heard', final: ANSWER, interim: '' }, { type: 'release', heldMs: 3000 }]);
    s = reduce(s, { type: 'failed', request: s.request, notice: 'server' });
    expect(s).toMatchObject({ phase: 'idle', mode: 'voice', notice: 'server', text: ANSWER });
    const first = s.request;
    s = reduce(s, { type: 'submit' });
    expect(s).toMatchObject({ phase: 'conferring', answered: ANSWER, notice: null });
    expect(s.request).toBe(first + 1);
  });

  it('puts a marked answer back on the page to improve, without spending a request on it', () => {
    let s = run([{ type: 'submit' }], typed(ANSWER));
    s = reduce(s, { type: 'resolved', request: s.request, result: verdict });
    const marked = s.request;
    s = reduce(s, { type: 'edit' });
    expect(s).toMatchObject({ phase: 'idle', mode: 'text', text: ANSWER, answered: null, result: null, notice: null });
    expect(s.request).toBe(marked + 1);
    expect(reduce(initialState(), { type: 'edit' })).toEqual(initialState());
  });

  it('ignores an answer to a request it has moved on from', () => {
    let s = run([{ type: 'submit' }], typed(ANSWER));
    s = reduce(s, { type: 'reset' });
    s = reduce(s, { type: 'resolved', request: s.request - 1, result: verdict });
    expect(s).toMatchObject({ phase: 'idle', result: null });
  });

  it('draws the next question and wraps around', () => {
    const s = run([{ type: 'next' }, { type: 'next' }, { type: 'next' }]);
    expect(s.question).toBe(0);
    expect(run([{ type: 'next' }]).question).toBe(1);
  });

  it('does not switch modes mid-answer', () => {
    const s = run([{ type: 'press' }, { type: 'granted' }, { type: 'mode', mode: 'text' }]);
    expect(s.mode).toBe('voice');
  });

  it('knows an answer from a fragment', () => {
    expect(isAnswer('Um yes no')).toBe(false);
    expect(isAnswer('The heart pumps blood.')).toBe(true);
  });
});

describe('judge', () => {
  const scores = { correctness: 71, clarity: 66, structure: 48, conciseness: 62, confidence: 54 };

  it('takes the model at its word', () => {
    expect(judge({ source: 'model', scores, overall: 60, weakestAxis: 'structure', summary: 's', improvements: ['a', 'b'] })).toEqual({
      marks: [71, 66, 48, 62, 54],
      weakest: 2,
      overall: 60,
      source: 'model',
      summary: 's',
      improvement: 'a',
    });
  });

  it('leaves correctness unmarked for the heuristic, and fixes first only what it measured', () => {
    const v = judge({ source: 'heuristic', scores: { ...scores, correctness: 20 }, overall: 50, weakestAxis: 'correctness', summary: 's', improvements: [] });
    expect(v.marks).toEqual([null, 66, 48, 62, 54]);
    expect(v.weakest).toBe(2);
    expect(v.overall).toBe(58);
    expect(v.improvement).toBeNull();
  });
});

describe('followUpFor', () => {
  it('asks each weakest examiner its own follow-up, sharpened by the red pen', () => {
    const pen = markTranscript('I think maybe um the heart sort of pumps blood around the body');
    expect(followUpFor(4, pen)).toBe('You hedged 3 times. Say it again like you mean it.');
    expect(followUpFor(4, { hedges: 2, fillers: 0, claim: null })).toBe('You hedged twice. Say it again like you mean it.');
    expect(followUpFor(2, { hedges: 0, fillers: 0, claim: { kind: 'claim', start: 0, end: 1, text: 'x' } })).toBe(
      'You buried your claim. What is the one-line answer?',
    );
    AXES.forEach((_, i) => expect(followUpFor(i, pen)).not.toMatch(/[—–]/));
  });
});

describe('the marking sequence', () => {
  it('lands every beat, including the longest follow-up, in under four seconds', () => {
    const lines = AXES.flatMap((_, i) => [
      followUpFor(i, { hedges: 9, fillers: 9, claim: null }),
      followUpFor(i, { hedges: 0, fillers: 0, claim: { kind: 'claim', start: 0, end: 1, text: 'x' } }),
    ]);
    for (const line of lines) expect(BEAT.speak + speakDuration(line)).toBeLessThan(4);
    expect(BEAT.done).toBeLessThan(4);
    expect(penAt(100)).toBeLessThan(BEAT.stamp);
    expect(BEAT.raise + 4 * BEAT.stagger).toBeLessThan(BEAT.faces);
  });

  it('runs in order', () => {
    const order = [BEAT.raise, BEAT.faces, BEAT.hot, BEAT.board, BEAT.pen, BEAT.speak, BEAT.stamp, BEAT.done];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    const b = beatsAt(Infinity);
    expect(b.hot && b.board && b.pen && b.stamp && b.done && b.raised(4) && b.verdict(4)).toBe(true);
    expect(beatsAt(0).hot).toBe(false);
  });

  it('confers without ever claiming to be finished', () => {
    expect(conferProgress(0)).toBe(0);
    expect(conferProgress(CONFER_MIN)).toBeGreaterThan(0.2);
    expect(conferProgress(600)).toBeLessThan(0.91);
  });

  it('speaks on vowels and rests on spaces', () => {
    expect(speechEnvelope('Say it', 0)).toBe(0.55);
    expect(speechEnvelope('Say it', 1 / 44)).toBe(1);
    expect(speechEnvelope('Say it', 3 / 44)).toBe(0.06);
    expect(speechEnvelope('Say it', 10)).toBe(0);
  });
});
