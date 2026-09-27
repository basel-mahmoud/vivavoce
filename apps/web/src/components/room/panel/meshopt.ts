import { MeshoptDecoder as reference } from './meshopt-decoder.js';

/**
 * The GLB's geometry decoder (EXT_meshopt_compression, see scripts/examiners/compress.mjs) for
 * three's GLTFLoader. The site's CSP rules out meshopt's WebAssembly decoder, so this runs the
 * plain-JavaScript reference decoder, one buffer view per job, in slices of a few milliseconds with
 * a yield between them: the whole model costs tens of milliseconds of script, and none of it lands
 * as one long task while the page is being read.
 */
const SLICE_MS = 8;
const jobs: (() => void)[] = [];
let channel: MessageChannel | null = null;
let pumping = false;

function pump() {
  const end = performance.now() + SLICE_MS;
  while (jobs.length && performance.now() < end) jobs.shift()!();
  if (jobs.length) yieldThen();
  else pumping = false;
}

/** Continue in a fresh task, without setTimeout's clamping. */
function yieldThen() {
  if (typeof MessageChannel === 'undefined') {
    setTimeout(pump, 0);
    return;
  }
  if (!channel) {
    channel = new MessageChannel();
    channel.port1.onmessage = pump;
  }
  channel.port2.postMessage(null);
}

export const meshoptDecoder = {
  supported: true,
  ready: Promise.resolve(),
  decodeGltfBuffer: reference.decodeGltfBuffer,
  decodeGltfBufferAsync(count: number, stride: number, source: Uint8Array, mode: string, filter?: string): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      jobs.push(() => {
        try {
          const target = new Uint8Array(count * stride);
          reference.decodeGltfBuffer(target, count, stride, source, mode, filter);
          resolve(target);
        } catch (error) {
          reject(error);
        }
      });
      if (!pumping) {
        pumping = true;
        yieldThen();
      }
    });
  },
};
