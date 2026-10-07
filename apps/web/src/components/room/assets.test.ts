import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { glbLength } from './assets';

describe('glbLength', () => {
  it("reads the shipped cast's whole length from its header", () => {
    const file = readFileSync(join(__dirname, '../../../public/models/examiners.glb'));
    const head = new Uint8Array(file.buffer, file.byteOffset, 64);
    expect(glbLength(head)).toBe(file.length);
  });

  it('reads it from a chunk that starts part-way into a buffer', () => {
    const buffer = new Uint8Array(40);
    const view = new DataView(buffer.buffer);
    view.setUint32(8, 0x46546c67, true);
    view.setUint32(12, 2, true);
    view.setUint32(16, 123456, true);
    expect(glbLength(buffer.subarray(8))).toBe(123456);
  });

  it('knows nothing from bytes that are not a binary glTF, or too few of them', () => {
    expect(glbLength(new TextEncoder().encode('<!doctype html><html>'))).toBe(0);
    expect(glbLength(new Uint8Array([0x67, 0x6c, 0x54, 0x46]))).toBe(0);
  });
});
