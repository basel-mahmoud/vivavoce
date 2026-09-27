import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { INVERSE_NEUTRAL_GLSL, hexToLinear } from '../tone';
import type { FocusLight } from './Studio';
import { BENCH, COVE_R, COVE_Z, FLOOR, LAMP, RISER, WALL_Z, figureShadows } from './layout';

export { FLOOR, WALL_Z } from './layout';

/** Page canvases (globals.css --vv-canvas), day and night. */
export const CANVAS = { light: '#f3f5f8', dark: '#0c0e14' } as const;

/**
 * The set's tones, as the colours they land on after tone mapping (the shader inverts Neutral per
 * fragment). By day: a wall one step below the page, a warm-white pool behind whoever has the
 * floor, a floor band a step darker again under the bench. At night: blue-black paper, a small
 * desaturated champagne pool on the panel, the faces the only glow. Every tone falls back to the
 * exact page colour at the frame's edges.
 */
const TONES = {
  light: {
    page: CANVAS.light,
    wall: '#e3e7ee',
    floor: '#d6dce5',
    pool: '#fcfbf7',
    shade: '#98a1b0',
    figure: '#cad1dc',
    rule: '#cfd7e8',
    margin: '#efb2a6',
  },
  dark: {
    page: CANVAS.dark,
    wall: '#10131c',
    floor: '#16171d',
    pool: '#2e2a25',
    shade: '#010204',
    figure: '#07080c',
    rule: '#1c2238',
    margin: '#3d1e19',
  },
} as const;

/** Pool radii (world units on the wall) and how strongly each layer shows. */
const LOOK = {
  light: { poolR: [2.1, 1.45], pool: 1, figure: 0.9, shade: 0.9, rule: 0.55, margin: 0.45 },
  dark: { poolR: [1.6, 1.15], pool: 1, figure: 0.9, shade: 0.95, rule: 0.6, margin: 0.55 },
} as const;

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

const f = (n: number) => n.toFixed(4);

/** Where the set fades back to the page: the frame's edges and the captions' side. */
const FRAME_PARS = /* glsl */ `
uniform vec2 uScreen;
uniform vec4 uMask;
uniform vec4 uEdge;
float vvFrame() {
  vec2 fc = gl_FragCoord.xy / uScreen;
  float edge = smoothstep(0.0, uEdge.x, fc.x) * smoothstep(0.0, uEdge.y, 1.0 - fc.x)
    * smoothstep(0.0, uEdge.z, 1.0 - fc.y) * smoothstep(0.0, uEdge.w, fc.y);
  return edge * smoothstep(uMask.x, uMask.y, fc.x) * smoothstep(uMask.z, uMask.w, 1.0 - fc.y);
}
`;

const PARS = /* glsl */ `
varying vec3 vW;
uniform vec3 uPage;
uniform vec3 uWall;
uniform vec3 uFloor;
uniform vec3 uPoolCol;
uniform vec3 uShade;
uniform vec3 uFigCol;
uniform vec3 uRule;
uniform vec3 uMargin;
uniform vec4 uPool;
uniform vec4 uGain;
uniform vec2 uMarginAt;
uniform vec4 uFigs[5];
${FRAME_PARS}
${INVERSE_NEUTRAL_GLSL}
float vvLine(float coord, float halfWidth) {
  float aa = fwidth(coord);
  float d = abs(fract(coord + 0.5) - 0.5);
  float cover = 1.0 - smoothstep(halfWidth - aa, halfWidth + aa, d);
  // fade before the rules can shimmer at a distance
  return cover * clamp(1.6 - aa * 7.0, 0.0, 1.0);
}
// signed distances in the floor plane (x, z) to the pieces standing on it
float vvBench(vec2 p) {
  vec2 q = vec2(p.x, ${f(BENCH.centreZ)} - p.y);
  float rr = length(q);
  float dr = max(${f(BENCH.front)} - rr, rr - ${f(BENCH.back)});
  float da = (abs(atan(q.x, q.y)) - ${f(BENCH.halfAngle)}) * rr;
  return length(max(vec2(dr, da), 0.0)) + min(max(dr, da), 0.0);
}
float vvRiser(vec2 p) {
  float rr = length(vec2(p.x, ${f(BENCH.centreZ)} - p.y));
  float dr = max(${f(RISER.inner)} - rr, rr - ${f(RISER.outer)});
  float dx = abs(p.x) - ${f(RISER.halfX)};
  return length(max(vec2(dr, dx), 0.0)) + min(max(dr, dx), 0.0);
}
// contact: a tight dark line where a piece meets the floor, and a softer occlusion around it
float vvContact(float d, float line, float reach) {
  float s = 1.0 - smoothstep(0.0, reach, d);
  return 0.5 * exp(-max(d, 0.0) / line) + 0.5 * s * (0.4 + 0.6 * s);
}
`;

