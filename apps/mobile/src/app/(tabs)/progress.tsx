import { View } from 'react-native';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Card } from '@/ui/Card';
import { ScoreBar } from '@/ui/ScoreBar';
import { useTheme } from '@/theme';
import { rubricAxes } from '@/data/content';

// Illustrative trend data; replaced by real analytics once sessions accrue.
const confidenceTrend = [52, 58, 55, 63, 67, 72, 79];
const axisAverages: Record<string, number> = {
  correctness: 84,
  clarity: 74,
  structure: 61,
  conciseness: 79,
  confidence: 72,
};

function TrendLine({ data }: { data: number[] }) {
  const { c, space } = useTheme();
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = Math.max(1, max - min);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 80, marginTop: space.md }}>
      {data.map((v, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <View
            style={{
              width: '70%',
              height: `${20 + ((v - min) / range) * 70}%`,
              backgroundColor: i === data.length - 1 ? c.accent : c.accentSoft,
              borderRadius: 4,
            }}
          />
        </View>
      ))}
    </View>
  );
}

export default function Progress() {
  const { space, c } = useTheme();
  return (
    <Screen>
      <Text variant="display2">Progress</Text>
      <Text variant="body" tone="textMuted" style={{ marginTop: space.xs }}>
        Where you’re improving — and what to work on next.
      </Text>

      <Card style={{ marginTop: space.xl }}>
        <Text variant="caption" tone="textMuted">
          CONFIDENCE TREND · 7 SESSIONS
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginTop: space.sm }}>
          <Text variant="display2" tone="success">
            79
          </Text>
          <Text variant="small" tone="success" style={{ marginBottom: 6 }}>
            ▲ +14
          </Text>
        </View>
        <TrendLine data={confidenceTrend} />
      </Card>

      <Text variant="title" style={{ marginTop: space['2xl'], marginBottom: space.md }}>
        Average by axis
      </Text>
      <Card>
        {rubricAxes.map((a) => (
          <ScoreBar key={a.key} label={a.label} value={axisAverages[a.key] ?? 0} />
        ))}
      </Card>

      <Text variant="title" style={{ marginTop: space['2xl'], marginBottom: space.md }}>
        Topic mastery
      </Text>
      {[
        { name: 'Cardiology', pct: 72 },
        { name: 'Behavioural', pct: 64 },
        { name: 'System design', pct: 48 },
      ].map((t) => (
        <Card key={t.name} style={{ marginBottom: space.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="bodyMedium">{t.name}</Text>
            <Text variant="mono" tone="textMuted">
              {t.pct}%
            </Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surface2, marginTop: space.sm, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${t.pct}%`, backgroundColor: c.accent, borderRadius: 3 }} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
