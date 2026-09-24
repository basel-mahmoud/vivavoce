import { AXES, ROUNDS } from '@/components/room/data';

/**
 * The rubric as an index: one row per examiner. Hovering a row flips its
 * paddle up to show an example mark.
 */
export function AxesIndex() {
  const scores = ROUNDS[1]!.scores;
  return (
    <section aria-labelledby="axes-title" className="mx-auto w-full max-w-[1360px] px-4 pb-24 sm:px-5 sm:pb-32">
      <h2 id="axes-title" className="display max-w-4xl text-[clamp(2.3rem,5vw,4.4rem)]">
        Five examiners. Five marks.
      </h2>
      <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-ink-mut">
        Every answer is marked from 0 to 100 on each axis, then summed up in the
        one thing to fix first. Marks shown are an example.
      </p>
      <ol className="mt-12">
        {AXES.map((a, i) => (
          <li
            key={a.key}
            className="group grid items-center gap-x-10 gap-y-3 border-t border-line py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto] md:py-10"
          >
            <h3 className="display text-[clamp(2.1rem,4.4vw,3.8rem)] transition-colors duration-200 group-hover:text-verm-text">
              {a.label}
            </h3>
            <div>
              <p className="text-xl font-black leading-snug">{a.ask}</p>
              <p className="mt-2 max-w-md leading-relaxed text-ink-mut">{a.line}</p>
            </div>
            <div className="hidden [perspective:500px] md:block" aria-hidden>
              <div className="relative h-20 w-20 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] [transform-style:preserve-3d] [transform:rotateY(180deg)] group-hover:[transform:rotateY(0deg)] motion-reduce:transition-none">
                <span className="marks absolute inset-0 grid place-items-center rounded-full bg-coal text-2xl font-bold text-paper [backface-visibility:hidden] dark:bg-paper dark:text-coal">
                  {scores[i]}
                </span>
                <span className="absolute inset-0 rounded-full border-2 border-dashed border-line bg-card-2 [backface-visibility:hidden] [transform:rotateY(180deg)]" />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
