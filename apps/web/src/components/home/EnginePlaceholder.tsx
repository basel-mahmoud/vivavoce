'use client';

import { RotateCcw, Smartphone } from 'lucide-react';

/**
 * Stands in for the live marking engine if it fails to load, at the same
 * address (#live), so every "Answer a question" link still lands somewhere
 * that says what happened and what to do next.
 */
export function EnginePlaceholder() {
  return (
    <section id="live" aria-labelledby="live-title" className="mx-auto w-full max-w-[1360px] px-3 py-3 sm:px-5">
      <div className="tile tile-ink rounded-field px-5 py-12 sm:px-12 sm:py-16">
        <h2 id="live-title" className="display text-[clamp(2.3rem,4.6vw,3.8rem)] text-paper">
          Your turn.
        </h2>
        <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-paper-mut">
          The live marker did not load on this device. Reload the page to try again, or answer on the Android beta,
          which marks the same way.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-paper" onClick={() => window.location.reload()}>
            <RotateCcw size={16} aria-hidden />
            Reload the page
          </button>
          <a href="/download/apk" className="btn btn-secondary">
            <Smartphone size={16} aria-hidden />
            Download the Android beta
          </a>
        </div>
      </div>
    </section>
  );
}
