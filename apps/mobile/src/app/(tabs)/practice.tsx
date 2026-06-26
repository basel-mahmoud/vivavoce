import { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Card } from '@/ui/Card';
import { useTheme } from '@/theme';
import { modes, starterDecks } from '@/data/content';
import { haptics } from '@/lib/haptics';

export default function Practice() {
  const { c, space, radius } = useTheme();
  const [deckId, setDeckId] = useState(starterDecks[0]!.id);

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
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {starterDecks.map((d) => {
            const active = d.id === deckId;
            return (
              <Pressable key={d.id} onPress={() => { haptics.tap(); setDeckId(d.id); }}>
                <View
                  style={{
                    paddingHorizontal: space.lg,
                    paddingVertical: space.md,
                    borderRadius: radius.pill,
                    borderWidth: 1.5,
                    borderColor: active ? c.accent : c.border,
                    backgroundColor: active ? c.accent + '12' : c.surface,
                  }}
                >
                  <Text variant="small" style={{ color: active ? c.accentDeep : c.textMuted }}>
                    {d.title}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* modes */}
      <Text variant="caption" tone="textFaint" style={{ marginTop: space.xl, marginBottom: space.sm }}>
        MODE
      </Text>
      {modes.map((m) => (
        <Pressable key={m.key} onPress={() => start(m.key)}>
          <Card style={{ marginBottom: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: c.accent,
                }}
              />
              <Text variant="bodyMedium">{m.name}</Text>
            </View>
            <Text variant="small" tone="textMuted" style={{ marginTop: space.sm }}>
              {m.line}
            </Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
