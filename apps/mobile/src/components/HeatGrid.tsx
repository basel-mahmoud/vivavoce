import { useMemo } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from '@/ui/Text';

/**
 * Practice heat grid — the GitHub-style activity calendar, ported to RN from
 * 21st.dev bankkroll/contribution-graph (level bucketing + week matrix) and
 * restyled to the Practice Room vermilion ramp. 12 weeks × 7 days, fed by the
 * real per-day answer counts from /api/v1/me/stats.
 */

const WEEKS = 12;
const DAY_MS = 86_400_000;
const CELL = 13;
const GAP = 3;

/** Ratio-to-max bucketing (ported calculateLevel, collapsed to our 3-color ramp). */
function level(count: number, max: number): 0 | 1 | 2 | 3 {
  if (count === 0 || max === 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.34) return 1;
  if (ratio <= 0.67) return 2;
  return 3;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function HeatGrid({ data }: { data: { day: string; count: number }[] }) {
  const { c, space } = useTheme();

  const { columns, total, max } = useMemo(() => {
    const byDay = new Map(data.map((d) => [d.day, d.count]));
    const today = new Date();
    today.setHours(12, 0, 0, 0); // noon avoids DST edge flips around midnight
    // End the grid on the current week's Sunday-start column.
    const weekday = today.getDay(); // 0 = Sunday
    const cols: { day: string; count: number; future: boolean }[][] = [];
    let totalCount = 0;
    let maxCount = 0;
    for (let w = WEEKS - 1; w >= 0; w--) {
      const col: { day: string; count: number; future: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const offset = w * 7 + (weekday - d);
        const date = new Date(today.getTime() - offset * DAY_MS);
        const key = isoDay(date);
        const count = byDay.get(key) ?? 0;
        const future = date.getTime() > today.getTime();
        if (!future) {
          totalCount += count;
          maxCount = Math.max(maxCount, count);
        }
        col.push({ day: key, count, future });
      }
      cols.push(col);
    }
    return { columns: cols, total: totalCount, max: maxCount };
  }, [data]);

  const ramp = [c.surface2, c.accentSoft, c.accent, c.accentDeep] as const;

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: GAP, justifyContent: 'center' }}>
        {columns.map((col, i) => (
          <View key={i} style={{ gap: GAP }}>
            {col.map((cell) => (
              <View
                key={cell.day}
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 3,
                  backgroundColor: cell.future ? 'transparent' : ramp[level(cell.count, max)],
                }}
              />
            ))}
          </View>
        ))}
      </View>

      {/* legend + honest total */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: space.md,
        }}
      >
        <Text variant="caption" tone="textFaint" numberOfLines={1} style={{ flexShrink: 1 }}>
          {total} {total === 1 ? 'ANSWER' : 'ANSWERS'} · 12 WEEKS
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text variant="caption" tone="textFaint">
            LESS
          </Text>
          {ramp.map((color, i) => (
            <View key={i} style={{ width: 10, height: 10, borderRadius: 2.5, backgroundColor: color }} />
          ))}
          <Text variant="caption" tone="textFaint">
            MORE
          </Text>
        </View>
      </View>
    </View>
  );
}
