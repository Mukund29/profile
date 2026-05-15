import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WEBHOOK_AUTH = Deno.env.get('REVENUECAT_WEBHOOK_AUTH_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const PREMIUM_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
]);

serve(async (req) => {
  const auth = req.headers.get('Authorization');
  if (auth !== WEBHOOK_AUTH) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const event = body.event;
  const appUserId: string | undefined = event?.app_user_id;
  const eventType: string | undefined = event?.type;

  if (!appUserId || !eventType) {
    return new Response('Bad Request', { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const isPremium = PREMIUM_EVENTS.has(eventType);
  const entitlement = isPremium ? 'premium_annual' : 'free';

  const expirationMs: number | undefined = event?.expiration_at_ms;
  const validUntil = expirationMs ? new Date(expirationMs).toISOString() : null;
  const graceUntil = expirationMs
    ? new Date(expirationMs + 7 * 24 * 60 * 60 * 1000).toISOString()
    : null;
  const store =
    event?.store?.toLowerCase() === 'app_store' ? 'app_store' : 'play_store';

  await supabase.from('user_entitlements').upsert(
    {
      user_id: appUserId,
      plan: entitlement,
      valid_until: validUntil,
      grace_until: graceUntil,
      revenuecat_customer_id: event?.id ?? null,
      store,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  await supabase.auth.admin.updateUserById(appUserId, {
    app_metadata: { entitlement },
  });

  return new Response('OK', { status: 200 });
});
