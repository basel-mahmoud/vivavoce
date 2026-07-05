import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useProfile } from '@/data/profile';
import { useTheme } from '@/theme';

/**
 * Entry gate. Everything is behind an account: a signed-out user is sent to the
 * auth screens; a signed-in user without a finished profile goes to onboarding;
 * otherwise straight into the app. Demo mode (signedIn === null) skips the auth
 * requirement so the app is still usable without Clerk configured.
 */
export default function Index() {
  const { profile, ready, signedIn } = useProfile();
  const { c } = useTheme();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  if (signedIn === false) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <Redirect href={profile.onboarded ? '/(tabs)' : '/(onboarding)/field'} />;
}
