import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useProfile } from '@/data/profile';
import { useTheme } from '@/theme';

export default function Index() {
  const { profile, ready } = useProfile();
  const { c } = useTheme();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  return <Redirect href={profile.onboarded ? '/(tabs)' : '/(onboarding)/goal'} />;
}
