import { afterEach, describe, expect, it, vi } from 'vitest';
import { fontGateScript } from './fontGate';

/** A document just big enough for the gate: a head that takes <style>, and a font loader. */
function page({ reduce = false, fonts = true }: { reduce?: boolean; fonts?: boolean } = {}) {
  const styles: { textContent: string; removed: boolean; remove(): void }[] = [];
  let settle: (ok: boolean) => void = () => {};
  const load = vi.fn<(font: string) => Promise<unknown[]>>(
    () =>
      new Promise((resolve, reject) => {
        settle = (ok) => (ok ? resolve([]) : reject(new Error('network')));
      }),
  );
  const document = {
    fonts: fonts ? { load } : undefined,
    createElement: () => {
      const el = {
        textContent: '',
        removed: false,
        remove() {
          el.removed = true;
        },
      };
      return el;
    },
    head: { appendChild: (el: (typeof styles)[number]) => styles.push(el) },
  };
  const matchMedia = () => ({ matches: reduce });
  const run = (script: string) => new Function('document', 'matchMedia', 'setTimeout', script)(document, matchMedia, setTimeout);
  const live = () => styles.filter((s) => !s.removed).map((s) => s.textContent);
  return { run, live, load, settle: (ok: boolean) => settle(ok) };
}

describe('font gate', () => {
  afterEach(() => vi.useRealTimers());

  it('holds the first frame, then lifts when the face arrives in time', async () => {
    vi.useFakeTimers();
    const p = page();
    p.run(fontGateScript("'Archivo', 'Archivo Fallback'"));
    // the face itself, not its local() fallback, which fails where Arial is missing
    expect(p.load).toHaveBeenCalledWith("900 1em 'Archivo'");
    expect(p.live()).toEqual([':root{--vv-type-play:paused}']);
    p.settle(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(p.live()).toEqual([]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(p.live()).toEqual([]);
  });

  it('shows the settled frame when the face is late, and stays settled', async () => {
    vi.useFakeTimers();
    const p = page();
    p.run(fontGateScript('Archivo', 800));
    await vi.advanceTimersByTimeAsync(799);
    expect(p.live()).toEqual([':root{--vv-type-play:paused}']);
    await vi.advanceTimersByTimeAsync(1);
    expect(p.live()).toEqual([':root{--vv-type-skip:-60s}']);
    p.settle(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(p.live()).toEqual([':root{--vv-type-skip:-60s}']);
  });

  it('shows the settled frame when the face fails', async () => {
    vi.useFakeTimers();
    const p = page();
    p.run(fontGateScript('Archivo'));
    p.settle(false);
    await vi.advanceTimersByTimeAsync(0);
    expect(p.live()).toEqual([':root{--vv-type-skip:-60s}']);
  });

  it('sets nothing under reduced motion or without the font loading API', () => {
    for (const opts of [{ reduce: true }, { fonts: false }]) {
      const p = page(opts);
      p.run(fontGateScript('Archivo'));
      expect(p.live()).toEqual([]);
    }
  });

  it('cannot be broken out of by the family name', () => {
    const family = 'Archivo")</script><script>alert(1)//';
    const script = fontGateScript(family);
    expect(script).not.toContain('</script');
    const p = page();
    p.run(script);
    expect(p.load).toHaveBeenCalledWith(`900 1em ${family}`);
  });
});
