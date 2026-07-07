import { forwardRef } from 'react';
import { View } from 'react-native';
import { Text } from '@/ui/Text';
import { useTheme } from '@/theme';

/**
 * The share card: a flat vermilion tile in the brand language, captured with
 * view-shot and handed to the OS share sheet. Rendered off-screen (static, no
 * animation) so the capture is always clean. Ink on vermilion per DESIGN.md
 * contrast rules — never white body text on vermilion.
 */
export const ShareCard = forwardRef<View, { overall: number; deckTitle: string; mode: string }>(
  function ShareCard({ overall, deckTitle, mode }, ref) {
    const { c, space } = useTheme();
    const ink = '#161412';
    const paper = '#FBFAF8';

    return (
      <View
        ref={ref}
        collapsable={false}
        style={{
          position: 'absolute',
          left: -9999, // off-screen, capture-only
          width: 360,
          backgroundColor: c.accent,
          borderRadius: 24,
          padding: space['2xl'],
        }}
      >
        <Text variant="caption" style={{ color: ink }}>
          VIVAVOCE · MARKED, NOT GRADED
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: space.lg }}>
          <Text variant="display" style={{ color: ink, fontSize: 88, lineHeight: 88 }}>
            {overall}
          </Text>
          <Text variant="title" style={{ color: ink, marginBottom: 12 }}>
            /100
          </Text>
        </View>
        <Text variant="bodyMedium" numberOfLines={2} style={{ color: ink, marginTop: space.md }}>
          {deckTitle}
        </Text>
        <Text variant="small" style={{ color: ink, opacity: 0.75, marginTop: 2 }}>
          {mode} · spoken answer, marked by the AI examiner
        </Text>
        <View
          style={{
            marginTop: space.xl,
            paddingTop: space.md,
            borderTopWidth: 1.5,
            borderTopColor: ink,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <Text variant="caption" style={{ color: ink }}>
            SAY IT OUT LOUD BEFORE IT COUNTS
          </Text>
          <Text variant="caption" style={{ color: paper }}>
            vivavoce-kappa.vercel.app
          </Text>
        </View>
      </View>
    );
  },
);
