/**
 * Step 2b of the examiner build: compress the GLB's geometry with EXT_meshopt_compression.
 *
 *   node scripts/examiners/compress.mjs [in.glb] [out.glb]     (both default to public/models/examiners.glb)
 *
 * Lossless: every buffer view is meshopt-encoded as it is (ATTRIBUTES for vertex data, TRIANGLES for
 * index lists, no filters), and the script decodes each one again and checks it before writing: vertex
 * data byte for byte, triangles as the same triangles in the same winding (the index codec may start
 * a triangle at another of its corners). The geometry shrinks to under half, and it compresses far better on the wire (the CDN's
 * brotli takes 1.06 MB to about 270 KB instead of 497 KB). The page decodes it in JavaScript
 * (src/components/room/panel/meshopt.ts): the site's CSP rules out the WebAssembly decoder.
 * Already-compressed input is left as it is, so the step can run twice.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MeshoptEncoder } from 'meshoptimizer/encoder';
import { MeshoptDecoder } from '../../src/components/room/panel/meshopt-decoder.js';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const input = process.argv[2] ?? join(WEB, 'public', 'models', 'examiners.glb');
const output = process.argv[3] ?? input;
const EXT = 'EXT_meshopt_compression';

const glb = readFileSync(input);
if (glb.readUInt32LE(0) !== 0x46546c67) throw new Error(`${input}: not a GLB`);
const jsonLength = glb.readUInt32LE(12);
const json = JSON.parse(glb.subarray(20, 20 + jsonLength).toString('utf8'));
if (json.extensionsUsed?.includes(EXT)) {
  console.log(`${input} is already meshopt-compressed; nothing to do`);
  process.exit(0);
}
const binHeader = 20 + jsonLength;
if (glb.readUInt32LE(binHeader + 4) !== 0x004e4942) throw new Error('GLB: missing BIN chunk');
const bin = glb.subarray(binHeader + 8, binHeader + 8 + glb.readUInt32LE(binHeader));
if (json.buffers.length !== 1) throw new Error('GLB: expected a single buffer');

await MeshoptEncoder.ready;

const SIZE = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const indexViews = new Set(
  json.meshes.flatMap((m) => m.primitives.filter((p) => p.indices !== undefined).map((p) => json.accessors[p.indices].bufferView)),
);
const accessorsOf = new Map();
json.accessors.forEach((a) => accessorsOf.set(a.bufferView, [...(accessorsOf.get(a.bufferView) ?? []), a]));

const pad4 = (n) => (n + 3) & ~3;

/** The same triangles in the same order and winding, each possibly starting at another corner. */
function sameTriangles(a, b, stride) {
  const A = stride === 2 ? new Uint16Array(a.buffer, a.byteOffset, a.length / 2) : new Uint32Array(a.buffer, a.byteOffset, a.length / 4);
  const B = stride === 2 ? new Uint16Array(b.buffer, b.byteOffset, b.length / 2) : new Uint32Array(b.buffer, b.byteOffset, b.length / 4);
  for (let t = 0; t < A.length; t += 3) {
    const [x, y, z] = [A[t], A[t + 1], A[t + 2]];
    const rotations = [[x, y, z], [y, z, x], [z, x, y]];
    if (!rotations.some(([p, q, r]) => B[t] === p && B[t + 1] === q && B[t + 2] === r)) return false;
  }
  return true;
}
const parts = [];
let offset = 0;
for (const [index, view] of json.bufferViews.entries()) {
  const accessors = accessorsOf.get(index) ?? [];
  if (accessors.length !== 1 || (accessors[0].byteOffset ?? 0) !== 0) throw new Error(`bufferView ${index}: expected one accessor at offset 0`);
  const accessor = accessors[0];
  const element = SIZE[accessor.componentType] * COMPONENTS[accessor.type];
  const indices = indexViews.has(index);
  const stride = view.byteStride ?? element;
  if (indices ? stride !== 2 && stride !== 4 : stride % 4 !== 0) throw new Error(`bufferView ${index}: stride ${stride} cannot be meshopt-encoded`);
  if (indices && accessor.count % 3 !== 0) throw new Error(`bufferView ${index}: not a triangle list`);
  const mode = indices ? 'TRIANGLES' : 'ATTRIBUTES';

  // the view's bytes, padded to count * stride (a strided view may stop short after its last element)
  const start = view.byteOffset ?? 0;
  const source = new Uint8Array(accessor.count * stride);
  source.set(bin.subarray(start, start + Math.min(view.byteLength, source.length)));

  // version 0 of the vertex codec: every meshopt decoder reads it
  const encoded = MeshoptEncoder.encodeGltfBuffer(source, accessor.count, stride, mode, 0);
  const check = new Uint8Array(source.length);
  MeshoptDecoder.decodeGltfBuffer(check, accessor.count, stride, encoded, mode);
  if (!(indices ? sameTriangles(source, check, stride) : Buffer.compare(Buffer.from(check), Buffer.from(source)) === 0)) {
    throw new Error(`bufferView ${index}: round trip differs`);
  }

  view.buffer = 1;
  view.extensions = {
    ...view.extensions,
    [EXT]: { buffer: 0, byteOffset: offset, byteLength: encoded.length, byteStride: stride, count: accessor.count, mode },
  };
  parts.push(Buffer.from(encoded), Buffer.alloc(pad4(encoded.length) - encoded.length));
  offset += pad4(encoded.length);
}

const compressed = Buffer.concat(parts);
json.buffers = [
  { byteLength: compressed.length },
  // the uncompressed layout the buffer views describe; loaders rebuild it from buffer 0
  { byteLength: json.buffers[0].byteLength, extensions: { [EXT]: { fallback: true } } },
];
json.extensionsUsed = [...(json.extensionsUsed ?? []), EXT];
json.extensionsRequired = [...(json.extensionsRequired ?? []), EXT];

let jsonBytes = Buffer.from(JSON.stringify(json), 'utf8');
jsonBytes = Buffer.concat([jsonBytes, Buffer.alloc(pad4(jsonBytes.length) - jsonBytes.length, 0x20)]);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonBytes.length + 8 + compressed.length, 8);
const chunk = (type, body) => {
  const h = Buffer.alloc(8);
  h.writeUInt32LE(body.length, 0);
  h.writeUInt32LE(type, 4);
  return Buffer.concat([h, body]);
};
const out = Buffer.concat([header, chunk(0x4e4f534a, jsonBytes), chunk(0x004e4942, compressed)]);
writeFileSync(output, out);
console.log(`${output}: ${glb.length} -> ${out.length} bytes (geometry ${bin.length} -> ${compressed.length})`);
