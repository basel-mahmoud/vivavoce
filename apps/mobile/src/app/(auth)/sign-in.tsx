import { useCallback, useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { router, Link } from 'expo-router';
import Animated from 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useSignIn, useSSO, useClerk } from '@clerk/clerk-expo';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { entrance } from '@/ui/motion';
import { useTheme } from '@/theme';
import { isAuthConfigured } from '@/lib/config';

// Required so the in-app browser closes itself after the OAuth redirect.
WebBrowser.maybeCompleteAuthSession();

/** Google via Clerk SSO. OAuth covers both sign-in and first-time sign-up. */
function GoogleButton({ onError }: { onError: (msg: string) => void }) {
  const { startSSOFlow } = useSSO();
  const clerk = useClerk();
  const [busy, setBusy] = useState(false);

  // After a reinstall, Clerk's browser cookie can still hold a live session;
  // the OAuth flow then short-circuits without creating a new one. Activating
  // the existing client session is the correct recovery — never a dead end.
  const activateExisting = useCallback(async () => {
    const sid =
      clerk.client?.lastActiveSessionId ?? clerk.client?.sessions?.[0]?.id ?? null;
    if (!sid) return false;
    await clerk.setActive({ session: sid });
    router.replace('/');
    return true;
  }, [clerk]);

  const go = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { createdSessionId, setActive, signIn, signUp } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri({ scheme: 'vivavoce' }),
      });
      const sessionId =
        createdSessionId ?? signIn?.createdSessionId ?? signUp?.createdSessionId ?? null;
      if (sessionId && setActive) {
        await setActive({ session: sessionId });
        router.replace('/');
      } else if (!(await activateExisting())) {
        // e.g. the user closed the browser mid-flow.
        onError('Google sign-in was not completed. Try again.');
      }
    } catch (err) {
      const code = (err as { errors?: { code?: string }[] })?.errors?.[0]?.code;
      if (code === 'session_exists' && (await activateExisting().catch(() => false))) {
        return;
      }
      onError('Google sign-in failed. You can use email instead.');
    } finally {
      setBusy(false);
    }
  }, [busy, startSSOFlow, onError, activateExisting]);

  return <Button label="Continue with Google" onPress={go} loading={busy} />;
}

/** Email/password sign-in via Clerk. */
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
        router.replace('/');
      } else {
        setError('Additional verification is required. Check your email.');
      }
    } catch {
      setError('Those details did not work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: space.md }}>
      <GoogleButton onError={setError} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          marginVertical: space.sm,
        }}
      >
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
        <Text variant="caption" tone="textFaint">
          or with email
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
      </View>

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
      <Button
        label="Sign in"
        variant="secondary"
        onPress={submit}
        loading={busy}
        style={{ marginTop: space.sm }}
      />
    </View>
  );
}

export default function SignIn() {
  const { c, space } = useTheme();
  return (
    <Screen>
      <Animated.View entering={entrance(0)}>
        <Text variant="caption" tone="accent" style={{ marginTop: space['2xl'] }}>
          VIVAVOCE
        </Text>
        <Text variant="display2" style={{ marginTop: space.sm }}>
          Welcome back
        </Text>
        <Text variant="body" tone="textMuted" style={{ marginTop: space.xs, marginBottom: space['2xl'] }}>
          Sign in to pick up your streak and sync your progress across devices.
        </Text>
      </Animated.View>

      {isAuthConfigured ? (
        <>
          <Animated.View entering={entrance(1)}>
            <SignInForm />
          </Animated.View>
          <Animated.View
            entering={entrance(2)}
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: space.xs,
              marginTop: space['2xl'],
            }}
          >
            <Text variant="small" tone="textMuted">
              New to VivaVoce?
            </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable accessibilityRole="link">
                <Text variant="small" style={{ color: c.accent, fontFamily: 'Archivo_600SemiBold' }}>
                  Create an account
                </Text>
              </Pressable>
            </Link>
          </Animated.View>
        </>
      ) : (
        <Text variant="small" tone="textMuted">
          Authentication is not configured in this build, so VivaVoce is running
          in demo mode and your practice stays on this device. Add a Clerk
          publishable key to enable accounts and cloud sync.
        </Text>
      )}
    </Screen>
  );
}
