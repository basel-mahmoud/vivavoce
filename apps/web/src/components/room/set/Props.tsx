import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ShotSet } from '../camera';
import { BENCH, FLOOR, FOOTPRINTS, LAMP, RISER } from './layout';

/* ── The lamp: the night before the exam, a task lamp over the panel ── */

function shadeProfile(inner: boolean) {
  // an enamel dome: neck, shoulder, a wide flared rim; the inner skin sits just inside
  const k = (inner ? 0.94 : 1) * 0.86;
  const pts: THREE.Vector2[] = [];
  const raw: [number, number][] = [
    [0.035, 0.3],
    [0.06, 0.29],
    [0.1, 0.255],
    [0.16, 0.2],
    [0.215, 0.13],
    [0.255, 0.06],
    [0.285, 0.01],
    [0.3, -0.005],
  ];
  for (const [r, y] of raw) pts.push(new THREE.Vector2(r * k, y - (inner ? 0.006 : 0)));
  return pts;
}

/**
 * A task lamp standing behind the panel's right end, its head reaching over the bench. Off by
 * day (a coal shade on a thin stem); at night the shade glows warm from inside and throws the
 * pool the panel sits in.
 */
export function Lamp({ dark }: { dark: boolean }) {
  const parts = useMemo(() => {
    const stemTop = LAMP.foot.clone().setY(FLOOR + LAMP.height);
    const tube = (a: THREE.Vector3, b: THREE.Vector3, r: number) => {
      const len = a.distanceTo(b);
      const g = new THREE.CylinderGeometry(r, r, len, 12, 1);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      g.applyQuaternion(q);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      g.translate(mid.x, mid.y, mid.z);
      return g;
    };
    // the shade's axis points from the head toward the aim point
    const axis = LAMP.aim.clone().sub(LAMP.head).normalize();
    const orient = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), axis);
    const place = (g: THREE.BufferGeometry) => {
      g.applyQuaternion(orient);
      g.translate(LAMP.head.x, LAMP.head.y, LAMP.head.z);
      return g;
    };
    const outer = place(new THREE.LatheGeometry(shadeProfile(false), 48));
    const neckTop = LAMP.head.clone().addScaledVector(axis, -0.3);
    const body = mergeGeometries([
      new THREE.CylinderGeometry(0.2, 0.23, 0.035, 40).translate(LAMP.foot.x, FLOOR + 0.0175, LAMP.foot.z),
      tube(LAMP.foot, stemTop, 0.016),
      tube(stemTop, neckTop, 0.013),
      outer,
    ]);
    const inner = place(new THREE.LatheGeometry(shadeProfile(true), 48));
    const joint = new THREE.SphereGeometry(0.03, 16, 12).translate(stemTop.x, stemTop.y, stemTop.z);
    const bulbAt = LAMP.head.clone().addScaledVector(axis, -0.1);
    const bulb = new THREE.SphereGeometry(0.075, 24, 16).translate(bulbAt.x, bulbAt.y, bulbAt.z);
    return { body, inner, joint, bulb, bulbAt, axis };
  }, []);

  // off by day; at night the inside of the shade glows and the bulb is a hot spot
  const mats = useMemo(
    () => ({
      coal: new THREE.MeshPhysicalMaterial({ color: '#1c2130', roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
      inner: new THREE.MeshStandardMaterial({
        color: '#f1ece3',
        roughness: 0.7,
        side: THREE.BackSide,
        // lit from inside at night: a desaturated champagne, so the faces stay the brightest glow
        emissive: dark ? '#f2d7b6' : '#000000',
        emissiveIntensity: dark ? 0.5 : 0,
      }),
      brass: new THREE.MeshStandardMaterial({ color: '#c8a978', roughness: 0.3, metalness: 1 }),
      bulb: new THREE.MeshBasicMaterial({ color: dark ? '#f6e6cf' : '#d9d6cf' }),
    }),
    [dark],
  );

  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  useEffect(
    () => () => {
      parts.body.dispose();
      parts.inner.dispose();
      parts.joint.dispose();
      parts.bulb.dispose();
    },
    [parts],
  );

  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.copy(LAMP.aim);
    o.updateMatrixWorld();
    return o;
  }, []);

  return (
    <group>
      <mesh geometry={parts.body} material={mats.coal} castShadow />
      <mesh geometry={parts.inner} material={mats.inner} />
      <mesh geometry={parts.joint} material={mats.brass} />
      <mesh geometry={parts.bulb} material={mats.bulb} />
      <primitive object={target} />
      {dark && (
        <spotLight
          position={parts.bulbAt.toArray()}
          target={target}
          color="#f4dcbd"
          intensity={7}
          distance={0}
          angle={0.78}
          penumbra={0.95}
          decay={1.6}
        />
      )}
    </group>
  );
}

/* ── The candidate's mic: the soft foreground of the shoulder shot ─── */

/**
 * A desk mic on a short stem, in coal with a blue-ink ring (the candidate's colour). It is only
 * drawn while the camera is near the shoulder shot, where it stands in the frame's near corner.
 */
