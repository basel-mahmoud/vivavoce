import { useEffect, useState } from 'react';
import { View, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Animated from 'react-native-reanimated';
import { X, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Text } from '@/ui/Text';
import { Card } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { ScoreBar, bandColor } from '@/ui/ScoreBar';
import { entrance, Stamp, DigitRoll, Skeleton } from '@/ui/motion';
import { useTheme } from '@/theme';
import { useApi } from '@/data/api-context';
import { rubricAxes, modeName } from '@/data/content';
import type { SessionDetail } from '@/lib/api';

/**
 * End-of-session recap: the session average stamps in, then every answer is
 * reviewable — question, marks, and the full transcript (your own words back).
 * Data is the session's stored answers; nothing here is recomputed client-side.
 */
export default function SessionRecap() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const { c, space, type } = useTheme();
  const api = useApi();
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!api || !id) return;
    api
      .getSession(id)
      .then((res) => {
        if (res.ok) setDetail(res.data);
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, [api, id]);

  const answers = detail?.answers ?? [];
  const marked = answers.filter((a) => a.overall != null);
  const avg = detail?.session.overallScore ??
    (marked.length
      ? Math.round(marked.reduce((s, a) => s + (a.overall ?? 0), 0) / marked.length)
      : null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: space.xl,
          paddingVertical: space.md,
        }}
      >
        <Text variant="title" numberOfLines={1} style={{ flex: 1, marginRight: space.md }}>
          {title ?? 'Session recap'}
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close recap">
          <X size={24} color={c.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: space['4xl'] }}
        showsVerticalScrollIndicator={false}
      >
        {!detail && !failed ? (
          <View style={{ gap: space.md, marginTop: space.md }}>
            <Skeleton style={{ height: 120 }} />
            <Skeleton style={{ height: 88 }} />
            <Skeleton style={{ height: 88 }} />
          </View>
        ) : failed ? (
          <Card style={{ marginTop: space.md }}>
            <Text variant="body">This recap could not load.</Text>
            <Text variant="small" tone="textMuted" style={{ marginTop: 4 }}>
              Your marks are saved to your account — check Progress for the
              session history.
            </Text>
          </Card>
        ) : (
          <>
            {/* session average */}
            <Animated.View entering={entrance(0)}>
              <Card style={{ marginTop: space.md }}>
                <Text variant="caption" tone="textMuted">
                  {modeName(detail!.session.mode).toUpperCase()} · {marked.length}{' '}
                  {marked.length === 1 ? 'ANSWER' : 'ANSWERS'}
                </Text>
                {avg != null ? (
                  <Stamp style={{ marginTop: space.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                      <DigitRoll
                        value={avg}
                        height={type.display.lineHeight}
                        textStyle={{ ...type.display, color: bandColor(avg, c) }}
                      />
                      <Text variant="body" tone="textFaint" style={{ marginBottom: 6 }}>
                        /100 average
                      </Text>
                    </View>
                  </Stamp>
                ) : (
                  <Text variant="body" tone="textMuted" style={{ marginTop: space.sm }}>
                    No marked answers in this session yet.
                  </Text>
                )}
              </Card>
            </Animated.View>

            {/* per-answer review */}
            {answers.map((a, i) => {
              const open = expanded === a.id;
              const band = a.overall != null ? bandColor(a.overall, c) : c.textFaint;
              return (
                <Animated.View key={a.id} entering={entrance(i + 1)}>
                  <Card style={{ marginTop: space.md }}>
                    <Pressable
                      onPress={() => setExpanded(open ? null : a.id)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: open }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}
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
                          {a.overall ?? '–'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium" numberOfLines={open ? undefined : 2}>
                          {a.questionPrompt}
                        </Text>
                        {a.weakestAxis ? (
                          <Text variant="caption" tone="textFaint" style={{ marginTop: 2 }}>
                            fix {a.weakestAxis}
                          </Text>
                        ) : null}
                      </View>
                      {open ? (
                        <ChevronUp size={18} color={c.textFaint} />
                      ) : (
                        <ChevronDown size={18} color={c.textFaint} />
                      )}
                    </Pressable>

                    {open ? (
                      <View style={{ marginTop: space.lg, gap: space.md }}>
                        {a.scores ? (
                          <View>
                            {rubricAxes.map((ax, j) => (
                              <ScoreBar
                                key={ax.key}
                                label={ax.label}
                                value={a.scores?.[ax.key] ?? 0}
                                order={j}
                              />
                            ))}
                          </View>
                        ) : null}
                        {a.summary ? <Text variant="small">{a.summary}</Text> : null}
                        {a.transcript ? (
                          <View>
                            <Text variant="caption" tone="textFaint" style={{ marginBottom: 4 }}>
                              YOUR ANSWER, TRANSCRIBED
                            </Text>
                            <Text variant="small" tone="textMuted" style={{ lineHeight: 21 }}>
                              “{a.transcript}”
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </Card>
                </Animated.View>
              );
            })}
          </>
        )}

        <Button label="Done" onPress={() => router.back()} style={{ marginTop: space['2xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}
