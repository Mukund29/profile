# FinTrack — Per-Screen Technical Reference

**Date:** 2026-05-13  
**Author:** Paige (Senior Technical Writer)  
**Status:** SHIP — matched to Architecture v4, Data Model, Epics & Stories  
**Screen IDs:** SCR-001 through SCR-032 (matching Sally's design doc numbering)  
**User Story cross-references:** US-### from `2026-05-13-epics-stories.md`

---

## Screen ID Map

| SCR | Screen Name | Tab / Flow | US refs |
|-----|-------------|-----------|---------|
| SCR-001 | Welcome | Onboarding | US-007, US-008, US-009, US-010 |
| SCR-002 | OTP / Magic Link | Onboarding | US-009, US-010 |
| SCR-003 | Name + Date of Birth | Onboarding | US-011 |
| SCR-004 | Connect Bank (Onboarding) | Onboarding | US-012 |
| SCR-005 | Dashboard (Home) | Tab 1 | US-013, US-029, US-038 |
| SCR-006 | Budget Ring Detail | Tab 1 (modal) | US-029 |
| SCR-007 | Transaction List (Tracker) | Tab 2 | US-016 |
| SCR-008 | Add Transaction (Manual) | Tab 2 (modal) | US-015 |
| SCR-009 | Auto-Parsed Review Queue | Tab 2 | US-018 |
| SCR-010 | Transaction Detail / Edit | Tab 2 (modal) | US-017 |
| SCR-011 | Transaction Filter / Search | Tab 2 (sheet) | US-019 |
| SCR-012 | Reports Hub | Tab 3 | US-031, US-032, US-034 |
| SCR-013 | Weekly Report | Tab 3 | US-031 |
| SCR-014 | Monthly Report | Tab 3 | US-032 |
| SCR-015 | Annual Report | Tab 3 | US-034 |
| SCR-016 | Export | Tab 3 (modal) | US-035, US-036 |
| SCR-017 | Accounts List | Tab 4 | US-039 |
| SCR-018 | Account Detail | Tab 4 | US-040 |
| SCR-019 | Add Bank Account (post-onboarding) | Tab 4 (modal) | US-012, US-021, US-022, US-023 |
| SCR-020 | Add Cash Account | Tab 4 (modal) | US-039 |
| SCR-021 | Goals List | Tab 4 | US-041 |
| SCR-022 | Goal Detail | Tab 4 | US-041 |
| SCR-023 | Add / Edit Goal | Tab 4 (modal) | US-041 |
| SCR-024 | Settings Menu | Tab 5 | US-042, US-043, US-044 |
| SCR-025 | Profile | Tab 5 | US-011, US-043 |
| SCR-026 | Subscription | Tab 5 | US-044, US-046 |
| SCR-027 | Budget Targets | Tab 5 | US-028 |
| SCR-028 | Custom Categories | Tab 5 | US-020 |
| SCR-029 | Manage Banks / Connections | Tab 5 | US-012, US-021, US-022, US-023 |
| SCR-030 | Notification Preferences | Tab 5 | US-042 |
| SCR-031 | Privacy Controls | Tab 5 | US-043 |
| SCR-032 | Paywall | Global (modal) | US-046 |

---

## Onboarding Screens

---

### SCR-001 — Welcome

**Story refs:** US-007 (Google OAuth), US-008 (Apple Sign-In), US-009 (Phone OTP), US-010 (Magic Link)

#### Supabase Queries

This screen initiates auth — no DB queries before auth completes. Post-auth the client stores the JWT.

```typescript
// Google OAuth — Supabase Auth helper
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'fintrack://auth/callback',
    scopes: 'openid email profile',
  },
});

// Apple Sign-In
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'apple',
  options: { redirectTo: 'fintrack://auth/callback' },
});
```

#### Edge Functions / API Calls

None on this screen. Auth is handled entirely by Supabase Auth SDK.

#### React Query Keys

None — auth state is managed by Zustand + Supabase session listener, not React Query.

#### Supabase Realtime Subscriptions

None.

#### Offline Behaviour

- If network is unavailable, OAuth buttons are disabled with a "No internet connection" banner.
- Phone/email path shows same banner and disables the "Send code" button.
- No queue involvement — auth requires connectivity.

#### RLS Notes

No table queries on this screen. Auth tokens are not yet issued.

#### RevenueCat / Paywall

Not checked on this screen. RevenueCat is initialised after auth in the app bootstrap sequence.

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Google OAuth cancelled | Returns to SCR-001, no toast |
| Apple Sign-In cancelled | Returns to SCR-001, no toast |
| Network error during OAuth | "No internet connection. Try again." toast |
| Supabase Auth 5xx | "Something went wrong. Try again in a moment." toast |
| OAuth redirect fails (deep link) | "Sign-in failed. Please try again." toast |

---

### SCR-002 — OTP / Magic Link

**Story refs:** US-009 (Phone OTP), US-010 (Magic Link)  
**Condition:** Shown only when user chose phone or email on SCR-001. Skipped for Google/Apple.

#### Supabase Queries

```typescript
// Send phone OTP
const { error } = await supabase.auth.signInWithOtp({
  phone: '+919876543210', // E.164 format
});

// Verify OTP
const { data, error } = await supabase.auth.verifyOtp({
  phone: '+919876543210',
  token: '123456',
  type: 'sms',
});

// Send magic link (email path)
const { error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: { emailRedirectTo: 'fintrack://auth/callback' },
});
```

#### Edge Functions / API Calls

None — Supabase Auth handles OTP delivery via Twilio (configured in Supabase dashboard).

#### React Query Keys

None. OTP state managed locally in component state.

#### Supabase Realtime Subscriptions

None. Auth state change is detected via `supabase.auth.onAuthStateChange` listener.

#### Offline Behaviour

- "Send code" is disabled when offline.
- If network drops after OTP is sent, the verify step shows a "No connection — please reconnect and try again" error.

#### RLS Notes

No table queries. JWT not yet issued.

#### RevenueCat / Paywall

Not checked.

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Invalid OTP | "Incorrect code. Check your SMS and try again." (inline under OTP field) |
| OTP expired (> 5 min) | "Code expired. Tap 'Resend' to get a new one." |
| Resend before 30s cooldown | Resend button disabled; countdown shown |
| Phone number already registered | Silently signs in (Supabase OTP is passwordless — no conflict) |
| Supabase 429 rate limit | "Too many attempts. Please wait 60 seconds." |
| Network error | "No internet connection." toast |

---

### SCR-003 — Name + Date of Birth

**Story refs:** US-011  
**Condition:** Shown after any successful auth path. Google/Apple users see name pre-filled.

#### Supabase Queries

```typescript
// Write user profile after DOB validation (server-side age check happens in Edge Function)
const { error } = await supabase
  .from('user_profiles')
  .upsert({
    id: user.id,                    // PK = auth.users.id
    display_name: 'Mukund',
    date_of_birth: '1995-03-15',    // RLS + Vault-encrypted server-side
    age_confirmed_at: new Date().toISOString(),
    base_currency: detectedCurrency, // 'INR' | 'USD' | 'GBP'
    locale: Localization.locale,     // e.g. 'en-IN'
  });
// RLS: auth.uid() = id — user can only upsert their own row (Tier 1)
```

**Age validation Edge Function call (before upsert):**

```typescript
// POST /functions/v1/validate-age — runs server-side, rejects under-18
const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-age`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${session.access_token}` },
  body: JSON.stringify({ date_of_birth: '1995-03-15' }),
});
// Returns 200 { valid: true } or 422 { error: 'Must be 18 or older' }
```

#### Edge Functions / API Calls

- `POST /functions/v1/validate-age` — validates DOB ≥ 18 server-side before profile write. The Edge Function also triggers Vault encryption of the DOB column.

#### React Query Keys

```typescript
['user-profile', userId]  // Invalidated after successful upsert
```

#### Supabase Realtime Subscriptions

None.

#### Offline Behaviour

- "Continue" button disabled when offline.
- Form data preserved in component state if user backgrounds the app.
- No queue involvement — this write must complete online before onboarding proceeds.

#### RLS Notes

- Table: `user_profiles` (Tier 1 — full read/write own row).
- Policy: `user_profiles_own_all` — `USING (auth.uid() = id)`.
- `WITH CHECK` prevents a user from writing another user's profile row.
- DOB stored encrypted in Supabase Vault; the plaintext never appears in API responses.

#### RevenueCat / Paywall

Not checked on this screen. RevenueCat `logIn(userId)` is called once after profile write completes.

```typescript
// Called once after profile upsert succeeds
import Purchases from 'react-native-purchases';
await Purchases.logIn(user.id);
```

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Age < 18 | "You must be 18 or older to use FinTrack. Financial services require age verification." — blocked from proceeding |
| DOB not entered | "Continue" button remains disabled |
| Display name empty | "Continue" button remains disabled |
| Supabase upsert error | "Couldn't save your details. Please try again." toast |
| Network error | "No internet connection." toast |

---

### SCR-004 — Connect Bank (Onboarding)

**Story refs:** US-012 (Connect Bank), US-021 (Plaid), US-022 (TrueLayer), US-023 (Setu AA)

#### Supabase Queries

```typescript
// After successful bank OAuth — write bank_connections row (via Edge Function)
// Client does NOT write bank_connections directly (token must go server-side)
// The Edge Function below handles token exchange + Vault encryption + row insert.

// Read result after connection — using safe view
const { data: connection } = await supabase
  .from('bank_connections_safe')
  .select('id, institution_name, balance_amount, balance_currency, tracking_from, status')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();
// RLS: bank_connections_safe view applies bank_connections_own_all policy
// access_token is excluded from the view — never returned to client
```

#### Edge Functions / API Calls

```typescript
// Plaid: exchange public token for access token (server-side only)
// POST /functions/v1/plaid-exchange-token
const response = await fetch(`${SUPABASE_URL}/functions/v1/plaid-exchange-token`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${session.access_token}` },
  body: JSON.stringify({ public_token: plaidPublicToken }),
});
// Edge Function: stores access_token in Vault, inserts bank_connections row
// Returns: { connection_id: string, institution_name: string, balance_amount: number }

