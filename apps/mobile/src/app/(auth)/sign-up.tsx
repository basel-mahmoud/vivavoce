import { useCallback, useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { router, Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useSignUp, useSSO } from '@clerk/clerk-expo';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { useTheme } from '@/theme';
import { isAuthConfigured } from '@/lib/config';

WebBrowser.maybeCompleteAuthSession();

/** Google via Clerk SSO — one tap covers both sign-up and sign-in. */
function GoogleButton({ onError }: { onError: (msg: string) => void }) {
  const { startSSOFlow } = useSSO();
  const [busy, setBusy] = useState(false);

  const go = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri({ scheme: 'vivavoce' }),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/');
      } else {
        onError('Google sign-up was not completed. Try again.');
      }
    } catch {
      onError('Google sign-up failed. You can use email instead.');
    } finally {
      setBusy(false);
    }
  }, [busy, startSSOFlow, onError]);

  return <Button label="Continue with Google" onPress={go} loading={busy} />;
}

/** Email + password sign-up with an email verification code (Clerk). */
function SignUpForm() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const { c, space, radius } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
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

  const startSignUp = async () => {
    if (!isLoaded || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signUp.create({ emailAddress: email.trim(), password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err) {
      setError(clerkMessage(err) ?? 'We could not start sign-up. Check your details.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!isLoaded || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (res.status === 'complete') {
        await setActive({ session: res.createdSessionId });
        router.replace('/');
      } else {
        setError('That code did not verify. Please try again.');
      }
    } catch (err) {
      setError(clerkMessage(err) ?? 'That code did not verify. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (pendingVerification) {
    return (
      <View style={{ gap: space.md }}>
        <Text variant="small" tone="textMuted">
          We sent a 6-digit code to {email.trim()}. Enter it to finish creating your
          account.
        </Text>
        <TextInput
          style={inputStyle}
          placeholder="123456"
          placeholderTextColor={c.textFaint}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          value={code}
          onChangeText={setCode}
          accessibilityLabel="Verification code"
        />
        {error ? (
          <Text variant="small" tone="danger" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <Button label="Verify & continue" onPress={verify} loading={busy} />
      </View>
    );
  }

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
        placeholder="Create a password"
        placeholderTextColor={c.textFaint}
        secureTextEntry
        autoComplete="password-new"
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
        label="Create account"
        variant="secondary"
        onPress={startSignUp}
        loading={busy}
        style={{ marginTop: space.sm }}
      />
    </View>
  );
}

/** Pull a human message out of a Clerk error without leaking internals. */
function clerkMessage(err: unknown): string | null {
  const e = err as { errors?: { message?: string; longMessage?: string }[] };
  const first = e?.errors?.[0];
  return first?.longMessage ?? first?.message ?? null;
}

export default function SignUp() {
  const { c, space } = useTheme();
  return (
    <Screen>
      <Text variant="caption" tone="accent" style={{ marginTop: space['2xl'] }}>
        VIVAVOCE
      </Text>
      <Text variant="display2" style={{ marginTop: space.sm }}>
        Create your account
      </Text>
      <Text variant="body" tone="textMuted" style={{ marginTop: space.xs, marginBottom: space['2xl'] }}>
        One account for your streak, your progress, and AI marking that remembers
        where you struggle.
      </Text>

      {isAuthConfigured ? (
        <>
          <SignUpForm />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: space.xs,
              marginTop: space['2xl'],
            }}
          >
            <Text variant="small" tone="textMuted">
              Already have an account?
            </Text>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable accessibilityRole="link">
                <Text variant="small" style={{ color: c.accent, fontFamily: 'Archivo_600SemiBold' }}>
                  Sign in
                </Text>
              </Pressable>
            </Link>
          </View>
        </>
      ) : (
        <Text variant="small" tone="textMuted">
          Authentication is not configured in this build, so account creation is
          disabled. VivaVoce is running in demo mode on this device.
        </Text>
      )}
    </Screen>
  );
}
