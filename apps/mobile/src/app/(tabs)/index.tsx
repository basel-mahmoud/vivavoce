import { useCallback, useMemo } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Flame, Mic, Target, Lightbulb, Sparkles, ArrowRight } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { SectionHeader, StatTile, ProgressRing } from '@/ui/kit';
import { DeckCard } from '@/components/DeckCard';
import { useTheme } from '@/theme';
import { tipOfTheDay, rubricAxes, decksForSubjects } from '@/data/content';
import { useStats, weeklyProgress } from '@/data/stats';
import { useProfile } from '@/data/profile';
import { haptics } from '@/lib/haptics';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const { c, space, radius } = useTheme();
  const { profile } = useProfile();
  const { stats, refresh } = useStats();
  const tip = tipOfTheDay();

  // Keep the dashboard honest: re-pull stats whenever the tab regains focus
  // (e.g. right after finishing a session), so the streak reflects reality.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const recommended = useMemo(() => decksForSubjects(profile.subjects), [profile.subjects]);
  const resume = recommended[0]!;
  const weekPct = weeklyProgress(stats.minutesThisWeek);

  const weakest = useMemo(() => {
    if (!stats.hasData) return null;
    return (
      Object.entries(stats.axisAverages).sort((a, b) => a[1] - b[1])[0]?.[0] ?? 'structure'
    );
  }, [stats]);

  const startQuick = () => {
    haptics.press();
    router.push({ pathname: '/deck/[id]', params: { id: resume.id } });
  };

  return (
    <Screen>
      <Text variant="small" tone="textMuted">
        {greeting()}{profile.displayName ? `, ${profile.displayName}` : ''}
      </Text>
      <Text variant="display" style={{ marginTop: 2 }}>
        {stats.hasData ? 'Let’s sharpen up' : 'Ready when you are'}
      </Text>

      {/* stat row: streak, minutes, weekly goal ring */}
      <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xl }}>
        <StatTile
          label="Streak"
          value={`${stats.streak.current}d`}
          icon={<Flame size={14} color={c.accent} />}
        />
        <StatTile label="This week" value={`${stats.minutesThisWeek}m`} />
        <View
          style={{
            backgroundColor: c.surface,
            borderColor: c.border,
            borderWidth: 1,
            borderRadius: radius.lg,
            padding: space.md,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ProgressRing
            progress={weekPct}
            size={64}
            stroke={7}
            label={`${Math.round(weekPct * 100)}%`}
          />
        </View>
      </View>

      {/* resume / quick start */}
      <Pressable onPress={startQuick} accessibilityRole="button">
        <View
          style={{
            marginTop: space.md,
            borderRadius: radius.xl,
            backgroundColor: c.accent,
            padding: space.xl,
            overflow: 'hidden',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Mic size={16} color={c.onAccent} />
            <Text variant="caption" style={{ color: c.onAccent }}>
              {stats.hasData ? 'PICK UP WHERE YOU LEFT OFF' : 'START YOUR FIRST SESSION'}
            </Text>
          </View>
          <Text variant="title" style={{ color: c.onAccent, marginTop: space.sm }}>
            {resume.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.md }}>
            <Text variant="bodyMedium" style={{ color: c.onAccent }}>
              {stats.hasData ? 'Continue' : 'Begin'}
            </Text>
            <ArrowRight size={16} color={c.onAccent} />
          </View>
        </View>
      </Pressable>

      {/* focus areas — only real once there's data */}
      <SectionHeader
        title="Focus areas"
        action="Progress"
        onAction={() => router.push('/(tabs)/progress')}
        style={{ marginTop: space['2xl'] }}
      />
      <View
        style={{
          backgroundColor: c.surface,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: space.lg,
        }}
      >
        {stats.hasData && weakest ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Target size={16} color={c.accent} />
              <Text variant="bodyMedium">Your weakest axis is {weakest}</Text>
            </View>
            <View style={{ marginTop: space.md, gap: space.md }}>
              {rubricAxes.map((a) => {
                const v = stats.axisAverages[a.key] ?? 0;
                const band = v >= 80 ? c.success : v >= 65 ? c.accent : c.gravitas;
                return (
                  <View key={a.key} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <Text variant="small" style={{ width: 92 }}>
                      {a.label}
                    </Text>
                    <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: c.surface2, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${v}%`, backgroundColor: band, borderRadius: 3 }} />
                    </View>
                    <Text variant="mono" tone="textMuted" style={{ width: 26, textAlign: 'right', fontSize: 12 }}>
                      {v}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Sparkles size={18} color={c.accent} />
            <Text variant="small" tone="textMuted" style={{ flex: 1 }}>
              Answer a few questions out loud and your five-axis breakdown — clarity,
              structure, confidence and more — shows up here.
            </Text>
          </View>
        )}
      </View>

      {/* recommended decks — calibrated to the user's subjects */}
      <SectionHeader
        title="Recommended for you"
        action="Library"
        onAction={() => router.push('/(tabs)/library')}
        style={{ marginTop: space['2xl'] }}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.md, paddingRight: space.xl }}
        style={{ marginHorizontal: -space.xl, paddingHorizontal: space.xl }}
      >
        {recommended.slice(0, 6).map((d) => (
          <DeckCard key={d.id} deck={d} compact />
        ))}
      </ScrollView>

      {/* tip of the day */}
      <View
        style={{
          marginTop: space['2xl'],
          padding: space.xl,
          borderRadius: radius.lg,
          backgroundColor: c.text,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <Lightbulb size={15} color={c.accent} />
          <Text variant="caption" style={{ color: c.accent }}>
            TIP OF THE DAY
          </Text>
        </View>
        <Text variant="title" style={{ color: c.bg, marginTop: space.sm }}>
          {tip.title}
        </Text>
        <Text variant="small" style={{ color: c.bg, opacity: 0.75, marginTop: space.xs, lineHeight: 20 }}>
          {tip.body}
        </Text>
      </View>
    </Screen>
  );
}
