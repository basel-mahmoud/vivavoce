// troika-three-text ships types under dist/types without a "types" entry.
// We only call the builder config, so declare just that.
declare module 'troika-three-text' {
  export function configureTextBuilder(config: {
    useWorker?: boolean;
    defaultFontURL?: string;
    sdfGlyphSize?: number;
  }): void;
}
