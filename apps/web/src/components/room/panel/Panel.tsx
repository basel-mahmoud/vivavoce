import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DETAIL_URLS, MODEL_URL, buildCast, detailMaps, type Cast } from './cast';
import type { PanelChannels } from './channels';
import { devTimeScale } from '../dev';

export interface PanelProps {
  /** Written by a director every frame (useFrame priority below 0), read here. */
  channelsRef: React.RefObject<PanelChannels>;
  dark: boolean;
  /** Cast and receive the key light's shadow (desktop tiers). */
  shadows: boolean;
  /** Called once the cast is on screen with every mark and label set. */
  onReady?: (cast: Cast) => void;
}

/** Longest step the animation takes in one frame, so a stalled tab resumes calmly. */
const MAX_STEP = 0.1;

/**
 * The five examiners and their bench, animated from `channelsRef`. Suspends while the GLB and the
 * detail maps load (wrap it in Suspense). Reusable: any director that writes PanelChannels can
 * drive it, in this room or in a second, lighter canvas.
 */
export function Panel({ channelsRef, dark, shadows, onReady }: PanelProps) {
  const gltf = useLoader(GLTFLoader, MODEL_URL);
  const textures = useLoader(THREE.TextureLoader, DETAIL_URLS);
  const maps = useMemo(() => detailMaps(textures), [textures]);
  // the cast is built once in the scheme it first meets; later scheme changes swap materials only
  const [initialScheme] = useState<'light' | 'dark'>(dark ? 'dark' : 'light');
  const cast = useMemo(() => buildCast(gltf.scene, maps, initialScheme), [gltf, maps, initialScheme]);
  const time = useRef(0);
  const scale = useRef(devTimeScale());

  useLayoutEffect(() => cast.setScheme(dark ? 'dark' : 'light'), [cast, dark]);
  useLayoutEffect(() => cast.setShadows(shadows), [cast, shadows]);
  useEffect(() => () => cast.dispose(), [cast]);

  useEffect(() => {
    let alive = true;
    void cast.ready.then(() => {
      if (alive) onReady?.(cast);
    });
    return () => {
      alive = false;
    };
  }, [cast, onReady]);

  useFrame((state, delta) => {
    const ch = channelsRef.current;
    if (!ch) return;
    const dt = Math.min(delta, MAX_STEP) * scale.current;
    time.current += dt;
    cast.update(time.current, dt, state.camera, ch);
  });

  return <primitive object={cast.root} />;
}
