/**
 * The examiner's red pen, as a pure function: find what a marker would mark in a spoken answer.
 *
 *   hedge   underlined: "I think", "maybe", "sort of", "kind of", "I guess", "probably" ...
 *   filler  struck through: "um", "uh", "like" used as filler, "basically", "you know", "actually" ...
 *   claim   circled: the answer's actual claim, when it is buried after a slow start
 *
 * Speech-to-text rarely punctuates, so the rules read the words around each candidate and stay
 * conservative: "a kind of enzyme" is a noun phrase, "reasons like nerves" is a comparison and
 * "do you know" is a question, so none of them is marked. Ranges index the original string and
 * never overlap, so the transcript renders as plain text with marked spans.
 */

export type PenKind = 'hedge' | 'filler' | 'claim';

export interface PenMark {
  kind: PenKind;
  /** UTF-16 offsets into the text: text.slice(start, end) is the marked words. */
  start: number;
  end: number;
  text: string;
}

export interface PenResult {
  /** Every mark, in reading order. */
  marks: PenMark[];
  hedges: number;
  fillers: number;
  claim: PenMark | null;
}

interface Token {
  /** Lower case, curly apostrophes straightened. Punctuation tokens keep their character. */
  w: string;
  start: number;
  end: number;
  punct: boolean;
}

const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}]+)*|[,.;:!?…]/gu;

function tokenize(text: string): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(WORD)) {
    const raw = m[0];
    const start = m.index ?? 0;
    out.push({ w: raw.toLowerCase().replace(/’/g, "'"), start, end: start + raw.length, punct: /^[,.;:!?…]$/.test(raw) });
  }
  return out;
}

const phrase = (s: string) => s.split(' ');

/** Longest first, so "i'm not sure" wins over "not sure". */
const HEDGES = [
  "i'm not sure",
  'im not sure',
  'i am not sure',
  'i feel like',
  'i would say',
  "i'd say",
  'more or less',
  'might be',
  'could be',
  'i think',
  'i guess',
  'i suppose',
  'i believe',
  'not sure',
  'sort of',
  'kind of',
  'maybe',
  'perhaps',
  'probably',
  'possibly',
  'kinda',
  'sorta',
  'somewhat',
].map(phrase);

/** Always filler in a spoken answer. */
const FILLERS = ['um', 'umm', 'uh', 'uhh', 'uhm', 'er', 'erm', 'hmm', 'basically', 'actually', 'literally'].map(phrase);

/** "kind of" and "sort of" after these are noun phrases ("a kind of enzyme"), not hedges. */
const DETERMINERS = new Set([
  'a', 'an', 'the', 'this', 'that', 'these', 'those', 'what', 'which', 'any', 'some', 'every', 'each', 'same', 'one',
  'other', 'different', 'particular', 'no', 'all', 'many', 'my', 'your', 'our', 'their', 'his', 'her', 'its', 'certain',
]);

/** Words after which "like" is doing a job (verb, comparison, preposition). */
const LIKE_KEEPS = new Set([
  'would', "i'd", 'i', 'you', 'we', 'they', 'he', 'she', 'people', 'feel', 'feels', 'felt', 'look', 'looks', 'looked',
  'seem', 'seems', 'seemed', 'sound', 'sounds', 'sounded', 'something', 'anything', 'nothing', 'much', 'more', 'not',
  "don't", "didn't", "doesn't", 'do', 'does', 'did', 'really', 'just', 'is', 'are', 'was', 'were', "it's", "that's",
  'be', 'been', 'exactly', 'things', 'reasons', 'ones',
]);

/** Words that lead into a filler "like" or "you know" when speech has no commas. */
const LEAD_INS = new Set(['um', 'umm', 'uh', 'uhh', 'er', 'erm', 'and', 'but', 'so', 'or', 'basically', 'actually', 'literally', 'like']);

/** "you know what", "you know that ...": a real verb, not filler. */
const KNOW_OBJECTS = new Set(['what', 'how', 'why', 'when', 'where', 'who', 'which', 'that', 'if', 'whether', 'it', 'this', 'about', 'them', 'him', 'her']);
const KNOW_ASKS = new Set(['do', 'did', "don't", "didn't", 'if', 'as', 'what', 'would', "you'll", 'will', 'may', 'might', 'to']);

/** Where a buried claim starts: the marker, then the claim itself. */
const CLAIM_MARKERS = [
  'the main reason is',
  'the real reason is',
  'the bottom line is',
  'the reason is',
  'the key is',
  'the answer is',
  'the point is',
  'my point is',
  'what matters is',
  'the problem is',
  'the issue is',
  'mainly because',
  'in short',
  'because',
].map(phrase);

/** A circle holds a short phrase: a marker's next few words. */
const CLAIM_WORDS = 6;
const CLAIM_CHARS = 38;

function matchAt(tokens: Token[], i: number, words: string[]): boolean {
  if (i + words.length > tokens.length) return false;
  for (let k = 0; k < words.length; k++) {
    const t = tokens[i + k]!;
    if (t.punct || t.w !== words[k]) return false;
  }
  return true;
}

function longest(tokens: Token[], i: number, list: string[][]): number {
  for (const words of list) if (matchAt(tokens, i, words)) return words.length;
  return 0;
}

const isPunct = (t: Token | undefined, chars = ',.;:!?…') => Boolean(t && t.punct && chars.includes(t.w));
const clauseBreak = (t: Token | undefined) => !t || isPunct(t);

function fillerLike(tokens: Token[], i: number): boolean {
  const prev = tokens[i - 1];
  const next = tokens[i + 1];
  if (isPunct(next, ',')) return true; // "like, nerves"
  if (!prev || prev.punct) return false; // ", like the heart" is a comparison
  if (LIKE_KEEPS.has(prev.w)) return false;
  if (next && !next.punct && next.w === 'to') return false; // "like to"
  return LEAD_INS.has(prev.w);
}

