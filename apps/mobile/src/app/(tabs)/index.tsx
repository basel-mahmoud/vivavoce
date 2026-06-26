import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Flame, ChevronRight, Mic, Target } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Card } from '@/ui/Card';
import { Pill } from '@/ui/Pill';
import { Waveform } from '@/ui/Waveform';
import { useTheme } from '@/theme';
import { useProfile } from '@/data/profile';
import { starterDecks, modes } from '@/data/content';
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
  const deck = starterDecks[0]!;

  const startQuick = () => {
    haptics.press();
    router.push({
      pathname: '/session/[id]',
      params: { id: 'new', mode: 'mock_viva', deckId: deck.id },
    });
  };

  return (
    <Screen>
      <Text variant="small" tone="textMuted">
        {greeting()}
      </Text>
      <Text variant="display" style={{ marginTop: 2 }}>
        Let’s sharpen up
      </Text>

      {/* streak + minutes */}
      <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xl }}>
        <Card style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Flame size={16} color={c.accent} />
            <Text variant="caption" tone="textMuted">
              STREAK
            </Text>
          </View>
          <Text variant="display2" style={{ marginTop: space.sm }}>
            4 days
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text variant="caption" tone="textMuted">
            THIS WEEK
          </Text>
          <Text variant="display2" style={{ marginTop: space.sm }}>
            38 min
          </Text>
        </Card>
      </View>

      {/* quick start — the one ember action */}
      <Pressable onPress={startQuick} accessibilityRole="button">
        <View
          style={{
            marginTop: space.lg,
            borderRadius: radius.xl,
            backgroundColor: c.accent,
            padding: space.xl,
            overflow: 'hidden',
          }}
        >
          <View style={{ position: 'absolute', right: -10, top: 10, opacity: 0.25 }}>
            <Waveform bars={26} live height={56} color={c.onAccent} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Mic size={18} color={c.onAccent} />
            <Text variant="caption" style={{ color: c.onAccent }}>
              QUICK START · MOCK VIVA
            </Text>
          </View>
          <Text variant="title" style={{ color: c.onAccent, marginTop: space.sm }}>
            {deck.title}
          </Text>
          <Text variant="small" style={{ color: c.onAccent, opacity: 0.8, marginTop: 2 }}>
            {deck.questions.length} questions · ~6 min
          </Text>
        </View>
      </Pressable>

      {/* weak areas */}
      <Text variant="title" style={{ marginTop: space['2xl'], marginBottom: space.md }}>
        Focus areas
      </Text>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Target size={16} color={c.gravitas} />
          <Text variant="bodyMedium">Structure</Text>
          <Pill label="weakest" tone="live" style={{ marginLeft: 'auto' }} />
        </View>
        <Text variant="small" tone="textMuted" style={{ marginTop: space.sm }}>
          Your answers tend to wander before landing. Practising signposting will
          move this fastest.
        </Text>
      </Card>

      {/* recommended modes */}
      <Text variant="title" style={{ marginTop: space['2xl'], marginBottom: space.md }}>
        Recommended drills
      </Text>
      {modes.slice(0, 3).map((m) => (
        <Pressable
          key={m.key}
          onPress={() =>
            router.push({
              pathname: '/session/[id]',
              params: { id: 'new', mode: m.key, deckId: deck.id },
            })
          }
        >
          <Card style={{ marginBottom: space.md, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">{m.name}</Text>
              <Text variant="small" tone="textMuted" style={{ marginTop: 2 }}>
                {m.line}
              </Text>
            </View>
            <ChevronRight size={18} color={c.textFaint} />
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
