// Renders the examiners' DOM sprites and review sheets with headless Chromium (SwiftShader), from the
// same modules the site uses (faceMaterial.ts and rig.ts, bundled with esbuild) and the shipped
// public/models files.
//
//   node scripts/examiners/render.mjs portraits [--only clarity,structure] [--heads | --raised]
//       public/examiners/<key>-<state>.webp  head and shoulders, 360x360, <= 30 KB, 6 states
//       public/examiners/<key>-raised.webp   half body with the paddle raised, 480x600
//       and the PORTRAIT_COINS block of rig.ts (where the page sets the live mark on each coin)
//   node scripts/examiners/render.mjs faces <out.png> [--dark]   the 10 x 5 face parity sheet
//   node scripts/examiners/render.mjs sheet <out.png>            every sprite on both page canvases
//
// Playwright is not a dependency of the app: point PLAYWRIGHT_MODULE at an installed copy's
// index.mjs (for example $(npm root -g)/playwright/index.mjs) when import('playwright') fails.
import { build } from 'esbuild';
import sharp from 'sharp';
import http from 'node:http';
import { copyFile, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = resolve(HERE, '..', '..');
const SRC = join(WEB, 'src', 'components', 'room', 'examiners');
const SPRITES = join(WEB, 'public', 'examiners');
const RIG_TS = join(SRC, 'rig.ts');
const EXAMINERS = ['correctness', 'clarity', 'structure', 'conciseness', 'confidence'];
const STATES = ['neutral', 'listening', 'pleased', 'sceptical', 'speaking', 'marking'];
const HEAD = { render: 720, size: 360, maxBytes: 30 * 1024 };
const RAISED = { render: [960, 1200], size: [480, 600], maxBytes: 48 * 1024 };

const [cmd, ...rest] = process.argv.slice(2);
const flag = (name) => rest.includes(name);
const option = (name) => (rest.includes(name) ? rest[rest.indexOf(name) + 1] : undefined);
const positional = rest.find((a, i) => !a.startsWith('--') && rest[i - 1] !== '--only');
if (!['portraits', 'faces', 'sheet'].includes(cmd) || (cmd !== 'portraits' && !positional)) {
  console.error('usage: render.mjs portraits [--only key,...] [--heads | --raised] | faces <out.png> [--dark] | sheet <out.png>');
  process.exit(1);
}

/* ── Serve root: the studio pages, the bundled modules and links to three and public/ ── */
const root = await mkdtemp(join(tmpdir(), 'vv-examiners-'));
async function bundle() {
  await build({
    entryPoints: [join(SRC, 'faceMaterial.ts'), join(SRC, 'rig.ts')],
    bundle: true,
    format: 'esm',
    external: ['three'],
    target: 'es2022',
    outdir: join(root, 'lib'),
    logLevel: 'warning',
  });
}
await bundle();
for (const [name, target] of [
  ['three', join(WEB, 'node_modules', 'three')],
  ['models', join(WEB, 'public', 'models')],
  ['fonts', join(WEB, 'public', 'fonts')],
  ['examiners', SPRITES],
]) {
  await symlink(target, join(root, name));
}
for (const page of ['portrait.html', 'faces.html', 'sheet.html']) await copyFile(join(HERE, 'studio', page), join(root, page));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.glb': 'model/gltf-binary',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.woff': 'font/woff',
};
const server = http.createServer(async (req, res) => {
  const file = resolve(root, `.${decodeURIComponent(new URL(req.url ?? '/', 'http://studio').pathname)}`);
  if (!file.startsWith(root + sep)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}/`;

const pw = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const { chromium } = pw.default ?? pw;
const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});

/** Load a studio page, wait for body[data-done], return a transparent PNG and the page's stats. */
async function shoot(url, width, height, fullPage = false) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.stack ?? e)));
  let poll;
  try {
    await page.goto(base + url);
    await Promise.race([
      page.waitForSelector('body[data-done="1"]', { timeout: 300_000 }),
      new Promise((_, reject) => {
        poll = setInterval(() => errors.length && reject(new Error(`${url}\n${errors.join('\n')}`)), 200);
      }),
    ]);
    const png = await page.screenshot({ omitBackground: true, fullPage });
    const stats = await page.evaluate(() => window.__stats ?? null);
    return { png, stats };
  } finally {
    clearInterval(poll);
    await page.close();
  }
}

/** Downsample 2x and encode WebP with alpha, stepping quality down until it fits the budget. */
async function webp(png, width, height, maxBytes) {
  const img = sharp(png).resize(width, height, { kernel: 'lanczos3' });
  let out;
  for (let quality = 90; quality >= 50; quality -= 4) {
    out = { buf: await img.clone().webp({ quality, alphaQuality: 90, effort: 6, smartSubsample: true }).toBuffer(), quality };
    if (out.buf.length <= maxBytes) break;
  }
  return out;
}

async function portraits() {
  const only = option('--only')?.split(',') ?? EXAMINERS;
  const coins = {};
  for (const key of EXAMINERS.filter((k) => only.includes(k))) {
    for (const state of flag('--raised') ? [] : STATES) {
      const { png } = await shoot(`portrait.html?mode=portrait&who=${key}&state=${state}`, HEAD.render, HEAD.render);
      const { buf, quality } = await webp(png, HEAD.size, HEAD.size, HEAD.maxBytes);
      await writeFile(join(SPRITES, `${key}-${state}.webp`), buf);
      console.log(`${key}-${state}.webp  ${(buf.length / 1024).toFixed(1)} KB  q${quality}`);
    }
    if (flag('--heads')) continue;
    const { png, stats } = await shoot(`portrait.html?mode=half&who=${key}`, ...RAISED.render);
    const { buf, quality } = await webp(png, ...RAISED.size, RAISED.maxBytes);
    await writeFile(join(SPRITES, `${key}-raised.webp`), buf);
    coins[key] = stats.coin;
    console.log(`${key}-raised.webp  ${(buf.length / 1024).toFixed(1)} KB  q${quality}  coin ${JSON.stringify(stats.coin)}`);
  }
  // keep anchors of examiners not rendered this time
  const src = await readFile(RIG_TS, 'utf8');
  const prev = /export const PORTRAIT_COINS[^=]*=\s*([\s\S]*?);\s*\/\/ @portraits:end/.exec(src);
  const merged = { ...(prev ? JSON.parse(prev[1]) : {}), ...coins };
  const missing = EXAMINERS.filter((k) => !merged[k]);
  if (missing.length) throw new Error(`no coin anchor yet for ${missing.join(', ')}: render them too`);
  const ordered = Object.fromEntries(EXAMINERS.map((k) => [k, merged[k]]));
  const block = `// @portraits:begin (render.mjs writes this block; do not edit by hand)
export const PORTRAIT_COINS: Record<ExaminerKey, { readonly x: number; readonly y: number; readonly r: number }> = ${JSON.stringify(ordered, null, 2)};
// @portraits:end`;
  await writeFile(RIG_TS, src.replace(/\/\/ @portraits:begin[\s\S]*?\/\/ @portraits:end/, () => block));
  console.log('rig.ts PORTRAIT_COINS updated');
}

try {
  if (cmd === 'portraits') {
    await portraits();
  } else if (cmd === 'faces') {
    const { png } = await shoot(`faces.html?dpr=2${flag('--dark') ? '&theme=dark' : ''}`, 1880, 400, true);
    await writeFile(resolve(positional), png);
    console.log('face sheet ->', resolve(positional));
  } else {
    await bundle();   // pick up a PORTRAIT_COINS block written by an earlier run
    const { png } = await shoot('sheet.html', 1600, 600, true);
    await writeFile(resolve(positional), png);
    console.log('sprite sheet ->', resolve(positional));
  }
} finally {
  await browser.close();
  server.close();
  await rm(root, { recursive: true, force: true });
}
