import { Fragment } from 'react';

/**
 * Splits a headline into words that rise into focus in sequence (CSS only, so
 * it plays before hydration and degrades to a plain fade under reduced motion).
 * Wrap a word in *asterisks* to set it as the rotated vermilion chip.
 */
export function RiseText({ text, start = 0 }: { text: string; start?: number }) {
  const words = text.split(' ');
  return (
    <>
      <span className="sr-only">{text.replaceAll('*', '')}</span>
      <span aria-hidden>
        {words.map((word, i) => {
          const chip = word.startsWith('*') && word.endsWith('*');
          const style = { '--i': start + i } as React.CSSProperties;
          return (
            <Fragment key={i}>
              {chip ? (
                <span
                  style={style}
                  className="rise-chip -rotate-2 rounded-[0.18em] bg-verm px-[0.16em] pb-[0.06em] text-coal"
                >
                  {word.slice(1, -1)}
                </span>
              ) : (
                <span style={style} className="rise">
                  {word}
                </span>
              )}
              {i < words.length - 1 ? ' ' : null}
            </Fragment>
          );
        })}
      </span>
    </>
  );
}
