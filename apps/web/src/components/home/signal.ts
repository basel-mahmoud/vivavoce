/** Geometry for the Loop's signal wire (pure, unit tested). */

export interface Anchor {
  key: string;
  x: number;
  y: number;
}

export interface SignalLayout {
  width: number;
  height: number;
  vertical: boolean;
  /** The whole wire, start to end. */
  full: string;
  /** Blue ink: from the mic to where the examiners take over. */
  bluePath: string;
  /** Red pen: from there to the next question. */
  redPath: string;
  /** The arrowhead at the end of the wire. */
  arrow: string;
  /** Where blue turns red, as a fraction of the wire. */
  split: number;
  /** Every stop the signal passes, in order, as a fraction of the wire. */
  stops: { key: string; at: number }[];
  /** The wire's ends along its axis, and its position across it (px). */
  start: number;
  end: number;
  cross: number;
}

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * One straight wire through the stops: horizontal on wide screens (at the
 * height of the first stop), vertical on narrow ones (down the rail at the
 * first stop's x). It runs from the `mic` stop to the `next` stop and turns
 * from blue to red at the `split` stop.
 */
export function signalLayout(
  anchors: readonly Anchor[],
  vertical: boolean,
  size: { width: number; height: number },
): SignalLayout | null {
  const byKey = new Map(anchors.map((a) => [a.key, a]));
  const first = byKey.get('mic');
  const last = byKey.get('next');
  const split = byKey.get('split');
  if (!first || !last || !split) return null;

  const along = (a: Anchor) => (vertical ? a.y : a.x);
  const start = along(first);
  const end = along(last);
  const length = end - start;
  if (length <= 0) return null;

  const fixed = vertical ? first.x : first.y;
  const point = (t: number) => (vertical ? `${round(fixed)} ${round(t)}` : `${round(t)} ${round(fixed)}`);
  const splitAt = Math.min(end, Math.max(start, along(split)));

  const head = 7;
  const arrow = vertical
    ? `M ${round(fixed - head)} ${round(end - head)} L ${round(fixed)} ${round(end)} L ${round(fixed + head)} ${round(end - head)}`
    : `M ${round(end - head)} ${round(fixed - head)} L ${round(end)} ${round(fixed)} L ${round(end - head)} ${round(fixed + head)}`;

  const stops = anchors
    .map((a) => ({ key: a.key, at: Math.min(1, Math.max(0, (along(a) - start) / length)) }))
    .sort((a, b) => a.at - b.at);

  return {
    width: Math.round(size.width),
    height: Math.round(size.height),
    vertical,
    full: `M ${point(start)} L ${point(end)}`,
    bluePath: `M ${point(start)} L ${point(splitAt)}`,
    redPath: `M ${point(splitAt)} L ${point(end)}`,
    arrow,
    split: (splitAt - start) / length,
    stops,
    start,
    end,
    cross: fixed,
  };
}
