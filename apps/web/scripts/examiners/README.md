# Examiners: build and render

The five examiners are studio instruments with black-glass screen faces: Correctness (graphite
bench instrument, brass half-moon glasses, lanyard badge), Clarity (butter-glazed bulb with a loupe
that magnifies one eye), Structure (tapered porcelain tiers with a tab edge, a binder clip and a
mortarboard), Conciseness (a turned-stone metronome with a ticking needle) and Confidence (a cobalt
pebble with a headset and boom mic). They share conduit arms from shoulder sockets, mittens with
cobalt velvet sleeve bars and bevelled score paddles, and they sit at a slim satin cobalt bench.

Everything in this folder is procedural. No third-party models, textures, HDRs or scans are used.
The only external files are the OFL fonts already in `public/fonts` (licences next to them).

## What ships

| Path | Contents |
| --- | --- |
| `public/models/examiners.glb` | The cast and the bench. `KHR_mesh_quantization` only (no Draco, meshopt or KTX2), no images. 1,059,100 bytes raw, 510,114 bytes gzipped. |
| `public/models/examiners-*.webp` | Five tiling detail maps, 60 KB in total, loaded with `TextureLoader` (`rig.ts` `DETAIL_TEXTURES`). |
| `public/examiners/<key>-<state>.webp` | 30 head-and-shoulders sprites, 360 x 360, transparent, 14 to 22 KB each. States: neutral, listening, pleased, sceptical, speaking, marking. |
| `public/examiners/<key>-raised.webp` | 5 half-body sprites with the paddle raised, 480 x 600, transparent, 26 to 38 KB. |
| `src/components/room/examiners/faceMaterial.ts` | The glass face as a GPU shader: a factory, a typed update API and the state enum. |
| `src/components/room/examiners/rig.ts` | Node, morph and material names, the build's measurements (generated), poses as data, the arm solver, the material recipes and the sprite anchors (generated). |

## Rebuild

Run everything from `apps/web`.

```bash
# 1. Detail maps (deterministic; writes public/models/examiners-*.webp)
node scripts/examiners/textures.mjs

# 2. The GLB (Blender 4.5 LTS, numpy ships with it). About 35 s on 4 cores with the AO bake.
#    Writes public/models/examiners.glb, scripts/examiners/build_report.json and the
#    @generated block of rig.ts. Add `-- --no-bake` for a quick look without baked AO.
blender -b --factory-startup --python scripts/examiners/build_examiners.py

# 3. Sprites and the PORTRAIT_COINS block of rig.ts (about 4 minutes in SwiftShader)
PLAYWRIGHT_MODULE="$(npm root -g)/playwright/index.mjs" node scripts/examiners/render.mjs portraits

# 4. Review sheets (any output path)
node scripts/examiners/render.mjs faces /tmp/faces.png        # 10 states x 5 eye styles
node scripts/examiners/render.mjs sheet /tmp/sprites.png      # every sprite on both canvases
```

Steps 1 and 2 are deterministic: a rebuild gives byte-identical maps, GLB and `rig.ts`.

`render.mjs` bundles `faceMaterial.ts` and `rig.ts` with esbuild (installed with `tsx`), serves the
`studio/` pages from a temporary folder on a local port and renders them in headless Chromium.
Playwright is not an app dependency. Point `PLAYWRIGHT_MODULE` at an installed copy when
`import('playwright')` does not resolve. `portraits` takes `--only key,key` and `--heads` or
`--raised` to render part of the set.

| File | Role |
| --- | --- |
| `build_examiners.py` | The whole cast: lathed superellipse shells split into Body and Head pivots, SDF parts (`sdf.py`), the rest-pose contact solve for the hands, merging per pivot per material, a Cycles AO bake into `COLOR_0.a`, glTF export and the quantising packer. |
| `sdf.py` | A small numpy SDF kit: smooth unions, surface nets and Newton projection. |
| `textures.mjs` | Orange peel, grooves, grain, fibre and speckle, from a fixed integer hash. |
| `render.mjs` | The sprite and sheet renderer described above. |
| `studio/portrait.html` | The sprite studio: one examiner at its origin, lit and posed per state. |
| `studio/faces.html` | The face parity sheet, drawn by the shader on quads with each visor's aspect. |
| `studio/sheet.html` | Sprites on the day and night canvases, with the live marks set from `PORTRAIT_COINS`. |
| `build_report.json` | Triangles per part and per examiner, rig measurements and sizes from the last build. |

## The GLB contract

- **Names.** `rig.ts` `NODES`, `MORPHS` and `MATERIALS` are the only names the scene should use.
  `examinerNodes(scene, key)` collects one examiner's pivots and throws if the GLB is out of date.
- **Materials.** Every material in the file is a stand-in. Replace them by name with
  `createExaminerMaterials(scheme, loadDetailTextures())`, and each `ex_face_<key>` slot with
  `createFaceMaterial(...)`. Share the returned map across the cast.
- **Vertex colours.** `COLOR_0.rgb` is the accent albedo (or a multiplier on the shells' brand
  colour) and `COLOR_0.a` is baked ambient occlusion. The material patch applies it to indirect light.