export function Mic({ shotsRef, weightRef }: { shotsRef: React.RefObject<ShotSet | null>; weightRef: React.RefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const parts = useMemo(() => {
    const body = mergeGeometries([
      new THREE.CapsuleGeometry(0.075, 0.2, 8, 24),
      new THREE.CylinderGeometry(0.016, 0.02, 0.5, 12).translate(0, -0.42, 0),
      new THREE.CylinderGeometry(0.03, 0.03, 0.06, 16).translate(0, -0.15, 0),
    ]);
    const grille = new THREE.CylinderGeometry(0.078, 0.078, 0.13, 32, 1, true).translate(0, 0.06, 0);
    const ring = new THREE.TorusGeometry(0.079, 0.01, 10, 40).rotateX(Math.PI / 2).translate(0, -0.03, 0);
    return { body, grille, ring };
  }, []);
  const mats = useMemo(
    () => ({
      coal: new THREE.MeshPhysicalMaterial({ color: '#171b24', roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.15 }),
      grille: new THREE.MeshStandardMaterial({ color: '#3a4152', roughness: 0.55, metalness: 0.6 }),
      ring: new THREE.MeshStandardMaterial({ color: '#2e45ff', emissive: '#2e45ff', emissiveIntensity: 0.6, roughness: 0.35 }),
    }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(parts).forEach((p) => p.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
    [parts, mats],
  );
  useFrame(() => {
    const g = group.current;
    const pose = shotsRef.current?.mic;
    if (!g || !pose) return;
    g.visible = (weightRef.current ?? 0) > 0.001;
    g.position.copy(pose.position);
    g.quaternion.copy(pose.quaternion);
  });
  return (
    <group ref={group} visible={false}>
      <mesh geometry={parts.body} material={mats.coal} />
      <mesh geometry={parts.grille} material={mats.grille} />
      <mesh geometry={parts.ring} material={mats.ring} />
    </group>
  );
}

/* ── The riser: the low stage the panel sits on ─────────────────────── */

/** The riser's outline in the floor plane: the ring behind the bench, cut square at both ends. */
function riserShape() {
  const cz = BENCH.centreZ;
  const inset = RISER.bevel;
  const r0 = RISER.inner + inset;
  const r1 = RISER.outer - inset;
  const hx = RISER.halfX - inset;
  const a0 = Math.asin(hx / r0);
  const a1 = Math.asin(hx / r1);
  const shape = new THREE.Shape();
  // shape x is world x, shape y is world z (the geometry is laid flat below)
  const at = (r: number, a: number) => [r * Math.sin(a), cz - r * Math.cos(a)] as const;
  const n = 40;
  shape.moveTo(...at(r0, -a0));
  for (let i = 1; i <= n; i++) shape.lineTo(...at(r0, -a0 + (2 * a0 * i) / n));
  shape.lineTo(...at(r1, a1));
  for (let i = 1; i <= n; i++) shape.lineTo(...at(r1, a1 - (2 * a1 * i) / n));
  shape.closePath();
  return shape;
}

const RISER_PARS = /* glsl */ `
varying vec3 vW;
float vvFootprint(vec2 p, vec4 f) {
  vec2 q = abs(p - f.xy) - f.zw + 0.18;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.18;
}
`;

/**
 * The low stage the panel sits on, tucked under the bench and cut square past both ends, so the
 * two outer examiners rest on it instead of hanging off the bench into the air. Its top carries a
 * soft contact shadow under each examiner (baked, so every tier has it); the floor around it gets
 * its own from the cyclorama.
 */
export function Riser({ dark, shadows }: { dark: boolean; shadows: boolean }) {
  const geometry = useMemo(() => {
    const depth = RISER.top - FLOOR - 2 * RISER.bevel;
    const g = new THREE.ExtrudeGeometry(riserShape(), {
      depth,
      bevelEnabled: true,
      bevelThickness: RISER.bevel,
      bevelSize: RISER.bevel,
      bevelSegments: 2,
      curveSegments: 1,
    });
    // lay it flat: shape y becomes world z, the extrusion runs down from the top
    g.rotateX(Math.PI / 2);
    g.translate(0, RISER.top - RISER.bevel, 0);
    return g;
  }, []);
  const material = useMemo(() => {
    // night: a cool blue-black like the paper, so the warm lamp lifts it to a neutral dark, never to wood
    const m = new THREE.MeshStandardMaterial({ color: dark ? '#080d22' : '#a3abb8', roughness: dark ? 0.94 : 0.82, envMapIntensity: dark ? 0.6 : 1 });
    const feet = FOOTPRINTS.map((p) => new THREE.Vector4(p[0], p[1], p[2], p[3]));
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uFeet = { value: feet };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vW;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvW = (modelMatrix * vec4(position, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\nuniform vec4 uFeet[5];\n${RISER_PARS}`)
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          {
            float top = smoothstep(${(RISER.top - 0.01).toFixed(3)}, ${(RISER.top - 0.002).toFixed(3)}, vW.y);
            float c = 0.0;
            for (int i = 0; i < 5; i++) {
              float d = vvFootprint(vW.xz, uFeet[i]);
              float s = 1.0 - smoothstep(0.0, 0.2, d);
              c = max(c, 0.6 * exp(-max(d, 0.0) / 0.025) + 0.4 * s * s);
            }
            diffuseColor.rgb *= 1.0 - ${dark ? '0.75' : '0.55'} * c * top;
          }`,
        );
    };
    m.customProgramCacheKey = () => `vv-riser-${dark ? 'd' : 'l'}`;
    return m;
  }, [dark]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geometry} material={material} receiveShadow={shadows} />;
}
