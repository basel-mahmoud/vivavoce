import { describe, expect, it } from 'vitest';
import { AXES } from '@/components/room/data';
import type { FlapRow } from '@/components/ui/SplitFlap';
import { BEAT } from './choreo';
import { initialState, type EngineState, type Notice, type Verdict } from './engine';
import { BOARD_COLUMNS, NOTICE, boardFor, lastWords, noticeText } from './words';

const DASH = /[‒-―]/;
const verdict = (weakest: number): Verdict => ({ marks: [71, 66, 48, 62, 54], weakest, overall: 60, source: 'model', summary: 's', improvement: 'i' });
const text = (row: FlapRow) => (typeof row === 'string' ? row : row.map((s) => s.text).join(''));
const state = (over: Partial<EngineState>): EngineState => ({ ...initialState(), ...over });

describe('the notices', () => {
  it('speak plainly: full sentences, no dashes', () => {
    for (const line of Object.values(NOTICE)) {
      expect(line).not.toMatch(DASH);
      expect(line).toMatch(/\.$/);
    }
  });

  it('say when the demo limit lifts, in words', () => {
    expect(noticeText('rate-limited', 1799)).toBe('That is the demo limit for now. Try again in 30 minutes, or get early access to the full app.');
    expect(noticeText('rate-limited', 50)).toContain('Try again in a minute, or');
    expect(noticeText('rate-limited', 3600)).toContain('Try again in an hour, or');
    expect(noticeText('rate-limited', null)).toContain('Try again later, or');
    expect(noticeText(null, null)).toBe('');
  });
});

describe('the board', () => {
  const notices: (Notice | null)[] = [null, 'denied', 'no-mic', 'unsupported', 'no-speech', 'too-short', 'rate-limited', 'server', 'offline', 'invalid'];

  it('fits every line on eleven flaps, in every state and for every axis', () => {
    const boards = [
      ...notices.map((notice) => boardFor(state({ notice, question: 2 }), -1)),
      ...(['requesting', 'listening', 'conferring'] as const).map((phase) => boardFor(state({ phase }), -1)),
      ...AXES.map((_, i) => boardFor(state({ phase: 'marked', result: verdict(i) }), Infinity)),
    ];
    for (const b of boards) {
      for (const line of b.lines) expect(line.length).toBeLessThanOrEqual(BOARD_COLUMNS);
      for (const row of b.rows) expect(text(row)).toHaveLength(BOARD_COLUMNS);
      expect(b.label).not.toMatch(DASH);
    }
  });

  it('confers until the verdict posts on its beat, then names the axis to fix first in red', () => {
    const marked = state({ phase: 'marked', result: verdict(2) });
    expect(boardFor(marked, BEAT.board - 0.01).lines).toEqual(['CONFERRING', '']);
    const posted = boardFor(marked, BEAT.board);
    expect(posted.lines).toEqual(['FIX FIRST', 'STRUCTURE']);
    expect(posted.label).toBe('Fix first: Structure');
    const axis = posted.rows[1];
    expect(typeof axis !== 'string' && axis?.find((s) => s.text === 'STRUCTURE')?.tone).toBe('verm');
  });

  it('greets each question by number', () => {
    expect(boardFor(state({ question: 1 }), -1).lines).toEqual(['YOUR TURN', 'QUESTION 2']);
  });
});

describe('lastWords', () => {
  it('keeps a short take whole and cuts a long one at a word', () => {
    expect(lastWords('  The heart   pumps blood. ', 40)).toBe('The heart pumps blood.');
    expect(lastWords('Candidates fail because they never lead with the answer', 24)).toBe('…lead with the answer');
  });
});