// TrueLayer: exchange auth code for access + refresh token
// POST /functions/v1/truelayer-exchange-token
const response = await fetch(`${SUPABASE_URL}/functions/v1/truelayer-exchange-token`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${session.access_token}` },
  body: JSON.stringify({ code: truelayerCode, redirect_uri: TRUELAYER_REDIRECT_URI }),
});

// Setu AA: register consent and store connection
// POST /functions/v1/setu-aa-register
const response = await fetch(`${SUPABASE_URL}/functions/v1/setu-aa-register`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${session.access_token}` },
  body: JSON.stringify({ consent_handle: setuConsentHandle }),
});
```

#### React Query Keys

```typescript
['bank-connections', userId]  // Invalidated after successful connection
['net-worth', userId]         // Invalidated after first balance fetched
```

#### Supabase Realtime Subscriptions

None on this screen. Balance appears from initial fetch response.

#### Offline Behaviour

- "Connect Bank" button disabled when offline.
- "Skip for now" always available — routes to SCR-005 (Dashboard).
- India AA flow: if AA deep link times out after 30s AND device is offline, shows "Connect when you're back online" message; skip path remains available.

#### RLS Notes

- Table: `bank_connections_safe` (VIEW over `bank_connections`, Tier 1).
- `access_token` is never returned — excluded from `bank_connections_safe` view.
- Edge Functions write to `bank_connections` using the service key (bypasses RLS).
- Client SELECT goes through `bank_connections_safe` — authenticated role SELECT is revoked from the underlying table.

#### RevenueCat / Paywall

Not checked. Bank connection is available on the free trial; no paywall on this screen.

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Plaid Link cancelled by user | Returns to SCR-004; CTA visible again |
| Plaid Link error (institution unavailable) | "Your bank isn't available right now. You can connect later from Accounts." |
| TrueLayer OAuth cancelled | Returns to SCR-004 |
| Setu AA timeout (> 30s) | Android: "We'll auto-read your bank SMS instead." SMS fallback prompt shown. iOS: Skip to SCR-005. |
| Token exchange Edge Function 5xx | "Couldn't connect your bank. Please try again." retry CTA |
| Setu AA app not installed | Falls back same as timeout |
| Network error | "No internet connection." toast; skip path available |

---

## Tab 1 — Dashboard

---

### SCR-005 — Dashboard (Home)

**Story refs:** US-013 (Smart Nudge), US-029 (Budget Ring), US-038 (Net Worth)

#### Supabase Queries

```typescript
// Net Worth — account balances from safe view
const { data: connections } = await supabase
  .from('bank_connections_safe')
  .select(
    'id, institution_name, institution_logo_url, balance_amount, balance_currency,' +
    'balance_cached_at, status, provider'
  )
  .eq('user_id', user.id)
  .eq('status', 'active');
// RLS: bank_connections_own_all via safe view (Tier 1)

// Budget ring — current month transactions aggregated by type
const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString().split('T')[0];
const { data: monthlyTotals } = await supabase
  .from('transactions')
  .select('txn_type, amount_base')
  .eq('user_id', user.id)
  .gte('txn_date', startOfMonth);
// RLS: transactions_own_all (Tier 1)
// Note: current-month summary is a live query — monthly_summaries covers prior months only

// User profile for income / budget targets
const { data: profile } = await supabase
  .from('user_profiles')
  .select('display_name, base_currency, monthly_income, budget_needs_pct, budget_wants_pct, budget_savings_pct, weekly_spend_limit')
  .eq('id', user.id)
  .single();
// RLS: user_profiles_own_all (Tier 1)

// Active goals for progress bars
const { data: goals } = await supabase
  .from('goals')
  .select('id, name, target_amount, current_amount, currency, target_date, status')
  .eq('user_id', user.id)
  .eq('status', 'active')
  .order('created_at', { ascending: true });
// RLS: goals_own_all (Tier 1)

// Today's transactions (last 3 for strip)
const today = new Date().toISOString().split('T')[0];
const { data: todayTxns } = await supabase
  .from('transactions')
  .select('id, txn_date, description, amount_base, currency, txn_type, category_id')
  .eq('user_id', user.id)
  .eq('txn_date', today)
  .order('created_at', { ascending: false })
  .limit(3);
// RLS: transactions_own_all (Tier 1)
```

#### Edge Functions / API Calls

- None on initial render. Manual balance refresh calls the Edge Function below (see SCR-017 for rate-limit logic — same endpoint).

```typescript
// Manual balance refresh — rate-limited 1/15 min per connection
const response = await fetch(`${SUPABASE_URL}/functions/v1/refresh-balance`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${session.access_token}` },
  body: JSON.stringify({ connection_id: connectionId }),
});
// Returns 200 { balance_amount, balance_currency, balance_cached_at }
// Returns 429 { error: 'Rate limit', retry_after_seconds: 900 }
```

#### React Query Keys

```typescript
['bank-connections', userId]
['budget-ring', userId, currentMonth]        // e.g. ['budget-ring', 'uuid', '2026-05']
['user-profile', userId]
['goals', userId, 'active']
['today-transactions', userId, todayDate]    // e.g. ['today-transactions', 'uuid', '2026-05-13']
```

#### Supabase Realtime Subscriptions

```typescript
// Budget ring updates in real-time when new transactions are inserted
// (covers auto-parsed transactions from FastAPI)
supabase
  .channel(`transactions:${userId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'transactions',
      filter: `user_id=eq.${userId}`,
    },
    () => {
      queryClient.invalidateQueries({ queryKey: ['budget-ring', userId, currentMonth] });
      queryClient.invalidateQueries({ queryKey: ['today-transactions', userId, today] });
    }
  )
  .subscribe();
// Supabase Pro: Realtime included. At 5% concurrency (1,000 users) = 50 connections — within limits.
// Risk 3 resolution from architecture-v4.md
```

#### Offline Behaviour

- All data displayed from React Query cache (stale-while-revalidate).
- "Offline" banner shown at top when `NetInfo.isConnected = false`.
- Manual refresh button disabled.
- Budget ring shows cached values — "Last updated X ago" badge remains.
- Net Worth shows cached balance with staleness badge if `balance_cached_at > 26h`.

#### RLS Notes

- `bank_connections_safe`: Tier 1 via VIEW — `access_token` excluded.
- `transactions`: Tier 1 — `transactions_own_all` policy.
- `user_profiles`: Tier 1 — `user_profiles_own_all` policy.
- `goals`: Tier 1 — `goals_own_all` policy.

#### RevenueCat / Paywall

Dashboard is accessible to all users (including free trial and lapsed with grace period).

```typescript
// Entitlement read from JWT — zero DB query
import { useSession } from '@/hooks/useSession';
const { session } = useSession();
const entitlement = session?.user?.app_metadata?.entitlement;
// 'premium_annual' | 'free'
// Smart nudge cards shown regardless of entitlement
```

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Network unavailable | Offline banner; cached data shown |
| `bank_connections_safe` query error | Net Worth card shows "–" with retry button |
| `transactions` query error | Budget ring shows 0; "Could not load budget data" inline |
| Manual refresh 429 | "Balance was refreshed recently. Try again in X minutes." toast |
| Manual refresh 5xx | "Couldn't refresh balance. Try again." toast |
| Goals query error | Goals section hidden; no error shown (non-critical) |

---

### SCR-006 — Budget Ring Detail

**Story refs:** US-029 (Budget Ring Detail)  
**Entry:** Tap on budget ring on SCR-005.

#### Supabase Queries

```typescript
// Current month transactions grouped by category and type
const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString().split('T')[0];

