import { View } from 'react-native';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { useTheme } from '@/theme';

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
  const { c, space } = useTheme();
  return (
    <Screen scroll contentStyle={{ flexGrow: 1 }}>
      {/* progress */}
      <View style={{ flexDirection: 'row', gap: space.xs, marginBottom: space['2xl'] }}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: i < step ? c.accent : c.surface2,
            }}
          />
        ))}
      </View>

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

      <View style={{ marginTop: space['2xl'], gap: space.md, flex: 1 }}>{children}</View>

      <Button
        label={nextLabel}
        onPress={onNext}
        disabled={nextDisabled}
        style={{ marginTop: space['2xl'] }}
      />
    </Screen>
  );
}
