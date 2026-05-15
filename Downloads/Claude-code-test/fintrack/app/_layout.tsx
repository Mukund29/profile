import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { configureRevenueCat } from '../lib/revenuecat';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const queryClient = new QueryClient();

async function handleDeepLink(url: string) {
  if (!url.includes('auth/callback')) return;
  // Exchange PKCE code from email magic link for a session
  const { error } = await supabase.auth.exchangeCodeForSession(url);
  if (error) console.error('[deeplink] exchangeCodeForSession error:', error.message);
  // On success, useAuth SIGNED_IN event drives navigation automatically
}

export default function RootLayout() {
  useAuth(); // drives SIGNED_IN → name-dob/dashboard, SIGNED_OUT → welcome

  useEffect(() => {
    configureRevenueCat();

    // Handle magic link that cold-started the app
    Linking.getInitialURL().then((url) => { if (url) handleDeepLink(url); });

    // Handle magic link while app is already running
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" backgroundColor="#fcf8ff" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
