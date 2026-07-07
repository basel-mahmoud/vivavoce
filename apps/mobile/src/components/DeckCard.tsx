import { View } from 'react-native';
import { router } from 'expo-router';
import { Clock, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { tintColor } from '@/theme/tint';
import { Text } from '@/ui/Text';
import { Dot } from '@/ui/kit';
import { PressableScale } from '@/ui/motion';
import {
  type Deck,
  subjectByKey,
  estMinutes,
  difficultyLabel,
} from '@/data/content';

/** A rich, tappable deck card used across Home, Library, and search. */
export function DeckCard({ deck, compact }: { deck: Deck; compact?: boolean }) {
  const { c, space, radius } = useTheme();
  const subject = subjectByKey(deck.subjectKey);
  const accent = subject ? tintColor(c, subject.tint) : c.accent;

  return (
    <PressableScale
      onPress={() => {
        router.push({ pathname: '/deck/[id]', params: { id: deck.id } });
      }}
      style={{
        width: compact ? 244 : undefined,
        backgroundColor: c.surface,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: space.lg,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.sm }}>
        <Dot color={accent} />
        <Text variant="caption" style={{ color: accent }}>
          {deck.subject.toUpperCase()}
        </Text>
      </View>

      <Text variant="bodyMedium" numberOfLines={2}>
        {deck.title}
      </Text>
      <Text variant="small" tone="textMuted" numberOfLines={2} style={{ marginTop: 4, minHeight: compact ? 36 : undefined }}>
        {deck.description}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          marginTop: space.md,
        }}
      >
        <Text variant="caption" tone="textFaint">
          {deck.questions.length} Q
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Clock size={12} color={c.textFaint} />
          <Text variant="caption" tone="textFaint">
            {estMinutes(deck)} min
          </Text>
        </View>
        <Text variant="caption" tone="textFaint">
          {difficultyLabel[deck.difficulty]}
        </Text>
        {!compact ? <ChevronRight size={16} color={c.textFaint} style={{ marginLeft: 'auto' }} /> : null}
      </View>
    </PressableScale>
  );
}
