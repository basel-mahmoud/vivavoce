import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { preToneMapped } from '../tone';
import type { FocusLight } from './Studio';

/** The floor the bench stands on (the bench apron runs from 0 down to here). */
export const FLOOR = -0.5;
/** Where the floor starts to curve up into the wall, and the curve's radius. */
const COVE_Z = -1.6;
const COVE_R = 1.15;
/** The vertical wall's plane. */
export const WALL_Z = COVE_Z - COVE_R;

const poolGoal = new THREE.Vector2();

/** Page canvases (globals.css --vv-canvas), day and night. */
export const CANVAS = { light: '#f3f5f8', dark: '#0c0e14' } as const;

/** A seamless floor-to-wall sweep: floor toward the candidate, a quarter-round cove, the wall. */
function sweepGeometry() {
  const prof: [number, number][] = [];
  for (let z = 16; z > COVE_Z; z -= 0.5) prof.push([FLOOR, z]);
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * (Math.PI / 2);
    prof.push([FLOOR + COVE_R - COVE_R * Math.cos(a), COVE_Z - COVE_R * Math.sin(a)]);
  }
  for (let y = FLOOR + COVE_R + 0.5; y <= 32; y += 1) prof.push([y, WALL_Z]);
  const X = 48;
  const nx = 2;
  const pos: number[] = [];
  const idx: number[] = [];
  prof.forEach(([y, z]) => {
    for (let i = 0; i <= nx; i++) pos.push(-X + (2 * X * i) / nx, y, z);
  });
  for (let j = 0; j < prof.length - 1; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      const b = a + 1;
      const c = a + nx + 1;
      const d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const PARS = /* glsl */ `
varying vec3 vW;
uniform vec3 uPool;
uniform vec2 uPoolAt;
uniform vec3 uRule;
uniform vec3 uMargin;
uniform float uMarginX;
uniform float uWallZ;
uniform float uFloor;
uniform vec2 uScreen;
uniform vec4 uMask;
float vvLine(float coord, float halfWidth) {
  float aa = fwidth(coord);
  float d = abs(fract(coord + 0.5) - 0.5);
  float cover = 1.0 - smoothstep(halfWidth - aa, halfWidth + aa, d);
  // fade before the rules can shimmer at a distance
  return cover * clamp(1.6 - aa * 7.0, 0.0, 1.0);
}
`;

const BODY = /* glsl */ `
{
  // the lamp pool on the wall behind whoever has the floor
  vec2 d = vec2((vW.x - uPoolAt.x) / 3.2, (max(vW.y, uFloor) - uPoolAt.y) / 2.1);
  // behind the captions the wall is plain page again, so text always sits on the page colour
  vec2 fc = gl_FragCoord.xy / uScreen;
  float keep = smoothstep(uMask.x, uMask.y, fc.x) * smoothstep(uMask.z, uMask.w, 1.0 - fc.y);
  float pool = exp(-dot(d, d) * 1.6) * smoothstep(0.6, -2.4, vW.z) * keep;
  diffuseColor.rgb += uPool * pool;
  // the exam paper: faint blue rules and a red margin rule on the wall, only where the light
  // reaches, so the set still melts into the page at its edges
  float wall = smoothstep(uWallZ + 0.45, uWallZ + 0.06, vW.z);
  vec2 dr = vec2((vW.x - uPoolAt.x) / 3.6, (vW.y - uPoolAt.y + 0.25) / 1.7);
  float reach = exp(-dot(dr, dr) * 1.4) * wall * keep;
  float rule = vvLine((vW.y - uFloor) / 0.17, 0.035);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uRule, rule * reach * 0.6);
  float margin = vvLine((vW.x - uMarginX) / 40.0, 0.00018) * reach;
  diffuseColor.rgb = mix(diffuseColor.rgb, uMargin, margin * 0.55);
}
`;

/**
 * The set. An unlit sweep painted in the colour that Neutral tone mapping maps onto the page, so
 * the room lands exactly on --vv-canvas and melts into the page at the frame's edges, while the
 * lamp pool, the ruled wall and the soft shadows it catches make it a place.
 */
export function Cyclorama({
  dark,
  shadows,
  focusRef,
  maskRef,
}: {
  dark: boolean;
  shadows: boolean;
  focusRef: React.RefObject<FocusLight>;
  /** Screen fractions where the captions sit: (x fade start, x fade end, y fade start, y fade end). */
  maskRef: React.RefObject<THREE.Vector4>;
}) {
  const geometry = useMemo(() => sweepGeometry(), []);
  const uniforms = useMemo(
    () => ({
      uPool: { value: new THREE.Color() },
      uPoolAt: { value: new THREE.Vector2(0.1, 1.3) },
      uRule: { value: new THREE.Color() },
      uMargin: { value: new THREE.Color() },
      uMarginX: { value: -3.05 },
      uWallZ: { value: WALL_Z },
      uFloor: { value: FLOOR },
      uScreen: { value: new THREE.Vector2(1, 1) },
      uMask: { value: new THREE.Vector4(-2, -1, -2, -1) },
    }),
    [],
  );
  const base = useMemo(() => {
    const m = new THREE.MeshBasicMaterial();
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vW;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvW = (modelMatrix * vec4(position, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\n${PARS}`)
        .replace('#include <color_fragment>', `#include <color_fragment>\n${BODY}`);
    };
    m.customProgramCacheKey = () => 'vv-cyc-v2';
    return m;
  }, [uniforms]);
  const shade = useMemo(
    () =>
      new THREE.ShadowMaterial({
        color: dark ? '#000000' : '#1b2233',
        opacity: dark ? 0.5 : 0.24,
        transparent: true,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    [dark],
  );

  useEffect(() => {
    const [r, g, b] = preToneMapped(dark ? CANVAS.dark : CANVAS.light);
    base.color.setRGB(r, g, b, THREE.LinearSRGBColorSpace);
    uniforms.uPool.value.set(dark ? '#ffae66' : '#fff4e4').multiplyScalar(dark ? 0.1 : 0.05);
    // rules multiply the paper: a cool blue by day, a faint lift of blue ink at night
    uniforms.uRule.value.set(dark ? '#aab4ff' : '#dde3f3');
    if (dark) uniforms.uRule.value.multiplyScalar(1.9);
    uniforms.uMargin.value.set(dark ? '#7a2c1d' : '#f0b2a6');
  }, [dark, base, uniforms]);

  useEffect(
    () => () => {
      geometry.dispose();
      base.dispose();
    },
    [geometry, base],
  );
  useEffect(() => () => shade.dispose(), [shade]);

  useFrame((state, delta) => {
    state.gl.getDrawingBufferSize(uniforms.uScreen.value);
    uniforms.uMask.value.copy(maskRef.current);
    const f = focusRef.current;
    if (!f) return;
    const k = 1 - Math.exp(-3 * Math.min(delta, 0.1));
    uniforms.uPoolAt.value.lerp(poolGoal.set(f.target.x * 0.85, f.target.y + 0.2), k);
  });

  return (
    <>
      <mesh geometry={geometry} material={base} renderOrder={-2} />
      {shadows && <mesh geometry={geometry} material={shade} receiveShadow renderOrder={-1} />}
    </>
  );
}
