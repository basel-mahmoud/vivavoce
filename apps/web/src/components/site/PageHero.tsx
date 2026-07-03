import { Reveal } from '@/components/ui/Reveal';

/** Inner-page opener: one loud statement inside a tile. */
export function PageHero({ title, intro }: { title: string; intro?: string }) {
  return (
    <section className="mx-auto w-full max-w-[1360px] px-4 pb-3 pt-2 sm:px-6">
      <Reveal>
        <div className="tile p-7 sm:p-10">
          <h1 className="display max-w-4xl text-[clamp(2.2rem,5vw,3.8rem)]">{title}</h1>
          {intro && (
            <p className="mt-5 max-w-2xl text-lg font-medium leading-relaxed text-ink-mut">
              {intro}
            </p>
          )}
        </div>
      </Reveal>
    </section>
  );
}
