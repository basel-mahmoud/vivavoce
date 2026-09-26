import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FLOOR } from './Cyclorama';
import type { ShotSet } from '../camera';

/* ── The lamp: the night before the exam, a task lamp over the panel ── */

/** Where the lamp stands (floor, behind the panel's right end) and where it points. */
const LAMP = {
  foot: new THREE.Vector3(2.62, FLOOR, -1.8),
  height: 2.6,
  head: new THREE.Vector3(1.74, 2.86, -0.42),
  aim: new THREE.Vector3(0.45, 0.3, -0.9),
};

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
        emissive: dark ? '#ffb070' : '#000000',
        emissiveIntensity: dark ? 0.9 : 0,
      }),
      brass: new THREE.MeshStandardMaterial({ color: '#c8a978', roughness: 0.3, metalness: 1 }),
      bulb: new THREE.MeshBasicMaterial({ color: dark ? '#fff1da' : '#d9d6cf', toneMapped: !dark }),
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
          color="#ffcf9a"
          intensity={9}
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

/* ── Contact shadows for the phone tier (no shadow map) ────────────── */

/** One soft blot under the bench and the panel: the contact a shadow map would give. */
export function ContactBlot({ dark }: { dark: boolean }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const g = c.getContext('2d');
    if (g) {
      const grad = g.createRadialGradient(128, 32, 4, 128, 32, 128);
      grad.addColorStop(0, 'rgba(0,0,0,0.9)');
      grad.addColorStop(0.45, 'rgba(0,0,0,0.45)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 256, 64);
    }
    const t = new THREE.CanvasTexture(c);
    return t;
  }, []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: dark ? '#000000' : '#1b2233',
        opacity: dark ? 0.5 : 0.26,
        alphaMap: texture,
        transparent: true,
        depthWrite: false,
      }),
    [texture, dark],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh material={material} rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR + 0.002, -0.35]} renderOrder={-1}>
      <planeGeometry args={[6.2, 2.1]} />
    </mesh>
  );
}
