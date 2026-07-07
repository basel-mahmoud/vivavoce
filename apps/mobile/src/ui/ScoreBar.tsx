import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { useFillProgress } from './motion';
import { Text } from './Text';

export function bandColor(
  score: number,
  c: { success: string; accent: string; gravitas: string },
) {
  if (score >= 80) return c.success;
  if (score >= 65) return c.accent;
  return c.gravitas;
}

/** A labelled 0–100 bar whose fill draws in (staggered by `order`). */
export function ScoreBar({ label, value, order = 0 }: { label: string; value: number; order?: number }) {
  const { c, space, radius } = useTheme();
  const progress = useFillProgress(value / 100, order * 70);
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  return (
    <View style={{ marginBottom: space.md }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: space.xs,
        }}
      >
        <Text variant="small">{label}</Text>
        <Text variant="mono" tone="textMuted">
          {value}
        </Text>
      </View>
      <View
        style={{
          height: 6,
          borderRadius: radius.pill,
          backgroundColor: c.surface2,
          overflow: 'hidden',
        }}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: value }}
      >
        <Animated.View
          style={[
            {
              height: '100%',
              width: '100%',
              backgroundColor: bandColor(value, c),
              borderRadius: radius.pill,
              transformOrigin: 'left center',
            },
            fillStyle,
          ]}
        />
      </View>
    </View>
  );
}
