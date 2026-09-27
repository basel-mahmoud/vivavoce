'use client';

import type { ReactNode } from 'react';
import { RedPen, type RedPenMark } from '@/components/ui/RedPen';
import { useFontsReady } from './useFontsReady';

/**
 * The examiner's mark on one word of a page heading, drawn shortly after
 * the page arrives, once the display face has loaded so the pen lands on
 * the real words. One decisive stroke, as on the live room's heading.
 * Reduced motion shows the finished mark.
 */
export function HeroMark({
  children,
  mark = 'circle',
  delay = 450,
}: {
  children: ReactNode;
  mark?: Extract<RedPenMark, 'circle' | 'underline' | 'box'>;
  delay?: number;
}) {
  const ready = useFontsReady();
  return (
    <RedPen mark={mark} play="manual" show={ready} delay={delay} iterations={1}>
      {children}
    </RedPen>
  );
}
