import { useState } from 'react';
import { router } from 'expo-router';
import { OnboardingScaffold } from '@/components/onboarding/Scaffold';
import { Choice } from '@/components/onboarding/Choice';
import { useProfile, type Goal } from '@/data/profile';

const GOALS: { value: Goal; label: string; description: string }[] = [
  { value: 'viva', label: 'Oral exam / viva', description: 'Defend your knowledge out loud.' },
  { value: 'interview', label: 'Interviews', description: 'Behavioural and role questions.' },
  { value: 'presentation', label: 'Presentations', description: 'Rehearse until it’s effortless.' },
  { value: 'language', label: 'Language practice', description: 'Build spoken fluency.' },
  { value: 'oral_exam', label: 'General oral exam', description: 'Any spoken assessment.' },
];

export default function GoalStep() {
  const { profile, update } = useProfile();
  const [goal, setGoal] = useState<Goal | null>(profile.goal);

  return (
    <OnboardingScaffold
      step={1}
      total={4}
      title="What are you preparing for?"
      subtitle="We’ll tune your questions and feedback around this."
      nextDisabled={!goal}
      onNext={() => {
        if (!goal) return;
        update({ goal });
        router.push('/(onboarding)/level');
      }}
    >
      {GOALS.map((g) => (
        <Choice
          key={g.value}
          label={g.label}
          description={g.description}
          selected={goal === g.value}
          onPress={() => setGoal(g.value)}
        />
      ))}
    </OnboardingScaffold>
  );
}
