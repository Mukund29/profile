/**
 * Deep link callback — fintrack://auth/callback?code=<pkce-code>
 * Reached when user taps the email magic link.
 * Exchanges the PKCE code for a session; useAuth SIGNED_IN event handles navigation.
 */
import { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

export default function AuthCallbackScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    if (!code) {
      // No code — malformed link or direct navigation; go back to welcome
      router.replace('/(auth)/welcome');
      return;
    }

    supabase.auth
      .exchangeCodeForSession(String(code))
      .then(({ error }) => {
        if (error) {
          console.error('[callback] exchangeCodeForSession error:', error.message);
          router.replace('/(auth)/welcome');
        }
        // On success, useAuth SIGNED_IN fires and navigates to name-dob or dashboard
      });
  }, [code]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.label}>Signing you in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  label: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
});
