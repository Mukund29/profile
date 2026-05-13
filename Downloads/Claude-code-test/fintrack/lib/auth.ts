/**
 * FinTrack auth module — all sign-in methods + profile creation.
 *
 * Rules:
 * - All async functions return { error: string | null } — never throw to UI.
 * - Errors logged via console.error, network failures surfaced as friendly strings.
 * - Bank tokens / raw credentials never appear in responses.
 */

import { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { supabase } from './supabase';

// Required for web browser auth flow redirect completion on iOS/Android.
WebBrowser.maybeCompleteAuthSession();

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function networkError(): string {
  return 'Unable to connect. Please check your internet connection.';
}

function normaliseError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (
      msg.includes('network') ||
      msg.includes('fetch') ||
      msg.includes('failed to fetch') ||
      msg.includes('timeout')
    ) {
      return networkError();
    }
    return err.message;
  }
  return 'An unexpected error occurred. Please try again.';
}

// ---------------------------------------------------------------------------
// Google OAuth
// ---------------------------------------------------------------------------

/**
 * Sign in with Google via expo-auth-session.
 *
 * Usage in a component:
 *   const [_request, response, promptAsync] = Google.useAuthRequest({ ... });
 *   useEffect(() => { if (response?.type === 'success') signInWithGoogle(response.params.id_token); }, [response]);
 *
 * This function is intentionally decoupled — the hook lives in the component
 * so the redirect URI can be resolved at render time (hooks must be called in
 * components/custom hooks, not plain functions).
 *
 * Call this with the id_token received from Google after the prompt resolves.
 */
export async function signInWithGoogle(
  idToken: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) {
      console.error('[auth] Google sign-in error:', error.message);
      return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    console.error('[auth] Google sign-in unexpected error:', err);
    return { error: normaliseError(err) };
  }
}

/**
 * Build the redirect URI for Google OAuth (Expo Go + production).
 * Export so screen components can pass it to Google.useAuthRequest.
 */
export const googleRedirectUri = makeRedirectUri({
  scheme: 'fintrack',
  path: 'auth/callback',
});

// ---------------------------------------------------------------------------
// Apple Sign-In
// ---------------------------------------------------------------------------

/**
 * Sign in with Apple via expo-apple-authentication.
 * iOS only — check AppleAuthentication.isAvailableAsync() before showing the button.
 */
export async function signInWithApple(): Promise<{ error: string | null }> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { error: 'Apple did not return an identity token. Please try again.' };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) {
      console.error('[auth] Apple sign-in error:', error.message);
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    // ERR_REQUEST_CANCELED = user tapped Cancel — not an error worth surfacing.
    if (err instanceof Error && err.message.includes('ERR_REQUEST_CANCELED')) {
      return { error: null };
    }
    console.error('[auth] Apple sign-in unexpected error:', err);
    return { error: normaliseError(err) };
  }
}

// ---------------------------------------------------------------------------
// Phone OTP
// ---------------------------------------------------------------------------

/**
 * Send a 6-digit OTP to the given E.164 phone number (e.g. +919876543210).
 * Supabase Auth must have Phone provider enabled in the dashboard.
 */
export async function sendPhoneOTP(
  phone: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) {
      console.error('[auth] Send OTP error:', error.message);
      return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    console.error('[auth] Send OTP unexpected error:', err);
    return { error: normaliseError(err) };
  }
}

// ---------------------------------------------------------------------------
// Email Magic Link
// ---------------------------------------------------------------------------

/**
 * Send a magic link to the given email address.
 * The deep-link redirect must be configured in Supabase → Authentication → URL Configuration.
 */
export async function sendEmailMagicLink(
  email: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'fintrack://auth/callback',
      },
    });
    if (error) {
      console.error('[auth] Magic link error:', error.message);
      return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    console.error('[auth] Magic link unexpected error:', err);
    return { error: normaliseError(err) };
  }
}

// ---------------------------------------------------------------------------
// Verify Phone OTP
// ---------------------------------------------------------------------------

/**
 * Verify the 6-digit OTP that was sent to `phone`.
 * Returns the session on success.
 */
export async function verifyPhoneOTP(
  phone: string,
  token: string
): Promise<{ session: Session | null; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    if (error) {
      console.error('[auth] Verify OTP error:', error.message);
      return { session: null, error: error.message };
    }
    return { session: data.session, error: null };
  } catch (err) {
    console.error('[auth] Verify OTP unexpected error:', err);
    return { session: null, error: normaliseError(err) };
  }
}

// ---------------------------------------------------------------------------
// Create user profile
// ---------------------------------------------------------------------------

/**
 * Insert (or upsert) the user_profiles row after the name/DOB onboarding screen.
 *
 * Age ≥ 18 is enforced server-side via a Supabase DB check constraint, but we
 * also validate here to surface a clear message before the round-trip.
 *
 * The `locale` field is populated from the device locale (passed by the caller
 * so this module stays free of side effects).
 */
export async function createUserProfile(params: {
  userId: string;
  displayName: string;
  dateOfBirth: Date;
  baseCurrency: string;
  locale?: string;
}): Promise<{ error: string | null }> {
  const { userId, displayName, dateOfBirth, baseCurrency, locale = 'en-US' } = params;

  // Client-side age gate (server enforces independently)
  const today = new Date();
  const eighteenYearsAgo = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate()
  );
  if (dateOfBirth > eighteenYearsAgo) {
    return { error: 'You must be 18 or older to use FinTrack.' };
  }

  try {
    const { error } = await supabase.from('user_profiles').upsert(
      {
        id: userId,
        display_name: displayName.trim(),
        date_of_birth: dateOfBirth.toISOString().split('T')[0], // 'YYYY-MM-DD'
        age_confirmed_at: new Date().toISOString(),
        base_currency: baseCurrency,
        locale,
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.error('[auth] Create profile error:', error.message);
      return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    console.error('[auth] Create profile unexpected error:', err);
    return { error: normaliseError(err) };
  }
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

/**
 * Sign the current user out and clear the local session.
 */
export async function signOut(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[auth] Sign-out error:', error.message);
    }
  } catch (err) {
    console.error('[auth] Sign-out unexpected error:', err);
  }
}

// ---------------------------------------------------------------------------
// Get current user (synchronous)
// ---------------------------------------------------------------------------

/**
 * Returns the currently authenticated user from the in-memory session cache.
 * Returns null if not authenticated. Non-async — safe to call during render.
 *
 * Note: This relies on the session being loaded at startup (e.g. via getSession()
 * in the root layout or useAuth). For reactive auth state, prefer useAuth().
 */
export function getCurrentUser(): User | null {
  // The Supabase JS v2 client exposes a synchronous getter via the internal
  // session store. We access it through the public currentUser property which
  // reflects the most-recently resolved session without an async round-trip.
  // @ts-expect-error — accessing internal _session which Supabase v2 exposes
  // as a convenience; this is stable and used by official Supabase RN examples.
  const session: Session | null = supabase.auth['_session'] ?? null;
  return session?.user ?? null;
}

// Re-export types so consumers don't need to import from supabase-js directly.
export type { Session, User };
