# Provenance: the examiner cast

Everything the site ships of the five examiners is made in this repository, procedurally.
No third-party models, textures, HDRs, scans or generated imagery are used. The only external
files involved are the OFL fonts in `public/fonts` (licences beside them).

| Shipped file | Origin | Made by |
| --- | --- | --- |
| `public/models/examiners.glb` | The cast and the bench, modelled in code (lathed shells, SDF parts, a baked AO pass). | `scripts/examiners/build_examiners.py` (Blender 4.5, `blender -b --factory-startup --python ...`) |
| `public/models/examiners-*.webp` | Five tiling detail maps (peel, grooves, grain, fibre, speckle) from a fixed integer hash. A rebuild is byte-identical. | `scripts/examiners/textures.mjs` |
| `public/examiners/<axis>-<state>.webp` | 35 sprites of the same cast: 30 heads (360 x 360) and 5 raised-paddle half bodies (480 x 600), rendered in headless Chromium from `examiners.glb` and encoded with sharp. | `scripts/examiners/render.mjs portraits` (`studio/portrait.html`) |
| `public/room/hero-*.{avif,webp}` | Posters of the live room scene, captured with Playwright. | `scripts/room/posters.mjs` |
| `src/app/opengraph-image.jpg`, `src/app/twitter-image.jpg` | The social card: a crop of the light room poster beside the headline in Archivo, laid out in HTML and captured with Playwright. | composed for the site, 2026-09-27 |

Each raster also carries its own record: a `.json` sidecar beside every WebP and AVIF, and an
embedded comment in the JPEG and PNG files. Check them with
`impeccable embed-prompt --scan apps/web/public apps/web/src/app` (it should report 0 missing).
See `scripts/examiners/README.md` for the full rebuild.
