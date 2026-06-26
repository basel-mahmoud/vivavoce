import { View } from 'react-native';
import { Sparkles, RotateCcw, ArrowRight, Lightbulb } from 'lucide-react-native';
import { Text } from '@/ui/Text';
import { Card } from '@/ui/Card';
import { Pill } from '@/ui/Pill';
import { Button } from '@/ui/Button';
import { ScoreBar, bandColor } from '@/ui/ScoreBar';
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

  return (
    <View style={{ gap: space.lg }}>
      {/* overall */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text variant="caption" tone="textMuted">
              OVERALL
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
              <Text variant="display" style={{ color: bandColor(result.overall, c) }}>
                {result.overall}
              </Text>
              <Text variant="body" tone="textFaint" style={{ marginBottom: 6 }}>
                /100
              </Text>
            </View>
          </View>
          {usedFallback ? (
            <Pill label="heuristic" tone="muted" />
          ) : (
            <Pill label="AI coach" tone="accent" />
          )}
        </View>

        <View style={{ marginTop: space.lg }}>
          {rubricAxes.map((a) => (
            <ScoreBar key={a.key} label={a.label} value={scores[a.key] ?? 0} />
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

      {/* summary */}
      <Card>
        <Text variant="body">{result.summary}</Text>
      </Card>

      {/* strengths / improvements */}
      {result.strengths.length > 0 ? (
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
      ) : null}

      {result.improvements.length > 0 ? (
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
      ) : null}

      {/* improved answer */}
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

      {/* follow-up */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.sm }}>
          <Lightbulb size={14} color={c.gravitas} />
          <Text variant="caption" tone="textMuted">
            FOLLOW-UP
          </Text>
        </View>
        <Text variant="body">{result.suggestedFollowUp}</Text>
      </Card>

      <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.sm }}>
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
      </View>
    </View>
  );
}
