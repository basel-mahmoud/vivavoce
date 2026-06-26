import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  useReducedMotion,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';

function Bar({
  index,
  base,
  live,
  color,
  height,
}: {
  index: number;
  base: number;
  live: boolean;
  color: string;
  height: number;
}) {
  const scale = useSharedValue(base);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (live && !reduced) {
      const peak = 0.5 + ((index * 37) % 50) / 100;
      scale.value = withDelay(
        index * 40,
        withRepeat(withTiming(peak, { duration: 520 + (index % 5) * 90 }), -1, true),
      );
    } else {
      scale.value = base;
    }
    return () => cancelAnimation(scale);
  }, [live, reduced, index, base, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.value }] }));

  return (
    <Animated.View
      style={[
        {
          width: 3,
          height,
          borderRadius: 2,
          backgroundColor: color,
          marginHorizontal: 1.5,
        },
        style,
      ]}
    />
  );
}

/** The voice motif. `live` breathes continuously; otherwise it's a frozen
 *  "answer fingerprint". Honors reduced-motion (renders static). */
export function Waveform({
  bars = 32,
  live = false,
  height = 40,
  color,
}: {
  bars?: number;
  live?: boolean;
  height?: number;
  color?: string;
}) {
  const { c } = useTheme();
  const fill = color ?? c.accent;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height,
      }}
    >
      {Array.from({ length: bars }, (_, i) => {
        // Deterministic envelope: taper at the ends, varied in the middle.
        const envelope = Math.sin((i / bars) * Math.PI);
        const base = 0.25 + envelope * (0.4 + ((i * 53) % 40) / 100);
        return (
          <Bar key={i} index={i} base={base} live={live} color={fill} height={height} />
        );
      })}
    </View>
  );
}
