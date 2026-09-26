import * as THREE from 'three';
import { Text, configureTextBuilder } from 'troika-three-text';
import {
  AXIS_NAME,
  BENCH_LABELS,
  DETAIL_TEXTURES,
  EXAMINERS,
  FINISH,
  NODES,
  VISORS,
  createExaminerMaterials,
  examinerNodes,
  finishMaterial,
  type DetailName,
  type DetailTextures,
  type Scheme,
} from '../examiners/rig';
import { createFaceMaterial, type FaceController } from '../examiners/faceMaterial';
import { ExaminerRuntime, type CoinLook } from './examiner';
import type { PanelChannels } from './channels';

// Troika builds glyph atlases in a blob-URL worker, which the site's CSP
// forbids. A few short labels are cheap on the main thread, so keep the
// policy strict and skip the worker.
configureTextBuilder({ useWorker: false });

export const MODEL_URL = '/models/examiners.glb';
export const DETAIL_URLS = Object.values(DETAIL_TEXTURES);
const FONT_MONO = '/fonts/jetbrains-mono-700.woff';
const FONT_DISPLAY = '/fonts/archivo-900.woff';

const PAPER = '#f6f6f3';
const COAL = '#10131a';
const BUTTER = '#ffc838';
/** Bench inlay size: about 15 px cap height in the 1440 hero. */
const LABEL_SIZE = 0.15;

/** Parts that cast a visible shadow: the big forms only (small metal would cost a draw each). */
const CASTS = /^ex_(shell|bisque|rubber|fabric|coin|bench)/;
const BIG_LACQUER = /Head_(Structure|Confidence)__lacquer/;

/** Turn the loaded detail textures (in DETAIL_TEXTURES order) into the rig's map record. */
export function detailMaps(textures: THREE.Texture[]): DetailTextures {
  const out = {} as DetailTextures;
  (Object.keys(DETAIL_TEXTURES) as DetailName[]).forEach((name, i) => {
    const t = textures[i]!;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    if (name === 'speckle') t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    out[name] = t;
  });
  return out;
}

export interface Cast {
  root: THREE.Object3D;
  runtimes: ExaminerRuntime[];
  /** Resolves once every label and mark has its glyphs. */
  ready: Promise<void>;
  setScheme(scheme: Scheme): void;
  setShadows(on: boolean): void;
  update(time: number, dt: number, camera: THREE.Camera, channels: PanelChannels): void;
  /** World position of an examiner's visor centre. */
  visorWorld(index: number, out: THREE.Vector3): THREE.Vector3;
  dispose(): void;
}

function makeText(parent: THREE.Object3D, str: string, font: string, size: number, material: THREE.Material, opts: { curve?: number; letter?: number; offset?: readonly [number, number, number] } = {}) {
  const t = new Text();
  t.text = str;
  t.font = font;
  t.fontSize = size;
  t.anchorX = 'center';
  t.anchorY = 'middle';
  t.letterSpacing = opts.letter ?? 0;
  t.curveRadius = opts.curve ?? 0;
  t.sdfGlyphSize = 64;
  t.material = material;
  if (opts.offset) t.position.set(...opts.offset);
  parent.add(t);
  return t;
}

const textMaterial = (color: string, roughness = 0.32, clearcoat = 0.6) =>
  new THREE.MeshPhysicalMaterial({ color, roughness, clearcoat, clearcoatRoughness: 0.12 });

/**
 * Build the five examiners and the bench from the loaded GLB: a private copy of the scene graph
 * (the arm conduits are rebuilt every frame, so their geometry must not be shared), the calibrated
 * finishes, one face shader per visor, one coin material per examiner (so each can turn red on its
 * own) and the troika marks, paddle-back names and bench inlays.
 */
