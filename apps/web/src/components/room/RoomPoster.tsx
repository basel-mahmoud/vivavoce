import { cn } from '@/lib/cn';
import styles from './room.module.css';

/** Compact: phones and portrait tablets, the same test the camera and the layout use. */
const COMPACT = '(max-width: 767px), (max-aspect-ratio: 21/20)';
const DARK = '(prefers-color-scheme: dark)';
const DARK_COMPACT = `${DARK} and (max-width: 767px), ${DARK} and (max-aspect-ratio: 21/20)`;

/** Rendered from the live scene by scripts/room/posters.mjs (see its header for provenance). */
export const POSTERS = {
  wide: { light: '/room/hero-light-1440', dark: '/room/hero-dark-1440', width: 1440, height: 900 },
  compact: { light: '/room/hero-light-390', dark: '/room/hero-dark-390', width: 780, height: 1688 },
} as const;

export const POSTER_ALT =
  'An example round: five examiners at a cobalt bench hold up their marks, 71, 66, 48, 62 and 54. Structure, the weakest at 48, leans in to ask the follow-up.';

/**
 * The first frame of the room as a still: the page's largest contentful paint, shown at once and
 * cross-faded to the live canvas when it is ready. Without WebGL it simply stays, under the same
 * DOM captions. Art-directed per scheme and layout by media queries, so no script is involved.
 */
export function RoomPoster({ hidden }: { hidden: boolean }) {
  const { wide, compact } = POSTERS;
  return (
    <picture>
      <source media={DARK_COMPACT} type="image/avif" srcSet={`${compact.dark}.avif`} width={compact.width} height={compact.height} />
      <source media={DARK_COMPACT} type="image/webp" srcSet={`${compact.dark}.webp`} width={compact.width} height={compact.height} />
      <source media={COMPACT} type="image/avif" srcSet={`${compact.light}.avif`} width={compact.width} height={compact.height} />
      <source media={COMPACT} type="image/webp" srcSet={`${compact.light}.webp`} width={compact.width} height={compact.height} />
      <source media={DARK} type="image/avif" srcSet={`${wide.dark}.avif`} />
      <source media={DARK} type="image/webp" srcSet={`${wide.dark}.webp`} />
      <source type="image/avif" srcSet={`${wide.light}.avif`} />
      <img
        src={`${wide.light}.webp`}
        width={wide.width}
        height={wide.height}
        alt={POSTER_ALT}
        fetchPriority="high"
        className={cn(styles.poster, hidden && 'opacity-0')}
      />
    </picture>
  );
}
