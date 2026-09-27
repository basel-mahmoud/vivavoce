import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { asset } from './assets';
import { currentVersions, VERSIONS_FILE } from '../../scripts/asset-versions.mjs';

describe('long-cached public assets', () => {
  it('carry the current content version of their folder', () => {
    // a changed GLB, texture, poster, portrait or font must change its URL, or returning visitors keep the old one
    expect(JSON.parse(readFileSync(VERSIONS_FILE, 'utf8'))).toEqual(currentVersions());
  });

  it('adds the version as a query string', () => {
    const v = (currentVersions() as Record<string, string>).models;
    expect(asset('/models/examiners.glb')).toBe(`/models/examiners.glb?v=${v}`);
  });
});
