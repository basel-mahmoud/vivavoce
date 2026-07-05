import { View, Switch, Pressable, Alert, Linking } from 'react-native';
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
} from 'lucide-react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Card } from '@/ui/Card';
import { useTheme } from '@/theme';
import { useProfile } from '@/data/profile';
import { fieldByKey } from '@/data/content';
import { isAuthConfigured } from '@/lib/config';
import { haptics } from '@/lib/haptics';

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

export default function SettingsScreen() {
  const { c, space } = useTheme();
  const { profile, update, reset } = useProfile();

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
        <Row icon={<Bell size={18} color={c.textMuted} />} label="Notifications" hint="Reminders & streaks" onPress={() => haptics.tap()} />
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
