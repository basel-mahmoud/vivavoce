/**
 * Khronos PBR Neutral tone mapping and its inverse, in linear sRGB.
 *
 * The room's cyclorama is an unlit surface in the page colour. The renderer
 * (or the post chain) tone-maps everything it draws, so a surface painted in
 * the plain page colour would come out a shade off. Painting it in the colour
 * that Neutral maps back onto the page colour makes the set melt into the
 * page at its edges in both schemes.
 */

export type RGB = readonly [number, number, number];

const START_COMPRESSION = 0.8 - 0.04;
const DESATURATION = 0.15;

/** Khronos PBR Neutral, as three.js implements it (linear in, linear out). */
export function neutral([r, g, b]: RGB): RGB {
  const x = Math.min(r, g, b);
  const offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  let c: [number, number, number] = [r - offset, g - offset, b - offset];
  const peak = Math.max(c[0], c[1], c[2]);
  if (peak < START_COMPRESSION) return c;
  const d = 1 - START_COMPRESSION;
  const newPeak = 1 - (d * d) / (peak + d - START_COMPRESSION);
  c = [(c[0] * newPeak) / peak, (c[1] * newPeak) / peak, (c[2] * newPeak) / peak];
  const g2 = 1 - 1 / (DESATURATION * (peak - newPeak) + 1);
  return [c[0] + (newPeak - c[0]) * g2, c[1] + (newPeak - c[1]) * g2, c[2] + (newPeak - c[2]) * g2];
}

/** The linear colour that Neutral maps onto `target` (fixed-point iteration). */
export function inverseNeutral(target: RGB): RGB {
  const m = Math.min(target[0], target[1], target[2]);
  if (m < 0.04) {
    // Below the toe the curve only subtracts x - 6.25x^2 from every channel.
    const x = Math.sqrt(m / 6.25);
    const off = x - m;
    return [target[0] + off, target[1] + off, target[2] + off];
  }
  let c: [number, number, number] = [target[0], target[1], target[2]];
  for (let i = 0; i < 60; i++) {
    const n = neutral(c);
    c = [c[0] + (target[0] - n[0]), c[1] + (target[1] - n[1]), c[2] + (target[2] - n[2])];
  }
  return c;
}

/** sRGB hex to linear components. */
export function hexToLinear(hex: string): RGB {
  const n = parseInt(hex.replace('#', ''), 16);
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)];
}

/** Linear components to 8-bit sRGB. */
export function linearToSrgb8([r, g, b]: RGB): RGB {
  const f = (v: number) => {
    const c = Math.min(1, Math.max(0, v));
    const s = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(s * 255);
  };
  return [f(r), f(g), f(b)];
}

/** The linear colour to paint so that, after Neutral, it lands on `hex`. */
export function preToneMapped(hex: string): RGB {
  return inverseNeutral(hexToLinear(hex));
}
