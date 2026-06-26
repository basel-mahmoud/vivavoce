import { View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

export function Pill({
  label,
  tone = 'muted',
  style,
}: {
  label: string;
  tone?: 'muted' | 'accent' | 'live' | 'success';
  style?: ViewStyle;
}) {
  const { c, radius, space } = useTheme();
  const map = {
    muted: { bg: c.surface2, fg: c.textMuted, border: c.border },
    accent: { bg: c.accent + '22', fg: c.accentDeep, border: c.accent + '55' },
    live: { bg: c.live + '22', fg: c.live, border: c.live + '55' },
    success: { bg: c.success + '22', fg: c.success, border: c.success + '55' },
  }[tone];

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          paddingHorizontal: space.md,
          paddingVertical: space.xs,
          borderRadius: radius.pill,
          backgroundColor: map.bg,
          borderWidth: 1,
          borderColor: map.border,
        },
        style,
      ]}
    >
      <Text variant="caption" style={{ color: map.fg }}>
        {label}
      </Text>
    </View>
  );
}