const { data: categoryTotals } = await supabase
  .from('transactions')
  .select(
    'txn_type, category_id, amount_base,' +
    'categories!inner(name, icon, colour_hex)'
  )
  .eq('user_id', user.id)
  .gte('txn_date', startOfMonth);
// RLS: transactions_own_all (Tier 1)
// categories read via join — Tier 3 policy applies (own + system defaults visible)
```

#### React Query Keys

```typescript
['budget-ring-detail', userId, currentMonth]
```

#### Offline Behaviour

Reads from React Query cache. Shows cached data with staleness badge.

#### RLS Notes

- `transactions`: Tier 1.
- `categories`: Tier 3 — `categories_read_own_and_system` — includes system defaults.

#### RevenueCat / Paywall

Accessible on all plans. Category breakdown detail is not paywalled.

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Query error | "Couldn't load budget breakdown." inline error with retry |

---

## Tab 2 — Tracker

---

### SCR-007 — Transaction List (Tracker)

**Story refs:** US-016 (Transaction List)

#### Supabase Queries

```typescript
// Paginated transaction list — 30 at a time
const { data: transactions } = await supabase
  .from('transactions')
  .select(
    'id, txn_date, description, merchant_normalized, amount, amount_base,' +
    'currency, txn_type, category_id, payment_mode, source, is_confirmed,' +
    'created_at, categories!inner(name, icon, colour_hex)'
  )
  .eq('user_id', user.id)
  .order('txn_date', { ascending: false })
  .order('created_at', { ascending: false })
  .range(offset, offset + 29);
// RLS: transactions_own_all (Tier 1)

// Unconfirmed count for tab badge
const { count: unconfirmedCount } = await supabase
  .from('transactions')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .eq('is_confirmed', false);
```

#### React Query Keys

```typescript
['transactions', userId, { offset: 0, limit: 30 }]   // paginated
['unconfirmed-count', userId]                           // tab badge
```

#### Supabase Realtime Subscriptions

```typescript
// Update list and badge when new transactions arrive
supabase
  .channel(`tracker:${userId}`)
  .on(
    'postgres_changes',
    {
      event: '*',  // INSERT | UPDATE | DELETE
      schema: 'public',
      table: 'transactions',
      filter: `user_id=eq.${userId}`,
    },
    () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] });
      queryClient.invalidateQueries({ queryKey: ['unconfirmed-count', userId] });
    }
  )
  .subscribe();
```

#### Offline Behaviour

- Cached transactions shown from React Query.
- Swipe-to-delete queued in SQLite if offline; synced on reconnect.
- "Offline" banner shown; pull-to-refresh disabled.

#### RLS Notes

- `transactions`: Tier 1 — `transactions_own_all`.
- `categories` joined: Tier 3 — user's own + system defaults visible.

#### RevenueCat / Paywall

Transaction list accessible on all plans. Export is paywalled (handled in SCR-016).

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Query error | "Couldn't load transactions." with retry button |
| Empty state (no transactions) | "No transactions yet — add your first spend" with FAB highlight |
| Offline delete | Delete queued locally; undo toast works against local state |

---

### SCR-008 — Add Transaction (Manual)

**Story refs:** US-015 (Add Transaction)  
**Entry:** FAB on Dashboard or Tracker, or swipe-right on SCR-007 (new row).

#### Supabase Queries

```typescript
// INSERT new transaction
const { data, error } = await supabase
  .from('transactions')
  .insert({
    user_id: user.id,
    txn_date: selectedDate,                    // 'YYYY-MM-DD'
    description: merchantName,
    merchant_normalized: merchantName.toLowerCase().trim().replace(/[^a-z0-9 ]/g, ''),
    category_id: selectedCategoryId,
    txn_type: selectedType,                   // 'need' | 'want' | 'saving'
    amount: amountInSmallestUnit,             // bigint — paise/cents/pence, never float
    currency: userBaseCurrency,
    amount_base: amountInSmallestUnit,        // same when currency = base_currency
    fx_rate_at_insert: 1.0,                   // 1.0 when no conversion needed
    payment_mode: selectedPaymentMode,
    source: 'manual',
    is_confirmed: true,                       // manual = always confirmed
    dedup_hash: computedDedupHash,            // SHA-256(amount + merchant_normalized + date-bucket + currency)
    goal_id: selectedGoalId ?? null,          // only when txn_type = 'saving'
    notes: notesText ?? null,
  })
  .select('id')
  .single();
// RLS: transactions_own_all WITH CHECK (auth.uid() = user_id) — Tier 1

// Fetch categories for picker
const { data: categories } = await supabase
  .from('categories')
  .select('id, name, icon, colour_hex, default_type')
  .or(`user_id.eq.${user.id},user_id.is.null`)  // own + system defaults
  .eq('is_archived', false)
  .order('user_id', { ascending: true, nullsFirst: false });
// RLS: categories_read_own_and_system (Tier 3)

// Fetch active goals for goal assignment (when type = 'saving')
const { data: activeGoals } = await supabase
  .from('goals')
  .select('id, name, target_amount, current_amount, currency')
  .eq('user_id', user.id)
  .eq('status', 'active');
// RLS: goals_own_all (Tier 1)
```

#### Edge Functions / API Calls

None. Manual transactions are written directly from the client.

**FX conversion (when multi-currency):**

```typescript
// If transaction currency differs from base_currency, read latest FX rate
const { data: fxRate } = await supabase
  .from('fx_rates')
  .select('rate, fetched_at')
  .eq('base', 'USD')                 // Open Exchange Rates always USD base
  .eq('quote', transactionCurrency)
  .order('fetched_at', { ascending: false })
  .limit(1)
  .single();
// RLS: fx_rates_authenticated_read (Tier 5 — global read)
// amount_base = Math.round(amount * fxRate.rate) — bigint arithmetic only
```

#### React Query Keys

```typescript
['categories', userId]
['goals', userId, 'active']
['fx-rates']              // no user scope — global
```

#### Offline Behaviour

```typescript
// SQLite (SQLCipher) offline queue
import * as SQLite from 'expo-sqlite';
const db = await SQLite.openDatabaseAsync('fintrack_offline.db', {
  flags: SQLite.SQLiteOpenFlags.READWRITE | SQLite.SQLiteOpenFlags.CREATE,
});

// Insert into offline queue when network unavailable
await db.runAsync(
  `INSERT INTO offline_queue (type, payload, created_at) VALUES (?, ?, ?)`,
  ['transaction_insert', JSON.stringify(transactionPayload), Date.now()]
);
// Queue drains on reconnect via NetInfo listener — drainOfflineQueue()
```

- Offline save triggers a "Saved offline — will sync when connected" toast.
- Undo works against local SQLite state.

#### RLS Notes

- `transactions`: Tier 1 — `WITH CHECK (auth.uid() = user_id)` prevents user_id spoofing.
- `categories`: Tier 3.
- `goals`: Tier 1.
- `fx_rates`: Tier 5 — authenticated read.

#### RevenueCat / Paywall

Manual transaction entry is accessible on all plans (not paywalled).

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Amount = 0 or empty | "Save" button disabled; "Enter an amount" inline hint |
| Description empty | "Save" button disabled; "Add a description" inline hint |
| `dedup_hash` UNIQUE conflict (23505) | "This transaction looks like a duplicate. Save anyway?" confirmation |
| Network error | Saved to offline queue; "Saved offline" toast |
| Supabase INSERT error (non-dedup) | "Couldn't save transaction. Please try again." toast |
| FX rate missing | Uses last cached rate; shows "Using approximate exchange rate" warning |

---

### SCR-009 — Auto-Parsed Transaction Review Queue

**Story refs:** US-018 (Auto-Parsed Review)  
**Entry:** Unconfirmed section at top of SCR-007, or deep link from push notification.

#### Supabase Queries

```typescript
// Unconfirmed transactions sorted by created_at
const { data: pendingTxns } = await supabase
  .from('transactions')
  .select(
    'id, txn_date, description, amount, currency, amount_base, txn_type,' +
    'category_id, payment_mode, source, is_confirmed,' +
    'categories!inner(name, icon, colour_hex)'
  )
  .eq('user_id', user.id)
  .eq('is_confirmed', false)
  .order('created_at', { ascending: false });
