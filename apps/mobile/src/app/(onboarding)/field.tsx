import { useMemo, useState } from 'react';
import { View, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Search } from 'lucide-react-native';
import { OnboardingScaffold } from '@/components/onboarding/Scaffold';
import { Choice } from '@/components/onboarding/Choice';
import { Text } from '@/ui/Text';
import { useTheme } from '@/theme';
import { useProfile } from '@/data/profile';
import { studyLevels, fieldsGrouped, fields, type StudyLevelKey } from '@/data/content';

export default function FieldStep() {
  const { profile, update } = useProfile();
  const { c, space, radius } = useTheme();
  const [studyLevel, setStudyLevel] = useState<StudyLevelKey | null>(profile.studyLevel);
  const [field, setField] = useState<string | null>(profile.fieldOfStudy);
  const [query, setQuery] = useState('');

  const groups = useMemo(() => fieldsGrouped(), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return fields.filter((f) => f.name.toLowerCase().includes(q));
  }, [query]);

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

      <Text variant="caption" tone="textFaint" style={{ marginTop: space.xl }}>
        FIELD OF STUDY
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          marginTop: space.sm,
          paddingHorizontal: space.lg,
          height: 46,
          borderRadius: radius.pill,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
        }}
      >
        <Search size={17} color={c.textFaint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search 50+ fields — e.g. Medicine, Law, CS"
          placeholderTextColor={c.textFaint}
          style={{ flex: 1, color: c.text, fontFamily: 'Archivo_400Regular', fontSize: 15 }}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          accessibilityLabel="Search fields of study"
        />
      </View>

      <View style={{ marginTop: space.md, gap: space.sm }}>
        {filtered ? (
          filtered.length ? (
            filtered.map((f) => (
              <Choice
                key={f.key}
                label={f.name}
                selected={field === f.key}
                onPress={() => setField(f.key)}
              />
            ))
          ) : (
            <Text variant="small" tone="textMuted" style={{ paddingVertical: space.md }}>
              No field matches “{query.trim()}”. Pick “Something else” to continue.
            </Text>
          )
        ) : (
          groups.map((g) => (
            <View key={g.area.key} style={{ marginTop: space.xs }}>
              <Text variant="caption" tone="textMuted" style={{ marginBottom: space.xs }}>
                {g.area.name}
              </Text>
              <View style={{ gap: space.sm }}>
                {g.fields.map((f) => (
                  <Choice
                    key={f.key}
                    label={f.name}
                    selected={field === f.key}
                    onPress={() => setField(f.key)}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </View>
    </OnboardingScaffold>
  );
}
