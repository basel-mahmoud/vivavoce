import { cn } from '@/lib/cn';

/** 5 by 7 dot glyphs, like a station clock or a scoreboard. */
const GLYPHS: Record<string, readonly string[]> = {
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ':': ['.', '.', '#', '.', '#', '.', '.'],
};

const PITCH = 11;
const R = 4.1;

/**
 * A countdown drawn in a dot matrix: "0:08". Lit dots change as the
 * seconds tick (a short fade, see home.css); unlit dots stay faintly
 * printed so the digits never jump around. Purely visual: pass the time
 * as text to assistive tech separately.
 */
export function DotClock({ seconds, className }: { seconds: number; className?: string }) {
  const text = `${Math.floor(seconds / 60)}:${String(Math.max(0, seconds % 60)).padStart(2, '0')}`;
  let x = 0;
  const dots: { cx: number; cy: number; on: boolean; key: string }[] = [];
  Array.from(text).forEach((ch, gi) => {
    const glyph = GLYPHS[ch] ?? GLYPHS['0']!;
    const cols = glyph[0]!.length;
    glyph.forEach((row, ry) => {
      Array.from(row).forEach((cell, cx) => {
        dots.push({
          cx: x + cx * PITCH + PITCH / 2,
          cy: ry * PITCH + PITCH / 2,
          on: cell === '#',
          key: `${gi}-${ry}-${cx}`,
        });
      });
    });
    x += cols * PITCH + PITCH;
  });
  const width = x - PITCH;
  return (
    <svg
      viewBox={`0 0 ${width} ${7 * PITCH}`}
      className={cn('vv-dotclock', className)}
      aria-hidden="true"
      focusable="false"
    >
      {dots.map((d) => (
        <circle key={d.key} cx={d.cx} cy={d.cy} r={R} data-on={d.on ? '' : undefined} />
      ))}
    </svg>
  );
}
