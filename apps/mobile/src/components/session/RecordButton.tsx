import { Pressable, View } from 'react-native';
import { Mic, Square } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  useReducedMotion,
  cancelAnimation,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useTheme } from '@/theme';

/** The living record control. A calm pulsing ring while listening; springy press. */
export function RecordButton({
  listening,
  onPress,
  disabled,
}: {
  listening: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const ring = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (listening && !reduced) {
      ring.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
    } else {
      cancelAnimation(ring);
      ring.value = 0;
    }
    return () => cancelAnimation(ring);
  }, [listening, reduced, ring]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ring.value * 0.6 }],
    opacity: 0.5 - ring.value * 0.5,
  }));
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const size = 116;
  const color = listening ? c.live : c.accent;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: size * 1.8 }}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          ringStyle,
        ]}
      />
      <Animated.View style={btnStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={listening ? 'Stop recording' : 'Start recording'}
          disabled={disabled}
          onPressIn={() => {
            scale.value = withSpring(0.94, { damping: 24, stiffness: 400 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 24, stiffness: 400 });
          }}
          onPress={onPress}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: color,
            shadowOpacity: 0.4,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 8 },
          }}
        >
          {listening ? (
            <Square size={36} color={c.onAccent} fill={c.onAccent} />
          ) : (
            <Mic size={42} color={c.onAccent} />
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}
