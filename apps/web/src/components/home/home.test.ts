import { describe, expect, it } from 'vitest';
import { flickDirection, isFlick, poseFor } from './deck';
import { boardRows, fits, NARROW, WIDE, wrapWords } from './board';
import { looksLikeEmail } from './email';
import { SUBJECTS } from './subjects-data';

describe('the modes deck', () => {
  it('rests the front card square and fans the rest', () => {
    expect(poseFor(0, false)).toEqual({ x: 0, y: 0, rotate: 0, scale: 1 });
    const back = poseFor(3, false);
    expect(back.x).toBeLessThan(0);
    expect(back.scale).toBeLessThan(1);
    expect(Math.abs(poseFor(5, false).rotate)).toBeGreaterThan(Math.abs(poseFor(1, false).rotate));
  });

  it('piles cards straight up on narrow screens', () => {
    for (let slot = 1; slot < 6; slot++) {
      const p = poseFor(slot, true);
      expect(p.x).toBe(0);
      expect(p.y).toBeLessThan(0);
    }
  });

  it('throws a card on speed or on distance, not on a nudge', () => {
    expect(isFlick(20, 900, 560)).toBe(true);
    expect(isFlick(-200, 0, 560)).toBe(true);
    expect(isFlick(60, 120, 560)).toBe(false);
  });

  it('sends a thrown card the way it was moving', () => {
    expect(flickDirection(40, -800)).toBe(-1);
    expect(flickDirection(-200, 100)).toBe(-1);
    expect(flickDirection(200, 0)).toBe(1);
  });
});

describe('the departures board', () => {
  it('wraps on word boundaries and splits words that cannot fit', () => {
    expect(wrapWords('why is the left ventricle wall thicker?', 14)).toEqual(['why is the', 'left ventricle', 'wall thicker?']);
    expect(wrapWords('thermodynamically', 8)).toEqual(['thermody', 'namicall', 'y']);
  });

  it('fits every subject and question on both boards', () => {
    for (const item of SUBJECTS) {
      expect(fits(item, WIDE), `${item.subject} on the wide board`).toBe(true);
      expect(fits(item, NARROW), `${item.subject} on the narrow board`).toBe(true);
    }
  });

  it('keeps the same shape for every question', () => {
    const shapes = new Set(
      SUBJECTS.map((s, i) => {
        const rows = boardRows(s, i, WIDE);
        return rows.length;
      }),
    );
    expect(shapes.size).toBe(1);
    expect(boardRows(SUBJECTS[0]!, 0, WIDE)).toHaveLength(1 + WIDE.questionRows);
    expect(boardRows(SUBJECTS[0]!, 0, NARROW)).toHaveLength(1 + NARROW.questionRows);
  });

  it('is a three-row board on wide screens, four on phones', () => {
    expect(boardRows(SUBJECTS[0]!, 0, WIDE)).toHaveLength(3);
    expect(boardRows(SUBJECTS[0]!, 0, NARROW)).toHaveLength(4);
  });
});

describe('the admission slip', () => {
  it('only lets the stub go with a plausible email', () => {
    expect(looksLikeEmail('ada@uni.ac.uk')).toBe(true);
    expect(looksLikeEmail('  ada@uni.edu ')).toBe(true);
    expect(looksLikeEmail('ada@uni')).toBe(false);
    expect(looksLikeEmail('ada uni.edu')).toBe(false);
    expect(looksLikeEmail('')).toBe(false);
  });
});
