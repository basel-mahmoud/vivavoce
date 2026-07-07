import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Sparkles, RotateCcw, ArrowRight, Lightbulb } from 'lucide-react-native';
import { Text } from '@/ui/Text';
import { Card } from '@/ui/Card';
import { Pill } from '@/ui/Pill';
import { Button } from '@/ui/Button';
import { ScoreBar, bandColor } from '@/ui/ScoreBar';
import { entrance, Stamp, useCountUp } from '@/ui/motion';
import { useTheme } from '@/theme';
import { rubricAxes } from '@/data/content';
import type { EvaluationResult } from '@/lib/api';

export function FeedbackView({
  result,
  usedFallback,
  isLast,
  onRetry,
  onNext,
}: {
  result: EvaluationResult;
  usedFallback: boolean;
  isLast: boolean;
  onRetry: () => void;
  onNext: () => void;
}) {
  const { c, space } = useTheme();
  const scores = result.scores as Record<string, number>;
  // The reveal: the mark stamps down while the number counts up to meet it.
  const shownOverall = useCountUp(result.overall, 800);

  return (
    <View style={{ gap: space.lg }}>
      {/* overall */}
      <Animated.View entering={entrance(0)}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stamp>
            <Text variant="caption" tone="textMuted">
              OVERALL
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
              <Text variant="display" style={{ color: bandColor(result.overall, c) }}>
                {shownOverall}
              </Text>
              <Text variant="body" tone="textFaint" style={{ marginBottom: 6 }}>
                /100
              </Text>
            </View>
          </Stamp>
          {usedFallback ? (
            <Pill label="heuristic" tone="muted" />
          ) : (
            <Pill label="AI coach" tone="accent" />
          )}
        </View>

        <View style={{ marginTop: space.lg }}>
          {rubricAxes.map((a, i) => (
            <ScoreBar key={a.key} label={a.label} value={scores[a.key] ?? 0} order={i + 2} />
          ))}
        </View>

        {result.wordsPerMinute ? (
          <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.sm }}>
            <Text variant="caption" tone="textFaint">
              {result.wordsPerMinute} wpm
            </Text>
            {result.fillerWordRate != null ? (
              <Text variant="caption" tone="textFaint">
                {Math.round(result.fillerWordRate * 100)}% filler
              </Text>
            ) : null}
          </View>
        ) : null}
      </Card>
      </Animated.View>

      {/* summary */}
      <Animated.View entering={entrance(1)}>
        <Card>
          <Text variant="body">{result.summary}</Text>
        </Card>
      </Animated.View>

      {/* strengths / improvements */}
      {result.strengths.length > 0 ? (
        <Animated.View entering={entrance(2)}>
          <Card>
            <Text variant="caption" tone="success" style={{ marginBottom: space.sm }}>
              WHAT WORKED
            </Text>
            {result.strengths.map((s, i) => (
              <Text key={i} variant="small" style={{ marginBottom: 4 }}>
                • {s}
              </Text>
            ))}
          </Card>
        </Animated.View>
      ) : null}

      {result.improvements.length > 0 ? (
        <Animated.View entering={entrance(3)}>
          <Card>
            <Text variant="caption" tone="danger" style={{ marginBottom: space.sm }}>
              FIX NEXT · {result.weakestAxis.toUpperCase()}
            </Text>
            {result.improvements.map((s, i) => (
              <Text key={i} variant="small" style={{ marginBottom: 4 }}>
                • {s}
              </Text>
            ))}
          </Card>
        </Animated.View>
      ) : null}

      {/* improved answer */}
      <Animated.View entering={entrance(4)}>
        <Card inset>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.sm }}>
            <Sparkles size={14} color={c.accent} />
            <Text variant="caption" tone="textMuted">
              A STRONGER ANSWER
            </Text>
          </View>
          <Text variant="small" style={{ lineHeight: 22 }}>
            {result.improvedAnswer}
          </Text>
        </Card>
      </Animated.View>

      {/* follow-up */}
      <Animated.View entering={entrance(5)}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.sm }}>
            <Lightbulb size={14} color={c.gravitas} />
            <Text variant="caption" tone="textMuted">
              FOLLOW-UP
            </Text>
          </View>
          <Text variant="body">{result.suggestedFollowUp}</Text>
        </Card>
      </Animated.View>

      <Animated.View
        entering={entrance(6)}
        style={{ flexDirection: 'row', gap: space.md, marginTop: space.sm }}
      >
        <Button
          label="Retry"
          variant="secondary"
          onPress={onRetry}
          icon={<RotateCcw size={16} color={c.text} />}
          style={{ flex: 1 }}
        />
        <Button
          label={isLast ? 'Finish' : 'Next'}
          onPress={onNext}
          icon={<ArrowRight size={16} color={c.onAccent} />}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}
