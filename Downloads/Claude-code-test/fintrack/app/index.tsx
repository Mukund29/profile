/**
 * Root entry point — in DEMO mode, goes straight to the app shell.
 * Auth + Supabase calls are disabled until DB is configured (see SUPABASE_SETUP.md).
 */
import { Redirect } from 'expo-router';

export default function Index() {
  // DEMO MODE: skip auth, go directly to the main tab navigator.
  // To re-enable real auth, replace this with the Supabase session check
  // (see git history for the full implementation).
  return <Redirect href={'/(app)/(tabs)/' as any} />;
}
