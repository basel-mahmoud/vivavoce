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
    material: Material;
    readonly textRenderInfo: { capHeight?: number } | null;
    sync(callback?: () => void): void;
    dispose(): void;
  }
}
