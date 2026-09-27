// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BOOT_STORE, bootScript } from './script';
import type { BootApi } from './types';
import { installOutro } from './outro';
import { fontGateScript } from '../site/fontGate';

/**
 * The inline script as the browser gets it: its own source, run in a document. Proves it is
 * self-contained (nothing from module scope leaks into the page) and walks the whole run on a
 * fake clock: the decision, the milestones, the stamp, the portal and what it leaves behind.
 */

const KEY = 'm1.r1.f1';

interface Page {
  reduce?: boolean;
  url?: string;
  stored?: string | null;
  styled?: boolean;
  poster?: boolean;
}

let faceLoads: ReturnType<typeof vi.fn>;

function setup({ reduce = false, url = '/', stored = null, styled = true, poster = true }: Page = {}) {
  document.head.innerHTML = styled ? '<style>vv-boot{position:fixed;display:block}</style>' : '';
  document.body.innerHTML = `<main>${poster ? '<img data-room-poster alt="">' : ''}</main>`;
  history.replaceState(null, '', url);
  localStorage.clear();
  sessionStorage.clear();
  if (stored) localStorage.setItem(BOOT_STORE, stored);
  window.matchMedia = ((q: string) => ({ matches: reduce && q.includes('reduce') })) as unknown as typeof window.matchMedia;
  faceLoads = vi.fn(() => Promise.resolve([{}]));
  Object.defineProperty(document, 'fonts', { value: { load: faceLoads }, configurable: true });
  const img = document.querySelector('img');
  if (img) Object.defineProperty(img, 'decode', { value: () => Promise.resolve(), configurable: true });
  delete (window as { __vvBoot?: BootApi }).__vvBoot;
}

const boot = () => (window as { __vvBoot?: BootApi }).__vvBoot;
const run = (script: string) => new Function(script)();
const overlay = () => document.querySelector('vv-boot');
const headStyles = () => Array.from(document.head.querySelectorAll('style')).map((s) => s.textContent);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] });
  // jsdom has no Web Animations: the script only needs them to run
  Element.prototype.animate = vi.fn(() => ({ cancel() {} }) as unknown as Animation);
  Element.prototype.getAnimations = () => [];
});
afterEach(() => {
  vi.useRealTimers();
});

const script = bootScript({ key: KEY, face: "'Archivo', 'Archivo Fallback'" });

