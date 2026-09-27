import { describe, expect, it } from 'vitest';
import { editDistance, isCurrent, KNOWN_PATHS, normalizePath, suggestPath } from './paths';
import { exampleStats, extremes, heatColumns, heatLevel, modeName } from './progress-data';
import { emailHint, refusal, REFUSED_OTHER, splitAnswer } from './text';
import { site } from '@/lib/site';

describe('the nav', () => {
  it('marks a page current on itself and on anything under it', () => {
    expect(isCurrent('/faq', '/faq')).toBe(true);
    expect(isCurrent('/legal/accessibility', '/legal')).toBe(true);
    expect(isCurrent('/features-old', '/features')).toBe(false);
    expect(isCurrent('/', '/faq')).toBe(false);
    expect(isCurrent(null, '/faq')).toBe(false);
  });

  it('keeps one label for early access everywhere it links', () => {
    const labels = Object.values(site.footer)
      .flat()
      .filter((l) => l.href === '/waitlist')
      .map((l) => l.label);
    expect(labels).toEqual(['Get early access']);
  });
});

describe('the 404 correction', () => {
  it('measures edits between paths', () => {
    expect(editDistance('/featurs', '/features')).toBe(1);
    expect(editDistance('/faq', '/faq')).toBe(0);
    expect(editDistance('', '/faq')).toBe(4);
  });

  it('tidies a requested path before comparing', () => {
    expect(normalizePath('/FAQ/?x=1')).toBe('/faq');
    expect(normalizePath('/')).toBe('/');
  });

  it('suggests the page a typo meant', () => {
    expect(suggestPath('/featurs')).toBe('/features');
    expect(suggestPath('/how-it-work')).toBe('/how-it-works');
    expect(suggestPath('/privcy')).toBe('/privacy');
  });

  it('suggests the section a deeper path was in', () => {
    expect(suggestPath('/features/modes')).toBe('/features');
  });

  it('never guesses wildly, and never suggests where you already are', () => {
    expect(suggestPath('/completely-elsewhere')).toBeNull();
    expect(suggestPath('/faq')).toBeNull();
    expect(suggestPath('/')).toBeNull();
    expect(KNOWN_PATHS).toContain('/waitlist');
  });
});

describe('the progress board', () => {
  it('buckets heat by share of the busiest day', () => {
    expect(heatLevel(0, 10)).toBe(0);
    expect(heatLevel(3, 10)).toBe(1);
    expect(heatLevel(6, 10)).toBe(2);
    expect(heatLevel(10, 10)).toBe(3);
    expect(heatLevel(4, 0)).toBe(0);
  });

  it('lays out twelve weeks of seven days, ending with today', () => {
    const today = new Date('2026-09-23T15:00:00Z'); // a Wednesday
    const cols = heatColumns([{ day: '2026-09-23', count: 4 }], today);
    expect(cols).toHaveLength(12);
    expect(cols.every((c) => c.length === 7)).toBe(true);
    const last = cols.at(-1)!;
    const todayCell = last.find((c) => c.today)!;
    expect(todayCell.key).toBe('2026-09-23');
    expect(todayCell.count).toBe(4);
    expect(last.filter((c) => c.future)).toHaveLength(3);
  });

  it('finds the weakest and the best mark', () => {
    expect(extremes([71, 66, 48, 62, 54])).toEqual({ lo: 2, hi: 0 });
    expect(extremes([50, 50])).toEqual({ lo: 0, hi: 0 });
  });

  it('builds an example that agrees with itself', () => {
    const ex = exampleStats(new Date('2026-09-26T12:00:00Z'));
    const total = ex.heatmap.reduce((sum, d) => sum + d.count, 0);
    expect(ex.answersTotal).toBe(total);
    const recent = ex.heatmap.slice(-5).map((d) => d.day);
    expect(recent).toEqual(['2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26']);
    expect(ex.heatmap.some((d) => d.day === '2026-09-21')).toBe(false);
    const avg = Object.values(ex.axisAverages);
    expect(Math.round(avg.reduce((a, b) => a + b, 0) / avg.length)).toBe(ex.overall);
    expect(exampleStats(new Date('2026-09-26T12:00:00Z'))).toEqual(ex);
  });

  it('names modes the way the app does', () => {
    expect(modeName('mock_viva')).toBe('Mock Viva');
    expect(modeName('rapid_fire')).toBe('Rapid Fire');
    expect(modeName('new_mode')).toBe('New mode');
  });
});

describe('page words', () => {
  it('finds the phrase an answer highlights', () => {
    expect(splitAnswer('Yes, and you choose.', 'you choose')).toEqual(['Yes, and ', 'you choose', '.']);
    expect(splitAnswer('Plain.', 'missing')).toBeNull();
    expect(splitAnswer('Plain.')).toBeNull();
  });

  it('says what is wrong with an email before sending it', () => {
    expect(emailHint('')).toMatch(/Write your email/);
    expect(emailHint('sara@uni')).toMatch(/incomplete/);
    expect(emailHint('sara@uni.edu')).toBe('');
  });

  it('turns API refusals into the page’s own words, without dashes', () => {
    expect(refusal('rate_limited')).toMatch(/Give it a minute/);
    expect(refusal('server_error')).toBe(REFUSED_OTHER);
    expect(refusal(undefined)).toBe(REFUSED_OTHER);
    for (const words of [refusal('rate_limited'), refusal('bad_request'), REFUSED_OTHER]) {
      expect(words).not.toMatch(/[–—]/);
    }
  });
});
