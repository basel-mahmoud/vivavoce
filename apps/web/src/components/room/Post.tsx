import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { DepthOfField, EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode, type DepthOfFieldEffect } from 'postprocessing';
import type { DofState } from './Director';
import { preToneMapped } from './tone';
import { CANVAS } from './set/Cyclorama';

/** The part of N8AO's pass this file touches (the wrapper does not expose transparencyAware). */
interface N8AOPass {
  configuration: { transparencyAware: boolean };
}

/**
 * Post for the desktop tiers, loaded on demand so none of it is in the first bundle.
 * Tier 2: contact AO at half resolution, SMAA. Tier 3: AO at full resolution, 4x MSAA, and depth
 * of field that fades in only as the camera settles on a close-up or the shoulder shot.
 * Neutral tone mapping runs last (the composer turns the renderer's own off).
 */
export default function Post({ tier, dark, dofRef, onReady }: { tier: 2 | 3; dark: boolean; dofRef: React.RefObject<DofState>; onReady?: () => void }) {
  const n8 = useRef<N8AOPass>(null);
  const depth = useRef<DepthOfFieldEffect>(null);
  const focusStart = useMemo(() => new THREE.Vector3(0, 1.2, -0.5), []);

  // troika glyphs and the loupe lens are transparent: transparency-aware AO would draw each of
  // them twice more per frame for no visible gain (they sit on opaque surfaces)
  useLayoutEffect(() => {
    if (n8.current) n8.current.configuration.transparencyAware = false;
  });

  // the composer tone-maps the cleared background too, so clear to the pre-compensated page colour
  const background = useMemo(() => preToneMapped(dark ? CANVAS.dark : CANVAS.light), [dark]);

  // on-demand rendering (reduced motion) draws only when asked: ask for the first frames here
  const invalidate = useThree((s) => s.invalidate);
  const frames = useRef(0);
  useLayoutEffect(() => invalidate(), [invalidate]);
  useFrame(() => {
    const e = depth.current;
    const d = dofRef.current;
    if (e && d) {
      (e.target as THREE.Vector3 | null)?.copy(d.focus);
      e.blendMode.opacity.value = Math.min(1, Math.max(0, d.amount));
    }
    if (frames.current < 3) {
      frames.current += 1;
      if (frames.current === 3) onReady?.();
      else invalidate();
    }
  });

  return (
    <>
    <color attach="background" args={background} />
    <EffectComposer multisampling={tier >= 3 ? 4 : 0} frameBufferType={THREE.HalfFloatType} enableNormalPass={false}>
      <N8AO
        ref={n8 as React.Ref<never>}
        aoRadius={0.36}
        distanceFalloff={0.7}
        intensity={dark ? 2.0 : 2.4}
        color={dark ? '#000000' : '#1c2130'}
        quality={tier >= 3 ? 'medium' : 'low'}
        halfRes={tier < 3}
      />
      {tier >= 3 ? (
        <DepthOfField ref={depth} target={focusStart} worldFocusRange={0.5} bokehScale={4.5} resolutionScale={0.5} />
      ) : (
        <></>
      )}
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      {tier < 3 ? <SMAA /> : <></>}
    </EffectComposer>
    </>
  );
}