function fillerYouKnow(tokens: Token[], i: number): boolean {
  const prev = tokens[i - 1];
  const next = tokens[i + 2];
  if (prev && !prev.punct && KNOW_ASKS.has(prev.w)) return false;
  if (next && !next.punct && KNOW_OBJECTS.has(next.w)) return false;
  if (!next || isPunct(next)) return Boolean(prev); // "..., you know." at the end of a thought
  return Boolean(prev && (prev.punct || LEAD_INS.has(prev.w)));
}

function fillerIMean(tokens: Token[], i: number): boolean {
  const prev = tokens[i - 1];
  return !(prev && !prev.punct && (prev.w === 'what' || prev.w === 'that' || prev.w === 'if'));
}

/** Read an answer the way a marker would. */
export function markTranscript(text: string): PenResult {
  const tokens = tokenize(text);
  const marks: PenMark[] = [];
  const taken = new Array<boolean>(tokens.length).fill(false);
  const add = (kind: PenKind, from: number, to: number) => {
    const start = tokens[from]!.start;
    const end = tokens[to - 1]!.end;
    marks.push({ kind, start, end, text: text.slice(start, end) });
    for (let k = from; k < to; k++) taken[k] = true;
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.punct) continue;

    const f = longest(tokens, i, FILLERS);
    if (f) {
      add('filler', i, i + f);
      i += f - 1;
      continue;
    }
    if (t.w === 'like' && fillerLike(tokens, i)) {
      add('filler', i, i + 1);
      continue;
    }
    if (matchAt(tokens, i, ['you', 'know']) && fillerYouKnow(tokens, i)) {
      add('filler', i, i + 2);
      i += 1;
      continue;
    }
    if (matchAt(tokens, i, ['i', 'mean']) && fillerIMean(tokens, i)) {
      add('filler', i, i + 2);
      i += 1;
      continue;
    }

    const h = longest(tokens, i, HEDGES);
    if (h) {
      const nounPhrase = (t.w === 'kind' || t.w === 'sort') && DETERMINERS.has(tokens[i - 1]?.w ?? '');
      if (!nounPhrase) {
        add('hedge', i, i + h);
        i += h - 1;
      }
    }
  }

  const claim = findClaim(tokens, taken, text);
  if (claim) marks.push(claim);
  marks.sort((a, b) => a.start - b.start);

  return {
    marks,
    hedges: marks.filter((m) => m.kind === 'hedge').length,
    fillers: marks.filter((m) => m.kind === 'filler').length,
    claim,
  };
}

/**
 * The claim, if the answer buries it: the first claim marker ("because", "the main reason is")
 * that comes after a slow start, and the few words after it, up to a clause break or the next
 * hedge or filler. An answer that leads with its claim gets no circle.
 */
function findClaim(tokens: Token[], taken: boolean[], text: string): PenMark | null {
  const words = tokens.filter((t) => !t.punct).length;
  if (words < 8) return null;
  let wordIndex = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i]!.punct) continue;
    const m = taken[i] ? 0 : longest(tokens, i, CLAIM_MARKERS);
    if (!m) {
      wordIndex++;
      continue;
    }
    let from = i + m;
    // "because um they" : the claim starts after the stumble
    while (from < tokens.length && taken[from] && !tokens[from]!.punct) from++;
    let to = from;
    while (to < tokens.length && to - from < CLAIM_WORDS && !clauseBreak(tokens[to]) && !taken[to]) to++;
    // trim a trailing connective so the circle ends on a content word
    while (to > from && ['and', 'but', 'so', 'or', 'the', 'a', 'an', 'to', 'of'].includes(tokens[to - 1]!.w)) to--;
    const buried = wordIndex + m >= Math.max(3, Math.round(words * 0.25));
    if (to > from && buried) {
      let start = tokens[from]!.start;
      let end = tokens[to - 1]!.end;
      // keep it to one short line: a circle round a wrapped phrase reads as a scribble
      while (end - start > CLAIM_CHARS && to - 1 > from) {
        to--;
        end = tokens[to - 1]!.end;
      }
      start = tokens[from]!.start;
      return { kind: 'claim', start, end, text: text.slice(start, end) };
    }
    return null;
  }
  return null;
}

/** The transcript as runs of plain text and marked words, for rendering. */
export function penSegments(text: string, marks: readonly PenMark[]): { text: string; mark: PenMark | null }[] {
  const out: { text: string; mark: PenMark | null }[] = [];
  let at = 0;
  for (const m of marks) {
    if (m.start < at) continue;
    if (m.start > at) out.push({ text: text.slice(at, m.start), mark: null });
    out.push({ text: text.slice(m.start, m.end), mark: m });
    at = m.end;
  }
  if (at < text.length) out.push({ text: text.slice(at), mark: null });
  return out;
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The examiner's margin note under the marked transcript. */
export function penNote(r: PenResult): string {
  const tally: string[] = [];
  if (r.hedges) tally.push(count(r.hedges, 'hedge', 'hedges'));
  if (r.fillers) tally.push(count(r.fillers, 'filler', 'fillers'));
  const advice = r.claim
    ? 'Lead with the circled claim.'
    : r.fillers > r.hedges
      ? 'Cut the filler.'
      : r.hedges
        ? 'Commit to it.'
        : '';
  if (!tally.length) return r.claim ? 'No hedges, no filler. Lead with the circled claim.' : 'No hedges, no filler.';
  return `${tally.join(', ')}. ${advice}`.trim();
}
