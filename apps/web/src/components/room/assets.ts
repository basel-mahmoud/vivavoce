/**
 * The room's downloads: the cast (GLB), its tiling detail maps and the two fonts its 3D labels are
 * set in. No three.js here, so the page can start all of them the moment it decides to bring the
 * room to life, in parallel with the room's code instead of one after another behind it. The loaders
 * in panel/load.ts read the same promises, so nothing is fetched twice. (Relative imports only:
 * scripts/examiners/render.mjs bundles rig.ts, and this with it, without the `@/` alias.)
 */
import { asset } from '../../lib/assets';
import { bootMark, type BootMilestone } from '../boot/client';

export const MODEL_URL = asset('/models/examiners.glb');

/** Tiling detail maps shipped as separate same-origin files (never inside the GLB). */
export const DETAIL_TEXTURES = {
  /** powder-coat orange peel with pinholes (normal) */
  peel: asset('/models/examiners-peel-n.webp'),
  /** one smooth groove per tile along v (normal): machined grooves, page edges, conduit ribs */
  grooves: asset('/models/examiners-grooves-n.webp'),
  /** fine isotropic grain (normal): ceramic, lacquer, bench */
  grain: asset('/models/examiners-grain-n.webp'),
  /** paper fibre and velvet nap (normal) */
  fibre: asset('/models/examiners-fibre-n.webp'),
  /** speckle (albedo multiplier, mean ~0.92): powder coat and stone */
  speckle: asset('/models/examiners-speckle.webp'),
} as const;

/**
 * The marks (digits) and the axis names on the paddles and the bench, in fonts cut down to those
 * glyphs (scripts/examiners/label-fonts.mjs): a few KB each, and quick for the text renderer to parse.
 */
export const FONT_MONO = asset('/fonts/jetbrains-mono-700-digits.woff');
export const FONT_DISPLAY = asset('/fonts/archivo-900-labels.woff');

function once<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () =>
    (pending ??= load().catch((error: unknown) => {
      // a later mount (the engine's stage, a retry) may try again
      pending = null;
      throw error;
    }));
}

async function get(url: string): Promise<Response> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res;
}

/**
 * The whole length of a binary glTF, read from its 12-byte header (magic `glTF`, version, length,
 * little-endian), or 0 when these bytes are not one. The header is exact whatever the transfer: the
 * server compresses the model (gzip here, brotli on the CDN) and then sends no usable Content-Length.
 */
export function glbLength(head: Uint8Array): number {
  if (head.length < 12) return 0;
  const view = new DataView(head.buffer, head.byteOffset, 12);
  return view.getUint32(0, true) === 0x46546c67 ? view.getUint32(8, true) : 0;
}

/**
 * A response's bytes, read as they stream in, reporting the share received: of the length its first
 * bytes declare (`sized`, for a GLB), else of an uncompressed Content-Length. With neither it
 * reports nothing until the end (the loader's other milestones carry it meanwhile).
 */
async function streamed(res: Response, report: (fraction: number) => void, sized?: (head: Uint8Array) => number): Promise<ArrayBuffer> {
  const reader = res.body?.getReader();
  if (!reader) return res.arrayBuffer();
  const encoded = (res.headers.get('content-encoding') ?? 'identity') !== 'identity';
  let total = encoded ? 0 : Number(res.headers.get('content-length')) || 0;
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (sized && chunks.length === 1 && value.length >= 12) total = sized(value) || total;
    if (total > 0) report(Math.min(0.99, received / total));
  }
  const bytes = new Uint8Array(received);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.length;
  }
  return bytes.buffer;
}

/** Reports a group of downloads to the first-visit loader as the share of them finished. */
function counted<T>(name: BootMilestone, jobs: Promise<T>[]): Promise<T[]> {
  let finished = 0;
  bootMark(name, 0);
  return Promise.all(
    jobs.map((job) =>
      job.then((value) => {
        finished += 1;
        bootMark(name, finished / jobs.length);
        return value;
      }),
    ),
  );
}

/** The GLB's bytes (their progress goes to the first-visit loader). */
export const modelBytes = once(() => {
  bootMark('model', 0);
  return get(MODEL_URL)
    .then((r) => streamed(r, (f) => bootMark('model', f), glbLength))
    .then((buffer) => {
      bootMark('model');
      return buffer;
    });
});

/** A detail map, decoded off the main thread where the browser can (flipped as three's TextureLoader would upload it). */
export interface DetailImage {
  image: ImageBitmap | HTMLImageElement;
  /** Already flipped vertically (an ImageBitmap): upload with flipY off. */
  flipped: boolean;
}

async function decode(blob: Blob): Promise<DetailImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const image = await createImageBitmap(blob, { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
      return { image, flipped: true };
    } catch {
      // an engine without these options: decode through an image element instead
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { image: img, flipped: false };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The detail maps, in DETAIL_TEXTURES order. */
export const detailImages = once(() =>
  counted(
    'textures',
    Object.values(DETAIL_TEXTURES).map((url) => get(url).then((r) => r.blob()).then(decode)),
  ),
);

/**
 * The label fonts, fetched into the HTTP cache (they are served with a year of caching), where the
 * text renderer, which fetches fonts by URL itself, finds them.
 */
export const labelFonts = once(() =>
  counted(
    'labels',
    [FONT_MONO, FONT_DISPLAY].map((url) => get(url).then((r) => r.arrayBuffer())),
  ),
);

/** Start every download the room needs. Failures surface where the room reads them (its error boundary). */
export function prefetchRoom() {
  for (const start of [modelBytes, detailImages, labelFonts]) start().catch(() => {});
}
