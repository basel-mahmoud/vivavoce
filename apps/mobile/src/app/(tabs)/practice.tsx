import { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Clock } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Chip } from '@/ui/kit';
import { ModeIcon } from '@/components/ModeIcon';
import { useTheme } from '@/theme';
import { haptics } from '@/lib/haptics';
import { modes, featuredDecks, deckById, estMinutes } from '@/data/content';

export default function Practice() {
  const { c, space, radius } = useTheme();
  const [deckId, setDeckId] = useState(featuredDecks[0]!.id);
  const deck = deckById(deckId)!;

  const start = (mode: string) => {
    haptics.press();
    router.push({ pathname: '/session/[id]', params: { id: 'new', mode, deckId } });
  };

  return (
    <Screen>
      <Text variant="display2">Practice</Text>
      <Text variant="body" tone="textMuted" style={{ marginTop: space.xs }}>
        Pick a deck, then choose how you want to spar.
      </Text>

      {/* deck selector */}
      <Text variant="caption" tone="textFaint" style={{ marginTop: space.xl, marginBottom: space.sm }}>
        DECK
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.sm, paddingRight: space.xl }}
        style={{ marginHorizontal: -space.xl, paddingHorizontal: space.xl }}
      >
        {featuredDecks.map((d) => (
          <Chip
            key={d.id}
            label={d.title}
            active={d.id === deckId}
            onPress={() => { haptics.tap(); setDeckId(d.id); }}
          />
        ))}
        <Chip label="Browse all →" onPress={() => router.push('/(tabs)/library')} />
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.md }}>
        <Clock size={13} color={c.textFaint} />
        <Text variant="caption" tone="textFaint">
          {deck.subject} · {deck.questions.length} questions
        </Text>
      </View>

      {/* modes */}
      <Text variant="caption" tone="textFaint" style={{ marginTop: space.xl, marginBottom: space.sm }}>
        MODE
      </Text>
      <View style={{ gap: space.md }}>
        {modes.map((m) => (
          <Pressable key={m.key} onPress={() => start(m.key)} accessibilityRole="button">
            <View
              style={{
                flexDirection: 'row',
                gap: space.md,
                padding: space.lg,
                borderRadius: radius.lg,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: c.surface2,
                }}
              >
                <ModeIcon icon={m.icon} color={c.accent} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text variant="bodyMedium">{m.name}</Text>
                  <ChevronRight size={18} color={c.textFaint} />
                </View>
                <Text variant="small" tone="textMuted" style={{ marginTop: 2, lineHeight: 19 }}>
                  {m.detail}
                </Text>
                <Text variant="caption" tone="textFaint" style={{ marginTop: space.sm }}>
                  ~{estMinutes(deck, m.key)} min
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
