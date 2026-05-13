/**
 * useOnboarding — checks whether the current user has completed onboarding.
 *
 * "Onboarding complete" means the user has a `user_profiles` row with a
 * non-null display_name. This is set by createUserProfile() after the
 * name/DOB screen.
 *
 * Usage:
 *   const { isComplete, loading, checkCompletion } = useOnboarding();
 */
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface OnboardingStatus {
  /** True if the user has a completed profile (display_name present). */
  isComplete: boolean;
  /** True while the profile check is in-flight. */
  loading: boolean;
  /**
   * Re-run the profile check. Call after createUserProfile() to confirm
   * the row was written before navigating to the dashboard.
   */
  checkCompletion: () => Promise<boolean>;
}

export function useOnboarding(): OnboardingStatus {
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const checkCompletion = useCallback(async (): Promise<boolean> => {
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setIsComplete(false);
        return false;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('[useOnboarding] Profile check error:', error.message);
        setIsComplete(false);
        return false;
      }

      const complete = !!data?.display_name;
      setIsComplete(complete);
      return complete;
    } catch (err) {
      console.error('[useOnboarding] Unexpected error:', err);
      setIsComplete(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { isComplete, loading, checkCompletion };
}
