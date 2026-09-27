import versions from './asset-versions.json';

/** Public folders served with a year of caching (next.config.ts), each versioned by its content. */
export type CachedFolder = keyof typeof versions;

/**
 * The URL of a file in one of the long-cached public folders, with its folder's content version
 * (`/models/examiners.glb` becomes `/models/examiners.glb?v=7050eec0`). Always reference those
 * files through here: a returning visitor keeps them for a year without asking the server again,
 * and the version changes whenever any file in the folder does (scripts/asset-versions.mjs).
 */
export function asset(path: `/${CachedFolder}/${string}`): string {
  const folder = path.split('/')[1] as CachedFolder;
  return `${path}?v=${versions[folder]}`;
}