// RLS: transactions_own_all (Tier 1)

// Confirm transaction (one-tap)
const { error } = await supabase
  .from('transactions')
  .update({ is_confirmed: true })
  .eq('id', transactionId)
  .eq('user_id', user.id);   // belt-and-suspenders alongside RLS
// RLS: transactions_own_all WITH CHECK (Tier 1)
```

#### React Query Keys

```typescript
['unconfirmed-transactions', userId]
['unconfirmed-count', userId]   // invalidated after confirm/edit
```

#### Supabase Realtime Subscriptions

Inherits from SCR-007 Realtime subscription — new unconfirmed transactions appear automatically.

#### Offline Behaviour

- Confirmation action queued in SQLite if offline.
- List shows cached unconfirmed items.

#### RLS Notes

- `transactions`: Tier 1 — users can only UPDATE their own rows.

#### RevenueCat / Paywall

Not paywalled.

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Confirm action fails | "Couldn't confirm. Try again." toast; item remains in queue |
| Empty queue | "All caught up!" empty state with checkmark |
| Offline confirm | Queued locally; confirmed state shown optimistically |

---

### SCR-010 — Transaction Detail / Edit

**Story refs:** US-017 (Edit & Delete)  
**Entry:** Tap on any transaction row in SCR-007, or swipe-right → Edit.

#### Supabase Queries

```typescript
// Fetch full transaction detail
const { data: txn } = await supabase
  .from('transactions')
  .select(
    'id, txn_date, description, merchant_normalized, amount, currency, amount_base,' +
    'fx_rate_at_insert, txn_type, category_id, payment_mode, source,' +
    'is_confirmed, goal_id, notes, created_at,' +
    'categories!inner(name, icon, colour_hex)'
  )
  .eq('id', transactionId)
  .eq('user_id', user.id)
  .single();
// RLS: transactions_own_all (Tier 1)

// UPDATE (edit save)
const { error } = await supabase
  .from('transactions')
  .update({
    txn_date: editedDate,
    description: editedDescription,
    merchant_normalized: editedDescription.toLowerCase().trim().replace(/[^a-z0-9 ]/g, ''),
    amount: editedAmountInSmallestUnit,
    txn_type: editedType,
    category_id: editedCategoryId,
    payment_mode: editedPaymentMode,
    notes: editedNotes,
    goal_id: editedGoalId ?? null,
    is_confirmed: true,
  })
  .eq('id', transactionId)
  .eq('user_id', user.id);
// RLS WITH CHECK prevents changing user_id
// trg_goal_amount trigger fires automatically on UPDATE if goal_id changes

// DELETE
const { error } = await supabase
  .from('transactions')
  .delete()
  .eq('id', transactionId)
  .eq('user_id', user.id);
// trg_goal_amount trigger fires on DELETE to reduce goals.current_amount
```

#### React Query Keys

```typescript
['transaction-detail', transactionId]
['transactions', userId]          // invalidated after edit/delete
['budget-ring', userId, month]    // invalidated after edit/delete
['goals', userId, 'active']       // invalidated if goal_id changed
```

#### Offline Behaviour

- Edit/delete queued in SQLite if offline.
- Undo (5-second toast) operates against local SQLite state.

#### RLS Notes

- `transactions`: Tier 1 — `UPDATE` and `DELETE` require `auth.uid() = user_id`.
- `trg_goal_amount` trigger runs atomically in the same transaction — no eventual consistency.

#### RevenueCat / Paywall

Not paywalled.

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Delete error | "Couldn't delete. Try again." toast; row remains |
| Edit save error | "Couldn't save changes." toast |
| Offline edit | Queued; "Saved offline" toast |
| Transaction not found (deleted elsewhere) | "Transaction no longer exists." toast; navigate back |

---

### SCR-011 — Transaction Filter / Search

**Story refs:** US-019 (Filter & Search)  
**Entry:** Search icon or filter icon on SCR-007.

#### Supabase Queries

```typescript
// Filtered transaction query (all active filters applied)
const { data: results } = await supabase
  .from('transactions')
  .select(
    'id, txn_date, description, amount_base, currency, txn_type,' +
    'category_id, payment_mode, source, is_confirmed,' +
    'categories!inner(name, icon, colour_hex)'
  )
  .eq('user_id', user.id)
  .ilike('merchant_normalized', `%${searchTerm.toLowerCase()}%`)  // debounced 300ms
  .gte('txn_date', filterDateFrom ?? '2000-01-01')
  .lte('txn_date', filterDateTo ?? '2099-12-31')
  .in('txn_type', selectedTypes.length ? selectedTypes : ['need', 'want', 'saving'])
  .in('payment_mode', selectedModes.length ? selectedModes : ALL_PAYMENT_MODES)
  .in('source', selectedSources.length ? selectedSources : ALL_SOURCES)
  .order('txn_date', { ascending: false })
  .order('created_at', { ascending: false });
// RLS: transactions_own_all (Tier 1)
// Uses idx_txn_user_date index — efficient for date-range + user_id queries
```

#### React Query Keys

```typescript
// Keyed by full filter state — unique cache per filter combination
['transactions-filtered', userId, { search, dateFrom, dateTo, types, modes, sources }]
```

#### Offline Behaviour

- Search operates against React Query cache when offline (client-side filter on cached transactions).
- Banner shown: "Searching cached data — connect for full results."

#### RLS Notes

- `transactions`: Tier 1 — all queries scoped by `user_id`.

#### RevenueCat / Paywall

Not paywalled.

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Query error | "Search failed. Try again." inline |
| Zero results | "No transactions match your filters. Try broadening the search." |

---

## Tab 3 — Reports

---

### SCR-012 — Reports Hub

**Story refs:** US-031, US-032, US-034  
**Entry:** Tab 3 in bottom nav.

#### Supabase Queries

```typescript
// Check if user has any weekly summaries — determines if reports are populated
const { count: weeklySummaryCount } = await supabase
  .from('weekly_summaries')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', user.id);
// RLS: weekly_summaries_own_read (Tier 2)

// Latest monthly summary (for "last month" quick card)
const { data: latestMonthly } = await supabase
  .from('monthly_summaries')
  .select('month, total_spend, discipline_score, is_partial')
  .eq('user_id', user.id)
  .order('month', { ascending: false })
  .limit(1)
  .single();
// RLS: monthly_summaries_own_read (Tier 2)
```

#### React Query Keys

```typescript
['reports-hub', userId]
['latest-monthly-summary', userId]
```

#### Offline Behaviour

Reads from cache. Shows last available period badges.

#### RLS Notes

- `weekly_summaries`: Tier 2 — read-only; written by pg_cron.
- `monthly_summaries`: Tier 2 — read-only; written by pg_cron.

#### RevenueCat / Paywall

Annual report is paywalled (requires `premium_annual` entitlement). Weekly and monthly reports accessible on free trial.

```typescript
const entitlement = session?.user?.app_metadata?.entitlement as string | undefined;
const hasAnnualAccess = entitlement === 'premium_annual';
// Annual report row shows lock icon if !hasAnnualAccess
```

#### Error Handling

| Error | User Sees |
|-------|-----------|
| No summaries yet | "Your first weekly report will appear after Monday." empty state |
| Query error | "Reports unavailable." with retry |

---

### SCR-013 — Weekly Report

**Story refs:** US-031

#### Supabase Queries

```typescript
// Weekly summary for the selected week
const { data: summary } = await supabase
  .from('weekly_summaries')
  .select(
    'week_start, week_end, total_spend, needs_spend, wants_spend, savings_spend,' +
    'weekly_limit, discipline_score, category_breakdown, computed_at'
  )
  .eq('user_id', user.id)
  .eq('week_start', selectedWeekStart)   // 'YYYY-MM-DD' Monday
  .single();
