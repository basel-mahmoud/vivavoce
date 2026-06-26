import { useEffect, useRef, useState } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { X, RefreshCw } from 'lucide-react-native';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { Pill } from '@/ui/Pill';
import { Waveform } from '@/ui/Waveform';
import { RecordButton } from '@/components/session/RecordButton';
import { FeedbackView } from '@/components/session/FeedbackView';
import { useTheme } from '@/theme';
import { useApi } from '@/data/api-context';
import { useSession } from '@/lib/useSession';
import { haptics } from '@/lib/haptics';
import { starterDecks, modeName } from '@/data/content';

function formatTime(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SessionScreen() {
  const { mode = 'mock_viva', deckId } = useLocalSearchParams<{
    id: string;
    mode?: string;
    deckId?: string;
  }>();
  const { c, space } = useTheme();
  const api = useApi();

  const deck = starterDecks.find((d) => d.id === deckId) ?? starterDecks[0]!;
  const questions = deck.questions;
  const [qIndex, setQIndex] = useState(0);
  const sessionId = useRef(Crypto.randomUUID()).current;
  const revealed = useRef(false);

  const question = questions[qIndex]!;
  const isLast = qIndex >= questions.length - 1;

  const { state, elapsedMs, result, error, usedFallback, start, stop, cancel, retry, reset } =
    useSession({ sessionId, questionPrompt: question, api, online: true });

  // Best-effort: register the session server-side when authenticated.
  useEffect(() => {
    if (api) {
      api
        .startSession({ mode, deckId: deck.id, clientSessionKey: sessionId })
        .catch(() => {});
    }
  }, [api, mode, deck.id, sessionId]);

  // Haptic on score reveal.
  useEffect(() => {
    if (state === 'feedback' && !revealed.current) {
      revealed.current = true;
      haptics.success();
    }
    if (state !== 'feedback') revealed.current = false;
  }, [state]);

  const next = () => {
    if (isLast) {
      router.back();
      return;
    }
    setQIndex((i) => i + 1);
    reset();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      {/* header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: space.xl,
          paddingVertical: space.md,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close session"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <X size={24} color={c.textMuted} />
        </Pressable>
        <Pill label={`${modeName(mode)} · Q${qIndex + 1}/${questions.length}`} tone="muted" />
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: space.xl, paddingBottom: space['4xl'], flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* question */}
        <Text variant="caption" tone="textFaint">
          {deck.subject.toUpperCase()}
        </Text>
        <Text variant="display2" style={{ marginTop: space.sm, lineHeight: 32 }}>
          {question}
        </Text>

        {/* state-driven body */}
        {(state === 'idle' || state === 'listening') && (
          <View style={{ alignItems: 'center', marginTop: space['3xl'] }}>
            {state === 'listening' && (
              <View style={{ height: 56, width: '100%', marginBottom: space.lg }}>
                <Waveform bars={36} live height={56} color={c.live} />
              </View>
            )}
            <RecordButton
              listening={state === 'listening'}
              onPress={() => (state === 'listening' ? stop() : start())}
            />
            <Text variant="mono" tone="textMuted" style={{ marginTop: space.lg }}>
              {state === 'listening' ? formatTime(elapsedMs) : 'Tap to answer aloud'}
            </Text>
            {state === 'listening' && (
              <Pressable onPress={cancel} style={{ marginTop: space.md }} hitSlop={8}>
                <Text variant="small" tone="textFaint">
                  Cancel
                </Text>
              </Pressable>
            )}
            {state === 'idle' && (
              <Text
                variant="caption"
                tone="textFaint"
                style={{ marginTop: space['2xl'], textAlign: 'center', maxWidth: 260 }}
              >
                Speak as if the examiner is in front of you. Aim for structure, not
                length.
              </Text>
            )}
          </View>
        )}

        {state === 'processing' && (
          <View style={{ alignItems: 'center', marginTop: space['4xl'], gap: space.lg }}>
            <ActivityIndicator size="large" color={c.accent} />
            <Text variant="bodyMedium">Listening back…</Text>
            <Text variant="small" tone="textMuted" style={{ textAlign: 'center', maxWidth: 280 }}>
              Transcribing and weighing your answer across the five axes.
            </Text>
          </View>
        )}

        {state === 'feedback' && result && (
          <View style={{ marginTop: space['2xl'] }}>
            <FeedbackView
              result={result}
              usedFallback={usedFallback}
              isLast={isLast}
              onRetry={retry}
              onNext={next}
            />
          </View>
        )}

        {state === 'error' && (
          <View style={{ alignItems: 'center', marginTop: space['4xl'], gap: space.lg }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: c.danger + '18',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RefreshCw size={28} color={c.danger} />
            </View>
            <Text variant="title" style={{ textAlign: 'center' }}>
              {error === 'no_speech' ? 'We didn’t catch that' : 'Something went wrong'}
            </Text>
            <Text variant="small" tone="textMuted" style={{ textAlign: 'center', maxWidth: 280 }}>
              {error === 'no_speech'
                ? 'No speech was detected. Find a quieter spot and try again.'
                : 'We couldn’t evaluate that answer. Your recording is safe — give it another go.'}
            </Text>
            <Button label="Try again" onPress={retry} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
