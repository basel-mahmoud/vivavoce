import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { applyProps, useFrame, useThree } from '@react-three/fiber';

/** Where the light pools: the examiner in focus (world visor centre) and how strongly. */
export interface FocusLight {
  target: THREE.Vector3;
  strength: number;
}

/**
 * The studio. Product-shot light for the cast, built in code so nothing is fetched (CSP-safe):
 * a PMREM of Lightformer panels (key softbox, horizon strip, overhead, two tall rim strips, a
 * front strip for the visors' long glint, a cool fill and a warm floor bounce), one key that casts
 * the only shadow, two rims, a front fill, and a spot that pools on whoever has the floor.
 *
 * These are the exact lights the examiner finishes were colour-calibrated under
 * (scripts/examiners/README.md): change them and re-check the swatches.
 */
export function Studio({ dark, shadows, focusRef }: { dark: boolean; shadows: boolean; focusRef: React.RefObject<FocusLight> }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useLayoutEffect(() => {
    const env = new THREE.Scene();
    env.background = new THREE.Color(dark ? '#0a0b10' : '#4c4f57');
    const disposables: { dispose(): void }[] = [];
    const rect = new THREE.PlaneGeometry(1, 1);
    const disc = new THREE.CircleGeometry(0.5, 48);
    disposables.push(rect, disc);
    const former = (w: number, h: number, pos: readonly [number, number, number], i: number, color = '#ffffff', look: readonly [number, number, number] = [0, 1, 0]) => {
      const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(i), side: THREE.DoubleSide, toneMapped: false });
      disposables.push(m);
      const mesh = new THREE.Mesh(rect, m);
      mesh.scale.set(w, h, 1);
      mesh.position.set(...pos);
      mesh.lookAt(...look);
      env.add(mesh);
    };
    const k = dark ? 0.62 : 1;
    former(7, 4.5, [-5, 6, 7], 3.0 * k, '#fff6ea'); // key softbox
    former(16, 1.0, [0, 7, -9], 1.1 * k); // horizon strip
    former(9, 9, [0, 10, 0], 1.25 * k, '#ffffff', [0, 0, 0]); // overhead
    former(1.0, 12, [-8, 2, -4], dark ? 3.4 : 4.2, '#eef2ff'); // rim strip L
    former(1.0, 12, [8, 2, -4], dark ? 3.4 : 4.2, dark ? '#ffe2c4' : '#eef2ff'); // rim strip R
    former(1.2, 10, [4.5, 3, 8], 2.1 * k); // front strip: the visors' long glint
    former(5, 5, [7, 2, 6], 0.85 * k, '#e9efff'); // cool fill
    former(16, 6, [0, -5, 4], 0.42 * k, '#ffe8d2', [0, 2, 0]); // warm floor bounce
    const pm = new THREE.PMREMGenerator(gl);
    const rt = pm.fromScene(env, 0, 0.1, 100, { size: 256 });
    const prev = { environment: scene.environment, environmentIntensity: scene.environmentIntensity };
    applyProps(scene, { environment: rt.texture, environmentIntensity: dark ? 0.62 : 0.78 });
    pm.dispose();
    disposables.forEach((d) => d.dispose());
    return () => {
      applyProps(scene, prev);
      rt.dispose();
    };
  }, [gl, scene, dark]);

  const keyTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 0.7, -0.6);
    return o;
  }, []);
  const spot = useRef<THREE.SpotLight>(null);
  const spotTarget = useMemo(() => new THREE.Object3D(), []);
  const pos = useRef(new THREE.Vector3(0, 7.7, 3.9));
  const aim = useRef(new THREE.Vector3(0, 0.8, -0.2));
  const first = useRef(true);

  useFrame((_, delta) => {
    const f = focusRef.current;
    const s = spot.current;
    if (!f || !s) return;
    const dt = Math.min(delta, 0.1);
    const t = f.target;
    // 6.5 above and 4.4 in front of the visor, aimed a little below and in front of it
    const px = t.x + 0.8;
    const py = t.y + 6.5;
    const pz = t.z + 4.4;
    const k = first.current ? 1 : 1 - Math.exp(-4 * dt);
    pos.current.x += (px - pos.current.x) * k;
    pos.current.y += (py - pos.current.y) * k;
    pos.current.z += (pz - pos.current.z) * k;
    aim.current.x += (t.x - aim.current.x) * k;
    aim.current.y += (t.y - 0.45 - aim.current.y) * k;
    aim.current.z += (t.z + 0.3 - aim.current.z) * k;
    s.position.copy(pos.current);
    spotTarget.position.copy(aim.current);
    spotTarget.updateMatrixWorld();
    const full = dark ? 34 : 20;
    s.intensity += (full * f.strength - s.intensity) * (first.current ? 1 : 1 - Math.exp(-5 * dt));
    first.current = false;
  });

  return (
    <>
      <primitive object={keyTarget} />
      <primitive object={spotTarget} />
      <directionalLight
        position={[-6.5, 9, 7.5]}
        target={keyTarget}
        color={dark ? '#ffe9d2' : '#fff4e8'}
        intensity={dark ? 1.9 : 2.7}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-4.6}
        shadow-camera-right={4.6}
        shadow-camera-top={4.4}
        shadow-camera-bottom={-2.6}
        shadow-camera-near={4}
        shadow-camera-far={28}
        shadow-radius={5}
        shadow-bias={-0.0004}
        shadow-normalBias={0.022}
        shadow-intensity={dark ? 0.75 : 0.6}
      />
      <directionalLight position={[5, 6, -8]} color={dark ? '#ffd5ac' : '#e8eeff'} intensity={dark ? 3.2 : 1.9} />
      <directionalLight position={[-6, 5, -7]} color={dark ? '#b9c4ff' : '#ffffff'} intensity={dark ? 2.2 : 1.0} />
      <directionalLight position={[0.6, 2.2, 10]} color="#fff8f0" intensity={dark ? 0.5 : 0.6} />
      <spotLight
        ref={spot}
        target={spotTarget}
        color={dark ? '#ffd9b0' : '#fff2e2'}
        intensity={0}
        distance={0}
        angle={0.3}
        penumbra={0.8}
        decay={1.2}
      />
    </>
  );
}
