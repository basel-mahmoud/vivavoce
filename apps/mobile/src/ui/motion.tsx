import { useEffect, useRef, useState } from 'react';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';
import Animated, {
  FadeInDown,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';

/**
 * "The Practice Room" motion kit (DESIGN.md → Motion). One vocabulary for the
 * whole app: quint ease-outs, springs, 140–300ms UI / up to 800ms data draws,
 * press scale 0.97, the score stamp. Every primitive honors reduced motion.
 */

/** Quint ease-out — the house curve for entrances and data draws. */
export const easeOutQuint = Easing.out(Easing.poly(5));

/** House spring for presses and settles. Matches Button's feel. */
export const pressSpring = { damping: 26, stiffness: 420 } as const;

/**
 * Entrance for tiles/rows: fade + rise, staggered by `order`. Use as
 * `<Animated.View entering={entrance(i)}>`. Delay is capped so long lists
 * never make the user wait (stagger is decorative, not blocking).
 */
export function entrance(order = 0) {
  return FadeInDown.duration(320)
    .delay(Math.min(order, 8) * 55)
    .easing(easeOutQuint)
    .reduceMotion(ReduceMotion.System);
}

/** Pressable with the house press physics (scale 0.97 spring) + tap haptic. */
export function PressableScale({
  children,
  style,
  onPressIn,
  onPressOut,
  haptic = true,
  ...rest
}: PressableProps & { style?: ViewStyle; haptic?: boolean }) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animated}>
      <Pressable
        onPressIn={(e) => {
          if (haptic) haptics.tap();
          scale.value = withSpring(0.97, pressSpring);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withSpring(1, pressSpring);
          onPressOut?.(e);
        }}
        style={style}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/**
 * Count-up number for marks (scores, streaks, minutes). Short-lived JS tick
 * (~30fps for <=800ms) — simple and reliable across devices; jumps straight
 * to the value under reduced motion or when the value is small.
 */
export function useCountUp(value: number, duration = 700): number {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  const raf = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (reduced || value <= 0) {
      setShown(value);
      return;
    }
    const start = Date.now();
    raf.current = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 5); // quint out
      setShown(Math.round(value * eased));
      if (t >= 1 && raf.current) clearInterval(raf.current);
    }, 33);
    return () => {
      if (raf.current) clearInterval(raf.current);
    };
  }, [value, duration, reduced]);

  return shown;
}

/**
 * The score stamp (DESIGN.md signature): lands at scale 1.12 → 1 with a −2°
 * rotate settle, like a mark pressed onto paper. Wrap the score block in it.
 */
export function Stamp({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : 1.12);
  const rotate = useSharedValue(reduced ? 0 : -2);
  const opacity = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    opacity.value = withTiming(1, { duration: 120 });
    scale.value = withSpring(1, { damping: 14, stiffness: 260 });
    rotate.value = withSpring(0, { damping: 14, stiffness: 260 });
  }, [reduced, scale, rotate, opacity]);

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));
  return <Animated.View style={[animated, style]}>{children}</Animated.View>;
}

/**
 * Animated 0..1 fill progress for bars/rings: draws in on mount (up to 800ms,
 * quint out, optional stagger delay), then tracks value changes at UI speed.
 */
export function useFillProgress(value: number, delay = 0) {
  const reduced = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, value));
  const progress = useSharedValue(reduced ? clamped : 0);
  const mounted = useRef(false);

  useEffect(() => {
    if (reduced) {
      progress.value = clamped;
      return;
    }
    if (!mounted.current) {
      mounted.current = true;
      progress.value = withDelay(
        delay,
        withTiming(clamped, { duration: 700, easing: easeOutQuint }),
      );
    } else {
      progress.value = withTiming(clamped, { duration: 240, easing: easeOutQuint });
    }
  }, [clamped, delay, reduced, progress]);

  return progress;
}

/** A one-shot attention pulse (scale 1 → 1.06 → 1). For streak/goal moments. */
export function usePulse() {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pulse = () => {
    if (reduced) return;
    scale.value = withSequence(
      withTiming(1.06, { duration: 140, easing: easeOutQuint }),
      withSpring(1, pressSpring),
    );
  };
  return { style, pulse };
}
