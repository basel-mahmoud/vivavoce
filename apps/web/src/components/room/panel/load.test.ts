import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EXAMINERS, examinerNodes } from '../examiners/rig';
import { meshoptDecoder } from './meshopt';

const file = readFileSync(new URL('../../../../public/models/examiners.glb', import.meta.url));
const glb = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
const json = JSON.parse(new TextDecoder().decode(new Uint8Array(glb, 20, new DataView(glb).getUint32(12, true))));

describe('the shipped cast (examiners.glb)', () => {
  it('is meshopt-compressed, which the page decodes without WebAssembly', () => {
    expect(json.extensionsRequired).toContain('EXT_meshopt_compression');
  });

  it('decodes into the full rig, every triangle and every position inside its bounds', async () => {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(meshoptDecoder as unknown as Parameters<GLTFLoader['setMeshoptDecoder']>[0]);
    const gltf = await loader.parseAsync(glb, '');
    for (const key of EXAMINERS) expect(() => examinerNodes(gltf.scene, key)).not.toThrow();

    const expected = json.meshes.reduce(
      (n: number, m: { primitives: { indices: number }[] }) => n + m.primitives.reduce((k, p) => k + json.accessors[p.indices].count, 0),
      0,
    );
    const seen = new Set<THREE.BufferGeometry>();
    let indices = 0;
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || seen.has(mesh.geometry)) return;
      seen.add(mesh.geometry);
      indices += mesh.geometry.index?.count ?? 0;
      const position = mesh.geometry.getAttribute('position');
      mesh.geometry.computeBoundingBox();
      const box = mesh.geometry.boundingBox!;
      expect(Number.isFinite(box.min.x + box.max.y) && position.count > 0).toBe(true);
    });
    expect(indices).toBe(expected);

    // every position decodes to the bounds the file declares for it (accessor min/max)
    const positions: number[] = json.meshes.flatMap((m: { primitives: { attributes: { POSITION: number } }[] }) =>
      m.primitives.map((p) => p.attributes.POSITION),
    );
    for (const index of new Set(positions)) {
      const declared = json.accessors[index];
      // normalised integers declare their bounds as stored integers; the attribute reads them as -1..1
      const scale = declared.normalized ? ({ 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 } as Record<number, number>)[declared.componentType]! : 1;
      const attribute: THREE.BufferAttribute = await gltf.parser.getDependency('accessor', index);
      for (let c = 0; c < 3; c++) {
        let lo = Infinity;
        let hi = -Infinity;
        for (let i = 0; i < attribute.count; i++) {
          const v = attribute.getComponent(i, c);
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
        expect(lo).toBeCloseTo(declared.min[c] / scale, 4);
        expect(hi).toBeCloseTo(declared.max[c] / scale, 4);
      }
    }
  });
});
