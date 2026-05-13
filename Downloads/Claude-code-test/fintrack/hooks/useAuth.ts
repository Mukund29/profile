/**
 * useAuth — subscribes to Supabase auth state and drives root navigation.
 *
 * Mount this once in the root layout (_layout.tsx). It automatically redirects:
 *   SIGNED_IN  → check user_profiles → if complete go to (app)/dashboard,
 *                                        else go to (onboarding)/name-dob
 *   SIGNED_OUT → (auth)/welcome
 */
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const router = useRouter();
  const segments = useSegments();

  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  /**
   * Check whether the user has a completed profile (display_name present).
   * Returns true if onboarding is done.
   */
  const hasCompletedProfile = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[useAuth] Profile check error:', error.message);
        return false;
      }
      return !!data?.display_name;
    } catch (err) {
      console.error('[useAuth] Profile check unexpected error:', err);
      return false;
    }
  }, []);

  /**
   * Navigate to the correct screen based on auth + profile state.
   * Called whenever the auth state changes.
   */
  const navigate = useCallback(
    async (session: Session | null) => {
      if (!session) {
        router.replace('/(auth)/welcome');
        return;
      }

      const profileComplete = await hasCompletedProfile(session.user.id);

      if (profileComplete) {
        router.replace('/(app)/dashboard');
      } else {
        router.replace('/(onboarding)/name-dob');
      }
    },
    [router, hasCompletedProfile]
  );

  // ------------------------------------------------------------------
  // Subscribe to auth state changes
  // ------------------------------------------------------------------

  useEffect(() => {
    // Load the initial session from AsyncStorage (non-blocking).
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
      });
      // Only navigate if the component is mounted at the root (no segments yet).
      // This prevents double-redirects when the user lands on a deep link.
      if (segments.length === 0) {
        navigate(session);
      }
    });

    // Real-time listener — fires on sign-in, sign-out, token refresh.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
      });

      if (_event === 'SIGNED_IN') {
        navigate(session);
      } else if (_event === 'SIGNED_OUT') {
        router.replace('/(auth)/welcome');
      }
      // TOKEN_REFRESHED, USER_UPDATED — update state only, no navigation.
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
