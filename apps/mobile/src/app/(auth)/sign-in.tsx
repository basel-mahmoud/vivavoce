import { useState } from 'react';
import { View, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useSignIn } from '@clerk/clerk-expo';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { useTheme } from '@/theme';
import { isAuthConfigured } from '@/lib/config';

/** Real Clerk email/password sign-in, isolated so the hook only runs when Clerk
 *  is configured. In demo mode we show guidance instead. */
function SignInForm() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { c, space, radius } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const inputStyle = {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: space.lg,
    color: c.text,
    fontFamily: 'Archivo_400Regular',
    fontSize: 16,
  } as const;

  const submit = async () => {
    if (!isLoaded || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await signIn.create({ identifier: email.trim(), password });
      if (res.status === 'complete') {
        await setActive({ session: res.createdSessionId });
        router.replace('/(tabs)');
      } else {
        setError('Additional verification is required. Check your email.');
      }
    } catch {
      setError('Those details didn’t work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: space.md }}>
      <TextInput
        style={inputStyle}
        placeholder="you@university.edu"
        placeholderTextColor={c.textFaint}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        accessibilityLabel="Email"
      />
      <TextInput
        style={inputStyle}
        placeholder="Password"
        placeholderTextColor={c.textFaint}
        secureTextEntry
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
        accessibilityLabel="Password"
      />
      {error ? (
        <Text variant="small" tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button label="Sign in" onPress={submit} loading={busy} style={{ marginTop: space.sm }} />
    </View>
  );
}

export default function SignIn() {
  const { space } = useTheme();
  return (
    <Screen>
      <Text variant="display2" style={{ marginTop: space['2xl'] }}>
        Welcome back
      </Text>
      <Text variant="body" tone="textMuted" style={{ marginTop: space.xs, marginBottom: space['2xl'] }}>
        Sign in to sync your progress across devices.
      </Text>

      {isAuthConfigured ? (
        <SignInForm />
      ) : (
        <Text variant="small" tone="textMuted">
          Authentication isn’t configured in this build, so VivaVoce is running in
          demo mode — your practice stays on this device. Add a Clerk publishable
          key to enable accounts and cloud sync.
        </Text>
      )}
    </Screen>
  );
}