// RLS: weekly_summaries_own_read (Tier 2)

// Transaction list for day-drilldown (tapping a bar on the chart)
const { data: dayTxns } = await supabase
  .from('transactions')
  .select('id, description, amount_base, currency, txn_type, category_id, payment_mode')
  .eq('user_id', user.id)
  .eq('txn_date', selectedDay)
  .order('created_at', { ascending: false });
// RLS: transactions_own_all (Tier 1)

// Prior week — for WoW trend arrow
const { data: priorSummary } = await supabase
  .from('weekly_summaries')
  .select('discipline_score')
  .eq('user_id', user.id)
  .eq('week_start', priorWeekStart)
  .single();
// RLS: weekly_summaries_own_read (Tier 2)
```

#### React Query Keys

```typescript
['weekly-summary', userId, weekStart]         // e.g. ['weekly-summary', 'uuid', '2026-05-11']
['weekly-day-transactions', userId, dayDate]  // e.g. ['weekly-day-transactions', 'uuid', '2026-05-13']
['weekly-summary', userId, priorWeekStart]    // for trend arrow
```

#### Offline Behaviour

Pre-computed summaries read from React Query cache. Day-drill transactions also cached.

#### RLS Notes

- `weekly_summaries`: Tier 2 — read-only.
- `transactions`: Tier 1.
- Note: "Weekly scores are based on UTC time" disclosure required per Risk 2 resolution (architecture-v4.md).

#### RevenueCat / Paywall

Weekly report accessible on free trial. No paywall.

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Summary not yet computed | "Report for this week will be ready on Monday." informational state |
| Query error | "Couldn't load weekly report." retry |
| No transactions in period | "No transactions this week." empty state |

---

### SCR-014 — Monthly Report

**Story refs:** US-032

#### Supabase Queries

```typescript
// Monthly summary (pre-computed by pg_cron on 1st of month)
const { data: summary } = await supabase
  .from('monthly_summaries')
  .select(
    'month, total_spend, needs_spend, wants_spend, savings_spend,' +
    'budget_needs, budget_wants, budget_savings, discipline_score,' +
    'is_partial, daily_breakdown, category_breakdown, computed_at'
  )
  .eq('user_id', user.id)
  .eq('month', selectedMonth)    // 'YYYY-MM-01' first day of month
  .single();
// RLS: monthly_summaries_own_read (Tier 2)

// If current month (not yet computed by pg_cron) — live aggregation query
// This is only run when selectedMonth === currentMonth
const { data: liveMonthTotals } = await supabase
  .from('transactions')
  .select('txn_date, txn_type, amount_base, category_id')
  .eq('user_id', user.id)
  .gte('txn_date', startOfCurrentMonth)
  .lte('txn_date', today);
// RLS: transactions_own_all (Tier 1)
// Aggregated client-side using dinero.js for display

// Day-drilldown transactions
const { data: dayTxns } = await supabase
  .from('transactions')
  .select('id, description, amount_base, currency, txn_type, category_id, payment_mode')
  .eq('user_id', user.id)
  .eq('txn_date', selectedDay);
// RLS: transactions_own_all (Tier 1)
```

#### React Query Keys

```typescript
['monthly-summary', userId, selectedMonth]         // e.g. ['monthly-summary', 'uuid', '2026-05-01']
['monthly-live-totals', userId, currentMonth]      // only for current (not-yet-computed) month
['monthly-day-transactions', userId, selectedDay]
```

#### Offline Behaviour

Pre-computed summaries and cached transactions available offline. "Partial month" banner still shown.

#### RLS Notes

- `monthly_summaries`: Tier 2.
- `transactions`: Tier 1 (for live current-month aggregation).
- `is_partial = true` months show "Partial month — data tracked from [date]" banner per US-032 AC.

#### RevenueCat / Paywall

Monthly report accessible on all plans.

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Summary not yet computed (prior month) | "Report for [Month] will be ready on the 1st." |
| is_partial = true | "Partial month — tracking started [date]. Data may be incomplete." banner |
| Query error | "Couldn't load monthly report." retry |

---

### SCR-015 — Annual Report

**Story refs:** US-034  
**Paywall:** `premium_annual` required

#### Supabase Queries

```typescript
// All monthly summaries for the selected year
const { data: monthlySummaries } = await supabase
  .from('monthly_summaries')
  .select(
    'month, total_spend, needs_spend, wants_spend, savings_spend,' +
    'budget_needs, budget_wants, budget_savings, discipline_score, is_partial'
  )
  .eq('user_id', user.id)
  .gte('month', `${selectedYear}-01-01`)
  .lte('month', `${selectedYear}-12-31`)
  .order('month', { ascending: true });
// RLS: monthly_summaries_own_read (Tier 2)

// User income for savings rate calculation
const { data: profile } = await supabase
  .from('user_profiles')
  .select('monthly_income, base_currency')
  .eq('id', user.id)
  .single();
// RLS: user_profiles_own_all (Tier 1)
```

#### React Query Keys

```typescript
['annual-report', userId, selectedYear]    // e.g. ['annual-report', 'uuid', 2026]
['user-profile', userId]
```

#### Offline Behaviour

Reads from cache. Annual insights computed client-side from cached monthly summaries.

#### RLS Notes

- `monthly_summaries`: Tier 2 — read-only.
- `user_profiles`: Tier 1.
- Partial months excluded from annual discipline score client-side: `summaries.filter(s => !s.is_partial)`.

#### RevenueCat / Paywall

```typescript
// Check entitlement from JWT — no DB query
const entitlement = session?.user?.app_metadata?.entitlement as string | undefined;
if (entitlement !== 'premium_annual') {
  // Navigate to SCR-032 (Paywall)
  router.push('/paywall');
  return;
}
```

#### Error Handling

| Error | User Sees |
|-------|-----------|
| No annual data | "No data for [year]. Start tracking to see your annual report." |
| Entitlement not premium | Redirected to SCR-032 paywall |
| Query error | "Couldn't load annual report." retry |

---

### SCR-016 — Export

**Story refs:** US-035 (Excel), US-036 (Google Drive)

#### Supabase Queries

```typescript
// Fetch all transactions for the selected period (for Excel generation)
const { data: exportTxns } = await supabase
  .from('transactions')
  .select(
    'txn_date, description, category_id, amount, currency, amount_base,' +
    'payment_mode, txn_type, notes,' +
    'categories!inner(name)'
  )
  .eq('user_id', user.id)
  .gte('txn_date', exportStartDate)
  .lte('txn_date', exportEndDate)
  .order('txn_date', { ascending: true });
// RLS: transactions_own_all (Tier 1)
// Uses idx_txn_user_date index

// Profile for Setup sheet
const { data: profile } = await supabase
  .from('user_profiles')
  .select('display_name, base_currency, monthly_income, budget_needs_pct, budget_wants_pct, budget_savings_pct')
  .eq('id', user.id)
  .single();
// RLS: user_profiles_own_all (Tier 1)

// Monthly/weekly summaries for summary sheets
const { data: summaries } = await supabase
  .from('monthly_summaries')
  .select('month, total_spend, needs_spend, wants_spend, savings_spend, discipline_score, daily_breakdown')
  .eq('user_id', user.id)
  .gte('month', exportStartDate.slice(0, 7) + '-01')
  .lte('month', exportEndDate.slice(0, 7) + '-01');
