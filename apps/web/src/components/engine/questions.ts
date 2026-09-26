/**
 * The questions a visitor can answer on the home page. They must match
 * DEMO_QUESTIONS in app/api/v1/demo-eval/route.ts index for index: the client
 * sends only the index, and the server looks the question up in its own
 * allowlist (engine.test.ts holds the two lists together).
 */
export const QUESTIONS = [
  'Why do candidates who know the material still fail the viva?',
  'Explain, to a smart friend outside your field, what you are studying and why it matters.',
  'Tell me about a decision you defended under pressure. Walk me through your reasoning.',
] as const;

/** The API's limits on an answer (demo-eval's zod schema): trimmed length. */
export const MIN_CHARS = 12;
export const MAX_CHARS = 700;
/** Fewer words than this is not an answer yet, even when it clears MIN_CHARS. */
export const MIN_WORDS = 4;
/** A spoken answer stops itself after this long. */
export const MAX_SECONDS = 90;
