/**
 * Root entry point — redirects to welcome or dashboard based on auth state.
 * Uses Expo Router's <Redirect> so no flash of wrong screen.
 */
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '../lib/supabase';

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    // Defer the Supabase session check to after mount so it runs in the
    // browser context (window available) not during SSR/static rendering.
    const timer = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setAuthed(true);
          supabase
            .from('user_profiles')
            .select('display_name')
            .eq('id', session.user.id)
            .single()
            .then(({ data }) => {
              setOnboarded(!!data?.display_name);
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      }).catch(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fcf8ff' }}>
        <ActivityIndicator size="large" color="#4648d4" />
      </View>
    );
  }

  if (!authed) return <Redirect href="/(auth)/welcome" />;
  if (!onboarded) return <Redirect href="/(onboarding)/name-dob" />;
  return <Redirect href="/(app)/dashboard" />;
}
