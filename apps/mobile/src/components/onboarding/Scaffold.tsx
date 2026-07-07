import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { entrance, useFillProgress } from '@/ui/motion';
import { useTheme } from '@/theme';

/** One step segment; the newly-reached one draws its fill in from the left. */
function StepSegment({ filled }: { filled: boolean }) {
  const { c } = useTheme();
  const progress = useFillProgress(filled ? 1 : 0);
  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));
  return (
    <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: c.surface2, overflow: 'hidden' }}>
      <Animated.View
        style={[
          { height: '100%', width: '100%', backgroundColor: c.accent, borderRadius: 2, transformOrigin: 'left center' },
          fillStyle,
        ]}
      />
    </View>
  );
}

export function OnboardingScaffold({
  step,
  total,
  title,
  subtitle,
  children,
  onNext,
  nextLabel = 'Continue',
  nextDisabled,
}: {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  const { space } = useTheme();
  return (
    <Screen scroll contentStyle={{ flexGrow: 1 }}>
      {/* progress */}
      <View style={{ flexDirection: 'row', gap: space.xs, marginBottom: space['2xl'] }}>
        {Array.from({ length: total }, (_, i) => (
          <StepSegment key={i} filled={i < step} />
        ))}
      </View>

      <Animated.View entering={entrance(0)}>
        <Text variant="caption" tone="textFaint" accessibilityLabel={`Step ${step} of ${total}`}>
          STEP {step} OF {total}
        </Text>
        <Text variant="display2" style={{ marginTop: space.sm }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" tone="textMuted" style={{ marginTop: space.sm }}>
            {subtitle}
          </Text>
        ) : null}
      </Animated.View>

      <Animated.View
        entering={entrance(1)}
        style={{ marginTop: space['2xl'], gap: space.md, flex: 1 }}
      >
        {children}
      </Animated.View>

      <Animated.View entering={entrance(2)}>
        <Button
          label={nextLabel}
          onPress={onNext}
          disabled={nextDisabled}
          style={{ marginTop: space['2xl'] }}
        />
      </Animated.View>
    </Screen>
  );
}