// RLS: monthly_summaries_own_read (Tier 2)
```

#### Edge Functions / API Calls

```typescript
// Google Drive upload — called after on-device Excel generation
const response = await fetch(`${SUPABASE_URL}/functions/v1/drive-upload`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${session.access_token}` },
  body: JSON.stringify({
    filename: 'FinTrack_May2026_Monthly.xlsx',
    folder_id: selectedFolderId,   // null = root "FinTrack Reports" folder
    file_base64: excelBase64,      // SheetJS output
  }),
});
// Edge Function exchanges stored OAuth token (Vault), uploads to Drive
// Returns: { file_id: string, web_view_link: string }
```

#### React Query Keys

```typescript
['export-transactions', userId, { startDate, endDate }]
['export-summaries', userId, { startDate, endDate }]
['user-profile', userId]
```

#### Offline Behaviour

Export requires network (Google Drive upload). On-device Excel generation works offline — saves to Files app / Downloads.

#### RLS Notes

- `transactions`: Tier 1.
- `monthly_summaries`: Tier 2.
- `user_profiles`: Tier 1.
- Google Drive OAuth token: stored in Supabase Vault (server-side only).

#### RevenueCat / Paywall

```typescript
// Export is paywalled — requires premium_annual entitlement
const entitlement = session?.user?.app_metadata?.entitlement as string | undefined;
if (entitlement !== 'premium_annual') {
  router.push('/paywall');
  return;
}
```

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Entitlement not premium | Redirected to SCR-032 paywall |
| Excel generation error (SheetJS) | "Couldn't generate Excel file. Try again." |
| Drive upload network error | "Upload failed. File saved to your device." + share sheet option |
| Drive OAuth expired | "Google Drive connection expired. Reconnect in Settings." |
| Drive quota exceeded | "Your Google Drive is full. Free up space and try again." |
| Export > 5s on low-end device | Progress spinner with "Generating report..." |

---

## Tab 4 — Accounts

---

### SCR-017 — Accounts List

**Story refs:** US-039 (Accounts Tab)

#### Supabase Queries

```typescript
// All bank connections (safe view — no access_token)
const { data: connections } = await supabase
  .from('bank_connections_safe')
  .select(
    'id, provider, institution_name, institution_logo_url,' +
    'balance_amount, balance_currency, balance_cached_at,' +
    'last_manual_refresh_at, status, tracking_from, created_at'
  )
  .eq('user_id', user.id)
  .order('created_at', { ascending: true });
// RLS: bank_connections_own_all via safe VIEW (Tier 1)

// FX rates for base currency conversion display
const { data: fxRates } = await supabase
  .from('fx_rates')
  .select('base, quote, rate, fetched_at')
  .in('quote', [userBaseCurrency])
  .order('fetched_at', { ascending: false })
  .limit(10);
// RLS: fx_rates_authenticated_read (Tier 5)
```

#### Edge Functions / API Calls

```typescript
// Manual balance refresh (rate-limited 1/15 min per connection)
const response = await fetch(`${SUPABASE_URL}/functions/v1/refresh-balance`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${session.access_token}` },
  body: JSON.stringify({ connection_id: connectionId }),
});
// Returns 200 { balance_amount, balance_currency, balance_cached_at }
//         429 { error: 'rate_limit', retry_after_seconds: 900 }
```

#### React Query Keys

```typescript
['bank-connections', userId]
['fx-rates', { quotes: [userBaseCurrency] }]
```

#### Supabase Realtime Subscriptions

None for account list — balances refresh on manual trigger or pg_cron.

#### Offline Behaviour

Cached connection list shown. Manual refresh disabled. Staleness badge shown if `balance_cached_at > 26h`.

#### RLS Notes

- `bank_connections_safe`: VIEW — `access_token` excluded. Underlying policy: `bank_connections_own_all` (Tier 1).
- `fx_rates`: Tier 5 — global read.

#### RevenueCat / Paywall

Account management accessible on all plans.

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Manual refresh 429 | "Refreshed recently. Try again in X min." toast |
| Connection `status = 'expired'` | "Reconnect" badge on account card |
| Connection `status = 'error'` | "Sync paused" badge; "Fix connection" CTA |
| Query error | "Couldn't load accounts." retry |

---

### SCR-018 — Account Detail

**Story refs:** US-040 (Account Detail)

#### Supabase Queries

```typescript
// Balance history — 7-day line chart
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  .toISOString();
const { data: balanceHistory } = await supabase
  .from('balance_history')
  .select('balance_amount, balance_currency, recorded_at')
  .eq('bank_connection_id', connectionId)
  .eq('user_id', user.id)
  .gte('recorded_at', sevenDaysAgo)
  .order('recorded_at', { ascending: true });
// RLS: balance_history_own_read (Tier 2) — user_id on table avoids JOIN for RLS
// Uses idx_bal_hist_conn_time index

// Recent transactions for this specific account
const { data: accountTxns } = await supabase
  .from('transactions')
  .select('id, txn_date, description, amount, currency, txn_type, category_id, is_confirmed')
  .eq('user_id', user.id)
  .eq('bank_connection_id', connectionId)
  .order('txn_date', { ascending: false })
  .limit(20);
// RLS: transactions_own_all (Tier 1)

// Connection detail
const { data: connection } = await supabase
  .from('bank_connections_safe')
  .select('id, institution_name, balance_amount, balance_currency, balance_cached_at,' +
          'status, token_expires_at, consent_expires_at, tracking_from, provider')
  .eq('id', connectionId)
  .eq('user_id', user.id)
  .single();
// RLS: bank_connections_own_all via safe VIEW (Tier 1)

// Remove account (sets status = 'disconnected', does NOT delete historical transactions)
const { error } = await supabase
  .from('bank_connections')
  .update({ status: 'disconnected' })
  .eq('id', connectionId)
  .eq('user_id', user.id);
// Direct table update via Tier 1 policy (status column, not access_token)
```

#### React Query Keys

```typescript
['balance-history', connectionId, '7d']
['account-transactions', connectionId, userId]
['bank-connection', connectionId, userId]
```

#### Offline Behaviour

Balance history chart reads from cache. "Partial history" note shown if fewer than 7 rows available.

#### RLS Notes

- `balance_history`: Tier 2 — user_id denormalised for RLS without join.
- `transactions`: Tier 1.
- `bank_connections_safe`: VIEW; `access_token` excluded.

#### RevenueCat / Paywall

Not paywalled.

#### Error Handling

| Error | User Sees |
|-------|-----------|
| < 7 days of balance_history | Chart shows available data; "Partial history — connected [date]" note |
| Remove account error | "Couldn't disconnect account. Try again." toast |
| `status = 'expired'` | "Reconnect" banner at top of screen |

---

### SCR-019 — Add Bank Account (post-onboarding)

**Story refs:** US-012, US-021, US-022, US-023  
**Entry:** "Add Account +" on SCR-017 or SCR-029.

Technical flow is identical to SCR-004 (onboarding Connect Bank), with the same Edge Function calls for token exchange. After success, navigation returns to SCR-017 (Accounts List) rather than Dashboard.

See SCR-004 for full Supabase queries, Edge Function calls, and error handling.

---

### SCR-020 — Add Cash Account

**Story refs:** US-039  
**Entry:** "Add Cash Account" on SCR-017.

#### Supabase Queries

```typescript
// Insert a manual bank_connections row (no access_token, provider = 'manual')
const { data, error } = await supabase
  .from('bank_connections')
  .insert({
    user_id: user.id,
    provider: 'manual',
    institution_name: cashAccountName,   // e.g. 'Wallet'
    tracking_from: new Date().toISOString(),
    balance_amount: openingBalanceInSmallestUnit,  // bigint
    balance_currency: selectedCurrency,
    balance_cached_at: new Date().toISOString(),
    status: 'active',
  })
  .select('id')
  .single();
// RLS: bank_connections_own_all WITH CHECK (Tier 1)
// access_token is NULL for manual accounts — Vault not invoked
```

#### React Query Keys

```typescript
['bank-connections', userId]   // invalidated after insert
```

#### Offline Behaviour

Insert queued in SQLite if offline.

#### RLS Notes

- `bank_connections`: Tier 1 — direct table write allowed (client writes; safe view only for reads).

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Name empty | "Save" button disabled |
| Balance not numeric | Inline format error |
| Insert error | "Couldn't add account. Try again." toast |

---

### SCR-021 — Goals List

**Story refs:** US-041  
**Entry:** Goals section of Tab 4.

#### Supabase Queries

```typescript
// All goals sorted by status (active first) then created_at
const { data: goals } = await supabase
  .from('goals')
  .select('id, name, target_amount, current_amount, currency, target_date, status, created_at')
  .eq('user_id', user.id)
  .order('status', { ascending: true })   // 'active' < 'archived' alphabetically
  .order('created_at', { ascending: true });
