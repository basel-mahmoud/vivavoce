import { describe, expect, it } from 'vitest';
import { nextStreak } from './practice.repo';

describe('nextStreak (weekly freeze rule)', () => {
  it('starts at 1 with no history', () => {
    expect(nextStreak({ current: 0, lastPracticedOn: null, freezeUsedOn: null }, '2026-07-08'))
      .toEqual({ current: 1, freezeUsedOn: null, frozeToday: false });
  });

  it('same-day practice changes nothing', () => {
    expect(
      nextStreak({ current: 4, lastPracticedOn: '2026-07-08', freezeUsedOn: null }, '2026-07-08'),
    ).toEqual({ current: 4, freezeUsedOn: null, frozeToday: false });
  });

  it('consecutive day extends without touching the freeze', () => {
    expect(
      nextStreak({ current: 4, lastPracticedOn: '2026-07-07', freezeUsedOn: null }, '2026-07-08'),
    ).toEqual({ current: 5, freezeUsedOn: null, frozeToday: false });
  });

  it('one missed day is absorbed by the freeze', () => {
    expect(
      nextStreak({ current: 9, lastPracticedOn: '2026-07-06', freezeUsedOn: null }, '2026-07-08'),
    ).toEqual({ current: 10, freezeUsedOn: '2026-07-07', frozeToday: true });
  });

  it('one missed day resets when the freeze was used this week', () => {
    expect(
      nextStreak(
        { current: 9, lastPracticedOn: '2026-07-06', freezeUsedOn: '2026-07-03' },
        '2026-07-08',
      ),
    ).toEqual({ current: 1, freezeUsedOn: '2026-07-03', frozeToday: false });
  });

  it('the freeze becomes available again after 7 days', () => {
    expect(
      nextStreak(
        { current: 9, lastPracticedOn: '2026-07-06', freezeUsedOn: '2026-06-30' },
        '2026-07-08',
      ),
    ).toEqual({ current: 10, freezeUsedOn: '2026-07-07', frozeToday: true });
  });

  it('two or more missed days always reset', () => {
    expect(
      nextStreak({ current: 9, lastPracticedOn: '2026-07-04', freezeUsedOn: null }, '2026-07-08'),
    ).toEqual({ current: 1, freezeUsedOn: null, frozeToday: false });
  });
});
