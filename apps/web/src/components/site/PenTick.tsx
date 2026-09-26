'use client';

import { animate, svg, utils } from 'animejs';
import { ANIME_EASE, useAnimeScope } from '@/components/ui/useAnimeScope';
import { cn } from '@/lib/cn';

/**
 * The examiner's tick, in red pen: one quick stroke down and a long flick
 * up, drawn with anime.js when it mounts (after `delay` ms). It waits
 * unseen until the script can draw it; reduced motion shows the finished
 * tick. Decorative: say what it means in text nearby.
 */
export function PenTick({ delay = 0, className }: { delay?: number; className?: string }) {
  const { root } = useAnimeScope<SVGSVGElement>(({ root: el, reduce }) => {
    const [stroke] = svg.createDrawable(el.querySelectorAll('path'));
    if (!stroke) return;
    utils.set(stroke, { draw: reduce ? '0 1' : '0 0' });
    el.removeAttribute('data-pending');
    if (!reduce) animate(stroke, { draw: ['0 0', '0 1'], duration: 560, delay, ease: ANIME_EASE.inOut });
  }, []);

  return (
    <svg
      ref={root}
      className={cn('vv-tick', className)}
      viewBox="0 0 64 52"
      aria-hidden="true"
      focusable="false"
      data-pending=""
    >
      <path d="M5 29.5c3.6 2.1 8.4 7.4 13.3 16.2C26.4 29.3 39.8 12.4 59.5 4.5" />
    </svg>
  );
}
