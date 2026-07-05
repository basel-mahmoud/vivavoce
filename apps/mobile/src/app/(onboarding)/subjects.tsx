import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { OnboardingScaffold } from '@/components/onboarding/Scaffold';
import { Choice } from '@/components/onboarding/Choice';
import { useProfile } from '@/data/profile';
import { subjectsForField, fieldByKey } from '@/data/content';

export default function SubjectsStep() {
  const { profile, update } = useProfile();
  const [selected, setSelected] = useState<string[]>(profile.subjects);

  // Order subjects so the ones relevant to the chosen field surface first.
  const ordered = useMemo(() => subjectsForField(profile.fieldOfStudy), [profile.fieldOfStudy]);
  const recommended = useMemo(
    () => new Set(fieldByKey(profile.fieldOfStudy ?? '')?.subjectKeys ?? []),
    [profile.fieldOfStudy],
  );

  const toggle = (key: string) =>
    setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));

  return (
    <OnboardingScaffold
      step={3}
      total={5}
      title="Pick your subjects"
      subtitle="We’ve highlighted what fits your field. Choose any that apply — add more later."
      nextDisabled={selected.length === 0}
      onNext={() => {
        if (selected.length === 0) return;
        update({ subjects: selected });
        router.push('/(onboarding)/level');
      }}
    >
      {ordered.map((s) => (
        <Choice
          key={s.key}
          label={recommended.has(s.key) ? `${s.name}  ·  Recommended` : s.name}
          description={s.blurb}
          selected={selected.includes(s.key)}
          onPress={() => toggle(s.key)}
        />
      ))}
    </OnboardingScaffold>
  );
}
