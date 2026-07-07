import { useEffect } from 'react';
import { useColorScheme, View, ActivityIndicator, AppState } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_900Black,
} from '@expo-google-fonts/archivo';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { useMemo } from 'react';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { colors } from '@/theme';
import { config, isAuthConfigured } from '@/lib/config';
import { tokenCache } from '@/lib/token-cache';
import { ProfileProvider } from '@/data/profile';
import { StatsProvider } from '@/data/stats';
import { ApiProvider, useApi } from '@/data/api-context';
import { createApi } from '@/lib/api';
import { flushQueue } from '@/lib/queue';

/** Drains the offline answer queue on launch and whenever the app foregrounds. */
function QueueFlusher() {
  const api = useApi();
  useEffect(() => {
    if (!api) return;
    void flushQueue(api).catch(() => {});
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void flushQueue(api).catch(() => {});
    });
    return () => sub.remove();
  }, [api]);
  return null;
}

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootStack() {
  const scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors[scheme].bg },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="deck/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="session/[id]" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  );
}

/**
 * Bridges Clerk into the app: the API client gets the session token, and the
 * profile/stats providers get the signed-in state so they know whether the
 * server is the source of truth. `signedIn` is null until Clerk has loaded, so
 * the gate can hold on a splash rather than flashing the sign-in screen.
 */
function Splash() {
  const scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const c = colors[scheme];
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
      <ActivityIndicator color={c.accent} />
    </View>
  );
}

function ClerkBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const api = useMemo(() => createApi(() => getToken()), [getToken]);
  // Hold on a splash until Clerk resolves, so `signedIn` handed to the profile
  // provider is always a real boolean — never a transient null that would be
  // mistaken for demo mode and briefly bypass the auth gate.
  if (!isLoaded) return <Splash />;
  const signedIn = Boolean(isSignedIn);
  return (
    <ApiProvider getToken={() => getToken()}>
      <ProfileProvider api={api} signedIn={signedIn}>
        <StatsProvider api={api} enabled={signedIn}>
          {children}
        </StatsProvider>
      </ProfileProvider>
    </ApiProvider>
  );
}

/** Demo mode (no Clerk key): local-only profile, no server sync, token-less API. */
function DemoBridge({ children }: { children: React.ReactNode }) {
  const api = useMemo(() => createApi(async () => null), []);
  return (
    <ApiProvider getToken={async () => null}>
      <ProfileProvider api={api} signedIn={null}>
        <StatsProvider api={api} enabled={false}>
          {children}
        </StatsProvider>
      </ProfileProvider>
    </ApiProvider>
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  if (isAuthConfigured) {
    return (
      <ClerkProvider publishableKey={config.clerkPublishableKey} tokenCache={tokenCache}>
        <ClerkBridge>{children}</ClerkBridge>
      </ClerkProvider>
    );
  }
  return <DemoBridge>{children}</DemoBridge>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_900Black,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Providers>
          <QueueFlusher />
          <RootStack />
          <StatusBar style="auto" />
        </Providers>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
