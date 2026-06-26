import { Pressable, ActivityIndicator, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme, minTapTarget } from '@/theme';
import { haptics } from '@/lib/haptics';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}) {
  const { c, radius, space } = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const bg =
    variant === 'primary' ? c.accent : variant === 'secondary' ? c.surface : 'transparent';
  const fg = variant === 'primary' ? c.onAccent : c.text;
  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 26, stiffness: 420 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 26, stiffness: 420 });
      }}
      onPress={() => {
        haptics.press();
        onPress?.();
      }}
      style={[
        animatedStyle,
        {
          minHeight: minTapTarget + 6,
          paddingHorizontal: space['2xl'],
          borderRadius: radius.pill,
          backgroundColor: bg,
          opacity: isDisabled ? 0.5 : 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: c.border,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <View>{icon}</View> : null}
          <Text variant="bodyMedium" style={{ color: fg }}>
            {label}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
