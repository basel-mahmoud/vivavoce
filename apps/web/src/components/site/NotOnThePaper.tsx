'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { SplitFlap } from '@/components/ui/SplitFlap';
import { RedPen } from '@/components/ui/RedPen';
import { Portrait } from '@/components/ui/Portrait';
import { suggestPath } from './paths';

const BOARD = [[{ text: '404', tone: 'verm' as const }], 'NOT ON THE PAPER'] as const;

/**
 * The 404: the departures board flips to NOT ON THE PAPER, the examiner
 * strikes the path you asked for and writes the page you probably meant
 * beside it, and the sceptical one says what examiners say.
 */
export function NotOnThePaper() {
  const pathname = usePathname() ?? '';
  const suggestion = suggestPath(pathname);

  return (
    <section className="vv-404 mx-auto w-full max-w-[1360px] px-4 sm:px-5">
      <h1 className="sr-only">Not on the paper: there is no page at this address.</h1>
      <div className="vv-404-grid">
        <div className="vv-404-main">
          <div className="vv-404-board" aria-hidden="true">
            <SplitFlap rows={BOARD} label="404. Not on the paper." size="lg" play="mount" stagger={30} />
          </div>

          {pathname ? (
            <p className="vv-404-path">
              <span className="text-ink-mut">You asked for</span>{' '}
              <RedPen mark="strike-through" play="mount" delay={1250} srLabel="struck through, not on the paper">
                <code className="vv-404-code">{pathname}</code>
              </RedPen>
            </p>
          ) : null}
          {suggestion ? (
            <p className="vv-404-hint">
              Did you mean{' '}
              <Link href={suggestion} className="link-inline font-bold text-ink-blue">
                {suggestion}
              </Link>
              ?
            </p>
          ) : null}
          <p className="vv-404-copy">
            There is no page at this address. It may have moved, or the link had a slip in it. Everything else is
            where it was.
          </p>
          <div className="vv-404-actions">
            <Link href="/" className="btn btn-primary btn-lg">
              Back to the front page
              <ArrowRight size={17} aria-hidden />
            </Link>
            <Link href="/faq" className="btn btn-secondary btn-lg">
              Read the FAQ
            </Link>
          </div>
        </div>

        <figure className="vv-404-examiner">
          <Portrait axis="correctness" state="sceptical" size={360} priority alt="The Correctness examiner, sceptical" />
          <figcaption className="vv-404-seeme">
            <RedPen mark="underline" play="mount" delay={1700} iterations={2}>
              See me.
            </RedPen>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
