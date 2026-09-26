import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { HERO_COINS, HERO_COINS_COMPACT, coinPoints, coinVec, frame, makeShots, visorCentre, type Region } from './camera';
import { EXAMINERS } from './examiners/rig';

/** Project a point through a solved pose (lens shift included) to frame fractions. */
function project(p: THREE.Vector3, pose: ReturnType<typeof frame>, aspect: number) {
  const cam = new THREE.PerspectiveCamera(pose.fov, aspect, 0.1, 200);
  cam.position.copy(pose.pos);
  cam.lookAt(pose.look);
  cam.setViewOffset(aspect, 1, -pose.sx * aspect, -pose.sy, aspect, 1);
  cam.updateMatrixWorld();
  const v = p.clone().project(cam);
  return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
}

const inside = (q: { x: number; y: number }, r: Region, eps = 0.005) =>
  q.x >= r.x0 - eps && q.x <= r.x1 + eps && q.y >= r.y0 - eps && q.y <= r.y1 + eps;

describe('fitted frame', () => {
  it('fits every point inside the free region at any aspect ratio', () => {
    const pts = [new THREE.Vector3(-2, 0, 0), new THREE.Vector3(2, 2.4, -1), new THREE.Vector3(0.4, 1, 0.6)];
    const region = { x0: 0.46, x1: 0.98, y0: 0.15, y1: 0.85 };
    for (const aspect of [1440 / 900, 1280 / 800, 768 / 1024, 390 / 844]) {
      const pose = frame(pts, new THREE.Vector3(0, 1, -0.5), new THREE.Vector3(0, 0.1, 1), aspect, region, 22);
      for (const p of pts) expect(inside(project(p, pose, aspect), region)).toBe(true);
    }
  });
});

describe('room shots', () => {
  it('keeps every raised mark and every face of the hero inside the frame (desktop and phone)', () => {
    for (const [w, h, coins] of [
      [1440, 900, HERO_COINS],
      [390, 844, HERO_COINS_COMPACT],
    ] as const) {
      const aspect = w / h;
      const { poses } = makeShots(aspect, { hero: 0.4, beat: 0.34, outro: 0.34 }, w);
      const faces = w > 768 ? EXAMINERS : (['clarity', 'structure', 'conciseness'] as const);
      for (const c of coins) for (const p of coinPoints(coinVec(c), 0.21)) {
        const q = project(p, poses.hero, aspect);
        expect(q.x).toBeGreaterThan(-0.01);
        expect(q.x).toBeLessThan(1.01);
        expect(q.y).toBeGreaterThan(0);
      }
      for (const k of faces) {
        const q = project(visorCentre(k), poses.hero, aspect);
        expect(q.x).toBeGreaterThan(0);
        expect(q.x).toBeLessThan(1);
      }
    }
  });
});
