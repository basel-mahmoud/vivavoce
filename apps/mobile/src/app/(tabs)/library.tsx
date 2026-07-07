import { useMemo, useState } from 'react';
import { View, TextInput, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Search, Plus, SearchX } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Chip, EmptyState } from '@/ui/kit';
import { entrance, PressableScale } from '@/ui/motion';
import { DeckCard } from '@/components/DeckCard';
import { useTheme } from '@/theme';
import { tintColor } from '@/theme/tint';
import { haptics } from '@/lib/haptics';
import { subjects, decksBySubject, allDecks } from '@/data/content';

export default function LibraryScreen() {
  const { c, space, radius } = useTheme();
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allDecks.filter((d) => {
      if (subject && d.subjectKey !== subject) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.subject.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, subject]);

  const searching = query.trim().length > 0 || subject !== null;

  return (
    <Screen>
      <Animated.View
        entering={entrance(0)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Text variant="display2">Library</Text>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Create a deck"
          onPress={() => haptics.tap()}
          haptic={false}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.text,
          }}
        >
          <Plus size={18} color={c.bg} />
        </PressableScale>
      </Animated.View>

      {/* search */}
      <Animated.View
        entering={entrance(1)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          marginTop: space.lg,
          paddingHorizontal: space.lg,
          height: 46,
          borderRadius: radius.pill,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
        }}
      >
        <Search size={17} color={c.textFaint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search decks, subjects, tags"
          placeholderTextColor={c.textFaint}
          style={{ flex: 1, color: c.text, fontFamily: 'Archivo_400Regular', fontSize: 15 }}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="Search decks"
        />
      </Animated.View>

      {/* subject filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.sm, paddingRight: space.xl }}
        style={{ marginHorizontal: -space.xl, paddingHorizontal: space.xl, marginTop: space.md }}
      >
        <Chip label="All" active={subject === null} onPress={() => { haptics.tap(); setSubject(null); }} />
        {subjects.map((s) => (
          <Chip
            key={s.key}
            label={s.name}
            active={subject === s.key}
            tint={tintColor(c, s.tint)}
            onPress={() => { haptics.tap(); setSubject(subject === s.key ? null : s.key); }}
          />
        ))}
      </ScrollView>

      {/* results */}
      {results.length === 0 ? (
        <Animated.View entering={FadeIn.duration(180)} style={{ marginTop: space['2xl'] }}>
          <EmptyState
            icon={<SearchX size={22} color={c.textMuted} />}
            title="No decks match"
            body="Try a different subject or clear your search to see the full catalogue."
          />
        </Animated.View>
      ) : searching ? (
        <Animated.View entering={FadeIn.duration(180)} style={{ marginTop: space.xl, gap: space.md }}>
          <Text variant="caption" tone="textFaint">
            {results.length} {results.length === 1 ? 'DECK' : 'DECKS'}
          </Text>
          {results.map((d) => (
            <DeckCard key={d.id} deck={d} />
          ))}
        </Animated.View>
      ) : (
        // Browse by subject when not filtering
        subjects
          .map((s) => ({ subject: s, decks: decksBySubject(s.key) }))
          .filter((g) => g.decks.length > 0)
          .map(({ subject: s, decks }) => (
            <View key={s.key} style={{ marginTop: space.xl }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md }}>
                <View>
                  <Text variant="title">{s.name}</Text>
                  <Text variant="small" tone="textMuted">{s.blurb}</Text>
                </View>
                <Text variant="caption" tone="textFaint">{decks.length}</Text>
              </View>
              <View style={{ gap: space.md }}>
                {decks.map((d) => (
                  <DeckCard key={d.id} deck={d} />
                ))}
              </View>
            </View>
          ))
      )}
    </Screen>
  );
}
