/** Departures-board text for the Subjects section (pure, unit tested). */

import type { FlapRow } from '@/components/ui/SplitFlap';

export interface NextQuestion {
  subject: string;
  question: string;
}

/** Break text into lines of at most `width` characters, on word boundaries. */
export function wrapWords(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const raw of text.trim().split(/\s+/)) {
    let word = raw;
    while (word.length > width) {
      if (line) {
        lines.push(line);
        line = '';
      }
      lines.push(word.slice(0, width));
      word = word.slice(width);
    }
    if (!word) continue;
    if (!line) line = word;
    else if (line.length + 1 + word.length <= width) line = `${line} ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export interface BoardShape {
  columns: number;
  /** Rows for the question under the heading and subject rows. */
  questionRows: number;
  /** Show the running number in the heading row. */
  counter: boolean;
}

export const WIDE: BoardShape = { columns: 24, questionRows: 2, counter: true };
export const NARROW: BoardShape = { columns: 14, questionRows: 4, counter: false };

/** Does this question fit the board without losing words? */
export function fits(item: NextQuestion, shape: BoardShape) {
  return (
    item.subject.length <= shape.columns &&
    wrapWords(item.question.toUpperCase(), shape.columns).length <= shape.questionRows
  );
}

/**
 * The board: NEXT QUESTION (and its number), the subject on a highlighted
 * row, then the question. Always the same number of rows, so turning to the
 * next question never changes the board's shape.
 */
export function boardRows(item: NextQuestion, index: number, shape: BoardShape): FlapRow[] {
  const { columns } = shape;
  const head: FlapRow = shape.counter
    ? [
        { text: 'NEXT QUESTION', width: columns - 3 },
        { text: String(index + 1).padStart(2, '0'), width: 3, align: 'end', tone: 'paper' },
      ]
    : [{ text: 'NEXT QUESTION', width: columns }];
  const subject: FlapRow = [{ text: item.subject, width: columns, tone: 'butter' }];
  const lines = wrapWords(item.question.toUpperCase(), columns).slice(0, shape.questionRows);
  while (lines.length < shape.questionRows) lines.push('');
  return [head, subject, ...lines.map((l): FlapRow => [{ text: l, width: columns }])];
}
