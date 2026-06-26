import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Text } from '@/ui/Text';
import { haptics } from '@/lib/haptics';

export function Choice({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { c, radius, space } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        padding: space.lg,
        borderRadius: radius.lg,
        borderWidth: 1.5,
        borderColor: selected ? c.accent : c.border,
        backgroundColor: selected ? c.accent + '12' : c.surface,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">{label}</Text>
        {description ? (
          <Text variant="small" tone="textMuted" style={{ marginTop: 2 }}>
            {description}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? c.accent : 'transparent',
          borderWidth: selected ? 0 : 1.5,
          borderColor: c.border,
        }}
      >
        {selected ? <Check size={15} color={c.onAccent} /> : null}
      </View>
    </Pressable>
  );
}
