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
  /** Rows for the question under the subject row. */
  questionRows: number;
  /** Show the running number at the end of the subject row. */
  counter: boolean;
}

export const WIDE: BoardShape = { columns: 24, questionRows: 2, counter: true };
export const NARROW: BoardShape = { columns: 15, questionRows: 3, counter: false };

/** Does this question fit the board without losing words? */
export function fits(item: NextQuestion, shape: BoardShape) {
  return (
    item.subject.length <= shape.columns - (shape.counter ? 3 : 0) &&
    wrapWords(item.question.toUpperCase(), shape.columns).length <= shape.questionRows
  );
}

/**
 * The board: the subject on a highlighted row (with the running number at its
 * end, on wide boards), then the question. "Next question" is printed on the
 * frame, not spelled in flaps. Always the same number of rows, so turning to
 * the next question never changes the board's shape.
 */
export function boardRows(item: NextQuestion, index: number, shape: BoardShape): FlapRow[] {
  const { columns } = shape;
  const subject: FlapRow = shape.counter
    ? [
        { text: item.subject, width: columns - 3, tone: 'butter' },
        { text: '', width: 1 },
        { text: String(index + 1).padStart(2, '0'), width: 2, align: 'end', tone: 'paper' },
      ]
    : [{ text: item.subject, width: columns, tone: 'butter' }];
  const lines = wrapWords(item.question.toUpperCase(), columns).slice(0, shape.questionRows);
  while (lines.length < shape.questionRows) lines.push('');
  return [subject, ...lines.map((l): FlapRow => [{ text: l, width: columns }])];
}
