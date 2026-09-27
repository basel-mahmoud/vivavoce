// The panel sets its marks and axis names with troika's Text mesh. troika ships
// JSDoc-generated types without a "types" entry (see src/troika-three-text.d.ts),
// so this merges in just the surface the panel uses.
declare module 'troika-three-text' {
  import type { Color, Material, Mesh } from 'three';

  export class Text extends Mesh {
    text: string;
    font: string | null;
    fontSize: number;
    anchorX: number | 'left' | 'center' | 'right';
    anchorY: number | 'top' | 'top-baseline' | 'top-cap' | 'middle' | 'bottom-baseline' | 'bottom';
    letterSpacing: number;
    curveRadius: number;
    sdfGlyphSize: number | null;
    color: string | number | Color | null;
    /** 0..1, read at render time (no sync needed). */
    fillOpacity: number;
    material: Material;
    readonly textRenderInfo: { capHeight?: number; blockBounds?: readonly [number, number, number, number] } | null;
    sync(callback?: () => void): void;
    dispose(): void;
  }

  /** Typeset `characters` in `font` ahead of time, filling the shared glyph atlas. */
  export function preloadFont(
    options: { font: string; characters: string | readonly string[]; sdfGlyphSize?: number },
    callback: () => void,
  ): void;
}
