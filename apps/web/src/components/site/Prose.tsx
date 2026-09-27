import type { ReactNode } from 'react';
import { DocToc } from './DocToc';

export interface DocHeading {
  id: string;
  title: string;
}

/**
 * Long-form legal text on a sheet of exam paper: a card with the red margin
 * rule, a readable measure (about 68 characters), the date printed in the
 * corner, and on wide screens the sections listed beside it.
 */
export function Prose({
  children,
  toc,
  updated,
}: {
  children: ReactNode;
  toc?: readonly DocHeading[];
  updated?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[1360px] px-3 pb-24 sm:px-5 sm:pb-32">
      <div className="vv-doc-grid">
        {toc?.length ? <DocToc items={toc} /> : null}
        <article className="vv-doc">
          {updated ? (
            <p className="vv-doc-date">
              Last updated <time>{updated}</time>
            </p>
          ) : null}
          <div className="vv-doc-body">{children}</div>
        </article>
      </div>
    </div>
  );
}

/** One section of a document: its heading is an anchor the contents list points at. */
export function DocSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="vv-doc-section">
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}
