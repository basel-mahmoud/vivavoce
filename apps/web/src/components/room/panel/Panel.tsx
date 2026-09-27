import { use, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { buildCast, detailMaps, type Cast } from './cast';
import { loadDetailTextures, loadModel } from './load';
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
  /**
   * Development review only: how fast the cast's clock runs against the frames it is given.
   * Defaults to the page's `?timescale`; a stage that steps its own frames on a slowed clock
   * passes 1, since its steps are already in slow time.
   */
  timeScale?: number;
}

/** Longest step the animation takes in one frame, so a stalled tab resumes calmly. */
const MAX_STEP = 0.1;

/**
 * The five examiners and their bench, animated from `channelsRef`. Suspends while the GLB and the
 * detail maps load (wrap it in Suspense). Reusable: any director that writes PanelChannels can
 * drive it, in this room or in a second, lighter canvas.
 */
export function Panel({ channelsRef, dark, shadows, onReady, timeScale }: PanelProps) {
  // both downloads are usually under way already (assets.ts); ask for both before waiting on either
  const model = loadModel();
  const details = loadDetailTextures();
  const gltf = use(model);
  const textures = use(details);
  const maps = useMemo(() => detailMaps(textures), [textures]);
  // the cast is built once in the scheme it first meets; later scheme changes swap materials only
  const [initialScheme] = useState<'light' | 'dark'>(dark ? 'dark' : 'light');
  const cast = useMemo(() => buildCast(gltf.scene, maps, initialScheme), [gltf, maps, initialScheme]);
  const time = useRef(0);
  const scale = useRef(timeScale ?? devTimeScale());

  // development only: the review scripts wait on the paddles through this
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as { __vvCast?: Cast }).__vvCast = cast;
  }, [cast]);

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
