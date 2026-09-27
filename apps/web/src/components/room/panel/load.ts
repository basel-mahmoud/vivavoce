import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { detailImages, modelBytes } from '../assets';

/** Keep one result per page; a failure clears it, so a later mount may try again. */
function once<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () =>
    (pending ??= load().catch((error: unknown) => {
      pending = null;
      throw error;
    }));
}

/**
 * The parsed cast, shared by every canvas that shows the panel (the room and the engine's stage):
 * each builds its own copy of the scene graph from it (cast.ts), so parsing once is enough.
 */
export const loadModel = once<GLTF>(() => modelBytes().then((buffer) => new GLTFLoader().parseAsync(buffer, '')));

/** The detail maps as textures, in DETAIL_TEXTURES order (already decoded; see assets.ts). */
export const loadDetailTextures = once(() =>
  detailImages().then((images) =>
    images.map(({ image, flipped }) => {
      const t = new THREE.Texture(image);
      // TextureLoader's orientation: an ImageBitmap arrives flipped already, an image element is flipped on upload
      t.flipY = !flipped;
      t.needsUpdate = true;
      return t;
    }),
  ),
);
