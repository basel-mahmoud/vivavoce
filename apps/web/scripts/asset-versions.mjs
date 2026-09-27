/**
 * Content versions for the public folders the site serves with a year of caching (next.config.ts):
 * the GLB and its detail maps, the portrait renders, the room posters and the fonts the 3D labels
 * are set in. Each folder's version is a hash of every file the page can request from it, so any
 * change to one of them gives every URL in that folder a new `?v=`.
 *
 *   node scripts/asset-versions.mjs          rewrite src/lib/asset-versions.json
 *   node scripts/asset-versions.mjs --check  exit 1 if it is out of date
 *
 * src/lib/assets.test.ts runs the check, so a changed asset cannot ship with a stale version.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const FOLDERS = ['examiners', 'fonts', 'models', 'room'];
const SERVED = /\.(webp|avif|glb|woff2?)$/;
export const VERSIONS_FILE = join(root, 'src/lib/asset-versions.json');

/** An 8-character hash of the folder's served files (names and bytes). */
export function folderVersion(folder) {
  const dir = join(root, 'public', folder);
  const hash = createHash('sha256');
  for (const name of readdirSync(dir).filter((n) => SERVED.test(n)).sort()) {
    hash.update(name);
    hash.update('\0');
    hash.update(readFileSync(join(dir, name)));
  }
  return hash.digest('hex').slice(0, 8);
}

export function currentVersions() {
  return Object.fromEntries(FOLDERS.map((f) => [f, folderVersion(f)]));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const next = `${JSON.stringify(currentVersions(), null, 2)}\n`;
  if (process.argv.includes('--check')) {
    const now = readFileSync(VERSIONS_FILE, 'utf8');
    if (now !== next) {
      console.error('src/lib/asset-versions.json is out of date: run node scripts/asset-versions.mjs');
      process.exit(1);
    }
  } else writeFileSync(VERSIONS_FILE, next);
}
