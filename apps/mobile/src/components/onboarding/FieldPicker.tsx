import { useMemo, useState } from 'react';
import { Modal, Pressable, SectionList, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ChevronDown, Search, X } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Text } from '@/ui/Text';
import { PressableScale } from '@/ui/motion';
import { haptics } from '@/lib/haptics';
import { fieldByKey, fieldsGrouped, type Field } from '@/data/content';

/**
 * Country-picker-style selector for the field of study (pattern ported from
 * 21st.dev combobox/country-select): a single input-like trigger opens a
 * full-screen searchable list, sectioned by area, check on the current pick.
 * Replaces the old inline mega-list.
 */
export function FieldPicker({
  value,
  onSelect,
}: {
  value: string | null;
  onSelect: (key: string) => void;
}) {
  const { c, space, radius } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = value ? fieldByKey(value) : undefined;

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const groups = fieldsGrouped();
    if (!q) return groups.map((g) => ({ title: g.area.name, data: g.fields }));
    const matches = groups
      .flatMap((g) => g.fields)
      .filter((f) => f.name.toLowerCase().includes(q));
    return matches.length ? [{ title: 'RESULTS', data: matches }] : [];
  }, [query]);

  const pick = (f: Field) => {
    haptics.tap();
    onSelect(f.key);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      {/* trigger — reads like a select input, never shrinks its text */}
      <PressableScale
        haptic={false}
        accessibilityRole="button"
        accessibilityLabel="Choose your field of study"
        onPress={() => {
          haptics.tap();
          setOpen(true);
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          height: 52,
          paddingHorizontal: space.lg,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: selected ? c.accent : c.border,
          backgroundColor: c.surface,
        }}
      >
        <Text
          variant="bodyMedium"
          numberOfLines={1}
          style={{ flex: 1, color: selected ? c.text : c.textFaint }}
        >
          {selected ? selected.name : 'Select your field of study'}
        </Text>
        <ChevronDown size={18} color={c.textFaint} />
      </PressableScale>

      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        presentationStyle="fullScreen"
      >
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
            <Text variant="title">Field of study</Text>
            <Pressable
              onPress={() => setOpen(false)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={24} color={c.textMuted} />
            </Pressable>
          </View>

          {/* search */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              marginHorizontal: space.xl,
              marginBottom: space.md,
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
              placeholder="Search fields"
              placeholderTextColor={c.textFaint}
              autoFocus
              autoCapitalize="none"
              style={{ flex: 1, color: c.text, fontFamily: 'Archivo_400Regular', fontSize: 15 }}
              accessibilityLabel="Search fields of study"
            />
          </View>

          {sections.length === 0 ? (
            <View style={{ padding: space.xl }}>
              <Text variant="small" tone="textMuted">
                No field matches “{query.trim()}”. Try another word, or pick
                “Something else” and tell us in your first session.
              </Text>
            </View>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(f) => f.key}
              keyboardShouldPersistTaps="handled"
              stickySectionHeadersEnabled={false}
              contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: space['4xl'] }}
              renderSectionHeader={({ section }) => (
                <Text
                  variant="caption"
                  tone="textFaint"
                  style={{ marginTop: space.lg, marginBottom: space.xs }}
                >
                  {section.title.toUpperCase()}
                </Text>
              )}
              renderItem={({ item }) => {
                const active = item.key === value;
                return (
                  <Pressable
                    onPress={() => pick(item)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.md,
                      paddingVertical: space.md,
                      borderBottomWidth: 1,
                      borderBottomColor: c.border,
                    }}
                  >
                    <Text
                      variant="body"
                      numberOfLines={1}
                      style={{ flex: 1, color: active ? c.accent : c.text }}
                    >
                      {item.name}
                    </Text>
                    {active ? <Check size={18} color={c.accent} /> : null}
                  </Pressable>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}
