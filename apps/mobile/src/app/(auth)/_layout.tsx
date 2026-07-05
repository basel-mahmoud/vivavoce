import { Stack, Redirect } from 'expo-router';
import { useProfile } from '@/data/profile';

export default function AuthLayout() {
  const { signedIn } = useProfile();

  // Already signed in? Don't show auth screens — let the gate route onward.
  if (signedIn === true) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
