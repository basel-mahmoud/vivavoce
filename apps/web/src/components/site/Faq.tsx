'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Plus } from 'lucide-react';
import { RedPen } from '@/components/ui/RedPen';
import { splitAnswer } from './text';

export interface FaqEntry {
  q: string;
  a: string;
  /** The one phrase in the answer that matters: highlighted as it opens. */
  key?: string;
}

/**
 * Questions as a disclosure list. Each question is a button that opens its
 * answer with a smooth height change (grid rows, so it works everywhere and
 * can be reversed mid-way); the open one shows its toggle in blue ink, and
 * the phrase that matters gets the highlighter. Arrow keys, Home and End
 * move between questions. Reduced motion opens without the slide.
 */
export function Faq({ items, defaultOpen = [0] }: { items: readonly FaqEntry[]; defaultOpen?: readonly number[] }) {
  const uid = useId();
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set(defaultOpen));
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = items.length - 1;
    const to =
      e.key === 'ArrowDown' ? (i === last ? 0 : i + 1)
      : e.key === 'ArrowUp' ? (i === 0 ? last : i - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (to === null) return;
    e.preventDefault();
    buttons.current[to]?.focus();
  };

  return (
    <ul className="vv-faq">
      {items.map((item, i) => {
        const isOpen = open.has(i);
        const parts = splitAnswer(item.a, item.key);
        return (
          <li key={item.q} className="vv-faq-item" data-open={isOpen ? '' : undefined}>
            <h3>
              <button
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                id={`${uid}-q${i}`}
                type="button"
                className="vv-faq-q"
                aria-expanded={isOpen}
                aria-controls={`${uid}-a${i}`}
                onClick={() => toggle(i)}
                onKeyDown={(e) => onKey(e, i)}
              >
                <span className="vv-faq-text">{item.q}</span>
                <span className="vv-faq-toggle" aria-hidden="true">
                  <Plus size={20} strokeWidth={2.6} />
                </span>
              </button>
            </h3>
            <div
              id={`${uid}-a${i}`}
              role="region"
              aria-labelledby={`${uid}-q${i}`}
              className="vv-faq-a"
              inert={!isOpen}
            >
              <div className="vv-faq-a-inner">
                <p>
                  {parts ? (
                    <>
                      {parts[0]}
                      <RedPen mark="highlight" play="manual" show={isOpen} delay={300}>
                        {parts[1]}
                      </RedPen>
                      {parts[2]}
                    </>
                  ) : (
                    item.a
                  )}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
