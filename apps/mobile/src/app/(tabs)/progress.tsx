import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Trophy, Lock } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Card } from '@/ui/Card';
import { ScoreBar } from '@/ui/ScoreBar';
import { SectionHeader, ProgressRing } from '@/ui/kit';
import { useTheme } from '@/theme';
import { rubricAxes, achievements, modeName } from '@/data/content';
import { stats } from '@/data/stats';

function TrendBars({ data }: { data: number[] }) {
  const { c, space } = useTheme();
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(1, max - min);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 92, marginTop: space.md }}>
      {data.map((v, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <View
            style={{
              width: '64%',
              height: `${25 + ((v - min) / range) * 70}%`,
              backgroundColor: i === data.length - 1 ? c.accent : c.accentSoft,
              borderRadius: 5,
            }}
          />
          <Text variant="caption" tone="textFaint" style={{ fontSize: 10 }}>
            {v}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function Progress() {
  const { space, c, radius } = useTheme();

  return (
    <Screen>
      <Text variant="display2">Progress</Text>
      <Text variant="body" tone="textMuted" style={{ marginTop: space.xs }}>
        Where you’re improving, and what to work on next.
      </Text>

      {/* hero: overall ring + lifetime stats */}
      <Card style={{ marginTop: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.xl }}>
        <ProgressRing progress={stats.overall / 100} size={92} stroke={9} label={`${stats.overall}`} />
        <View style={{ flex: 1, gap: space.md }}>
          <View>
            <Text variant="caption" tone="textFaint">
              OVERALL AVERAGE
            </Text>
            <Text variant="small" tone="success">
              ▲ +{stats.overallDelta} this month
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: space.lg }}>
            <View>
              <Text variant="mono" style={{ fontSize: 17 }}>{stats.sessionsTotal}</Text>
              <Text variant="caption" tone="textFaint">sessions</Text>
            </View>
            <View>
              <Text variant="mono" style={{ fontSize: 17 }}>{stats.answersTotal}</Text>
              <Text variant="caption" tone="textFaint">answers</Text>
            </View>
            <View>
              <Text variant="mono" style={{ fontSize: 17 }}>{stats.longestStreak}d</Text>
              <Text variant="caption" tone="textFaint">best streak</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* confidence trend */}
      <SectionHeader title="Confidence trend" style={{ marginTop: space['2xl'] }} />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
          <Text variant="display2" tone="success">
            {stats.confidenceTrend[stats.confidenceTrend.length - 1]}
          </Text>
          <Text variant="small" tone="success" style={{ marginBottom: 6 }}>
            ▲ +{stats.confidenceTrend[stats.confidenceTrend.length - 1]! - stats.confidenceTrend[0]!} over 7 sessions
          </Text>
        </View>
        <TrendBars data={stats.confidenceTrend} />
      </Card>

      {/* average by axis */}
      <SectionHeader title="Average by axis" style={{ marginTop: space['2xl'] }} />
      <Card>
        {rubricAxes.map((a) => (
          <ScoreBar key={a.key} label={a.label} value={stats.axisAverages[a.key] ?? 0} />
        ))}
      </Card>

      {/* topic mastery */}
      <SectionHeader title="Topic mastery" style={{ marginTop: space['2xl'] }} />
      <Card style={{ gap: space.md }}>
        {stats.topicMastery.map((t) => (
          <View key={t.name}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.xs }}>
              <Text variant="small">{t.name}</Text>
              <Text variant="mono" tone="textMuted" style={{ fontSize: 12 }}>
                {t.pct}%
              </Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surface2, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${t.pct}%`, backgroundColor: c.gravitas, borderRadius: 3 }} />
            </View>
          </View>
        ))}
      </Card>

      {/* achievements */}
      <SectionHeader title="Achievements" style={{ marginTop: space['2xl'] }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {achievements.map((a) => (
          <View
            key={a.key}
            style={{
              width: '47%',
              flexGrow: 1,
              padding: space.md,
              borderRadius: radius.md,
              backgroundColor: a.earned ? c.surface : 'transparent',
              borderWidth: 1,
              borderColor: c.border,
              borderStyle: a.earned ? 'solid' : 'dashed',
              opacity: a.earned ? 1 : 0.6,
            }}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: a.earned ? c.accent : c.surface2,
              }}
            >
              {a.earned ? <Trophy size={16} color={c.onAccent} /> : <Lock size={15} color={c.textFaint} />}
            </View>
            <Text variant="bodyMedium" style={{ marginTop: space.sm, fontSize: 14 }}>
              {a.name}
            </Text>
            <Text variant="caption" tone="textFaint" style={{ marginTop: 2, lineHeight: 15 }}>
              {a.detail}
            </Text>
          </View>
        ))}
      </View>

      {/* recent history */}
      <SectionHeader title="Recent sessions" style={{ marginTop: space['2xl'] }} />
      <Card style={{ paddingVertical: space.xs }}>
        {stats.recent.map((s, i) => {
          const band = s.overall >= 80 ? c.success : s.overall >= 65 ? c.accent : c.gravitas;
          return (
            <Pressable
              key={s.id}
              onPress={() => router.push({ pathname: '/deck/[id]', params: { id: s.deckId } })}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                paddingVertical: space.md,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: c.border,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: band + '18',
                }}
              >
                <Text variant="mono" style={{ color: band, fontSize: 15 }}>
                  {s.overall}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" numberOfLines={1} style={{ fontSize: 14 }}>
                  {s.deckTitle}
                </Text>
                <Text variant="caption" tone="textFaint">
                  {modeName(s.mode)} · fix {s.weakest} · {s.when}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}
