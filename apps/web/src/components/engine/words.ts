import { AXES } from '@/components/room/data';
import type { FlapRow } from '@/components/ui/SplitFlap';
import { beatsAt } from './choreo';
import type { EngineState, Notice } from './engine';

/**
 * What "Your turn" says, in the page's own words: the notices when something did not go to plan,
 * and the panel's split-flap board. Pure, so every line can be tested (no dashes, and every board
 * line fits its flaps).
 */

export const NOTICE: Record<Notice, string> = {
  denied: 'The microphone is blocked, so type your answer instead. You can allow it again in your browser’s site settings.',
  'no-mic': 'No microphone found. Type your answer instead, and the panel marks it the same way.',
  unsupported: 'This browser cannot turn speech into text right now. Type your answer and the panel marks it the same way.',
  'no-speech': 'The panel did not catch that. Hold the key and speak up, or type instead.',
  'too-short': 'Give the panel a full sentence or two. Short answers are half the problem.',
  'rate-limited': 'That is the demo limit for now.',
  server: 'Marking failed on our end. Your answer is still here, so try once more.',
  offline: 'You are offline. Your answer is kept here; mark it when you are back online.',
  invalid: 'The panel could not read that answer. Try a few full sentences.',
};

/** When the demo limit lifts, in words: "in 12 minutes", "in an hour", or later. */
export function whenAgain(retryAfter: number | null): string {
  if (!retryAfter) return 'Try again later, or';
  const mins = Math.max(1, Math.round(retryAfter / 60));
  return `Try again in ${mins === 1 ? 'a minute' : mins >= 55 ? 'an hour' : `${mins} minutes`}, or`;
}

/** The notice as one line of text (the demo limit's also renders its link to early access). */
export function noticeText(notice: Notice | null, retryAfter: number | null): string {
  if (!notice) return '';
  if (notice !== 'rate-limited') return NOTICE[notice];
  return `${NOTICE[notice]} ${whenAgain(retryAfter)} get early access to the full app.`;
}

/** The board: two lines of eleven flaps. */
export const BOARD_COLUMNS = 11;

function centred(text: string, tone: 'coal' | 'verm' = 'coal'): FlapRow {
  const pad = Math.max(0, BOARD_COLUMNS - text.length);
  const left = Math.floor(pad / 2);
  return [
    { text: ' '.repeat(left), width: left },
    { text, tone },
    { text: ' '.repeat(pad - left), width: pad - left },
  ].filter((s) => (s.width ?? s.text.length) > 0);
}

export interface Board {
  /** Upper-case lines, centred on the flaps. */
  lines: [string, string];
  rows: FlapRow[];
  /** What a screen reader hears instead of the flaps. */
  label: string;
}

function say(a: string, b: string, label: string, tone: 'coal' | 'verm' = 'coal'): Board {
  return { lines: [a, b], rows: [centred(a), centred(b, tone)], label };
}

/**
 * What the panel's board says for a round in this state, `clock` seconds into the marking sequence:
 * the verdict ("FIX FIRST" over the weakest axis, in the examiners' red) posts on its beat.
 */
export function boardFor(s: Pick<EngineState, 'phase' | 'notice' | 'question' | 'result'>, clock: number): Board {
  const weakest = s.result?.weakest ?? -1;
  if (s.phase === 'marked' && weakest >= 0 && beatsAt(clock).board) {
    const axis = AXES[weakest]!.label;
    return say('FIX FIRST', axis.toUpperCase(), `Fix first: ${axis}`, 'verm');
  }
  if (s.phase === 'marked' || s.phase === 'conferring') return say('CONFERRING', '', 'The panel is conferring');
  if (s.phase === 'listening') return say('LISTENING', 'TO YOU', 'Listening to you');
  if (s.phase === 'requesting') return say('ALLOW THE', 'MICROPHONE', 'Allow the microphone');
  switch (s.notice) {
    case 'rate-limited':
      return say('DEMO LIMIT', 'REACHED', 'Demo limit reached');
    case 'offline':
      return say('OFFLINE', '', 'Offline');
    case 'server':
    case 'invalid':
      return say('NOT MARKED', 'TRY AGAIN', 'Not marked. Try again');
    case 'too-short':
      return say('TOO SHORT', 'SAY MORE', 'Too short. Say more');
    case 'no-speech':
      return say('NOTHING', 'HEARD', 'Nothing heard');
    default:
      return say('YOUR TURN', `QUESTION ${s.question + 1}`, `Your turn. Question ${s.question + 1}`);
  }
}

/** The end of a long take, cut at a word: the few words a phone shows above the panel. */
export function lastWords(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(t.length - max);
  return `…${cut.slice(cut.indexOf(' ') + 1)}`;
}
