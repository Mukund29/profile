/**
 * Supabase client — singleton, AsyncStorage-persisted session.
 * Import this everywhere you need DB/Auth access.
 *
 * Web note: AsyncStorage is only used on native. On web (including SSR/dev),
 * we fall back to localStorage so the `window` reference is safe.
 */
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[supabase] Missing env vars — auth calls will fail. Copy .env.example → .env.'
  );
}

// On web, let Supabase use its default localStorage-based storage.
// On native, use AsyncStorage for persistence across app restarts.
async function getStorage() {
  if (Platform.OS === 'web') return undefined; // supabase defaults to localStorage
  const { default: AsyncStorage } = await import(
    '@react-native-async-storage/async-storage'
  );
  return AsyncStorage;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // storage is set lazily per-platform; undefined → supabase uses localStorage on web
    storage: Platform.OS !== 'web'
      ? require('@react-native-async-storage/async-storage').default
      : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