// RLS: goals_own_all (Tier 1)
```

#### React Query Keys

```typescript
['goals', userId]
```

#### Supabase Realtime Subscriptions

```typescript
// current_amount updates when saving transactions are added
supabase
  .channel(`goals:${userId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'goals',
    filter: `user_id=eq.${userId}`,
  }, () => {
    queryClient.invalidateQueries({ queryKey: ['goals', userId] });
  })
  .subscribe();
// Driven by trg_goal_amount trigger (runs atomically with transaction INSERT/UPDATE/DELETE)
```

#### Offline Behaviour

Cached goal list shown. Progress bars reflect cached `current_amount`.

#### RLS Notes

- `goals`: Tier 1 — `goals_own_all`.

#### RevenueCat / Paywall

Goals accessible on all plans.

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Max 5 active goals reached | "Add Goal +" button disabled; "You've reached the maximum of 5 active goals." tooltip |
| Query error | "Couldn't load goals." retry |
| Empty state | "No goals yet — add one to start tracking your savings." CTA |

---

### SCR-022 — Goal Detail

**Story refs:** US-041

#### Supabase Queries

```typescript
// Goal detail
const { data: goal } = await supabase
  .from('goals')
  .select('id, name, target_amount, current_amount, currency, target_date, status, created_at')
  .eq('id', goalId)
  .eq('user_id', user.id)
  .single();
// RLS: goals_own_all (Tier 1)

// Transactions contributing to this goal (for history list)
const { data: goalTxns } = await supabase
  .from('transactions')
  .select('id, txn_date, description, amount_base, currency, created_at')
  .eq('user_id', user.id)
  .eq('goal_id', goalId)
  .eq('txn_type', 'saving')
  .order('txn_date', { ascending: false });
// RLS: transactions_own_all (Tier 1)
// Uses idx_txn_goal index: WHERE goal_id IS NOT NULL

// Mark as achieved
const { error } = await supabase
  .from('goals')
  .update({ status: 'achieved' })
  .eq('id', goalId)
  .eq('user_id', user.id);
```

#### React Query Keys

```typescript
['goal-detail', goalId, userId]
['goal-transactions', goalId, userId]
```

#### Offline Behaviour

Cached goal detail shown. "Mark as achieved" queued if offline.

#### RLS Notes

- `goals`: Tier 1.
- `transactions`: Tier 1; `idx_txn_goal` partial index used.

#### RevenueCat / Paywall

Not paywalled.

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Goal not found | Navigate back; "Goal not found." toast |
| Mark achieved error | "Couldn't update goal. Try again." toast |

---

### SCR-023 — Add / Edit Goal

**Story refs:** US-041

#### Supabase Queries

```typescript
// INSERT new goal
const { error } = await supabase
  .from('goals')
  .insert({
    user_id: user.id,
    name: goalName,
    target_amount: targetAmountInSmallestUnit,   // bigint
    current_amount: 0,
    currency: userBaseCurrency,
    target_date: targetDate ?? null,
    status: 'active',
  });
// RLS: goals_own_all WITH CHECK (Tier 1)

// UPDATE existing goal
const { error } = await supabase
  .from('goals')
  .update({
    name: goalName,
    target_amount: targetAmountInSmallestUnit,
    target_date: targetDate ?? null,
  })
  .eq('id', goalId)
  .eq('user_id', user.id);
```

#### React Query Keys

```typescript
['goals', userId]   // invalidated after insert/update
```

#### Offline Behaviour

Insert/update queued in SQLite if offline.

#### RLS Notes

- `goals`: Tier 1 — `WITH CHECK (auth.uid() = user_id)`.

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Name empty | "Save" disabled |
| Target amount = 0 | "Save" disabled; "Enter a target amount" hint |
| Max 5 active goals (on insert) | "You already have 5 active goals. Archive one to add a new goal." |
| Insert/update error | "Couldn't save goal. Try again." toast |

---

## Tab 5 — Settings

---

### SCR-024 — Settings Menu

**Story refs:** US-042, US-043, US-044  
**Entry:** Tab 5 in bottom nav.

#### Supabase Queries

```typescript
// User profile summary for header display
const { data: profile } = await supabase
  .from('user_profiles')
  .select('display_name, base_currency')
  .eq('id', user.id)
  .single();
// RLS: user_profiles_own_all (Tier 1)

// Entitlement for Subscription row
const { data: entitlement } = await supabase
  .from('user_entitlements')
  .select('plan, valid_until, grace_until')
  .eq('user_id', user.id)
  .single();
// RLS: user_entitlements_own_read (Tier 2) — read-only
// Note: primary entitlement check uses JWT claim; this is supplementary for UI display
```

#### React Query Keys

```typescript
['user-profile', userId]
['user-entitlement', userId]
```

#### Offline Behaviour

Settings menu reads from React Query cache. Navigation to sub-screens works offline.

#### RLS Notes

- `user_profiles`: Tier 1.
- `user_entitlements`: Tier 2 — read-only.

#### RevenueCat / Paywall

Not paywalled. Subscription row shows current plan status.

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Profile query error | Header shows truncated email; no blocking error |
| Entitlement query error | Subscription row shows "–"; non-blocking |

---

### SCR-025 — Profile

**Story refs:** US-011 (DOB), US-043

#### Supabase Queries

```typescript
// Read profile
const { data: profile } = await supabase
  .from('user_profiles')
  .select('display_name, date_of_birth, base_currency, locale, age_confirmed_at')
  .eq('id', user.id)
  .single();
// RLS: user_profiles_own_all (Tier 1)
// Note: date_of_birth returned as masked string "••/••/1995" — server-side masking in Edge Function

// Update display name / base_currency
const { error } = await supabase
  .from('user_profiles')
  .update({
    display_name: newDisplayName,
    base_currency: newBaseCurrency,
    updated_at: new Date().toISOString(),
  })
  .eq('id', user.id);
// RLS: user_profiles_own_all WITH CHECK (Tier 1)
// base_currency change triggers re-aggregation of amount_base — see note below
```

**Important:** Changing `base_currency` does NOT retroactively convert existing `amount_base` values — this is a display preference change only. Historical `fx_rate_at_insert` values are locked forever.

#### React Query Keys

```typescript
['user-profile', userId]
```

#### Offline Behaviour

Display name edit queued if offline.

#### RLS Notes

- `user_profiles`: Tier 1.
- DOB is masked in the UI — "Contact support to update." DOB is Vault-encrypted; the plaintext is never returned to the client.

#### RevenueCat / Paywall

Not paywalled.

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Update error | "Couldn't save profile. Try again." toast |

---

### SCR-026 — Subscription

**Story refs:** US-044, US-046

#### Supabase Queries

```typescript
// Entitlement detail (for UI display — plan, renewal date, grace period)
const { data: entitlement } = await supabase
  .from('user_entitlements')
  .select('plan, valid_until, grace_until, store, revenuecat_customer_id')
  .eq('user_id', user.id)
  .single();
// RLS: user_entitlements_own_read (Tier 2)
```

#### Edge Functions / API Calls

```typescript
// RevenueCat: manage subscription (opens App Store / Play Store native flow)
import Purchases from 'react-native-purchases';
const customerInfo = await Purchases.getCustomerInfo();
// Trial days remaining
const trialEndsAt = customerInfo.entitlements.active['premium_annual']?.expirationDate;
```

#### React Query Keys

```typescript
['user-entitlement', userId]
```

#### Offline Behaviour

Cached entitlement shown. Cancellation requires network.

#### RLS Notes

- `user_entitlements`: Tier 2 — read-only for client.

#### RevenueCat / Paywall

This screen IS the subscription management screen. Shows paywall if plan = 'free' after trial.

#### Error Handling

| Error | User Sees |
|-------|-----------|
| RevenueCat SDK error | "Couldn't load subscription details. Check the App Store." |
| Cancellation flow fails | "Couldn't open subscription management. Go to [App Store / Play Store] directly." |
| During grace period | "Your subscription has ended. Access continues until [grace_until date]." banner |

---

### SCR-027 — Budget Targets

**Story refs:** US-028

#### Supabase Queries

```typescript
// Read current budget targets
const { data: profile } = await supabase
  .from('user_profiles')
  .select('monthly_income, budget_needs_pct, budget_wants_pct, budget_savings_pct, weekly_spend_limit, base_currency')
  .eq('id', user.id)
  .single();
// RLS: user_profiles_own_all (Tier 1)

// Save budget targets
const { error } = await supabase
  .from('user_profiles')
  .update({
    monthly_income: incomeInSmallestUnit,  // bigint — paise/cents/pence
    budget_needs_pct: needsPct,            // numeric(5,2)
    budget_wants_pct: wantsPct,            // numeric(5,2)
    budget_savings_pct: savingsPct,        // numeric(5,2)
    weekly_spend_limit: weeklyLimitInSmallestUnit ?? null,  // bigint nullable
    updated_at: new Date().toISOString(),
  })
  .eq('id', user.id);
// DB CHECK constraint: budget_needs_pct + budget_wants_pct + budget_savings_pct = 100
// RLS: user_profiles_own_all WITH CHECK (Tier 1)
```

#### React Query Keys

```typescript
['user-profile', userId]
['budget-ring', userId, currentMonth]   // invalidated after budget change
```

#### Offline Behaviour

Reads from cache. Save queued if offline.

#### RLS Notes

- `user_profiles`: Tier 1.
- Server-side `CHECK` constraint on the three budget columns enforces sum = 100.

#### RevenueCat / Paywall

Not paywalled.

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Percentages don't sum to 100 | "Save" disabled; "Budget percentages must add up to 100%." inline error |
| Income negative | Inline validation error |
| Save error | "Couldn't save budget settings. Try again." toast |

---

### SCR-028 — Custom Categories

**Story refs:** US-020

#### Supabase Queries

```typescript
// All categories (own + system)
const { data: categories } = await supabase
  .from('categories')
  .select('id, name, default_type, icon, colour_hex, is_archived, user_id')
  .or(`user_id.eq.${user.id},user_id.is.null`)
  .order('user_id', { ascending: true, nullsFirst: true })  // system first
  .order('name', { ascending: true });
// RLS: categories_read_own_and_system (Tier 3)

// Add custom category
const { error } = await supabase
  .from('categories')
  .insert({
    user_id: user.id,
    name: categoryName,
    default_type: selectedType,   // 'need' | 'want' | 'saving'
    icon: selectedIcon,
    colour_hex: selectedColour,
    is_archived: false,
  });
// RLS: categories_write_own WITH CHECK (user_id = auth.uid()) (Tier 3)

// Archive category (soft-delete)
const { error } = await supabase
  .from('categories')
  .update({ is_archived: true })
  .eq('id', categoryId)
  .eq('user_id', user.id);  // system categories (user_id IS NULL) cannot be archived — RLS blocks
```

#### React Query Keys

```typescript
['categories', userId]
```

#### Offline Behaviour

Add/archive queued if offline.

#### RLS Notes

- `categories`: Tier 3.
- System defaults (`user_id IS NULL`) are blocked from modification by `categories_write_own` policy (`USING (user_id = auth.uid())` — NULL does not equal any uid).

#### RevenueCat / Paywall

Not paywalled.

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Attempt to modify system category | "System categories cannot be edited." (UI prevents action; RLS is backstop) |
| Duplicate name | "A category with this name already exists." |
| Insert error | "Couldn't add category. Try again." toast |

---

### SCR-029 — Manage Banks / Connections

**Story refs:** US-012, US-021, US-022, US-023  
**Entry:** Settings → Banks & Connections.

Technical queries are identical to SCR-017 (Accounts List) plus SCR-004 / SCR-019 for adding/reconnecting banks. This screen focuses on connection management (token expiry warnings, re-consent CTAs, disconnect) rather than net worth display.

See SCR-017 and SCR-018 for query patterns.

---

### SCR-030 — Notification Preferences

**Story refs:** US-042

#### Supabase Queries

```typescript
// Notification preferences stored in user_profiles (or dedicated JSONB column)
// These are simple boolean flags — stored as a JSONB column in user_profiles
// (not a separate table in MVP schema — stored as part of profile update)
const { error } = await supabase
  .from('user_profiles')
  .update({
    // notification_prefs JSONB column (extend schema if needed)
    notification_prefs: {
      new_transaction: notifNewTransaction,
      review_needed: notifReviewNeeded,
      budget_alert: notifBudgetAlert,
      weekly_summary: notifWeeklySummary,
      bank_re_consent: notifBankReConsent,
      bank_error: notifBankError,
    },
    updated_at: new Date().toISOString(),
  })
  .eq('id', user.id);
// RLS: user_profiles_own_all WITH CHECK (Tier 1)
```

#### React Query Keys

```typescript
['notification-prefs', userId]
```

#### Offline Behaviour

Preference toggles update optimistically; sync on reconnect.

#### RLS Notes

- `user_profiles`: Tier 1.

#### RevenueCat / Paywall

Not paywalled.

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Save error | "Couldn't save notification preferences." toast (non-blocking — toggle reverts) |
| Push permission denied by OS | "Notifications are blocked. Enable in phone Settings." banner with deep link |

---

### SCR-031 — Privacy Controls

**Story refs:** US-043

#### Supabase Queries

```typescript
// Trigger GDPR data export (async — Edge Function queues the job)
const response = await fetch(`${SUPABASE_URL}/functions/v1/gdpr-export-request`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${session.access_token}` },
});
// Edge Function: inserts into audit_log (action = 'data_export_requested'),
// triggers async JSON export job, emails result within 24h
// Returns: { job_id: string, estimated_delivery: '2026-05-14T10:00:00Z' }

