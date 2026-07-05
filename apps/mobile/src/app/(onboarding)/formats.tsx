import { useState } from 'react';
import { router } from 'expo-router';
import { OnboardingScaffold } from '@/components/onboarding/Scaffold';
import { Choice } from '@/components/onboarding/Choice';
import { useProfile } from '@/data/profile';
import { examFormats, goalFromFormats } from '@/data/content';

export default function FormatsStep() {
  const { profile, update } = useProfile();
  const [selected, setSelected] = useState<string[]>(profile.examFormats);

  const toggle = (key: string) =>
    setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));

  return (
    <OnboardingScaffold
      step={2}
      total={5}
      title="What are you preparing for?"
      subtitle="Pick every format that applies — your practice modes are built from these."
      nextDisabled={selected.length === 0}
      onNext={() => {
        if (selected.length === 0) return;
        update({ examFormats: selected, goal: goalFromFormats(selected) });
        router.push('/(onboarding)/subjects');
      }}
    >
      {examFormats.map((f) => (
        <Choice
          key={f.key}
          label={f.name}
          description={f.line}
          selected={selected.includes(f.key)}
          onPress={() => toggle(f.key)}
        />
      ))}
    </OnboardingScaffold>
  );
}
