import { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { FadeInUp, ReduceMotion } from 'react-native-reanimated';
import { ChevronLeft, Play, Check } from 'lucide-react-native';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { Chip, Dot } from '@/ui/kit';
import { entrance, easeOutQuint, PressableScale } from '@/ui/motion';
import { ModeIcon } from '@/components/ModeIcon';
import { useTheme } from '@/theme';
import { tintColor } from '@/theme/tint';
import { haptics } from '@/lib/haptics';
import {
  deckById,
  subjectByKey,
  modes,
  estMinutes,
  difficultyLabel,
  type ModeKey,
} from '@/data/content';

export default function DeckDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c, space, radius } = useTheme();
  const deck = deckById(id ?? '');
  const [mode, setMode] = useState<ModeKey>('mock_viva');

  if (!deck) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="bodyMedium">Deck not found.</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </SafeAreaView>
    );
  }

  const subject = subjectByKey(deck.subjectKey);
  const accent = subject ? tintColor(c, subject.tint) : c.accent;

  const start = () => {
    haptics.press();
    router.push({ pathname: '/session/[id]', params: { id: 'new', mode, deckId: deck.id } });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      {/* header */}
      <View style={{ paddingHorizontal: space.xl, paddingVertical: space.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back" accessibilityRole="button">
          <ChevronLeft size={26} color={c.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={entrance(0)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Dot color={accent} />
            <Text variant="caption" style={{ color: accent }}>
              {deck.subject.toUpperCase()}
            </Text>
          </View>
          <Text variant="display2" style={{ marginTop: space.sm }}>
            {deck.title}
          </Text>
          <Text variant="body" tone="textMuted" style={{ marginTop: space.sm }}>
            {deck.description}
          </Text>
        </Animated.View>

        {/* meta */}
        <Animated.View
          entering={entrance(1)}
          style={{ flexDirection: 'row', gap: space.lg, marginTop: space.lg }}
        >
          {[
            [`${deck.questions.length}`, 'questions'],
            [`${estMinutes(deck, mode)}`, 'minutes'],
            [difficultyLabel[deck.difficulty], 'level'],
          ].map(([v, l]) => (
            <View key={l}>
              <Text variant="mono" style={{ fontSize: 18 }}>
                {v}
              </Text>
              <Text variant="caption" tone="textFaint">
                {l}
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* tags */}
        <Animated.View
          entering={entrance(2)}
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.lg }}
        >
          {deck.tags.map((t) => (
            <Chip key={t} label={t} />
          ))}
        </Animated.View>

        {/* mode picker */}
        <Animated.View entering={entrance(3)}>
          <Text variant="title" style={{ marginTop: space['2xl'], marginBottom: space.md }}>
            How do you want to spar?
          </Text>
          <View style={{ gap: space.sm }}>
            {modes.map((m) => {
              const active = m.key === mode;
              return (
                <PressableScale
                  key={m.key}
                  haptic={false}
                  onPress={() => {
                    haptics.tap();
                    setMode(m.key);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    padding: space.md,
                    borderRadius: radius.md,
                    borderWidth: 1.5,
                    borderColor: active ? c.accent : c.border,
                    backgroundColor: active ? c.accent + '10' : c.surface,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: active ? c.accent : c.surface2,
                    }}
                  >
                    <ModeIcon icon={m.icon} color={active ? c.onAccent : c.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium">{m.name}</Text>
                    <Text variant="small" tone="textMuted" numberOfLines={1}>
                      {m.line}
                    </Text>
                  </View>
                  {active ? <Check size={18} color={c.accent} /> : null}
                </PressableScale>
              );
            })}
          </View>
        </Animated.View>

        {/* question preview */}
        <Animated.View entering={entrance(4)}>
          <Text variant="title" style={{ marginTop: space['2xl'], marginBottom: space.md }}>
            What you’ll be asked
          </Text>
          <View style={{ gap: space.md }}>
            {deck.questions.map((q, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: space.md }}>
                <Text variant="mono" style={{ color: accent, width: 22 }}>
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <Text variant="small" style={{ flex: 1, lineHeight: 21 }}>
                  {q}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* sticky start bar — rises in after the content settles */}
      <Animated.View
        entering={FadeInUp.duration(320)
          .delay(220)
          .easing(easeOutQuint)
          .reduceMotion(ReduceMotion.System)}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: space.xl,
          paddingTop: space.md,
          paddingBottom: space['2xl'],
          backgroundColor: c.bg,
          borderTopWidth: 1,
          borderTopColor: c.border,
        }}
      >
        <Button
          label={`Start ${modes.find((m) => m.key === mode)!.name}`}
          onPress={start}
          icon={<Play size={16} color={c.onAccent} fill={c.onAccent} />}
        />
      </Animated.View>
    </SafeAreaView>
  );
}
