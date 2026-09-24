'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { useOnScreen } from '@/components/ui/hooks';
import { cn } from '@/lib/cn';

const SCRIPT = [
  ['You', 'Um, so, there are many reasons, like nerves, and also…'],
  ['VivaVoce', 'Stop. You buried your claim. Lead with it, then defend it.'],
  ['You', 'Candidates fail because structure collapses under pressure. Three reasons. First…'],
  ['VivaVoce', 'That is an opening an examiner can follow. Again, faster.'],
] as const;

/** The coaching exchange, typing itself out while it is on screen. */
export function Interrupts() {
  const reduce = useReducedMotion();
  const [ref, onScreen] = useOnScreen<HTMLDivElement>('-15% 0px');
  const [shown, setShown] = useState(0);
  const [chars, setChars] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (reduce || !onScreen) return;
    const clear = () => {
      if (timer.current) clearTimeout(timer.current);
    };
    if (shown >= SCRIPT.length) {
      timer.current = setTimeout(() => {
        setShown(0);
        setChars(0);
      }, 5200);
      return clear;
    }
    const line = SCRIPT[shown]![1];
    timer.current =
      chars < line.length
        ? setTimeout(() => setChars((c) => c + 2), 26)
        : setTimeout(() => {
            setShown((s) => s + 1);
            setChars(0);
          }, 700);
    return clear;
  }, [shown, chars, reduce, onScreen]);

  const all = reduce || !onScreen;
  const visible = all ? SCRIPT.length : Math.min(shown + 1, SCRIPT.length);

  return (
    <section aria-labelledby="interrupts-title" className="mx-auto w-full max-w-[1360px] px-3 pb-24 sm:px-5 sm:pb-32">
      <div ref={ref} className="tile tile-ink grid gap-12 rounded-[2rem] p-7 sm:p-12 lg:grid-cols-[1fr_1.3fr] lg:p-16">
        <div>
          <h2 id="interrupts-title" className="display text-[clamp(2.3rem,4.6vw,4rem)] text-paper">
            It interrupts, like the room will.
          </h2>
          <p className="mt-5 max-w-md text-lg font-medium leading-relaxed text-paper-mut">
            Examiners do not wait politely for a ramble to end. Neither does
            VivaVoce: it stops you where the answer goes soft and tells you why.
          </p>
        </div>
        <div className="flex min-h-[18rem] flex-col justify-center gap-5" aria-label="Example coaching exchange">
          {SCRIPT.slice(0, visible).map(([who, text], i) => {
            const typing = !all && i === shown;
            const coach = who === 'VivaVoce';
            return (
              <p key={i} className={cn('text-lg leading-snug sm:text-xl', coach ? 'pl-6 sm:pl-10' : '')}>
                <span className={cn('mr-3 text-sm font-bold', coach ? 'text-verm' : 'text-paper-mut')}>{who}</span>
                <span className={cn(coach ? 'font-black text-paper' : 'font-medium text-paper-mut', typing && 'caret')}>
                  {typing ? text.slice(0, chars) : text}
                </span>
              </p>
            );
          })}
        </div>
      </div>
    </section>
  );
}
