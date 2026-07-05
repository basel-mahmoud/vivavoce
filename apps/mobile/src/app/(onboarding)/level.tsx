import { useState } from 'react';
import { router } from 'expo-router';
import { OnboardingScaffold } from '@/components/onboarding/Scaffold';
import { Choice } from '@/components/onboarding/Choice';
import { useProfile, type Level } from '@/data/profile';

const LEVELS: { value: Level; label: string; description: string }[] = [
  { value: 'intro', label: 'Just starting', description: 'New to speaking under pressure.' },
  { value: 'intermediate', label: 'Getting there', description: 'Comfortable, but inconsistent.' },
  { value: 'advanced', label: 'Confident', description: 'Sharpening for a high-stakes moment.' },
  { value: 'expert', label: 'Polishing', description: 'Chasing the last few percent.' },
];

export default function LevelStep() {
  const { profile, update } = useProfile();
  const [level, setLevel] = useState<Level>(profile.level);

  return (
    <OnboardingScaffold
      step={4}
      total={5}
      title="How do you feel speaking out loud?"
      subtitle="This sets your starting difficulty — it adapts as you go."
      onNext={() => {
        update({ level });
        router.push('/(onboarding)/consent');
      }}
    >
      {LEVELS.map((l) => (
        <Choice
          key={l.value}
          label={l.label}
          description={l.description}
          selected={level === l.value}
          onPress={() => setLevel(l.value)}
        />
      ))}
    </OnboardingScaffold>
  );
}
