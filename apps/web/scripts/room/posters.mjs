/**
 * Renders the room's LCP posters from the live scene (no painting, no generation): the hero shot
 * as the page first shows it, in both colour schemes, for wide screens (1440 x 900, desktop tier)
 * and phones (390 x 844 at 2x, phone tier), then encodes AVIF and WebP with sharp into
 * public/room/. Reduced motion is emulated so the frame is the still, fully marked panel (no
 * blink, no breathing), which is also what the live canvas cross-fades from.
 *
 * Each image gets a provenance sidecar (<file>.json, the format `impeccable embed-prompt` reads
 * for AVIF and WebP) stating what it is a render of.
 *
 * Usage (from apps/web, with `next dev` running on BASE, default http://localhost:3200; the
 * dev-only ?tier= override pins the render tier):
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/room/posters.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');

const BASE = process.env.BASE ?? 'http://localhost:3200';
const OUT = path.resolve('public/room');
const SHOTS = [
  { name: 'hero-light-1440', scheme: 'light', w: 1440, h: 900, dpr: 1, tier: 2 },
  { name: 'hero-dark-1440', scheme: 'dark', w: 1440, h: 900, dpr: 1, tier: 2 },
  { name: 'hero-light-390', scheme: 'light', w: 390, h: 844, dpr: 2, tier: 1 },
  { name: 'hero-dark-390', scheme: 'dark', w: 390, h: 844, dpr: 2, tier: 1 },
];
// Only the canvas: no nav, captions, tags, ruler, notes or the previous poster. Opacity, not
// display or visibility: the captions keep their boxes (phones frame the room below them) and
// their own inline visibility cannot bring them back.
const HIDE = `
  header, nextjs-portal, section picture, [data-room-canvas] ~ *, [data-room-canvas] ~ * * { opacity: 0 !important; }
  [data-room-canvas] { opacity: 1 !important; transition: none !important; }
`;

const origin = (s) =>
  `Rendered, not generated: the live room scene (src/components/room) at ${s.w}x${s.h} CSS px, ` +
  `${s.dpr}x, ${s.scheme} scheme, reduced motion (the still, marked hero), render tier ${s.tier}; captured ` +
  `with Playwright and encoded by sharp in scripts/room/posters.mjs. Models and maps: examiners.glb and ` +
  `its procedural detail textures (scripts/examiners); no third-party imagery.`;

async function save(file, buffer, s) {
  await writeFile(file, buffer);
  await writeFile(`${file}.json`, `${JSON.stringify({ prompt: origin(s), createdAt: new Date().toISOString() }, null, 2)}\n`);
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});
for (const s of SHOTS) {
  const ctx = await browser.newContext({
    viewport: { width: s.w, height: s.h },
    deviceScaleFactor: s.dpr,
    colorScheme: s.scheme,
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?tier=${s.tier}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('section[data-ready="true"]', { timeout: 240000 });
  await page.addStyleTag({ content: HIDE });
  await page.waitForTimeout(4000);
  const png = await page.locator('[data-room-canvas] canvas').first().screenshot({ type: 'png' });
  const img = sharp(png).resize(s.w * s.dpr, s.h * s.dpr, { fit: 'fill' });
  await save(path.join(OUT, `${s.name}.avif`), await img.clone().avif({ quality: 52, effort: 7, chromaSubsampling: '4:2:0' }).toBuffer(), s);
  await save(path.join(OUT, `${s.name}.webp`), await img.clone().webp({ quality: 78, effort: 6 }).toBuffer(), s);
  console.log(`${s.name}: done`);
  await ctx.close();
}
await browser.close();