// Trigger account deletion (2-step — this is step 2: confirmed delete)
const response = await fetch(`${SUPABASE_URL}/functions/v1/account-delete`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${session.access_token}` },
  body: JSON.stringify({ confirmation: 'DELETE_MY_ACCOUNT' }),
});
// Edge Function: cascade wipe all user data, writes audit_log (action = 'account_deleted'),
// sends confirmation email, signs user out
// Returns: 200 { message: 'Account deletion queued — completed within 30 days.' }
```

#### Edge Functions / API Calls

- `POST /functions/v1/gdpr-export-request` — queues async data export.
- `POST /functions/v1/account-delete` — cascades all user data deletion (GDPR Article 17, 30-day SLA).

#### React Query Keys

None — these are imperative actions, not cached queries.

#### Offline Behaviour

Export request and account deletion require network.

#### RLS Notes

- Writes to `audit_log` are done by Edge Function using the service key (Tier 4 — no client access).
- Account deletion: Edge Function performs cascade delete with service key; RLS not the blocker here.

#### RevenueCat / Paywall

Not paywalled.

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Export request error | "Couldn't request data export. Try again." retry |
| Delete confirmation mismatch | "Please type 'DELETE MY ACCOUNT' exactly." inline validation |
| Delete request error | "Couldn't process deletion. Contact support@fintrack.app." |
| Network error | "No internet connection." toast |

---

### SCR-032 — Paywall

**Story refs:** US-046 (Free Trial & Paywall)  
**Entry:** Any screen that checks entitlement and finds `entitlement !== 'premium_annual'` after trial.

#### Supabase Queries

```typescript
// Entitlement check from JWT (zero DB query)
const entitlement = session?.user?.app_metadata?.entitlement as string | undefined;
// 'premium_annual' = active subscriber
// 'free' = trial expired or cancelled past grace period

// Display grace period info (supplementary — from user_entitlements table)
const { data: entitlementRecord } = await supabase
  .from('user_entitlements')
  .select('plan, valid_until, grace_until')
  .eq('user_id', user.id)
  .single();
// RLS: user_entitlements_own_read (Tier 2)
```

#### Edge Functions / API Calls

```typescript
// RevenueCat: initiate purchase
import Purchases, { PurchasesPackage } from 'react-native-purchases';
const offerings = await Purchases.getOfferings();
const premiumPackage: PurchasesPackage = offerings.current!.annual;

const { customerInfo } = await Purchases.purchasePackage(premiumPackage);
// On success: RevenueCat webhook fires → Edge Function updates app_metadata.entitlement
// JWT refresh: client polls Supabase session.refreshSession() after ~60s to pick up new claim
```

#### React Query Keys

```typescript
['user-entitlement', userId]
```

#### Offline Behaviour

Paywall screen requires network. Purchase cannot be initiated offline.

#### RLS Notes

- `user_entitlements`: Tier 2 — read-only (UI display only).
- Primary entitlement check uses JWT claim — no DB query.

#### RevenueCat / Paywall

This screen IS the paywall. After successful purchase, user is navigated back to the previously blocked screen.

```typescript
// After purchase: wait for JWT to refresh (webhook → app_metadata → JWT)
// Max 60s until entitlement is reflected (JWT refresh cycle)
await supabase.auth.refreshSession();
const refreshedEntitlement = (await supabase.auth.getSession())
  .data.session?.user.app_metadata?.entitlement;
```

#### Error Handling

| Error | User Sees |
|-------|-----------|
| Purchase cancelled by user | Returns to paywall; no error |
| Purchase failed (payment declined) | "Payment failed. Check your payment method." (App Store / Play Store native error) |
| RevenueCat 5xx | "Purchase failed. Try again." retry |
| Network error | "No internet connection. Connect to subscribe." |
| JWT not updated after 90s | "Subscription activated! Restart the app if features are still locked." banner |

---

*End of per-screen technical reference — SCR-001 through SCR-032.*
