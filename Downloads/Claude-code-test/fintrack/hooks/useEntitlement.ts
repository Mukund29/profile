import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type EntitlementStatus = 'premium' | 'free' | 'loading';

export function useEntitlement(): EntitlementStatus {
  const [status, setStatus] = useState<EntitlementStatus>('loading');

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStatus('free'); return; }
      const entitlement = session.user.app_metadata?.entitlement;
      setStatus(entitlement === 'premium_annual' ? 'premium' : 'free');
    }
    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setStatus('free'); return; }
      const entitlement = session.user.app_metadata?.entitlement;
      setStatus(entitlement === 'premium_annual' ? 'premium' : 'free');
    });

    return () => subscription.unsubscribe();
  }, []);

  return status;
}
