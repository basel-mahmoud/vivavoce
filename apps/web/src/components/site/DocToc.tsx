'use client';

import { useEffect, useState } from 'react';
import { InkStroke } from './InkStroke';
import type { DocHeading } from './Prose';

/**
 * The sections of a document, beside it on wide screens. The one you are
 * reading carries the blue-ink underline: the last heading that has passed
 * the top third of the window.
 */
export function DocToc({ items }: { items: readonly DocHeading[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const heads = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!heads.length) return;
    const pick = () => {
      const line = window.innerHeight * 0.32;
      let current: string | null = null;
      for (const h of heads) if (h.getBoundingClientRect().top <= line) current = h.id;
      setActive(current);
    };
    // Headings crossing the line are the only moments the answer can change.
    const io = new IntersectionObserver(pick, { rootMargin: '0px 0px -68% 0px' });
    heads.forEach((h) => io.observe(h));
    pick();
    return () => io.disconnect();
  }, [items]);

  return (
    <nav aria-label="On this page" className="vv-toc">
      <p className="vv-toc-head">On this page</p>
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} className="vv-toc-link" aria-current={active === i.id ? 'location' : undefined}>
              <span className="relative">
                {i.title}
                {active === i.id ? <InkStroke /> : null}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
