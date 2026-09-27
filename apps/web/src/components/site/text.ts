import { looksLikeEmail } from '@/components/home/email';

/** Split an answer around its key phrase (first occurrence), if it has one. */
export function splitAnswer(a: string, key?: string): [string, string, string] | null {
  if (!key) return null;
  const at = a.indexOf(key);
  if (at < 0) return null;
  return [a.slice(0, at), key, a.slice(at + key.length)];
}

/** When the list says no, the slip says why in the page's own words (API messages are for logs). */
export const REFUSED: Readonly<Record<string, string>> = {
  rate_limited: 'Too many tries at once. Give it a minute, then try again.',
  bad_request: 'That email does not look right. Check it, then try again.',
};
export const REFUSED_OTHER = 'That did not go through. Try again in a moment.';
export const OFFLINE = 'No connection. Check it and try again.';

/** The words for a refusal from the waitlist API, by its error code. */
export function refusal(code: string | undefined) {
  return REFUSED[code ?? ''] ?? REFUSED_OTHER;
}

/** What to say about the email before sending, or nothing when it looks fine. */
export function emailHint(value: string) {
  if (!value.trim()) return 'Write your email on the slip first.';
  if (!looksLikeEmail(value)) return 'That email looks incomplete. Check it, then try again.';
  return '';
}
