import { Stack, Redirect } from 'expo-router';
import { useProfile } from '@/data/profile';

export default function OnboardingLayout() {
  const { signedIn, ready } = useProfile();

  // Onboarding requires an account (except in demo mode where signedIn is null).
  if (ready && signedIn === false) return <Redirect href="/(auth)/sign-in" />;

  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