describe('boot script', () => {
  it('cannot be closed early by anything in its markup', () => {
    expect(script).not.toMatch(/<\/script/i);
    expect(script).not.toContain('<!--');
  });

  it('does nothing on a page without the room', () => {
    setup({ url: '/features' });
    run(script);
    expect(boot()).toBeUndefined();
    expect(overlay()).toBeNull();
    expect(headStyles()).toEqual(['vv-boot{position:fixed;display:block}']);
  });

  it('covers a first visit before anything else in the body, and holds the page', async () => {
    setup();
    run(script);
    expect(document.body.firstElementChild?.tagName).toBe('VV-BOOT');
    expect(overlay()?.getAttribute('aria-hidden')).toBe('true');
    expect(boot()).toMatchObject({ showing: true, held: true, why: 'first' });
    expect(headStyles()).toContain('html{overflow:hidden;scrollbar-gutter:stable}');
    // the hold on the crescendo sits on its heading, so letting it go restyles that heading alone
    expect(headStyles()).toContain('[data-crescendo]{--vv-type-play:paused}');
    // it loads the display face by its first family only
    expect(faceLoads).toHaveBeenCalledWith("900 1em 'Archivo'");
  });

  it('stays away on a repeat visit, and says the page is revealed', async () => {
    setup({ stored: KEY });
    run(script);
    expect(overlay()).toBeNull();
    expect(boot()).toMatchObject({ showing: false, held: false, why: 'cached' });
    const revealed = vi.fn();
    boot()!.on('reveal', revealed);
    await Promise.resolve();
    expect(revealed).toHaveBeenCalled();
  });

  it('never shows under reduced motion', () => {
    setup({ reduce: true, url: '/?intro=1' });
    run(script);
    expect(overlay()).toBeNull();
    expect(headStyles()).toHaveLength(1);
  });

  it('steps aside when its stylesheet is missing', () => {
    setup({ styled: false });
    run(script);
    expect(overlay()).toBeNull();
    expect(boot()).toMatchObject({ showing: false, held: false });
    expect(boot()!.times.unstyled).toBeDefined();
    expect(headStyles()).toEqual([]);
  });

  it('draws in step with the milestones, stamps, opens and leaves the page as it was', async () => {
    setup();
    run(script);
    const b = boot()!;
    const critical = vi.fn();
    const revealed = vi.fn();
    b.on('critical', critical);
    b.on('reveal', revealed);
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await vi.advanceTimersByTimeAsync(400);
    expect(b.times.font).toBeDefined();
    expect(b.times.poster).toBeDefined();
    const early = b.drawn();
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(0.3);

    b.mark('app');
    for (const name of ['code', 'model', 'textures', 'labels']) b.mark(name, 0);
    b.mark('model', 0.5);
    await vi.advanceTimersByTimeAsync(600);
    const mid = b.drawn();
    expect(mid).toBeGreaterThan(early);
    for (const name of ['code', 'model', 'textures', 'labels']) b.mark(name);
    expect(critical).toHaveBeenCalledTimes(1);
    b.mark('compile', 0);
    await vi.advanceTimersByTimeAsync(300);
    expect(b.drawn()).toBeLessThan(1);
    expect(b.times.stamp).toBeUndefined();
    b.mark('compile');
    b.mark('ready');
    // the room is ready: the check completes and the square stamps, but the page stays covered
    // until the room has run smoothly for a while
    await vi.advanceTimersByTimeAsync(1200);
    expect(b.times.stamp).toBeGreaterThanOrEqual(b.times.ready!);
    expect(b.times.smooth).toBeGreaterThanOrEqual(b.times.ready!);
    expect(b.times.portal).toBeGreaterThanOrEqual(b.times.smooth!);
    await vi.advanceTimersByTimeAsync(2000);
    expect(b.times.done).toBeDefined();
    expect(revealed).toHaveBeenCalled();
    expect(b).toMatchObject({ showing: false, held: false });
    // nothing is left behind: no overlay, no lock, no hold on the type (the face arrived)
    expect(overlay()).toBeNull();
    expect(headStyles()).toEqual(['vv-boot{position:fixed;display:block}']);
    // and the next visit will not see it again
    expect(localStorage.getItem(BOOT_STORE)).toBe(KEY);
  });

  it('stamps with the ending the room page hands over, and fades on its own without it', async () => {
    for (const handed of [true, false]) {
      setup({ url: '/?intro=1' });
      run(script);
      if (handed) installOutro();
      const b = boot()!;
      document.dispatchEvent(new Event('DOMContentLoaded'));
      b.mark('app');
      b.still('test');
      await vi.advanceTimersByTimeAsync(1200);
      expect(b.times.stamp).toBeDefined();
      // the stamp and its square exist only with the handed-over ending
      expect(Boolean(overlay()?.querySelector('.vvb-stamp'))).toBe(handed);
      await vi.advanceTimersByTimeAsync(2500);
      expect(b.times.done).toBeDefined();
      expect(overlay()).toBeNull();
    }
  });

  it('keeps to its shortest run even when everything is already in', async () => {
    setup({ url: '/?intro=1', stored: KEY });
    run(script);
    const b = boot()!;
    document.dispatchEvent(new Event('DOMContentLoaded'));
    b.mark('app');
    b.still('test');
    await vi.advanceTimersByTimeAsync(5000);
    expect(b.times.stamp).toBeGreaterThanOrEqual(900);
    expect(b.times.portal).toBeGreaterThanOrEqual(2050 - 820);
  });

  it('waits for the page and its poster alone when the room will not go live', async () => {
    setup();
    run(script);
    const b = boot()!;
    document.dispatchEvent(new Event('DOMContentLoaded'));
    b.mark('app');
    b.still('no-webgl');
    await vi.advanceTimersByTimeAsync(4000);
    expect(b.times['still:no-webgl']).toBeDefined();
    expect(b.times.done).toBeDefined();
    expect(b.times.smooth).toBeUndefined();
    expect(localStorage.getItem(BOOT_STORE)).toBe(KEY);
  });

  it('reveals the page anyway at its longest wait, and remembers nothing until the room loads', async () => {
    setup();
    run(script);
    const b = boot()!;
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(b.times.done).toBeUndefined();
    await vi.advanceTimersByTimeAsync(4000);
    expect(b.times.max).toBeGreaterThanOrEqual(11_000);
    expect(b.times.done).toBeDefined();
    expect(localStorage.getItem(BOOT_STORE)).toBeNull();
    b.mark('app');
    for (const name of ['code', 'model', 'textures', 'labels', 'compile', 'ready']) b.mark(name);
    expect(localStorage.getItem(BOOT_STORE)).toBe(KEY);
  });

  it('skips to a quick end on a key, but only after a moment', async () => {
    setup();
    run(script);
    const b = boot()!;
    await vi.advanceTimersByTimeAsync(300);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(b.times.skip).toBeUndefined();
    await vi.advanceTimersByTimeAsync(700);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(b.times.skip).toBeGreaterThanOrEqual(800);
    await vi.advanceTimersByTimeAsync(1600);
    expect(b.times.done).toBeDefined();
    expect(b.times.done! - b.times.skip!).toBeLessThan(1600);
  });

  it('lets the font gate stand aside while it shows', () => {
    setup();
    run(script);
    run(fontGateScript("'Archivo'"));
    // one hold on the type (the loader's), not two
    expect(headStyles().filter((s) => s?.includes('--vv-type-play'))).toHaveLength(1);
  });
});