const BODY = /* glsl */ `
{
  float h = vW.y - ${f(FLOOR)};
  float onFloor = 1.0 - smoothstep(0.0, 0.3, h);
  float back = smoothstep(${f(COVE_Z + 0.3)}, ${f(COVE_Z - 0.9)}, vW.z);
  float onWall = smoothstep(${f(WALL_Z + 0.5)}, ${f(WALL_Z + 0.05)}, vW.z);

  // the band the bench stands on, a step below the wall, easing out toward the candidate
  float band = onFloor * exp(-max(vW.z - 0.6, 0.0) / 2.4);
  vec3 col = mix(uWall, uFloor, band);
  // the lamp's spill on that floor, in front of the bench
  float spill = onFloor * exp(-pow((vW.x - uPool.x) / (uPool.z * 1.5), 2.0)) * exp(-max(vW.z - 0.4, 0.0) / 1.8);
  col = mix(col, uPoolCol, spill * uGain.x * 0.5);

  // the lamp pool on the wall behind whoever has the floor
  vec2 dp = vec2((vW.x - uPool.x) / uPool.z, (vW.y - uPool.y) / uPool.w);
  float pool = exp(-dot(dp, dp) * 1.3) * back;
  col = mix(col, uPoolCol, pool * uGain.x);

  // the exam paper: faint rules and a red margin rule, only where the lamp reaches
  float reach = exp(-dot(dp, dp) * 0.55) * onWall;
  col = mix(col, uRule, vvLine(h / 0.17, 0.035) * reach * uGain.w);
  col = mix(col, uMargin, vvLine((vW.x - uMarginAt.y) / 40.0, 0.00018) * reach * uMarginAt.x);

  // the soft shadows of the five on the cove and the wall, thrown a little right and down
  float fig = 0.0;
  for (int i = 0; i < 5; i++) {
    vec4 s = uFigs[i];
    float dx = abs(vW.x - s.x - 0.3) - s.z * 0.95;
    float dy = vW.y - (s.w - 0.35);
    fig = max(fig, (1.0 - smoothstep(-0.35, 0.5, max(dx, dy))) * (1.0 - 0.3 * smoothstep(0.2, 1.8, h)));
  }
  col = mix(col, uFigCol, fig * back * uGain.y);

  // contact where the bench, the riser and the lamp's foot meet the floor (every tier)
  vec2 fp = vW.xz;
  float contact = max(vvContact(vvBench(fp), 0.12, 1.6), vvContact(vvRiser(fp), 0.05, 0.45));
  contact = max(contact, vvContact(length(fp - vec2(${f(LAMP.foot.x)}, ${f(LAMP.foot.z)})) - ${f(LAMP.footRadius)}, 0.04, 0.5));
  col = mix(col, uShade, contact * onFloor * uGain.z);

  diffuseColor.rgb = vvInverseNeutral(mix(uPage, col, vvFrame()));
}
`;

