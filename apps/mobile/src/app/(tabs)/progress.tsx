import { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Trophy, Lock, TrendingUp } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Card } from '@/ui/Card';
import { ScoreBar } from '@/ui/ScoreBar';
import { SectionHeader, ProgressRing, EmptyState } from '@/ui/kit';
import { useTheme } from '@/theme';
import { rubricAxes, modeName } from '@/data/content';
import { useStats, weeklyProgress } from '@/data/stats';
import type { UserStats } from '@/lib/api';

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

/** Achievements derived from real numbers — never shown as earned on a fresh account. */
function achievementsFor(s: UserStats) {
  return [
    { key: 'first', name: 'First answer', detail: 'Complete your first spoken answer.', earned: s.answersTotal >= 1 },
    { key: 'streak3', name: 'Three-day streak', detail: 'Practise three days in a row.', earned: s.streak.longest >= 3 },
    { key: 'streak7', name: 'Week strong', detail: 'Practise seven days in a row.', earned: s.streak.longest >= 7 },
    { key: 'ninety', name: 'Nailed it', detail: 'Reach a 90+ overall average.', earned: s.overall >= 90 },
    { key: 'ten', name: 'Getting reps in', detail: 'Finish ten practice sessions.', earned: s.sessionsTotal >= 10 },
    { key: 'fifty', name: 'Fifty answers', detail: 'Answer fifty questions out loud.', earned: s.answersTotal >= 50 },
  ];
}

export default function Progress() {
  const { space, c, radius } = useTheme();
  const { stats, refresh } = useStats();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const achievements = useMemo(() => achievementsFor(stats), [stats]);
  const trend = stats.confidenceTrend;
  const weekPct = weeklyProgress(stats.minutesThisWeek);

  return (
    <Screen>
      <Text variant="display2">Progress</Text>
      <Text variant="body" tone="textMuted" style={{ marginTop: space.xs }}>
        Where you’re improving, and what to work on next.
      </Text>

      {!stats.hasData ? (
        <View style={{ marginTop: space['3xl'] }}>
          <EmptyState
            icon={<TrendingUp size={22} color={c.textMuted} />}
            title="No sessions yet"
            body="Finish your first spoken answer and your scores, streak, and trends start filling in here — all tied to your account."
          />
        </View>
      ) : (
        <>
          {/* hero: overall ring + lifetime stats */}
          <Card style={{ marginTop: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.xl }}>
            <ProgressRing progress={stats.overall / 100} size={92} stroke={9} label={`${stats.overall}`} />
            <View style={{ flex: 1, gap: space.md }}>
              <View>
                <Text variant="caption" tone="textFaint">
                  OVERALL AVERAGE
                </Text>
                {stats.overallDelta !== 0 ? (
                  <Text variant="small" tone={stats.overallDelta > 0 ? 'success' : 'danger'}>
                    {stats.overallDelta > 0 ? '▲' : '▼'} {Math.abs(stats.overallDelta)} recently
                  </Text>
                ) : (
                  <Text variant="small" tone="textFaint">
                    building your baseline
                  </Text>
                )}
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
                  <Text variant="mono" style={{ fontSize: 17 }}>{stats.streak.longest}d</Text>
                  <Text variant="caption" tone="textFaint">best streak</Text>
                </View>
              </View>
            </View>
          </Card>

          {/* weekly minutes */}
          <Card style={{ marginTop: space.md, flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <ProgressRing progress={weekPct} size={56} stroke={7} label={`${Math.round(weekPct * 100)}%`} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">{stats.minutesThisWeek} min this week</Text>
              <Text variant="small" tone="textMuted">Weekly goal: 60 minutes of practice.</Text>
            </View>
          </Card>

          {/* confidence trend */}
          {trend.length >= 2 ? (
            <>
              <SectionHeader title="Confidence trend" style={{ marginTop: space['2xl'] }} />
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
                  <Text variant="display2" tone="success">
                    {trend[trend.length - 1]}
                  </Text>
                  <Text variant="small" tone="success" style={{ marginBottom: 6 }}>
                    ▲ +{Math.max(0, trend[trend.length - 1]! - trend[0]!)} over {trend.length} sessions
                  </Text>
                </View>
                <TrendBars data={trend} />
              </Card>
            </>
          ) : null}

          {/* average by axis */}
          <SectionHeader title="Average by axis" style={{ marginTop: space['2xl'] }} />
          <Card>
            {rubricAxes.map((a) => (
              <ScoreBar key={a.key} label={a.label} value={stats.axisAverages[a.key] ?? 0} />
            ))}
          </Card>

          {/* recent history */}
          {stats.recent.length ? (
            <>
              <SectionHeader title="Recent sessions" style={{ marginTop: space['2xl'] }} />
              <Card style={{ paddingVertical: space.xs }}>
                {stats.recent.map((s, i) => {
                  const band = s.overall >= 80 ? c.success : s.overall >= 65 ? c.accent : c.gravitas;
                  return (
                    <View
                      key={s.id}
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
                    </View>
                  );
                })}
              </Card>
            </>
          ) : null}
        </>
      )}

      {/* achievements — always visible, honestly gated */}
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
    </Screen>
  );
}
