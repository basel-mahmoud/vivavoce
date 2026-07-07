import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { OnboardingScaffold } from '@/components/onboarding/Scaffold';
import { Choice } from '@/components/onboarding/Choice';
import { FieldPicker } from '@/components/onboarding/FieldPicker';
import { Text } from '@/ui/Text';
import { useTheme } from '@/theme';
import { useProfile } from '@/data/profile';
import { studyLevels, type StudyLevelKey } from '@/data/content';

export default function FieldStep() {
  const { profile, update } = useProfile();
  const { space } = useTheme();
  const [studyLevel, setStudyLevel] = useState<StudyLevelKey | null>(profile.studyLevel);
  const [field, setField] = useState<string | null>(profile.fieldOfStudy);

  return (
    <OnboardingScaffold
      step={1}
      total={5}
      title="Tell us what you study"
      subtitle="We’ll calibrate your questions, subjects, and feedback around this."
      nextDisabled={!studyLevel || !field}
      onNext={() => {
        if (!studyLevel || !field) return;
        update({ studyLevel, fieldOfStudy: field });
        router.push('/(onboarding)/formats');
      }}
    >
      <Text variant="caption" tone="textFaint">
        YOUR LEVEL
      </Text>
      <View style={{ gap: space.sm, marginTop: space.sm }}>
        {studyLevels.map((l) => (
          <Choice
            key={l.key}
            label={l.label}
            description={l.description}
            selected={studyLevel === l.key}
            onPress={() => setStudyLevel(l.key)}
          />
        ))}
      </View>

      <Text variant="caption" tone="textFaint" style={{ marginTop: space.xl, marginBottom: space.sm }}>
        FIELD OF STUDY
      </Text>
      <FieldPicker value={field} onSelect={setField} />
    </OnboardingScaffold>
  );
}