/** Patches a ShadowMaterial so the shadows it catches fade out with the set at the frame's edges. */
function fadeShadows(m: THREE.ShadowMaterial, frame: { uScreen: { value: THREE.Vector2 }; uMask: { value: THREE.Vector4 }; uEdge: { value: THREE.Vector4 } }) {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, frame);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAME_PARS}`)
      .replace('#include <tonemapping_fragment>', 'gl_FragColor.a *= vvFrame();\n#include <tonemapping_fragment>');
  };
  m.customProgramCacheKey = () => 'vv-cyc-shade-v1';
}

/**
 * The set. A seamless sweep whose shader paints target colours (inverted through Neutral, so they
 * land exactly after tone mapping): a wall a step below the page, a lamp pool on whoever has the
 * floor, a floor band with the contact shadows of the bench, the riser and the lamp baked in, and
 * the soft shadows of the five on the wall. It fades to the exact page colour only at the frame's
 * edges and toward the captions. The key light's own shadows add to it on desktop tiers.
 */
export function Cyclorama({
  dark,
  shadows,
  focusRef,
  maskRef,
  edgeRef,
}: {
  dark: boolean;
  shadows: boolean;
  focusRef: React.RefObject<FocusLight>;
  /** Screen fractions where the captions sit: (x fade start, x fade end, y fade start, y fade end). */
  maskRef: React.RefObject<THREE.Vector4>;
  /** How far in from each frame edge the set fades to the page (left, right, top, bottom). */
  edgeRef: React.RefObject<THREE.Vector4>;
}) {
  const geometry = useMemo(() => sweepGeometry(), []);
  const frame = useMemo(
    () => ({
      uScreen: { value: new THREE.Vector2(1, 1) },
      uMask: { value: new THREE.Vector4(-2, -1, -2, -1) },
      uEdge: { value: new THREE.Vector4(0.04, 0.04, 0.06, 0.06) },
    }),
    [],
  );
  const uniforms = useMemo(
    () => ({
      ...frame,
      uPage: { value: new THREE.Vector3() },
      uWall: { value: new THREE.Vector3() },
      uFloor: { value: new THREE.Vector3() },
      uPoolCol: { value: new THREE.Vector3() },
      uShade: { value: new THREE.Vector3() },
      uFigCol: { value: new THREE.Vector3() },
      uRule: { value: new THREE.Vector3() },
      uMargin: { value: new THREE.Vector3() },
      uPool: { value: new THREE.Vector4(0.1, 1.3, 2, 1.4) },
      uGain: { value: new THREE.Vector4(1, 1, 1, 1) },
      // the red margin rule: how strongly it shows, and where it runs (world x)
      uMarginAt: { value: new THREE.Vector2(0.5, -3.05) },
      uFigs: { value: figureShadows() },
    }),
    [frame],
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
    m.customProgramCacheKey = () => 'vv-cyc-v3';
    return m;
  }, [uniforms]);
  const shade = useMemo(() => {
    const m = new THREE.ShadowMaterial({
      color: dark ? '#000000' : '#1b2233',
      opacity: dark ? 0.45 : 0.2,
      transparent: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    fadeShadows(m, frame);
    return m;
  }, [dark, frame]);

  useEffect(() => {
    const t = TONES[dark ? 'dark' : 'light'];
    const look = LOOK[dark ? 'dark' : 'light'];
    const set = (v: THREE.Vector3, hex: string) => v.set(...hexToLinear(hex));
    set(uniforms.uPage.value, t.page);
    set(uniforms.uWall.value, t.wall);
    set(uniforms.uFloor.value, t.floor);
    set(uniforms.uPoolCol.value, t.pool);
    set(uniforms.uShade.value, t.shade);
    set(uniforms.uFigCol.value, t.figure);
    set(uniforms.uRule.value, t.rule);
    set(uniforms.uMargin.value, t.margin);
    uniforms.uPool.value.setZ(look.poolR[0]).setW(look.poolR[1]);
    uniforms.uGain.value.set(look.pool, look.figure, look.shade, look.rule);
    uniforms.uMarginAt.value.setX(look.margin);
  }, [dark, uniforms]);

  useEffect(
    () => () => {
      geometry.dispose();
      base.dispose();
    },
    [geometry, base],
  );
  useEffect(() => () => shade.dispose(), [shade]);

  useFrame((state, delta) => {
    state.gl.getDrawingBufferSize(frame.uScreen.value);
    frame.uMask.value.copy(maskRef.current);
    frame.uEdge.value.copy(edgeRef.current);
    const fl = focusRef.current;
    if (!fl) return;
    // the pool follows whoever has the floor; at night it stays on the panel, never toward the captions
    const x = dark ? THREE.MathUtils.clamp(fl.target.x * 0.6 + 0.15, -0.7, 1.3) : fl.target.x * 0.85;
    const y = fl.target.y + (dark ? 0.3 : 0.25);
    const k = 1 - Math.exp(-3 * Math.min(delta, 0.1));
    const p = uniforms.uPool.value;
    p.set(p.x + (x - p.x) * k, p.y + (y - p.y) * k, p.z, p.w);
  });

  return (
    <>
      <mesh geometry={geometry} material={base} renderOrder={-2} />
      {shadows && <mesh geometry={geometry} material={shade} receiveShadow renderOrder={-1} />}
    </>
  );
}
