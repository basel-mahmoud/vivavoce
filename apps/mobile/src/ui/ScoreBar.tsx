import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

export function bandColor(
  score: number,
  c: { success: string; accent: string; gravitas: string },
) {
  if (score >= 80) return c.success;
  if (score >= 65) return c.accent;
  return c.gravitas;
}

export function ScoreBar({ label, value }: { label: string; value: number }) {
  const { c, space, radius } = useTheme();
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
        <View
          style={{
            height: '100%',
            width: `${Math.max(0, Math.min(100, value))}%`,
            backgroundColor: bandColor(value, c),
            borderRadius: radius.pill,
          }}
        />
      </View>
    </View>
  );
}