export function buildCast(source: THREE.Object3D, maps: DetailTextures, initial: Scheme): Cast {
  const root = source.clone(true);
  root.name = 'Panel';

  const standIn = new Map<THREE.Mesh, string>();
  const glass: Partial<Record<(typeof EXAMINERS)[number], THREE.Mesh>> = {};
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const name = (mesh.material as THREE.Material).name;
    standIn.set(mesh, name);
    if (name.startsWith('ex_face_')) glass[name.slice(8) as (typeof EXAMINERS)[number]] = mesh;
    if (mesh.name.startsWith('Arms_')) mesh.geometry = mesh.geometry.clone();
  });

  let scheme: Scheme = initial;
  let mats = createExaminerMaterials(scheme, maps);
  const faces: FaceController[] = [];
  const coinMaterials: THREE.MeshPhysicalMaterial[] = [];
  const disposables: { dispose(): void }[] = [];
  const texts: Text[] = [];
  const runtimes: ExaminerRuntime[] = [];

  const markMaterials: THREE.MeshPhysicalMaterial[] = [];
  const nameMaterial = textMaterial(PAPER);
  const labelMaterial = textMaterial(BUTTER, 0.5, 0.3);
  disposables.push(nameMaterial, labelMaterial);

  EXAMINERS.forEach((key, index) => {
    const nodes = examinerNodes(root, key);
    const v = VISORS[key];
    const face = createFaceMaterial({ style: key, aspect: v.halfWidth / v.halfHeight, scheme });
    const g = glass[key];
    if (!g) throw new Error(`examiners.glb: missing glass for ${key}`);
    g.material = face.material;
    faces.push(face);

    const coin = root.getObjectByName(NODES.coin(key)) as THREE.Mesh;
    const coinMaterial = finishMaterial('ex_coin', FINISH[scheme].ex_coin!, maps);
    coin.material = coinMaterial;
    coinMaterials.push(coinMaterial);

    const markMaterial = textMaterial(PAPER);
    markMaterials.push(markMaterial);
    const front = root.getObjectByName(NODES.paddleFront(key))!;
    const back = root.getObjectByName(NODES.paddleBack(key))!;
    const markText = makeText(front, '0', FONT_MONO, 0.2, markMaterial, { offset: [0.004, -0.006, 0] });
    const nameText = makeText(back, AXIS_NAME[key].toUpperCase(), FONT_DISPLAY, 0.045, nameMaterial, { letter: 0.02 });
    const label = makeText(root.getObjectByName(NODES.benchLabel(key))!, AXIS_NAME[key], FONT_DISPLAY, LABEL_SIZE, labelMaterial, {
      curve: BENCH_LABELS[key].curveRadius,
    });
    texts.push(markText, nameText, label);

    runtimes.push(
      new ExaminerRuntime({
        key,
        index,
        nodes,
        face,
        visor: root.getObjectByName(NODES.visor(key))!,
        coinMaterial,
        markText,
        nameText,
        markMaterial,
        front,
        back,
        loupe: key === 'clarity' ? root.getObjectByName(NODES.loupe) : undefined,
      }),
    );
  });

  const coinLook = (s: Scheme): CoinLook => {
    const coal = FINISH[s].ex_coin!;
    const hot = FINISH[s].ex_coin_hot!;
    const finish = (f: typeof coal) => ({
      roughness: f.roughness,
      clearcoat: f.clearcoat ?? 0,
      clearcoatRoughness: f.clearcoatRoughness ?? 0,
      specularIntensity: f.specularIntensity ?? 0.6,
    });
    return {
      coal: new THREE.Color(coal.color),
      hot: new THREE.Color(hot.color),
      markPaper: new THREE.Color(PAPER),
      markCoal: new THREE.Color(COAL),
      coalFinish: finish(coal),
      hotFinish: finish(hot),
    };
  };

  const assign = () => {
    for (const [mesh, name] of standIn) {
      if (name.startsWith('ex_face_') || name === 'ex_coin') continue;
      const m = mats.get(name);
      if (m) mesh.material = m;
    }
    const look = coinLook(scheme);
    runtimes.forEach((r) => r.setCoinLook(look));
  };
  assign();

  const ready = Promise.all(texts.map((t) => new Promise<void>((res) => t.sync(() => res())))).then(() => undefined);

  const targets = EXAMINERS.map(() => new THREE.Vector3());
  const pointerWorld = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const centre = new THREE.Vector3(0, 1.1, -0.7);

  return {
    root,
    runtimes,
    ready,
    setScheme(next) {
      if (next === scheme) return;
      scheme = next;
      const old = mats;
      mats = createExaminerMaterials(scheme, maps);
      assign();
      for (const m of old.values()) {
        m.normalMap?.dispose();
        m.map?.dispose();
        m.dispose();
      }
      faces.forEach((f) => f.setScheme(scheme));
      coinMaterials.forEach((m) => m.color.set(FINISH[scheme].ex_coin!.color));
    },
    setShadows(on) {
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh || mesh instanceof Text) return;
        const name = standIn.get(mesh) ?? '';
        mesh.castShadow = on && (CASTS.test(name) || BIG_LACQUER.test(mesh.name));
        mesh.receiveShadow = on;
      });
    },
    update(time, dt, camera, channels) {
      for (let i = 0; i < runtimes.length; i++) runtimes[i]!.visorWorld(targets[i]!);
      // the pointer, as a point between the candidate and the panel
      camPos.setFromMatrixPosition(camera.matrixWorld);
      dir.set(channels.pointer.x, channels.pointer.y, 0.5).unproject(camera).sub(camPos).normalize();
      pointerWorld.copy(camPos).addScaledVector(dir, camPos.distanceTo(centre) * 0.55);
      for (let i = 0; i < runtimes.length; i++) {
        runtimes[i]!.update(time, dt, camera, channels.examiners[i]!, channels, targets, pointerWorld);
      }
    },
    visorWorld(index, out) {
      return runtimes[index]!.visorWorld(out);
    },
    dispose() {
      for (const m of mats.values()) {
        m.normalMap?.dispose();
        m.map?.dispose();
        m.dispose();
      }
      coinMaterials.forEach((m) => {
        m.normalMap?.dispose();
        m.dispose();
      });
      markMaterials.forEach((m) => m.dispose());
      faces.forEach((f) => f.dispose());
      texts.forEach((t) => t.dispose());
      disposables.forEach((d) => d.dispose());
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh && mesh.name.startsWith('Arms_')) mesh.geometry.dispose();
      });
    },
  };
}
