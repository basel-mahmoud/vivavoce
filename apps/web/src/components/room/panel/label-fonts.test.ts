import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { AXIS_NAME } from '../examiners/rig';
import { FONT_DISPLAY, FONT_MONO } from '../assets';

/** The code points a WOFF (1.0) font maps to a glyph, from its cmap (formats 4 and 12). */
function codePoints(path: string): Set<number> {
  const woff = readFileSync(new URL(`../../../../public${path.split('?')[0]}`, import.meta.url));
  if (woff.toString('latin1', 0, 4) !== 'wOFF') throw new Error(`${path}: not a WOFF`);
  let cmap: Buffer | null = null;
  for (let i = 0, n = woff.readUInt16BE(12); i < n; i++) {
    const at = 44 + i * 20;
    if (woff.toString('latin1', at, at + 4) !== 'cmap') continue;
    const offset = woff.readUInt32BE(at + 4);
    const length = woff.readUInt32BE(at + 8);
    const raw = woff.subarray(offset, offset + length);
    cmap = length < woff.readUInt32BE(at + 12) ? inflateSync(raw) : raw;
  }
  if (!cmap) throw new Error(`${path}: no cmap`);
  const out = new Set<number>();
  for (let i = 0, n = cmap.readUInt16BE(2); i < n; i++) {
    const sub = cmap.readUInt32BE(4 + i * 8 + 4);
    const format = cmap.readUInt16BE(sub);
    if (format === 4) {
      const segs = cmap.readUInt16BE(sub + 6) / 2;
      const ends = sub + 14;
      const starts = ends + segs * 2 + 2;
      const deltas = starts + segs * 2;
      const ranges = deltas + segs * 2;
      for (let s = 0; s < segs; s++) {
        const end = cmap.readUInt16BE(ends + s * 2);
        const start = cmap.readUInt16BE(starts + s * 2);
        const delta = cmap.readInt16BE(deltas + s * 2);
        const range = cmap.readUInt16BE(ranges + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          const glyph = range === 0 ? (c + delta) & 0xffff : cmap.readUInt16BE(ranges + s * 2 + range + (c - start) * 2);
          if (glyph !== 0) out.add(c);
        }
      }
    } else if (format === 12) {
      for (let g = 0, n = cmap.readUInt32BE(sub + 12); g < n; g++) {
        const at = sub + 16 + g * 12;
        for (let c = cmap.readUInt32BE(at); c <= cmap.readUInt32BE(at + 4); c++) out.add(c);
      }
    }
  }
  return out;
}

describe('the fonts of the 3D labels', () => {
  it('hold every letter of every axis name, as set on the bench and on the paddles', () => {
    const have = codePoints(FONT_DISPLAY);
    const names = Object.values(AXIS_NAME).flatMap((n) => [n, n.toUpperCase()]).join('');
    for (const ch of new Set(names)) expect(have.has(ch.codePointAt(0)!), `"${ch}" in ${FONT_DISPLAY}`).toBe(true);
  });

  it('hold every digit a mark can show', () => {
    const have = codePoints(FONT_MONO);
    for (const ch of '0123456789') expect(have.has(ch.codePointAt(0)!), `"${ch}" in ${FONT_MONO}`).toBe(true);
  });
});
