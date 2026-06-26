import { useState } from 'react';
import { router } from 'expo-router';
import { OnboardingScaffold } from '@/components/onboarding/Scaffold';
import { Choice } from '@/components/onboarding/Choice';
import { useProfile } from '@/data/profile';

const SUBJECTS = [
  'Medicine',
  'Law',
  'Engineering',
  'Software Interviews',
  'Public Speaking',
  'Languages',
  'Business',
  'Science',
];

export default function SubjectsStep() {
  const { profile, update } = useProfile();
  const [selected, setSelected] = useState<string[]>(profile.subjects);

  const toggle = (s: string) =>
    setSelected((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <OnboardingScaffold
      step={3}
      total={4}
      title="Pick your subjects"
      subtitle="Choose any that apply. You can add more later."
      nextDisabled={selected.length === 0}
      onNext={() => {
        update({ subjects: selected });
        router.push('/(onboarding)/consent');
      }}
    >
      {SUBJECTS.map((s) => (
        <Choice
          key={s}
          label={s}
          selected={selected.includes(s)}
          onPress={() => toggle(s)}
        />
      ))}
    </OnboardingScaffold>
  );
}
