import { describe, expect, it } from 'vitest';
import { markTranscript, penNote, penSegments } from './pen';

const kinds = (text: string) => markTranscript(text).marks.map((m) => `${m.kind}:${m.text}`);

describe('markTranscript: hedges', () => {
  it('underlines the common hedges, keeping their original case', () => {
    expect(kinds('I think maybe the heart is sort of a pump, I guess.')).toEqual([
      'hedge:I think',
      'hedge:maybe',
      'hedge:sort of',
      'hedge:I guess',
    ]);
  });

  it('prefers the longest hedge', () => {
    expect(kinds("I'm not sure it matters")).toEqual(["hedge:I'm not sure"]);
    expect(kinds('I’m not sure it matters')).toEqual(['hedge:I’m not sure']);
  });

  it('leaves "kind of" and "sort of" alone when they are noun phrases', () => {
    expect(kinds('It is a kind of enzyme and this sort of thing matters')).toEqual([]);
    expect(kinds('what kind of cell is it')).toEqual([]);
    expect(kinds('it is kind of important')).toEqual(['hedge:kind of']);
  });

  it('does not match inside longer words', () => {
    expect(kinds('the maybelline umbrella uhura')).toEqual([]);
  });
});

describe('markTranscript: fillers', () => {
  it('strikes the words that are always filler', () => {
    expect(kinds('Um, so basically it is, uh, actually the ventricle')).toEqual([
      'filler:Um',
      'filler:basically',
      'filler:uh',
      'filler:actually',
    ]);
  });

  it('strikes "like" only when it is filler', () => {
    expect(kinds('there are reasons like nerves')).toEqual([]);
    expect(kinds('the heart is like a pump')).toEqual([]);
    expect(kinds('I would like to explain')).toEqual([]);
    expect(kinds('it feels like a race')).toEqual([]);
    expect(kinds('and like the examiner asks')).toEqual(['filler:like']);
    expect(kinds('um like they panic')).toEqual(['filler:um', 'filler:like']);
    expect(kinds('it was, like, a disaster')).toEqual(['filler:like']);
  });

  it('strikes "you know" as filler but not as a question or a verb', () => {
    expect(kinds('and you know the viva is oral')).toEqual(['filler:you know']);
    expect(kinds('the viva, you know, is oral')).toEqual(['filler:you know']);
    expect(kinds('do you know the answer')).toEqual([]);
    expect(kinds('and you know what they ask')).toEqual([]);
    expect(kinds('You know the answer already')).toEqual([]);
  });

  it('strikes "I mean" unless it is part of what is meant', () => {
    expect(kinds('I mean the left ventricle')).toEqual(['filler:I mean']);
    expect(kinds('that is what I mean by structure')).toEqual([]);
  });
});

describe('markTranscript: the buried claim', () => {
  it('circles a claim that arrives after a slow start', () => {
    const r = markTranscript('Um, there are lots of reasons, like nerves, and also they sort of know it but they fail because they never lead with the answer.');
    expect(r.claim?.text).toBe('they never lead with the answer');
    expect(r.claim && r.claim.text.length).toBeLessThanOrEqual(38);
  });

  it('starts the circle after a stumble and stops at the next hedge', () => {
    const r = markTranscript('So there were a few things going on in my head when it happened because um nerves maybe took over');
    expect(r.claim?.text).toBe('nerves');
    expect(r.marks.map((m) => m.kind)).toEqual(['filler', 'claim', 'hedge']);
  });

  it('does not circle a claim the answer leads with', () => {
    expect(markTranscript('Because they never practise out loud, the words arrive in the wrong order.').claim).toBeNull();
  });

  it('needs a real answer before it looks for one', () => {
    expect(markTranscript('um because').claim).toBeNull();
  });
});

describe('marks never overlap and index the original text', () => {
  const samples = [
    'Um, I think, like, you know, basically the answer is kind of that the viva tests how you think, I guess.',
    'Well I mean the main reason is that uh students actually memorise instead of explaining it out loud.',
    '',
    '...',
    'I think I think I think',
  ];
  it.each(samples)('%s', (text) => {
    const { marks } = markTranscript(text);
    let at = 0;
    for (const m of marks) {
      expect(m.start).toBeGreaterThanOrEqual(at);
      expect(text.slice(m.start, m.end)).toBe(m.text);
      at = m.end;
    }
    expect(penSegments(text, marks).map((s) => s.text).join('')).toBe(text);
  });
});

describe('penNote', () => {
  it('counts and advises', () => {
    expect(penNote(markTranscript('I think maybe um the heart pumps blood around the whole body quite well'))).toBe('2 hedges, 1 filler. Commit to it.');
    expect(penNote(markTranscript('Um uh basically the heart pumps blood around the body'))).toBe('3 fillers. Cut the filler.');
    expect(penNote(markTranscript('The heart pumps blood around the body.'))).toBe('No hedges, no filler.');
  });

  it('points at the circled claim', () => {
    const r = markTranscript('Um, there are lots of reasons, like nerves, and also they sort of know it but they fail because they never lead with the answer.');
    expect(penNote(r)).toBe('1 hedge, 1 filler. Lead with the circled claim.');
  });
});
