import { useEffect, useRef, useState } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Crypto from 'expo-crypto';
import { X, RefreshCw, Volume2, VolumeX } from 'lucide-react-native';
import { entrance } from '@/ui/motion';
import { getVoiceEnabled, setVoiceEnabled, speak, stopSpeaking } from '@/lib/speech';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { Pill } from '@/ui/Pill';
import { Waveform } from '@/ui/Waveform';
import { RecordButton } from '@/components/session/RecordButton';
import { FeedbackView } from '@/components/session/FeedbackView';
import { useTheme } from '@/theme';
import { useApi } from '@/data/api-context';
import { useSession } from '@/lib/useSession';
import { useRecorder } from '@/lib/useRecorder';
import { haptics } from '@/lib/haptics';
import { starterDecks, deckById, modeName } from '@/data/content';

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

  const deck = deckById(deckId ?? '') ?? starterDecks[0]!;
  const questions = deck.questions;
  const [qIndex, setQIndex] = useState(0);
  // Mock Viva chains one AI follow-up per base question, aimed at the weakest
  // axis of the answer just given (PRODUCT.md's adaptive examiner).
  const [followUp, setFollowUp] = useState<string | null>(null);
  // Idempotency key for creating the session; the SERVER id comes back from
  // startSession and is what answers must be submitted against.
  const clientSessionKey = useRef(Crypto.randomUUID()).current;
  const [serverSessionId, setServerSessionId] = useState<string | null>(null);
  const revealed = useRef(false);
  const [voiceOn, setVoiceOn] = useState(true);

  useEffect(() => {
    void getVoiceEnabled().then(setVoiceOn);
  }, []);

  const question = followUp ?? questions[qIndex]!;
  const onLastBase = qIndex >= questions.length - 1;

  const { state, elapsedMs, result, error, usedFallback, start, stop, cancel, retry, reset } =
    useSession({
      sessionId: serverSessionId ?? clientSessionKey,
      questionPrompt: question,
      api,
      online: true,
    });
  const recorder = useRecorder();

  // The examiner reads each fresh question aloud (never over your answer).
  useEffect(() => {
    if (voiceOn && state === 'idle') speak(question);
    return () => stopSpeaking();
  }, [question, voiceOn]); // eslint-disable-line react-hooks/exhaustive-deps -- speak only on new questions, not state churn

  // Drive both the recorder and the session state machine together.
  const onMicPress = async () => {
    if (state === 'listening') {
      const audio = await recorder.stop();
      await stop(audio);
    } else {
      stopSpeaking(); // the candidate has the floor
      await recorder.start(); // begins real capture; session falls back if it fails
      start();
    }
  };
  const onCancel = async () => {
    await recorder.stop();
    cancel();
  };

  // Register the session server-side (idempotent); answers are submitted
  // against the returned server id. Anonymous callers get 401 and stay local.
  useEffect(() => {
    if (!api) return;
    api
      // Bundled decks have no server row; AI-generated decks do — link them.
      .startSession({ mode, deckId: deck.serverId ?? null, clientSessionKey })
      .then((res) => {
        if (res.ok) setServerSessionId(res.data.session.id);
      })
      .catch(() => {});
  }, [api, mode, deck.id, clientSessionKey]);

  // Haptic on score reveal.
  useEffect(() => {
    if (state === 'feedback' && !revealed.current) {
      revealed.current = true;
      haptics.success();
    }
    if (state !== 'feedback') revealed.current = false;
  }, [state]);

  // In viva mode, an answer to a base question earns one adaptive follow-up
  // before the deck advances; other modes walk the deck linearly.
  const nextFollowUp =
    mode === 'mock_viva' && !followUp ? result?.suggestedFollowUp?.trim() || null : null;
  const isLast = onLastBase && !nextFollowUp;

  const next = () => {
    if (nextFollowUp) {
      setFollowUp(nextFollowUp);
      reset();
      return;
    }
    if (onLastBase) {
      router.back();
      return;
    }
    setFollowUp(null);
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={voiceOn ? 'Mute the examiner voice' : 'Unmute the examiner voice'}
          onPress={() => {
            const next = !voiceOn;
            setVoiceOn(next);
            setVoiceEnabled(next);
            if (!next) stopSpeaking();
            else if (state === 'idle') speak(question);
          }}
          hitSlop={12}
        >
          {voiceOn ? <Volume2 size={22} color={c.accent} /> : <VolumeX size={22} color={c.textFaint} />}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: space.xl, paddingBottom: space['4xl'], flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* question — re-keyed per question/phase so each one slides in fresh */}
        <Animated.View key={`${qIndex}-${followUp ? 'f' : 'b'}`} entering={entrance(0)}>
          <Text variant="caption" tone={followUp ? 'accent' : 'textFaint'}>
            {followUp ? 'FOLLOW-UP · DIGGING DEEPER' : deck.subject.toUpperCase()}
          </Text>
          <Text variant="display2" style={{ marginTop: space.sm, lineHeight: 32 }}>
            {question}
          </Text>
        </Animated.View>

        {/* state-driven body */}
        {(state === 'idle' || state === 'listening') && (
          <View style={{ alignItems: 'center', marginTop: space['3xl'] }}>
            {state === 'listening' && (
              <View style={{ height: 56, width: '100%', marginBottom: space.lg }}>
                <Waveform bars={36} live height={56} color={c.live} />
              </View>
            )}
            <RecordButton listening={state === 'listening'} onPress={onMicPress} />
            <Text variant="mono" tone="textMuted" style={{ marginTop: space.lg }}>
              {state === 'listening' ? formatTime(elapsedMs) : 'Tap to answer aloud'}
            </Text>
            {state === 'listening' && (
              <Pressable onPress={onCancel} style={{ marginTop: space.md }} hitSlop={8}>
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
          <Animated.View
            entering={FadeIn.duration(180)}
            style={{ alignItems: 'center', marginTop: space['4xl'], gap: space.lg }}
          >
            <ActivityIndicator size="large" color={c.accent} />
            <View style={{ width: '100%', maxWidth: 280 }}>
              <Waveform bars={28} height={32} color={c.surface2} />
            </View>
            <Text variant="bodyMedium">Listening back…</Text>
            <Text variant="small" tone="textMuted" style={{ textAlign: 'center', maxWidth: 280 }}>
              Transcribing and weighing your answer across the five axes.
            </Text>
          </Animated.View>
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
          <Animated.View
            entering={FadeIn.duration(180)}
            style={{ alignItems: 'center', marginTop: space['4xl'], gap: space.lg }}
          >
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
              {error === 'no_speech'
                ? 'We didn’t catch that'
                : error === 'auth_required'
                  ? 'Sign in to get marked'
                  : 'Something went wrong'}
            </Text>
            <Text variant="small" tone="textMuted" style={{ textAlign: 'center', maxWidth: 280 }}>
              {error === 'no_speech'
                ? 'No speech was detected. Find a quieter spot and try again.'
                : error === 'auth_required'
                  ? 'Spoken answers are transcribed and marked on our servers, which needs an account. It takes a few seconds with Google.'
                  : 'We couldn’t evaluate that answer. Your recording is safe. Give it another go.'}
            </Text>
            {error === 'auth_required' ? (
              <Button label="Sign in" onPress={() => router.push('/(auth)/sign-in')} />
            ) : (
              <Button label="Try again" onPress={retry} />
            )}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
