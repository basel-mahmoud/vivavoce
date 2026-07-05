import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { OnboardingScaffold } from '@/components/onboarding/Scaffold';
import { Choice } from '@/components/onboarding/Choice';
import { Text } from '@/ui/Text';
import { useProfile } from '@/data/profile';
import { useTheme } from '@/theme';

export default function ConsentStep() {
  const { update } = useProfile();
  const { space } = useTheme();
  const [audio, setAudio] = useState(false);
  const [ai, setAi] = useState(false);

  return (
    <OnboardingScaffold
      step={5}
      total={5}
      title="Your voice, your call"
      subtitle="Practising out loud means we process your speech. Here’s exactly what for — you’re in control, and you can change this any time in Settings."
      nextLabel="Start practising"
      nextDisabled={!audio || !ai}
      onNext={() => {
        update({ consentAudio: audio, consentAI: ai, onboarded: true });
        router.replace('/(tabs)');
      }}
    >
      <Choice
        label="Process my voice to transcribe it"
        description="Required to turn your spoken answers into text. Audio isn’t retained unless you opt in later."
        selected={audio}
        onPress={() => setAudio((v) => !v)}
      />
      <Choice
        label="Send transcripts to AI for coaching"
        description="Required for feedback and model answers. We send the minimum needed and never use your data to train others’ models."
        selected={ai}
        onPress={() => setAi((v) => !v)}
      />
      <View style={{ marginTop: space.md }}>
        <Text variant="caption" tone="textFaint">
          VivaVoce is a coaching tool, not an official examiner. By continuing you
          agree to our Terms and Privacy Policy.
        </Text>
      </View>
    </OnboardingScaffold>
  );
}
