// Procedural tiling detail maps for the examiners, written as separate same-origin WebP files
// (never embedded in the GLB). Deterministic: a fixed integer hash, no Math.random.
//
//   node apps/web/scripts/examiners/textures.mjs
//
// peel     powder-coat orange peel with pinholes (tangent-space normal)
// grooves  one smooth groove per tile along v (normal): machined grooves, page edges, conduit ribs
// grain    fine isotropic grain (normal): ceramic, lacquer, bench
// fibre    paper fibre and velvet nap (normal)
// speckle  speckle albedo multiplier (sRGB, mean ~0.92): powder coat, bisque, stone
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'models');

const hash = (x, y, s) => {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const smooth = (t) => t * t * (3 - 2 * t);

/** Periodic value noise: lattice period p (cells across the tile). */
function vnoise(u, v, p, seed) {
  const x = u * p;
  const y = v * p;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const w = (i, j) => hash(((i % p) + p) % p, ((j % p) + p) % p, seed);
  const a = w(x0, y0) + (w(x0 + 1, y0) - w(x0, y0)) * fx;
  const b = w(x0, y0 + 1) + (w(x0 + 1, y0 + 1) - w(x0, y0 + 1)) * fx;
  return a + (b - a) * fy;
}

function fbm(u, v, p, oct, seed) {
  let s = 0;
  let a = 1;
  let n = 0;
  for (let o = 0; o < oct; o++) {
    s += a * vnoise(u, v, p << o, seed + o * 17);
    n += a;
    a *= 0.5;
  }
  return s / n;
}

/** Height field (size x size, tiling) -> tangent-space normal map RGB. */
function normalMap(size, height, strength) {
  const H = new Float64Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) H[y * size + x] = height(x / size, y / size);
  const px = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const hL = H[y * size + ((x + size - 1) % size)];
      const hR = H[y * size + ((x + 1) % size)];
      const hD = H[((y + 1) % size) * size + x];
      const hU = H[((y + size - 1) % size) * size + x];
      let nx = -(hR - hL) * strength;
      let ny = (hU - hD) * strength;
      let nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l;
      ny /= l;
      nz /= l;
      const o = (y * size + x) * 3;
      px[o] = Math.round((nx * 0.5 + 0.5) * 255);
      px[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      px[o + 2] = Math.round((nz * 0.5 + 0.5) * 255);
    }
  }
  return px;
}

async function save(name, px, w, h, channels, opts) {
  const info = await sharp(px, { raw: { width: w, height: h, channels } })
    .webp(opts)
    .toFile(join(OUT, name));
  console.log(name, `${w}x${h}`, `${info.size} bytes`);
}

// orange peel: soft cells of a few millimetres, plus sparse pinholes
{
  const S = 128;
  const px = normalMap(
    S,
    (u, v) => {
      let h = fbm(u, v, 8, 3, 11) * 0.8;
      const pin = vnoise(u, v, 48, 5);
      h -= Math.max(0, pin - 0.9) * 2.2;
      return h;
    },
    9,
  );
  await save('examiners-peel-n.webp', px, S, S, 3, { quality: 90 });
}

// grooves: one rounded groove per tile, constant along u
{
  const W = 8;
  const S = 128;
  const px = normalMap(
    S,
    (u, v) => -Math.pow(Math.max(0, 1 - Math.abs(v - 0.5) * 3.2), 2) * 0.5,
    14,
  );
  // keep an 8-pixel wide strip (the pattern does not change along u)
  const strip = Buffer.alloc(W * S * 3);
  for (let y = 0; y < S; y++) px.copy(strip, y * W * 3, y * S * 3, y * S * 3 + W * 3);
  await save('examiners-grooves-n.webp', strip, W, S, 3, { lossless: true });
}

// grain: fine and even
{
  const S = 128;
  const px = normalMap(S, (u, v) => fbm(u, v, 32, 2, 23), 5);
  await save('examiners-grain-n.webp', px, S, S, 3, { quality: 90 });
}

// fibre: short fibres at random angles over a soft nap
{
  const S = 256;
  const H = new Float64Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) H[y * S + x] = fbm(x / S, y / S, 16, 3, 41) * 0.35;
  let seed = 7;
  const rnd = () => hash(seed++, 3, 99);
  for (let f = 0; f < 900; f++) {
    const cx = rnd() * S;
    const cy = rnd() * S;
    const a = rnd() * Math.PI;
    const len = 6 + rnd() * 16;
    const amp = 0.25 + rnd() * 0.35;
    for (let t = -len / 2; t <= len / 2; t += 0.5) {
      const x = Math.round(cx + Math.cos(a) * t);
      const y = Math.round(cy + Math.sin(a) * t);
      const i = (((y % S) + S) % S) * S + (((x % S) + S) % S);
      H[i] += amp * (1 - Math.abs(t) / (len / 2 + 0.5)) * 0.35;
    }
  }
  const px = normalMap(S, (u, v) => H[Math.floor(v * S) * S + Math.floor(u * S)], 3.2);
  await save('examiners-fibre-n.webp', px, S, S, 3, { quality: 90 });
}

// speckle: mostly 0.94, dark flecks and a few light ones (mean ~0.92)
{
  const S = 256;
  const px = Buffer.alloc(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const v = y / S;
      let g = 0.94 + (fbm(u, v, 8, 2, 3) - 0.5) * 0.05;
      const d = vnoise(u, v, 64, 71);
      const l = vnoise(u, v, 48, 83);
      if (d > 0.86) g *= 0.5 + (0.93 - Math.min(d, 0.93)) * 4;
      if (l > 0.9) g = Math.min(1, g + (l - 0.9) * 1.2);
      px[y * S + x] = Math.round(Math.max(0, Math.min(1, g)) * 255);
    }
  }
  await save('examiners-speckle.webp', px, S, S, 1, { quality: 92 });
}
