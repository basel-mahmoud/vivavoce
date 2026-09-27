/**
 * Development-only review controls, read from the query string. Production builds compile these
 * to their defaults (the NODE_ENV test is replaced at build time), so no visitor can change them.
 *   ?tier=1|2|3     pin the render tier (Scene.tsx)
 *   ?timescale=0.2  slow the room's clocks, to review motion frame by frame
 *   ?at=19.5        start the example-round loop this many seconds in
 */
function param(name: string): string | null {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

export function devTimeScale(): number {
  const v = Number(param('timescale'));
  return v > 0 && v <= 4 ? v : 1;
}

export function devRoundStart(): number | null {
  const v = param('at');
  return v === null || Number.isNaN(Number(v)) ? null : Number(v);
}
