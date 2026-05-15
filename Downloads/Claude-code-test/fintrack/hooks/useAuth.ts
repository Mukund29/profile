/**
 * useAuth — subscribes to Supabase auth state and drives root navigation.
 *
 * Mount this once in the root layout (_layout.tsx). It automatically redirects:
 *   SIGNED_IN  → check user_profiles → if complete go to (app)/dashboard,
 *                                        else go to (onboarding)/name-dob
 *   SIGNED_OUT → (auth)/welcome
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
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
  const navigationState = useRootNavigationState();
  const isReady = !!navigationState?.key;

  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  // Holds a navigation action to fire once the navigator is ready.
  const pendingNav = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isReady && pendingNav.current) {
      const fn = pendingNav.current;
      pendingNav.current = null;
      fn();
    }
  }, [isReady]);

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
      const doNav = async () => {
        if (!session) {
          router.replace('/(auth)/welcome');
          return;
        }
        const profileComplete = await hasCompletedProfile(session.user.id);
        if (profileComplete) {
          router.replace('/(app)/(tabs)/' as any);
        } else {
          router.replace('/(onboarding)/name-dob');
        }
      };

      if (isReady) {
        doNav();
      } else {
        // Navigator not mounted yet — defer until ready.
        pendingNav.current = doNav;
      }
    },
    [router, hasCompletedProfile, isReady]
  );

  // ------------------------------------------------------------------
  // Subscribe to auth state changes
  // ------------------------------------------------------------------

  useEffect(() => {
    // Populate state from the persisted session — app/index.tsx handles the
    // initial redirect, so no navigation here.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ user: session?.user ?? null, session, loading: false });
    });

    // Real-time listener — fires on sign-in, sign-out, token refresh.
    // These events fire AFTER the navigator is mounted, so navigation is safe.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, session, loading: false });

      if (_event === 'SIGNED_IN') {
        navigate(session);
      } else if (_event === 'SIGNED_OUT') {
        router.replace('/(auth)/welcome');
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
