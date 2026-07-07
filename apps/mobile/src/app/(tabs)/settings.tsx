import { useEffect, useState } from 'react';
import { View, Switch, Pressable, Alert, Linking, TextInput } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import {
  ChevronRight,
  Shield,
  Bell,
  Download,
  Trash2,
  LogOut,
  LogIn,
  User,
  LifeBuoy,
  Star,
  FileText,
  Info,
  CalendarClock,
} from 'lucide-react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Card } from '@/ui/Card';
import { useTheme } from '@/theme';
import { useProfile } from '@/data/profile';
import { fieldByKey } from '@/data/content';
import { Chip } from '@/ui/kit';
import { isAuthConfigured } from '@/lib/config';
import { haptics } from '@/lib/haptics';
import { getReminder, setReminder, type ReminderPrefs } from '@/lib/reminders';

/** Sign-in entry when signed out; identity + working sign-out when signed in.
 *  Only rendered when Clerk is configured (hooks need the provider). */
function AccountRow() {
  const { c } = useTheme();
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();

  if (!isSignedIn) {
    return (
      <Row
        icon={<LogIn size={18} color={c.accent} />}
        label="Sign in"
        hint="Sync progress and get AI marking"
        onPress={() => {
          haptics.tap();
          router.push('/(auth)/sign-in');
        }}
      />
    );
  }

  const email = user?.primaryEmailAddress?.emailAddress ?? 'Signed in';
  return (
    <Row
      icon={<LogOut size={18} color={c.textMuted} />}
      label="Sign out"
      hint={email}
      onPress={() => {
        haptics.tap();
        Alert.alert('Sign out?', email, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
        ]);
      }}
    />
  );
}

function Row({
  icon,
  label,
  hint,
  onPress,
  right,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}) {
  const { c, space } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md }}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" style={danger ? { color: c.danger } : undefined}>
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" tone="textFaint" style={{ marginTop: 2 }}>
            {hint}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <ChevronRight size={18} color={c.textFaint} /> : null)}
    </Pressable>
  );
}

const REMINDER_TIMES: [number, string][] = [
  [7, '7:00'],
  [12, '12:00'],
  [18, '18:00'],
  [21, '21:00'],
];

