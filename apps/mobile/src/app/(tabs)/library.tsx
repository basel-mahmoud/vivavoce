import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Plus, ChevronRight } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Card } from '@/ui/Card';
import { Pill } from '@/ui/Pill';
import { useTheme } from '@/theme';
import { starterDecks } from '@/data/content';
import { haptics } from '@/lib/haptics';

export default function LibraryScreen() {
  const { c, space } = useTheme();
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="display2">Library</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create a deck"
          onPress={() => haptics.tap()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <Plus size={18} color={c.text} />
        </Pressable>
      </View>
      <Text variant="body" tone="textMuted" style={{ marginTop: space.xs }}>
        Your decks and starter sets. Create your own or import a question list.
      </Text>

      <Text variant="caption" tone="textFaint" style={{ marginTop: space.xl, marginBottom: space.sm }}>
        STARTER DECKS
      </Text>
      {starterDecks.map((d) => (
        <Pressable
          key={d.id}
          onPress={() =>
            router.push({ pathname: '/session/[id]', params: { id: 'new', mode: 'flash_recall', deckId: d.id } })
          }
        >
          <Card style={{ marginBottom: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium">{d.title}</Text>
                <Text variant="small" tone="textMuted" style={{ marginTop: 2 }}>
                  {d.subject} · {d.questions.length} questions
                </Text>
              </View>
              <ChevronRight size={18} color={c.textFaint} />
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
              <Pill label={d.difficulty} tone="muted" />
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
