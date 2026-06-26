import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { colors } from '@/theme';
import { config, isAuthConfigured } from '@/lib/config';
import { tokenCache } from '@/lib/token-cache';
import { ProfileProvider } from '@/data/profile';
import { ApiProvider } from '@/data/api-context';

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
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="session/[id]" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="(auth)/sign-in" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

/** Bridges Clerk's session token into the API context (Clerk only). */
function ClerkApiBridge({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  return <ApiProvider getToken={() => getToken()}>{children}</ApiProvider>;
}

function Providers({ children }: { children: React.ReactNode }) {
  if (isAuthConfigured) {
    return (
      <ClerkProvider publishableKey={config.clerkPublishableKey} tokenCache={tokenCache}>
        <ClerkApiBridge>{children}</ClerkApiBridge>
      </ClerkProvider>
    );
  }
  // Demo mode: no auth provider; API calls run token-less (backend returns 401,
  // and the app falls back to on-device evaluation).
  return <ApiProvider getToken={async () => null}>{children}</ApiProvider>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
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
          <ProfileProvider>
            <RootStack />
            <StatusBar style="auto" />
          </ProfileProvider>
        </Providers>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