- **Quantisation.** Static positions are normalized SHORT with the dequantisation folded into each
  leaf node's scale and translation, normals are BYTE and colours UNSIGNED_BYTE. Read positions
  through the node transform, never as metres.
- **Arms.** The conduits are float geometry in the rest pose. `applyPose()` moves the wrists and calls
  `bendArms()`, which rebuilds both conduits from socket to cuff, so a mitten can never float.
- **Shared meshes.** The mitten and the coin are one mesh each, referenced by every hand and every
  paddle (one geometry in memory; the left mitten is a mirrored reference). Each reference is still a
  draw call in three.js; an `InstancedMesh` with per-instance morphs could fold them if needed.
- **Faces.** The glass maps u 0..1 left to right and v 0..1 bottom to top over the visor. The tally
  pill shares the primitive at v 2..3.

## Runtime notes for the scene

- troika-three-text must run with `configureTextBuilder({ useWorker: false })`: the site's CSP
  blocks its blob worker. Paddle marks use `/fonts/jetbrains-mono-700.woff` on the `PaddleFront_`
  anchors, axis names use `/fonts/archivo-900.woff` on `PaddleBack_` and the `BenchLabel_` anchors
  (butter `#ffc838`, `curveRadius` from `BENCH_LABELS`).
- N8AO: set `configuration.transparencyAware = false`. Otherwise it renders every transparent
  object (troika glyphs, the loupe lens) twice more per frame. In the hero that is 129 draw calls
  against 115.
- Count draw calls with `renderer.info.autoReset = false`, then `reset()` before one full frame, so
  the shadow pass and every post pass are included.

## Measured budgets

| | Result | Target |
| --- | --- | --- |
| Triangles per examiner (shell, hands, paddle) | Correctness 14,668, Clarity 14,590, Structure 14,866, Conciseness 12,054, Confidence 14,798. Bench 3,600. | about 15k or fewer |
| Hero, 1440 x 900, desktop: shadows, N8AO, Neutral | 115 draw calls (108 of them are the scene and its shadow pass), 131k triangles | 120 or fewer |
| Hero, 390 x 844, mobile tier: no shadows, no post | 67 draw calls | 80 or fewer |
| Close-ups with depth of field | 118 and 114 draw calls | |
| Bench labels, cap height in the 1440 hero | 14.1 to 14.4 px | 14 px or more |
| Face height in the 1440 hero | 52 to 70 px | |

## Colour calibration

Four swatches are calibrated per scheme under Neutral tone mapping, on a lit mid-tone patch of the
1440 hero (a 7 x 7 median, CIEDE2000 against the token):

| Swatch | Token | Day | Night |
| --- | --- | --- | --- |
| Speaker's paddle | verm `#ff4d26` | 2.9 | 2.7 |
| Clarity's shell | butter `#ffc838` | 3.7 | 3.7 |
| Confidence's shell | cobalt-deep `#1f31c9` | 0.3 | 0.1 |
| Bench apron | cobalt-deep `#1f31c9` | 0.3 | 3.5 |

The solve renders the hero, samples each probe, scales the material's linear base colour by
`(target / measured) ^ 0.8` per channel and repeats three or four times. Vermilion is aimed at
`#f04a25` because Neutral compresses red near 255. The results are the base colours in `rig.ts`
`FINISH`. They assume the hero lighting below, so re-solve them if the scene's lights change.

Hero lighting (day / night):

- Environment: a PMREM of Lightformer panels built in code (a key softbox at (-5, 6, 7), a horizon
  strip, an overhead panel, two tall rim strips at x = +-8, a front strip at (4.5, 3, 8), a cool fill
  and a warm floor bounce), at `environmentIntensity` 0.78 / 0.62.
- Key light `#fff4e8` 2.7 / `#ffe9d2` 1.9 at (-6.5, 9, 7.5), casting a 2048 shadow. Rims at (5, 6, -8)
  1.9 / 3.2 and (-6, 5, -7) 1.0 / 2.2. A front fill at (0.6, 2.2, 10) 0.6 / 0.5.
- A spot on the speaker, 20 / 34, from 6.5 above and 4.4 in front of its visor. At night only, a warm
  lamp (26) over the bench.
- Post: `EffectComposer` (half float, 4x MSAA), N8AO, then `ToneMappingEffect` in NEUTRAL mode. The
  page colour is passed through the inverse Neutral curve before it is used as the background.

## Sprites

- **Head and shoulders.** Every state of one examiner shares one camera, fitted to the head on the
  neutral pose, so a state change never shifts the sprite. The hands hang below the frame. In the
  sceptical state a mitten comes to the chin, and Clarity raises its loupe instead. Nothing below the
  bench line is drawn: Confidence, which is short, sits on the sprite's bottom edge.
- **Raised.** Each figure fills its card, centred, with its cut at the bench line on the bottom row,
  so a row of sprites shares one bench line. The coin is blank and square to the camera. Set the live
  mark over it from `PORTRAIT_COINS` (centre as fractions of the width and height, radius as a
  fraction of the width) in JetBrains Mono 700, paper `#f6f6f3`, at about 0.95 r.
- **Lighting.** The sprites use the day finishes under the hero's day studio with stronger rims and
  the night conduit sheen, so coal parts keep an outline on the night canvas. One set serves both
  canvases.
