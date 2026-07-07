import { useEffect, useMemo, useState } from 'react';
import { View, TextInput, ScrollView, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Search, Plus, SearchX, Sparkles, X } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { Chip, EmptyState, SectionHeader } from '@/ui/kit';
import { entrance, PressableScale } from '@/ui/motion';
import { DeckCard } from '@/components/DeckCard';
import { useTheme } from '@/theme';
import { tintColor } from '@/theme/tint';
import { haptics } from '@/lib/haptics';
import { useApi } from '@/data/api-context';
import {
  subjects,
  decksBySubject,
  allDecks,
  registerServerDecks,
  generatedDecks,
  type Deck,
} from '@/data/content';

export default function LibraryScreen() {
  const { c, space, radius } = useTheme();
  const api = useApi();
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState<string | null>(null);
  const [aiDecks, setAiDecks] = useState<Deck[]>(generatedDecks());
  const [aiOpen, setAiOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(6);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Hydrate the registry with the account's AI decks (server is the truth).
  useEffect(() => {
    if (!api) return;
    api
      .listDecks()
      .then((res) => {
        if (res.ok) {
          registerServerDecks(res.data.decks);
          setAiDecks(generatedDecks());
        }
      })
      .catch(() => {});
  }, [api]);

  const generate = async () => {
    if (!api || generating || topic.trim().length < 3) return;
    setGenerating(true);
    setAiError(null);
    const res = await api.generateDeck({ topic: topic.trim(), count });
    setGenerating(false);
    if (res.ok) {
      const [deck] = registerServerDecks([res.data.deck]);
      setAiDecks(generatedDecks());
      setAiOpen(false);
      setTopic('');
      haptics.success();
      router.push({ pathname: '/deck/[id]', params: { id: deck!.id } });
    } else {
      setAiError(
        res.error.code === 'rate_limited'
          ? 'You have hit the hourly AI-deck limit. Try again in a bit.'
          : 'We could not build that deck. Check your connection and try again.',
      );
    }
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...aiDecks, ...allDecks].filter((d) => {
      if (subject && d.subjectKey !== subject) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.subject.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, subject, aiDecks]);

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
          accessibilityLabel="Create a deck with AI"
          onPress={() => {
            haptics.tap();
            setAiOpen(true);
          }}
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
        <>
          {/* the user's AI-generated decks, freshest first */}
          {aiDecks.length > 0 ? (
            <View style={{ marginTop: space.xl }}>
              <SectionHeader title="Your AI decks" />
              <View style={{ gap: space.md }}>
                {aiDecks.map((d) => (
                  <DeckCard key={d.id} deck={d} />
                ))}
              </View>
            </View>
          ) : null}

          {/* browse by subject when not filtering */}
          {subjects
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
            ))}
        </>
      )}

      {/* Create-with-AI: any topic → a calibrated deck in seconds */}
      <Modal
        visible={aiOpen}
        animationType="slide"
        onRequestClose={() => setAiOpen(false)}
        presentationStyle="fullScreen"
      >
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
            <Text variant="title">Create a deck with AI</Text>
            <Pressable
              onPress={() => setAiOpen(false)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={24} color={c.textMuted} />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: space.xl, gap: space.md }}>
            <Text variant="body" tone="textMuted">
              Name any topic and we’ll build an examiner-grade deck calibrated to
              your field and level.
            </Text>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g. Renal physiology, Graph algorithms…"
              placeholderTextColor={c.textFaint}
              autoFocus
              maxLength={120}
              style={{
                height: 52,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: c.border,
                backgroundColor: c.surface,
                paddingHorizontal: space.lg,
                color: c.text,
                fontFamily: 'Archivo_400Regular',
                fontSize: 16,
              }}
              accessibilityLabel="Deck topic"
            />

            <Text variant="caption" tone="textFaint" style={{ marginTop: space.sm }}>
              QUESTIONS
            </Text>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              {[4, 6, 8].map((n) => (
                <Chip
                  key={n}
                  label={`${n}`}
                  active={count === n}
                  onPress={() => {
                    haptics.tap();
                    setCount(n);
                  }}
                />
              ))}
            </View>

            {aiError ? (
              <Text variant="small" tone="danger" accessibilityRole="alert">
                {aiError}
              </Text>
            ) : null}

            <Button
              label={generating ? 'Building your deck…' : 'Generate deck'}
              onPress={generate}
              loading={generating}
              disabled={topic.trim().length < 3}
              icon={<Sparkles size={16} color={c.onAccent} />}
              style={{ marginTop: space.md }}
            />
            <Text variant="caption" tone="textFaint" style={{ textAlign: 'center' }}>
              Decks are saved to your account. Up to 6 per hour.
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    </Screen>
  );
}
