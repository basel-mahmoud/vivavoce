/**
 * The two fonts the room's 3D labels are set in, cut down to the glyphs the labels use: the paddle
 * marks are digits (JetBrains Mono 700) and the axis names are letters (Archivo Black). Troika
 * parses a whole font before it sets a glyph, so the full files cost the room about 45 KB and a
 * long parse; the subsets are about 7 KB. Outlines, advances, kerning and ligatures are kept.
 * The full fonts stay beside them for the studio sheets.
 *
 *   node scripts/examiners/label-fonts.mjs       (needs fontTools: pip install fonttools)
 *
 * src/components/room/panel/label-fonts.test.ts checks that every character a label can show is in
 * its subset.
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FONTS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'fonts');

export const LABEL_FONTS = [
  { from: 'archivo-900.woff', to: 'archivo-900-labels.woff', text: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' },
  { from: 'jetbrains-mono-700.woff', to: 'jetbrains-mono-700-digits.woff', text: '0123456789' },
];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const { from, to, text } of LABEL_FONTS) {
    execFileSync('python3', [
      '-m', 'fontTools.subset', join(FONTS, from),
      `--text=${text}`, '--layout-features=*', '--name-IDs=*', '--name-languages=*', '--no-hinting', '--flavor=woff',
      `--output-file=${join(FONTS, to)}`,
    ], { stdio: 'inherit' });
    console.log(`public/fonts/${to}`);
  }
}