export default function SettingsScreen() {
  const { c, space } = useTheme();
  const { profile, update, reset } = useProfile();
  const [reminder, setReminderState] = useState<ReminderPrefs>({
    enabled: false,
    hour: 18,
    minute: 0,
  });

  useEffect(() => {
    void getReminder().then(setReminderState);
  }, []);

  const applyReminder = async (next: ReminderPrefs) => {
    setReminderState(next);
    const okGranted = await setReminder(next);
    if (!okGranted && next.enabled) {
      setReminderState({ ...next, enabled: false });
      Alert.alert(
        'Notifications are off',
        'Allow notifications for VivaVoce in your system settings to get practice reminders.',
      );
    }
  };

  const [examName, setExamName] = useState(profile.examName ?? '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  useEffect(() => setExamName(profile.examName ?? ''), [profile.examName]);

  const confirmDelete = () =>
    Alert.alert(
      'Delete your account?',
      'This permanently removes your practice data and any retained recordings on a defined schedule. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            reset();
            router.replace('/');
          },
        },
      ],
    );

  return (
    <Screen>
      <Text variant="display2">Settings</Text>

      <Text variant="caption" tone="textFaint" style={{ marginTop: space.xl, marginBottom: space.sm }}>
        ACCOUNT
      </Text>
      <Card style={{ paddingVertical: space.xs }}>
        {isAuthConfigured && <AccountRow />}
        <Row
          icon={<User size={18} color={c.textMuted} />}
          label="Profile"
          hint={
            profile.fieldOfStudy
              ? fieldByKey(profile.fieldOfStudy)?.name ?? 'Your field'
              : 'Set up your profile'
          }
          onPress={() => {
            haptics.tap();
            router.push('/(onboarding)/field');
          }}
        />
        <Row icon={<Shield size={18} color={c.textMuted} />} label="Security" hint="Password, sessions, MFA" onPress={() => haptics.tap()} />
        <Row
          icon={<Bell size={18} color={reminder.enabled ? c.accent : c.textMuted} />}
          label="Daily reminder"
          hint={reminder.enabled ? `Every day at ${reminder.hour}:00` : 'Keep the streak alive'}
          right={
            <Switch
              value={reminder.enabled}
              onValueChange={(v) => {
                haptics.tap();
                void applyReminder({ ...reminder, enabled: v });
              }}
              trackColor={{ true: c.accent, false: c.surface2 }}
              thumbColor="#fff"
            />
          }
        />
        {reminder.enabled ? (
          <View style={{ flexDirection: 'row', gap: space.sm, paddingBottom: space.md, paddingLeft: 30 }}>
            {REMINDER_TIMES.map(([hour, label]) => (
              <Chip
                key={hour}
                label={label}
                active={reminder.hour === hour}
                onPress={() => {
                  haptics.tap();
                  void applyReminder({ ...reminder, hour, minute: 0 });
                }}
              />
            ))}
          </View>
        ) : null}
      </Card>

      <Text variant="caption" tone="textFaint" style={{ marginTop: space.xl, marginBottom: space.sm }}>
        EXAM COUNTDOWN
      </Text>
      <Card style={{ paddingVertical: space.md, gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <CalendarClock size={18} color={profile.examDate ? c.gravitas : c.textMuted} />
          <TextInput
            value={examName}
            onChangeText={setExamName}
            onEndEditing={() => update({ examName: examName.trim() || null })}
            placeholder="Name your exam (e.g. Cardiology viva)"
            placeholderTextColor={c.textFaint}
            maxLength={60}
            style={{ flex: 1, color: c.text, fontFamily: 'Archivo_400Regular', fontSize: 15 }}
            accessibilityLabel="Exam name"
          />
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm, paddingLeft: 30 }}>
          <Chip
            label={profile.examDate ?? 'Pick a date'}
            active={Boolean(profile.examDate)}
            onPress={() => {
              haptics.tap();
              setShowDatePicker(true);
            }}
          />
          {profile.examDate ? (
            <Chip
              label="Clear"
              onPress={() => {
                haptics.tap();
                update({ examDate: null, examName: null });
                setExamName('');
              }}
            />
          ) : null}
        </View>
        {showDatePicker ? (
          <DateTimePicker
            value={profile.examDate ? new Date(profile.examDate) : new Date()}
            mode="date"
            minimumDate={new Date()}
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (event.type === 'set' && date) {
                update({ examDate: date.toISOString().slice(0, 10) });
              }
            }}
          />
        ) : null}
      </Card>

      <Text variant="caption" tone="textFaint" style={{ marginTop: space.xl, marginBottom: space.sm }}>
        PRIVACY
      </Text>
      <Card style={{ paddingVertical: space.xs }}>
        <Row
          icon={<Shield size={18} color={c.textMuted} />}
          label="Keep my recordings"
          hint="Off = audio is deleted right after transcription"
          right={
            <Switch
              value={profile.consentAudio}
              onValueChange={(v) => {
                haptics.tap();
                update({ consentAudio: v });
              }}
              trackColor={{ true: c.accent, false: c.surface2 }}
              thumbColor="#fff"
            />
          }
        />
        <Row icon={<Download size={18} color={c.textMuted} />} label="Export my data" hint="Download everything we hold" onPress={() => haptics.tap()} />
      </Card>

      <Text variant="caption" tone="textFaint" style={{ marginTop: space.xl, marginBottom: space.sm }}>
        SUPPORT
      </Text>
      <Card style={{ paddingVertical: space.xs }}>
        <Row
          icon={<LifeBuoy size={18} color={c.textMuted} />}
          label="Help & support"
          hint="Guides and contact"
          onPress={() => Linking.openURL('https://vivavoce-kappa.vercel.app/contact')}
        />
        <Row
          icon={<Star size={18} color={c.textMuted} />}
          label="Rate VivaVoce"
          hint="Tell us how it’s going"
          onPress={() => haptics.tap()}
        />
        <Row
          icon={<FileText size={18} color={c.textMuted} />}
          label="Privacy & terms"
          onPress={() => Linking.openURL('https://vivavoce-kappa.vercel.app/privacy')}
        />
        <Row
          icon={<Info size={18} color={c.textMuted} />}
          label="About"
          hint={`Version ${Constants.expoConfig?.version ?? '1.0.0'}`}
          onPress={() => haptics.tap()}
        />
      </Card>

      <Text variant="caption" tone="textFaint" style={{ marginTop: space.xl, marginBottom: space.sm }}>
        DANGER ZONE
      </Text>
      <Card style={{ paddingVertical: space.xs }}>
        <Row icon={<Trash2 size={18} color={c.danger} />} label="Delete account" hint="Right to be forgotten" danger onPress={confirmDelete} />
      </Card>

      <Text variant="caption" tone="textFaint" style={{ marginTop: space['2xl'], textAlign: 'center' }}>
        VivaVoce is a coaching tool, not an official examiner. Scores are guidance,
        not grades.
      </Text>
    </Screen>
  );
}
