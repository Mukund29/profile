# FinTrack — End-to-End Developer Guide

**Date:** 2026-05-13  
**Author:** Paige (Senior Technical Writer)  
**Status:** SHIP — matched to Architecture v4, Data Model, RLS Policies, Epics & Stories  
**Stack:** Expo SDK 52 · React Native · Supabase (PostgreSQL 15) · FastAPI (Railway) · RevenueCat

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Setup](#2-environment-setup)
3. [Database Setup](#3-database-setup)
4. [Running Locally](#4-running-locally)
5. [Key Architecture Patterns](#5-key-architecture-patterns)
6. [pg_cron Job Registration](#6-pg_cron-job-registration)
7. [RevenueCat Webhook Setup](#7-revenuecat-webhook-setup)
8. [Bank Integration Setup](#8-bank-integration-setup)
9. [Deployment](#9-deployment)
10. [Testing](#10-testing)
11. [Monitoring & Alerts](#11-monitoring--alerts)

---

## 1. Prerequisites

### Runtime & CLI Tools

| Tool | Minimum Version | Install |
|------|----------------|---------|
| Node.js | 20.x LTS | https://nodejs.org |
| Bun (preferred) or npm | 1.1+ / 10.x | `curl -fsSL https://bun.sh/install | bash` |
| Expo CLI | Latest | `bun add -g expo-cli` |
| EAS CLI | Latest | `bun add -g eas-cli` |
| Supabase CLI | 1.170+ | `brew install supabase/tap/supabase` |
| Railway CLI | Latest | `npm install -g @railway/cli` |
| Python | 3.12 | https://python.org (FastAPI service) |
| uv (Python package manager) | Latest | `pip install uv` |
| Git | 2.40+ | Included on macOS via Xcode tools |

### iOS Development (macOS only)

- Xcode 16+ installed from App Store
- `xcode-select --install` (command-line tools)
- An Apple Developer account (free for simulator, paid for TestFlight/App Store)

### Android Development

- Android Studio Ladybug (2024.2+)
- Android SDK Platform 35 (API 35)
- ANDROID_HOME environment variable set

### Accounts Required

- Supabase account (https://supabase.com)
- Railway account (https://railway.app)
- Expo account (https://expo.dev)
- RevenueCat account (https://revenuecat.com)
- Plaid account (sandbox free — https://plaid.com)
- TrueLayer account (https://truelayer.com)
- Setu account (https://setu.co)
- Open Exchange Rates account (free tier — https://openexchangerates.org)
- PostHog account (https://posthog.com)
- Sentry account (https://sentry.io)

---

## 2. Environment Setup

### 2.1 Expo App Environment Variables

Create `.env.local` in the project root. This file is in `.gitignore` — never commit it.

```bash
# Supabase — Global project (us-east-1) for US and UK users
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Supabase — India project (ap-south-1) for RBI compliance
# Routing logic: device locale 'en-IN' or phone prefix +91 → use India project
EXPO_PUBLIC_SUPABASE_IN_URL=https://<india-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_IN_ANON_KEY=eyJ...

# RevenueCat
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_...

# Plaid (switch between sandbox/development/production)
EXPO_PUBLIC_PLAID_ENV=sandbox           # 'sandbox' | 'development' | 'production'
EXPO_PUBLIC_PLAID_PUBLIC_KEY=...        # deprecated; use link_token flow only

# TrueLayer
EXPO_PUBLIC_TRUELAYER_CLIENT_ID=...
EXPO_PUBLIC_TRUELAYER_ENV=sandbox       # 'sandbox' | 'live'
EXPO_PUBLIC_TRUELAYER_REDIRECT_URI=fintrack://truelayer/callback

# Setu Account Aggregator
EXPO_PUBLIC_SETU_AA_ENV=sandbox         # 'sandbox' | 'production'
EXPO_PUBLIC_SETU_REDIRECT_URL=fintrack://setu/callback

# PostHog
EXPO_PUBLIC_POSTHOG_API_KEY=phc_...
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry
EXPO_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# Feature flags
EXPO_PUBLIC_ENABLE_SMS_PARSING=true      # Android only
EXPO_PUBLIC_ENABLE_EMAIL_PARSING=true
```

> **Rule:** All Expo public env vars must be prefixed `EXPO_PUBLIC_` to be accessible in the React Native bundle. Server-side secrets (Supabase service key, Plaid secret) must NEVER use this prefix — they live in Railway and Supabase Edge Function secrets only.

### 2.2 Supabase Project Setup

FinTrack runs **two Supabase projects** for RBI India data localisation:

| Project | Region | Users |
|---------|--------|-------|
| `fintrack-global` | `us-east-1` | US, UK, and all non-India users |
| `fintrack-india` | `ap-south-1` | Users with locale `en-IN` or phone prefix `+91` |

Both projects run identical schemas. India routing happens at app startup:

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as Localization from 'expo-localization';
import type { Database } from '@/types/supabase.generated';

const isIndiaUser = (): boolean => {
  const locale = Localization.getLocales()[0]?.languageTag ?? '';
  return locale.startsWith('en-IN') || locale === 'hi-IN';
};

export const supabase = createClient<Database>(
  isIndiaUser()
    ? process.env.EXPO_PUBLIC_SUPABASE_IN_URL!
    : process.env.EXPO_PUBLIC_SUPABASE_URL!,
  isIndiaUser()
    ? process.env.EXPO_PUBLIC_SUPABASE_IN_ANON_KEY!
    : process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,    // defined below
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

**Create both Supabase projects** in the Supabase dashboard before running migrations.

### 2.3 FastAPI (Railway) Environment Variables

Set these in the Railway dashboard → Variables:

```bash
# Supabase service key — bypasses RLS (FastAPI uses fintrack_parser role in practice)
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_KEY=eyJ...              # NEVER expose to client

# India Supabase project (FastAPI parses for all regions)
SUPABASE_IN_URL=https://<india-ref>.supabase.co
SUPABASE_IN_SERVICE_KEY=eyJ...

# fintrack_parser role credentials (preferred over service key)
PARSER_DB_URL=postgresql://fintrack_parser:<password>@db.<project-ref>.supabase.co:5432/postgres

# Open Exchange Rates
OXR_APP_ID=<open-exchange-rates-app-id>

# Gmail OAuth (for email parsing)
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...

# Plaid (for webhook verification)
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=sandbox

# TrueLayer (webhook verification)
TRUELAYER_CLIENT_ID=...
TRUELAYER_CLIENT_SECRET=...

# Internal secret for health-check endpoint auth
HEALTH_CHECK_SECRET=<random-32-char-string>
```

### 2.4 Supabase Edge Function Secrets

Set these via the Supabase CLI (not in source control):

```bash
supabase secrets set \
  RC_WEBHOOK_SECRET=<revenuecat-shared-secret> \
  PLAID_WEBHOOK_SECRET=<plaid-webhook-verification-key> \
  TRUELAYER_WEBHOOK_SECRET=<truelayer-hmac-secret> \
  OXR_APP_ID=<open-exchange-rates-app-id> \
  SETU_AA_CLIENT_ID=<setu-client-id> \
  SETU_AA_CLIENT_SECRET=<setu-client-secret> \
  GDRIVE_CLIENT_ID=<google-drive-client-id> \
  GDRIVE_CLIENT_SECRET=<google-drive-client-secret> \
  GMAIL_CLIENT_ID=<gmail-oauth-client-id> \
  GMAIL_CLIENT_SECRET=<gmail-oauth-client-secret> \
  PLAID_CLIENT_ID=<plaid-client-id> \
  PLAID_SECRET=<plaid-secret> \
  TRUELAYER_CLIENT_ID=<truelayer-client-id> \
  TRUELAYER_CLIENT_SECRET=<truelayer-client-secret>
```

---

## 3. Database Setup

### 3.1 Run Migrations in Order

Migrations live in `supabase/migrations/`. Apply them in filename order:

```bash
# Local Supabase instance
supabase start
supabase db push

# Or push directly to hosted project
supabase db push --db-url "postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"
```

**Migration file sequence:**

| File | Contents |
|------|----------|
| `20260513000000_initial_schema.sql` | All 12 tables, indexes, constraints |
| `20260513000001_rls_policies.sql` | All RLS policies, `bank_connections_safe` view, `fintrack_parser` role |
| `20260513000002_triggers.sql` | `trg_goal_amount` trigger for Goals auto-update |
| `20260513000003_pg_cron_jobs.sql` | Register all 8 pg_cron scheduled jobs |
| `20260513000004_seed_categories.sql` | 5 system default categories |

> Run migrations on BOTH Supabase projects (global + India).

### 3.2 Create the `fintrack_parser` Role

The `fintrack_parser` role is created in `20260513000001_rls_policies.sql`. Verify it exists after migration:

```sql
-- Verification query (run in Supabase SQL editor)
SELECT rolname, rolcanlogin FROM pg_roles WHERE rolname = 'fintrack_parser';
-- Expected: rolname = 'fintrack_parser', rolcanlogin = true

-- Set a password for the role (do this once after migration)
ALTER ROLE fintrack_parser PASSWORD '<secure-random-password>';

-- Confirm grants
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'fintrack_parser'
ORDER BY table_name, privilege_type;
-- Expected: INSERT on transactions, SELECT/UPDATE on parse_queue, INSERT on parse_failed
```

### 3.3 Enable Extensions

Run in Supabase SQL editor (both projects):

```sql
-- pg_cron: scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- pgcrypto: SHA-256 for dedup_hash
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Supabase Vault (should already be enabled on Pro plan — verify)
SELECT vault.create_secret('test', 'test_value');  -- succeeds if Vault is ready
DELETE FROM vault.secrets WHERE name = 'test';     -- clean up
```

### 3.4 Configure Supabase Vault

Vault is used for two column types: bank `access_token` and user `date_of_birth`.

```sql
-- Vault is configured at the schema level by Supabase — no additional setup needed on Pro.
-- Verify Vault is accessible:
SELECT * FROM vault.secrets LIMIT 1;

-- The Edge Functions that write bank tokens call vault.create_secret() / vault.update_secret()
-- and store the returned secret_id in bank_connections.access_token (not the token itself).
-- The DOB column uses a dedicated Vault secret per user, referenced by user_profiles.date_of_birth.
```

### 3.5 Seed Default Categories

```sql
-- supabase/migrations/20260513000004_seed_categories.sql
-- Idempotent: ON CONFLICT DO NOTHING
INSERT INTO public.categories (id, user_id, name, default_type, icon, colour_hex, is_archived)
VALUES
  ('00000000-0000-0000-0000-000000000001', NULL, 'Life Infrastructure',       'need',   '🏠', '#6366f1', false),
  ('00000000-0000-0000-0000-000000000002', NULL, 'Performance & Growth',      'need',   '📈', '#8b5cf6', false),
  ('00000000-0000-0000-0000-000000000003', NULL, 'Future Me',                 'saving', '💰', '#34d399', false),
  ('00000000-0000-0000-0000-000000000004', NULL, 'Relationships & Generosity','want',   '❤️', '#f472b6', false),
  ('00000000-0000-0000-0000-000000000005', NULL, 'Lifestyle Enjoyment',       'want',   '✨', '#fb923c', false)
ON CONFLICT (id) DO NOTHING;
```

### 3.6 Enable pg_cron and Register Jobs

See [Section 6](#6-pg_cron-job-registration) for the complete SQL. The migration file `20260513000003_pg_cron_jobs.sql` contains this SQL and runs automatically via `supabase db push`.

### 3.7 Generate TypeScript Types

After schema is applied, generate typed Supabase client:

```bash
supabase gen types typescript \
  --project-id <project-ref> \
  --schema public \
  > types/supabase.generated.ts

# For India project
supabase gen types typescript \
  --project-id <india-project-ref> \
  --schema public \
  >> types/supabase.generated.ts
```

---

## 4. Running Locally

### 4.1 Mobile App (Expo)

```bash
# Install dependencies
bun install

# Start local Expo dev server
npx expo start

# Run on iOS Simulator (macOS only)
npx expo run:ios

# Run on Android Emulator
npx expo run:android

# Run on physical device (scan QR code in Expo Go)
npx expo start --tunnel
```

### 4.2 FastAPI Parsing Service

```bash
cd services/parser

# Install Python dependencies (uv recommended)
uv venv
source .venv/bin/activate    # or .venv\Scripts\activate on Windows
uv pip install -r requirements.txt

# Copy environment variables
cp .env.example .env
# Edit .env with your local Supabase credentials

# Start FastAPI with hot-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Health check
curl http://localhost:8000/health
# Expected: {"status": "ok", "queue_depth": 0, "parser_version": "1.0.0"}
```

### 4.3 Supabase Local Stack

```bash
# Start local Supabase (Docker required)
supabase start

# Output includes:
#   API URL:    http://127.0.0.1:54321
#   Studio URL: http://127.0.0.1:54323
#   DB URL:     postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Apply migrations to local instance
supabase db push

# Reset local DB to clean state (re-runs all migrations + seeds)
supabase db reset

# Stop local Supabase
supabase stop
```

### 4.4 Environment Variable Switching

The project uses `expo-constants` to read env vars in code. For local development pointing at local Supabase:

```bash
# Override in .env.local for local dev
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # from `supabase start` output
```

---

## 5. Key Architecture Patterns

### 5.1 Monetary Amounts — Always Bigint, Never Float

All monetary values in the database and API are stored as **integers in the smallest currency unit**:

| Currency | Smallest unit | Example |
|----------|--------------|---------|
| INR | Paise (1 INR = 100 paise) | ₹1,500.50 → `150050` |
| USD | Cents (1 USD = 100 cents) | $29.99 → `2999` |
| GBP | Pence (1 GBP = 100 pence) | £14.99 → `1499` |

**Display formatting — use dinero.js only:**

```typescript
import { Dinero, dinero, toDecimal } from 'dinero.js';
import { INR, USD, GBP } from '@dinero.js/currencies';

const CURRENCIES = { INR, USD, GBP };

function formatAmount(amountInSmallestUnit: number, currencyCode: 'INR' | 'USD' | 'GBP'): string {
  const currency = CURRENCIES[currencyCode];
  const d = dinero({ amount: amountInSmallestUnit, currency });
  return toDecimal(d, ({ value, currency: c }) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: c.code,
    }).format(Number(value))
  );
}

// Example
formatAmount(150050, 'INR');  // "₹1,500.50"
formatAmount(2999, 'USD');    // "$29.99"
```

**Conversion from user input to storage:**

```typescript
function toSmallestUnit(displayAmount: string, currencyCode: 'INR' | 'USD' | 'GBP'): number {
  const parsed = parseFloat(displayAmount.replace(/[^0-9.]/g, ''));
  if (isNaN(parsed)) throw new Error('Invalid amount');
  return Math.round(parsed * 100);  // always round — never store fractional paise/cents
}
```

**Rules:**
- Never use `parseFloat` without `Math.round` immediately after.
- Never store amounts in JavaScript `number` type without validating they fit in a 32-bit integer.
- Never use `*` or `/` directly on stored amounts — use dinero.js arithmetic.

### 5.2 RLS — Every Table Locked Down

All 12 user-data tables have RLS enabled. The complete policy definitions are in `supabase/migrations/20260513000001_rls_policies.sql`.

**Policy tiers:**

| Tier | Tables | Client Access |
|------|--------|--------------|
| 1 — Full user R/W | `user_profiles`, `bank_connections`, `transactions`, `goals` | Read + Write own rows |
| 2 — User read-only | `user_entitlements`, `weekly_summaries`, `monthly_summaries`, `balance_history`, `parse_queue` | Read own rows only |
| 3 — Shared read + own write | `categories` | Read own + system; Write own only |
| 4 — No client access | `audit_log`, `parse_failed` | None — service key only |
| 5 — Global read | `fx_rates` | Read all rows; no writes |

**Critical:** Clients must NEVER query `bank_connections` directly. Always use `bank_connections_safe`:

```typescript
// CORRECT
const { data } = await supabase
  .from('bank_connections_safe')
  .select('id, institution_name, balance_amount, status')
  .eq('user_id', user.id);

// WRONG — access_token ciphertext would be returned
const { data } = await supabase
  .from('bank_connections')
  .select('*');
```

**WITH CHECK is mandatory on all write policies.** Without it, a client could insert a row with an arbitrary `user_id` (privilege escalation):

```sql
-- Correct: both USING and WITH CHECK
CREATE POLICY "transactions_own_all" ON transactions FOR ALL
USING     (auth.uid() = user_id)
WITH CHECK(auth.uid() = user_id);
```

### 5.3 JWT Entitlement — Zero DB Lookup

RevenueCat subscription status is embedded in the Supabase JWT via `app_metadata.entitlement`. Edge Functions and the mobile app read this claim without any database query:

```typescript
// Mobile app — read entitlement from decoded JWT
import { useSession } from '@/hooks/useSession';

function useEntitlement(): 'premium_annual' | 'free' {
  const { session } = useSession();
  return (session?.user?.app_metadata?.entitlement as 'premium_annual' | 'free') ?? 'free';
}

// Edge Function (Deno) — read entitlement from JWT
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const { data: { user } } = await supabase.auth.getUser(jwt);
const entitlement = user?.app_metadata?.entitlement ?? 'free';
```

**Properties:**
- JWT refreshes every 1 hour — max 60-minute exposure window after cancellation.
- Works during Supabase DB outages (JWT is self-contained).
- 7-day grace period: `user_entitlements.grace_until = valid_until + 7 days`.

### 5.4 Offline Queue — SQLite (SQLCipher)

Manual transactions and other mutations are queued locally when offline:

```typescript
// lib/offline-queue.ts
import * as SQLite from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';

const DB_NAME = 'fintrack_offline.db';

type QueueItem = {
  type: 'transaction_insert' | 'transaction_update' | 'transaction_delete' | 'balance_refresh';
  payload: string;  // JSON stringified
  created_at: number;  // Unix ms
};

export async function enqueueOffline(item: Omit<QueueItem, 'created_at'>): Promise<void> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.runAsync(
    `INSERT INTO offline_queue (type, payload, created_at) VALUES (?, ?, ?)`,
    [item.type, item.payload, Date.now()]
  );
}

export async function drainOfflineQueue(supabase: ReturnType<typeof createClient>): Promise<void> {
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) return;

  const db = await SQLite.openDatabaseAsync(DB_NAME);
  const items = await db.getAllAsync<QueueItem>(
    `SELECT * FROM offline_queue ORDER BY created_at ASC LIMIT 50`
  );

  for (const item of items) {
    try {
      const payload = JSON.parse(item.payload);
      if (item.type === 'transaction_insert') {
        const { error } = await supabase.from('transactions').insert(payload);
        if (error && error.code !== '23505') throw error;  // 23505 = dedup conflict = OK
      }
      // Remove from queue after successful sync
      await db.runAsync(`DELETE FROM offline_queue WHERE created_at = ?`, [item.created_at]);
    } catch (err) {
      // Log and continue — don't block the rest of the queue
      console.error('Offline queue drain error:', err);
    }
  }
}

// Call drainOfflineQueue() in NetInfo subscription
NetInfo.addEventListener(state => {
  if (state.isConnected) drainOfflineQueue(supabase);
});
```

**Queue limits:** 500 items max. Oldest item discarded when full; user notified.

### 5.5 Deduplication

Two dedup mechanisms protect against duplicate transactions:

**Provider transactions (Plaid / TrueLayer / Setu AA):**

```sql
-- UNIQUE constraint in schema
UNIQUE (provider_txn_id) NULLS NOT DISTINCT
-- On conflict: UPDATE the existing row (not duplicate insert)
```

```typescript
// In FastAPI parser (Python)
# Handle as upsert — update existing row on provider_txn_id conflict
result = supabase_client.table('transactions').upsert(
    txn_data,
    on_conflict='provider_txn_id'
).execute()
```

**SMS / email parsed transactions:**

```typescript
// Compute dedup_hash before INSERT
import { createHash } from 'expo-crypto';

function computeDedupHash(params: {
  amount: number;       // smallest unit
  merchantNormalized: string;
  timestampBucket: number;   // floor(unix_ms / 1_800_000) * 1_800_000 — 30-min window
  currency: string;
}): string {
  const raw = `${params.amount}:${params.merchantNormalized}:${params.timestampBucket}:${params.currency}`;
  return createHash('sha256', raw);
}

// ±30-minute bucket — avoids midnight boundary bug
const timestampBucket = Math.floor(Date.now() / 1_800_000) * 1_800_000;
```

**Conflict resolution:** Bank API source wins over SMS/email parse. The `ON CONFLICT (dedup_hash) DO NOTHING` upsert on FastAPI inserts is intentional for SMS/email — if Plaid already wrote the row, the SMS parse is silently discarded.

### 5.6 Certificate Pinning (SPKI)

Pin to Supabase's Subject Public Key Info (SPKI) hash — **not** the leaf certificate. Leaf cert pinning breaks on every Supabase TLS rotation.

```typescript
// lib/ssl-pinning.ts
import { fetch as pinnedFetch } from 'react-native-ssl-pinning';

// SPKI hashes: current + one backup (rotate backup before current expires)
const SUPABASE_SPKI_HASHES = [
  'sha256/<current-spki-base64-hash>',
  'sha256/<next-expected-spki-base64-hash>',
];

export async function secureSupabaseFetch(url: string, options: RequestInit): Promise<Response> {
  return pinnedFetch(url, {
    ...options,
    sslPinning: {
      certs: SUPABASE_SPKI_HASHES,
    },
  });
}
```

**How to extract the SPKI hash:**

```bash
openssl s_client -connect <project-ref>.supabase.co:443 -servername <project-ref>.supabase.co \
  < /dev/null 2>/dev/null \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform DER \
  | openssl dgst -sha256 -binary \
  | base64
```

Store the output in `SUPABASE_SPKI_HASHES`. Repeat when Supabase rotates their TLS key.

### 5.7 FX Rate Handling

FX rates are fetched every 2 hours by pg_cron and stored in `fx_rates`. The rate at transaction insert time is locked forever in `fx_rate_at_insert`.

```typescript
// Read latest FX rate for a currency pair
async function getLatestFxRate(
  base: string,
  quote: string,
  supabase: ReturnType<typeof createClient>
): Promise<number> {
  const { data, error } = await supabase
    .from('fx_rates')
    .select('rate, fetched_at')
    .eq('base', base)
    .eq('quote', quote)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    // Fallback: return 1.0 (no conversion) and show warning badge
    console.warn('FX rate unavailable — using 1.0 fallback');
    return 1.0;
  }

  // Warn if rate is stale (> 4 hours old)
  const ageMs = Date.now() - new Date(data.fetched_at).getTime();
  if (ageMs > 4 * 60 * 60 * 1000) {
    console.warn('FX rate is stale — using cached rate from', data.fetched_at);
  }

  return data.rate;
}

// Compute amount_base when saving a transaction
// Open Exchange Rates uses USD as base — all rates are USD→X
function convertToBaseCurrency(params: {
  amountInSmallestUnit: number;
  fromCurrency: string;
  toCurrency: string;
  usdToFromRate: number;    // fx_rates WHERE base='USD' AND quote=fromCurrency
  usdToToRate: number;      // fx_rates WHERE base='USD' AND quote=toCurrency
}): number {
  // Convert via USD: fromCurrency → USD → toCurrency
  const amountUsd = params.amountInSmallestUnit / params.usdToFromRate;
  return Math.round(amountUsd * params.usdToToRate);
}
```

**Monthly API calls:** 12 calls/day × 31 days = 372/month (well within 1,000/month free tier).

### 5.8 parse_queue Throughput

The FastAPI parser polls `parse_queue` every 30 seconds in batches of 50:

```
Throughput math:
  1,000 users × 30 transactions/day = 30,000 transactions/day
  = 1,250/hour = ~21/minute
  Batch-50 at 30s intervals = 100/minute capacity
  Headroom to ~7,000 users before needing Redis + Celery
```

**FastAPI polling loop:**

```python
# services/parser/main.py
import asyncio
from supabase import create_client, Client

BATCH_SIZE = 50
POLL_INTERVAL_SECONDS = 30

async def poll_parse_queue(supabase: Client) -> None:
    while True:
        try:
            # Fetch pending batch — SKIP LOCKED prevents double-processing
            result = supabase.table('parse_queue').select('*').eq(
                'status', 'pending'
            ).order('created_at').limit(BATCH_SIZE).execute()

            items = result.data or []

            if items:
                # Mark as processing
                ids = [item['id'] for item in items]
                supabase.table('parse_queue').update(
                    {'status': 'processing'}
                ).in_('id', ids).execute()

                # Process each item
                for item in items:
                    await process_queue_item(supabase, item)

        except Exception as e:
            logger.error(f'Queue poll error: {e}')

        await asyncio.sleep(POLL_INTERVAL_SECONDS)

async def process_queue_item(supabase: Client, item: dict) -> None:
    try:
        parsed = parse_text(item['raw_text'], item['source_type'])  # on-device → already structured
        txn_data = {
            'user_id': item['user_id'],
            'amount': parsed['amount'],
            'description': parsed['merchant'],
            'merchant_normalized': parsed['merchant'].lower().strip(),
            'txn_date': parsed['date'],
            'currency': parsed['currency'],
            'source': item['source_type'],
            'is_confirmed': False,
            'dedup_hash': compute_dedup_hash(parsed),
        }
        # Insert — treat dedup conflict (23505) as success
        result = supabase.table('transactions').insert(txn_data).execute()
        supabase.table('parse_queue').update(
            {'status': 'processed', 'processed_at': 'now()'}
        ).eq('id', item['id']).execute()

    except Exception as e:
        retry_count = item.get('retry_count', 0)
        if retry_count >= 3:
            # Move to dead letter queue
            supabase.table('parse_failed').insert({
                'user_id': item['user_id'],
                'source_type': item['source_type'],
                'error_message': str(e),
                'failed_at': 'now()',
                # raw_text intentionally omitted — PII policy
            }).execute()
            supabase.table('parse_queue').update(
                {'status': 'failed'}
            ).eq('id', item['id']).execute()
        else:
            supabase.table('parse_queue').update(
                {'retry_count': retry_count + 1, 'status': 'pending'}
            ).eq('id', item['id']).execute()
```

**CRITICAL — handle PostgreSQL error code 23505 as success** (dedup constraint violation = duplicate = expected, not an error):

```python
from postgrest import APIError

try:
    result = supabase.table('transactions').insert(txn_data).execute()
except APIError as e:
    if e.code == '23505':  # unique_violation — dedup conflict
        # This is OK — the transaction already exists from a faster source
        logger.info(f'Dedup conflict for user {txn_data["user_id"]} — transaction already exists')
    else:
        raise
```

---

## 6. pg_cron Job Registration

Run this SQL once on both Supabase projects. The migration file `20260513000003_pg_cron_jobs.sql` contains this SQL.

```sql
-- =============================================================================
-- FinTrack — pg_cron Job Registration
-- All 8 scheduled jobs (run on both global and India Supabase projects)
-- =============================================================================

-- Prerequisite: pg_cron extension must be enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing jobs to make this idempotent
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN (
  'balance-refresh',
  'token-expiry-check',
  'fx-rate-refresh',
  'weekly-summaries',
  'monthly-summaries',
  'parse-queue-cleanup',
  'setu-re-consent-alerts',
  'setu-aa-pull'
);


-- Job 1: Balance Refresh — daily at 06:00 UTC
-- Refreshes all active bank balances (staggered 50/hr, 2s delay to prevent Plaid thundering herd)
SELECT cron.schedule(
  'balance-refresh',
  '0 6 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/balance-refresh-trigger',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
    INSERT INTO cron_health (job_name, ran_at, status, rows_affected)
    VALUES ('balance-refresh', NOW(), 'triggered', 1);
  $$
);


-- Job 2: Token Expiry Check — daily at 07:00 UTC
-- Alerts users 7 days before Plaid/TrueLayer token expires; refreshes tokens where possible
SELECT cron.schedule(
  'token-expiry-check',
  '0 7 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/token-expiry-check',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
    INSERT INTO cron_health (job_name, ran_at, status, rows_affected)
    VALUES ('token-expiry-check', NOW(), 'triggered', 1);
  $$
);


-- Job 3: FX Rate Refresh — every 2 hours
-- Fetches all USD base pairs (INR, GBP, EUR, etc.) in a single Open Exchange Rates API call
-- 12 calls/day × 31 days = 372 calls/month (free tier: 1,000/month)
SELECT cron.schedule(
  'fx-rate-refresh',
  '0 */2 * * *',
  $$
    WITH latest_rates AS (
      SELECT
        'USD' AS base,
        key AS quote,
        value::numeric(18,8) AS rate,
        NOW() AS fetched_at
      FROM jsonb_each_text(
        (SELECT response_body::jsonb -> 'rates'
         FROM net.http_get(
           url := 'https://openexchangerates.org/api/latest.json?app_id=' ||
                  current_setting('app.oxr_app_id') || '&symbols=INR,GBP,EUR,CAD,AUD,SGD,AED'
         ))
      )
    )
    INSERT INTO fx_rates (id, base, quote, rate, fetched_at)
    SELECT gen_random_uuid(), base, quote, rate, fetched_at FROM latest_rates
    ON CONFLICT (base, quote, fetched_at) DO NOTHING;

    INSERT INTO cron_health (job_name, ran_at, status, rows_affected)
    VALUES ('fx-rate-refresh', NOW(), 'ok',
            (SELECT COUNT(*) FROM fx_rates WHERE fetched_at >= NOW() - INTERVAL '5 minutes'));
  $$
);


-- Job 4: Weekly Summaries — every Monday at 08:00 UTC
-- Computes discipline scores for all users who had transactions in the prior week
SELECT cron.schedule(
  'weekly-summaries',
  '0 8 * * 1',
  $$
    INSERT INTO weekly_summaries (
      id, user_id, week_start, week_end,
      total_spend, needs_spend, wants_spend, savings_spend,
      weekly_limit, discipline_score, category_breakdown, computed_at
    )
    SELECT
      gen_random_uuid(),
      t.user_id,
      DATE_TRUNC('week', NOW() - INTERVAL '7 days')::date   AS week_start,
      DATE_TRUNC('week', NOW() - INTERVAL '7 days')::date + 6 AS week_end,
      COALESCE(SUM(t.amount_base), 0)                        AS total_spend,
      COALESCE(SUM(CASE WHEN t.txn_type = 'need'   THEN t.amount_base END), 0) AS needs_spend,
      COALESCE(SUM(CASE WHEN t.txn_type = 'want'   THEN t.amount_base END), 0) AS wants_spend,
      COALESCE(SUM(CASE WHEN t.txn_type = 'saving' THEN t.amount_base END), 0) AS savings_spend,
      p.weekly_spend_limit,
      GREATEST(0, LEAST(100,
        100 - (
          ABS(
            (COALESCE(SUM(CASE WHEN t.txn_type = 'need' THEN t.amount_base END), 0)::numeric /
             NULLIF(SUM(t.amount_base), 0) * 100) - p.budget_needs_pct
          ) * 0.5 +
          ABS(
            (COALESCE(SUM(CASE WHEN t.txn_type = 'want' THEN t.amount_base END), 0)::numeric /
             NULLIF(SUM(t.amount_base), 0) * 100) - p.budget_wants_pct
          ) * 0.3 +
          ABS(
            (COALESCE(SUM(CASE WHEN t.txn_type = 'saving' THEN t.amount_base END), 0)::numeric /
             NULLIF(SUM(t.amount_base), 0) * 100) - p.budget_savings_pct
          ) * 0.2
        ) * 2
      ))                                                     AS discipline_score,
      JSONB_OBJECT_AGG(
        t.category_id::text,
        COALESCE(SUM(t.amount_base), 0)
      ) FILTER (WHERE t.category_id IS NOT NULL)             AS category_breakdown,
      NOW()                                                  AS computed_at
    FROM transactions t
    JOIN user_profiles p ON p.id = t.user_id
    WHERE t.txn_date >= DATE_TRUNC('week', NOW() - INTERVAL '7 days')::date
      AND t.txn_date <= DATE_TRUNC('week', NOW() - INTERVAL '7 days')::date + 6
      AND t.is_confirmed = true
    GROUP BY t.user_id, p.weekly_spend_limit, p.budget_needs_pct, p.budget_wants_pct, p.budget_savings_pct
    ON CONFLICT (user_id, week_start) DO UPDATE
      SET total_spend = EXCLUDED.total_spend,
          needs_spend = EXCLUDED.needs_spend,
          wants_spend = EXCLUDED.wants_spend,
          savings_spend = EXCLUDED.savings_spend,
          discipline_score = EXCLUDED.discipline_score,
          category_breakdown = EXCLUDED.category_breakdown,
          computed_at = EXCLUDED.computed_at;

    INSERT INTO cron_health (job_name, ran_at, status, rows_affected)
    SELECT 'weekly-summaries', NOW(), 'ok', COUNT(*)
    FROM weekly_summaries
    WHERE computed_at >= NOW() - INTERVAL '5 minutes';
  $$
);


-- Job 5: Monthly Summaries — 1st of each month at 02:00 UTC
SELECT cron.schedule(
  'monthly-summaries',
  '0 2 1 * *',
  $$
    INSERT INTO monthly_summaries (
      id, user_id, month,
      total_spend, needs_spend, wants_spend, savings_spend,
      budget_needs, budget_wants, budget_savings,
      discipline_score, is_partial, daily_breakdown, category_breakdown, computed_at
    )
    SELECT
      gen_random_uuid(),
      t.user_id,
      DATE_TRUNC('month', NOW() - INTERVAL '1 month')::date AS month,
      COALESCE(SUM(t.amount_base), 0)                        AS total_spend,
      COALESCE(SUM(CASE WHEN t.txn_type = 'need'   THEN t.amount_base END), 0) AS needs_spend,
      COALESCE(SUM(CASE WHEN t.txn_type = 'want'   THEN t.amount_base END), 0) AS wants_spend,
      COALESCE(SUM(CASE WHEN t.txn_type = 'saving' THEN t.amount_base END), 0) AS savings_spend,
      ROUND(COALESCE(p.monthly_income, 0) * p.budget_needs_pct    / 100) AS budget_needs,
      ROUND(COALESCE(p.monthly_income, 0) * p.budget_wants_pct    / 100) AS budget_wants,
      ROUND(COALESCE(p.monthly_income, 0) * p.budget_savings_pct  / 100) AS budget_savings,
      GREATEST(0, LEAST(100,
        100 - (
          ABS(
            (COALESCE(SUM(CASE WHEN t.txn_type = 'need' THEN t.amount_base END), 0)::numeric /
             NULLIF(SUM(t.amount_base), 0) * 100) - p.budget_needs_pct
          ) * 0.5 +
          ABS(
            (COALESCE(SUM(CASE WHEN t.txn_type = 'want' THEN t.amount_base END), 0)::numeric /
             NULLIF(SUM(t.amount_base), 0) * 100) - p.budget_wants_pct
          ) * 0.3 +
          ABS(
            (COALESCE(SUM(CASE WHEN t.txn_type = 'saving' THEN t.amount_base END), 0)::numeric /
             NULLIF(SUM(t.amount_base), 0) * 100) - p.budget_savings_pct
          ) * 0.2
        ) * 2
      ))                                                     AS discipline_score,
      EXISTS (
        SELECT 1 FROM bank_connections bc
        WHERE bc.user_id = t.user_id
          AND bc.tracking_from >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
      )                                                      AS is_partial,
      JSONB_OBJECT_AGG(
        t.txn_date::text,
        day_totals.day_amount
      )                                                      AS daily_breakdown,
      JSONB_OBJECT_AGG(
        t.category_id::text,
        COALESCE(SUM(t.amount_base), 0)
      ) FILTER (WHERE t.category_id IS NOT NULL)             AS category_breakdown,
      NOW()                                                  AS computed_at
    FROM transactions t
    JOIN user_profiles p ON p.id = t.user_id
    JOIN (
      SELECT user_id, txn_date,
             SUM(amount_base) AS day_amount
      FROM transactions
      WHERE txn_date >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')::date
        AND txn_date < DATE_TRUNC('month', NOW())::date
        AND is_confirmed = true
      GROUP BY user_id, txn_date
    ) day_totals ON day_totals.user_id = t.user_id AND day_totals.txn_date = t.txn_date
    WHERE t.txn_date >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')::date
      AND t.txn_date < DATE_TRUNC('month', NOW())::date
      AND t.is_confirmed = true
    GROUP BY t.user_id, p.monthly_income, p.budget_needs_pct, p.budget_wants_pct, p.budget_savings_pct
    ON CONFLICT (user_id, month) DO UPDATE
      SET total_spend       = EXCLUDED.total_spend,
          needs_spend       = EXCLUDED.needs_spend,
          wants_spend       = EXCLUDED.wants_spend,
          savings_spend     = EXCLUDED.savings_spend,
          discipline_score  = EXCLUDED.discipline_score,
          is_partial        = EXCLUDED.is_partial,
          daily_breakdown   = EXCLUDED.daily_breakdown,
          category_breakdown = EXCLUDED.category_breakdown,
          computed_at       = EXCLUDED.computed_at;

    INSERT INTO cron_health (job_name, ran_at, status, rows_affected)
    SELECT 'monthly-summaries', NOW(), 'ok', COUNT(*)
    FROM monthly_summaries
    WHERE computed_at >= NOW() - INTERVAL '5 minutes';
  $$
);


-- Job 6: parse_queue Cleanup — daily at 03:00 UTC
-- Deletes processed rows older than 30 days; parse_failed rows older than 90 days
SELECT cron.schedule(
  'parse-queue-cleanup',
  '0 3 * * *',
  $$
    WITH deleted_queue AS (
      DELETE FROM parse_queue
      WHERE status = 'processed'
        AND processed_at < NOW() - INTERVAL '30 days'
      RETURNING id
    ),
    deleted_failed AS (
      DELETE FROM parse_failed
      WHERE failed_at < NOW() - INTERVAL '90 days'
      RETURNING id
    ),
    deleted_balance AS (
      DELETE FROM balance_history
      WHERE recorded_at < NOW() - INTERVAL '90 days'
      RETURNING id
    )
    INSERT INTO cron_health (job_name, ran_at, status, rows_affected)
    VALUES (
      'parse-queue-cleanup',
      NOW(),
      'ok',
      (SELECT COUNT(*) FROM deleted_queue) +
      (SELECT COUNT(*) FROM deleted_failed) +
      (SELECT COUNT(*) FROM deleted_balance)
    );
  $$
);


-- Job 7: Setu AA Re-consent Alerts — daily at 09:00 UTC
-- Sends push + email notifications 30 days before Setu AA consent expires
SELECT cron.schedule(
  'setu-re-consent-alerts',
  '0 9 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/setu-reconsent-check',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'alert_window_days', 30,
        'connections', (
          SELECT jsonb_agg(jsonb_build_object(
            'id', id,
            'user_id', user_id,
            'consent_expires_at', consent_expires_at
          ))
          FROM bank_connections
          WHERE provider = 'setu_aa'
            AND status = 'active'
            AND consent_expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
        )
      )
    );

    INSERT INTO cron_health (job_name, ran_at, status, rows_affected)
    SELECT 'setu-re-consent-alerts', NOW(), 'triggered',
           COUNT(*) FROM bank_connections
    WHERE provider = 'setu_aa'
      AND status = 'active'
      AND consent_expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days';
  $$
);


-- Job 8: Setu AA Transaction Pull — every 4 hours
-- Setu AA has no webhooks; must poll for new transactions
SELECT cron.schedule(
  'setu-aa-pull',
  '0 */4 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/setu-aa-sync',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );

    INSERT INTO cron_health (job_name, ran_at, status, rows_affected)
    VALUES ('setu-aa-pull', NOW(), 'triggered', 1);
  $$
);


-- Verify all 8 jobs registered
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname IN (
  'balance-refresh', 'token-expiry-check', 'fx-rate-refresh',
  'weekly-summaries', 'monthly-summaries', 'parse-queue-cleanup',
  'setu-re-consent-alerts', 'setu-aa-pull'
)
ORDER BY jobname;
-- Expected: 8 rows, all active = true
```

**cron_health table** (create in initial schema migration):

```sql
CREATE TABLE IF NOT EXISTS public.cron_health (
  id          bigserial PRIMARY KEY,
  job_name    text NOT NULL,
  ran_at      timestamptz NOT NULL DEFAULT NOW(),
  status      text NOT NULL,   -- 'ok' | 'triggered' | 'error'
  rows_affected bigint DEFAULT 0
);

CREATE INDEX idx_cron_health_job_time ON cron_health(job_name, ran_at DESC);
```

**Failure alerting:** A Logflare alert fires if any `cron_health` job has no row within 30 minutes of its scheduled time.

---

## 7. RevenueCat Webhook Setup

### 7.1 Edge Function Endpoint

The RevenueCat webhook handler is deployed as a Supabase Edge Function at:

```
POST https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook
```

Configure this URL in the RevenueCat dashboard: **Project Settings → Integrations → Webhooks**.

### 7.2 Authorization Header Verification

**CRITICAL:** Every RevenueCat webhook MUST verify the `Authorization: Bearer` header. Without this check, any HTTP client can grant fake premium entitlement.

```typescript
// supabase/functions/revenuecat-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RC_WEBHOOK_SECRET = Deno.env.get('RC_WEBHOOK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request): Promise<Response> => {
  // 1. Verify Authorization header — RevenueCat uses Bearer token auth (not HMAC)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${RC_WEBHOOK_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Parse event
  const event = await req.json() as RevenueCatEvent;
  const { event: eventData } = event;

  // Only handle relevant event types
  const HANDLED_EVENTS = [
    'INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE',
    'CANCELLATION', 'BILLING_ISSUE', 'EXPIRATION', 'GRACE_PERIOD_EXPIRATION',
  ] as const;
  if (!HANDLED_EVENTS.includes(eventData.type)) {
    return new Response('OK', { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 3. Determine new entitlement state
  const isActive = ['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE'].includes(eventData.type);
  const newPlan = isActive ? 'premium_annual' : 'free';

  const validUntil = eventData.expiration_at_ms
    ? new Date(eventData.expiration_at_ms).toISOString()
    : new Date().toISOString();
  const graceUntil = new Date(
    new Date(validUntil).getTime() + 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  // 4. Update user_entitlements table (audit trail + grace period source of truth)
  const { data: entitlementRow } = await supabase
    .from('user_entitlements')
    .upsert({
      user_id: eventData.app_user_id,   // Supabase user UUID
      plan: newPlan,
      valid_until: validUntil,
      grace_until: graceUntil,
      revenuecat_customer_id: eventData.original_app_user_id,
      store: eventData.store === 'APP_STORE' ? 'app_store' : 'play_store',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('user_id')
    .single();

  // 5. Update app_metadata.entitlement in Supabase Auth JWT
  //    This is what the mobile app reads — zero DB query at runtime
  const { error: authError } = await supabase.auth.admin.updateUserById(
    eventData.app_user_id,
    {
      app_metadata: { entitlement: newPlan },
    }
  );

  if (authError) {
    console.error('Failed to update JWT entitlement:', authError);
    return new Response(JSON.stringify({ error: 'JWT update failed' }), { status: 500 });
  }

  // 6. Write audit_log
  await supabase.from('audit_log').insert({
    user_id: eventData.app_user_id,
    action: `revenuecat_${eventData.type.toLowerCase()}`,
    metadata: { event_type: eventData.type, plan: newPlan, store: eventData.store },
  });

  return new Response('OK', { status: 200 });
});

interface RevenueCatEvent {
  event: {
    type: string;
    app_user_id: string;
    original_app_user_id: string;
    expiration_at_ms: number | null;
    store: string;
  };
}
```

### 7.3 Mobile App: Entitlement Update After Purchase

After a successful RevenueCat purchase, the webhook fires asynchronously. The mobile app must refresh the JWT to pick up the new `app_metadata.entitlement` claim:

```typescript
// hooks/usePurchase.ts
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { supabase } from '@/lib/supabase';

export async function purchasePremium(pkg: PurchasesPackage): Promise<boolean> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);

  if (customerInfo.entitlements.active['premium_annual']) {
    // Wait for RevenueCat webhook to fire and update JWT (max 60s)
    // Poll session refresh every 5s for up to 60s
    const MAX_POLLS = 12;
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const { data } = await supabase.auth.refreshSession();
      const entitlement = data.session?.user?.app_metadata?.entitlement;
      if (entitlement === 'premium_annual') return true;
    }
    // Timeout — tell user to restart the app
    return false;
  }
  return false;
}
```

---

## 8. Bank Integration Setup

### 8.1 Plaid (US)

**Sandbox setup:**

1. Create a Plaid account at https://plaid.com → get `client_id` and `secret`.
2. In Plaid dashboard, set Redirect URI: `fintrack://plaid/callback`.
3. Set env vars in Railway: `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV=sandbox`.

**Link token creation (server-side Edge Function):**

```typescript
// supabase/functions/plaid-create-link-token/index.ts
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'https://esm.sh/plaid@29.0.0';

Deno.serve(async (req: Request): Promise<Response> => {
  const { user_id } = await req.json() as { user_id: string };

  const configuration = new Configuration({
    basePath: PlaidEnvironments[Deno.env.get('PLAID_ENV') as keyof typeof PlaidEnvironments],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': Deno.env.get('PLAID_CLIENT_ID')!,
        'PLAID-SECRET': Deno.env.get('PLAID_SECRET')!,
      },
    },
  });
  const plaidClient = new PlaidApi(configuration);

  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: user_id },
    client_name: 'FinTrack',
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: 'en',
    webhook: `${Deno.env.get('SUPABASE_URL')}/functions/v1/plaid-webhook`,
  });

  return new Response(
    JSON.stringify({ link_token: response.data.link_token }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

**Webhook verification (HMAC-SHA256):**

```typescript
// supabase/functions/plaid-webhook/index.ts
import { createHmac } from 'https://deno.land/std@0.220.0/crypto/mod.ts';

function verifyPlaidWebhook(body: string, signatureHeader: string, secret: string): boolean {
  const [version, timestamp, v1Sig] = signatureHeader.split(',').map(p => p.split('=')[1]);
  const signedPayload = `${timestamp}.${body}`;
  const hmac = createHmac('sha256', secret);
  hmac.update(signedPayload);
  const computedSig = hmac.digest('hex');
  return computedSig === v1Sig;
}
```

**Cost guard:** TrueLayer free developer tier is exceeded at ~35 UK users (500 calls/month). Onboard to TrueLayer paid plan before UK launch.

### 8.2 TrueLayer (UK)

**Sandbox setup:**

1. Create TrueLayer account → get `client_id` and `client_secret`.
2. Add redirect URI: `fintrack://truelayer/callback`.
3. Set env vars in Railway: `TRUELAYER_CLIENT_ID`, `TRUELAYER_CLIENT_SECRET`, `TRUELAYER_ENV=sandbox`.

**CRITICAL — Free tier limit:** TrueLayer sandbox is limited to 500 API calls/month. This is exceeded at approximately 35 UK users with daily polling (4 polls/day × 0.4 connections × 200 users = 9,600/month). **Purchase TrueLayer paid plan before UK launch.** Budget approximately £200/month.

**TrueLayer OAuth flow:**

```typescript
// app/(auth)/truelayer-connect.tsx
import * as WebBrowser from 'expo-web-browser';

const TRUELAYER_AUTH_URL = process.env.EXPO_PUBLIC_TRUELAYER_ENV === 'sandbox'
  ? 'https://auth.truelayer-sandbox.com'
  : 'https://auth.truelayer.com';

async function connectTrueLayer(userId: string): Promise<void> {
  const state = generateSecureRandom(32);  // CSRF protection
  const authUrl =
    `${TRUELAYER_AUTH_URL}/?` +
    `response_type=code&client_id=${process.env.EXPO_PUBLIC_TRUELAYER_CLIENT_ID}` +
    `&scope=info%20accounts%20balance%20transactions%20offline_access` +
    `&redirect_uri=${encodeURIComponent(process.env.EXPO_PUBLIC_TRUELAYER_REDIRECT_URI!)}` +
    `&state=${state}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, process.env.EXPO_PUBLIC_TRUELAYER_REDIRECT_URI!);
  if (result.type === 'success') {
    const code = new URL(result.url).searchParams.get('code');
    // Exchange code server-side (Edge Function)
    await fetch(`${SUPABASE_URL}/functions/v1/truelayer-exchange-token`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ code, state }),
    });
  }
}
```

### 8.3 Setu Account Aggregator (India)

**Sandbox setup:**

1. Register at https://setu.co → get `client_id` and `client_secret`.
2. Configure redirect URL: `fintrack://setu/callback`.
3. Sandbox AA test credentials available in Setu dashboard (test users with pre-populated transaction history).

**Tiered flow (per Architecture v4):**

```typescript
// app/(auth)/setu-connect.tsx
import * as Linking from 'expo-linking';

const SETU_TIMEOUT_MS = 30_000;  // 30s before fallback

async function connectSetuAA(userId: string): Promise<'connected' | 'sms-fallback' | 'skip'> {
  // 1. Request consent handle from Edge Function
  const response = await fetch(`${SUPABASE_URL}/functions/v1/setu-create-consent`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ user_id: userId }),
  });
  const { consent_handle, aa_deep_link } = await response.json() as {
    consent_handle: string;
    aa_deep_link: string;
  };

  // 2. Open AA app via deep link
  const canOpen = await Linking.canOpenURL(aa_deep_link);
  if (!canOpen) {
    // AA app (Finvu/OneMoney) not installed
    return Platform.OS === 'android' ? 'sms-fallback' : 'skip';
  }

  await Linking.openURL(aa_deep_link);

  // 3. Wait for callback (poll or deep link return)
  return new Promise<'connected' | 'sms-fallback' | 'skip'>(resolve => {
    const timeoutId = setTimeout(() => resolve(
      Platform.OS === 'android' ? 'sms-fallback' : 'skip'
    ), SETU_TIMEOUT_MS);

    // Listen for deep link return from AA app
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      if (url.startsWith('fintrack://setu/callback')) {
        clearTimeout(timeoutId);
        subscription.remove();
        const status = new URL(url).searchParams.get('status');
        resolve(status === 'SUCCESS' ? 'connected' : 'sms-fallback');
      }
    });
  });
}
```

**Email fallback for re-consent:** Push notifications are deferred to post-onboarding. India users may not have granted push permission when their Setu AA consent expires. The re-consent alert Edge Function must send both push (if token available) and email (always).

---

## 9. Deployment

### 9.1 EAS Build — iOS + Android

```bash
# Login to Expo account
eas login

# Configure EAS (first time only)
eas build:configure

# Build for development (internal testing)
eas build --platform all --profile development

# Build for App Store / Play Store submission
eas build --platform all --profile production

# Build for TestFlight (iOS only)
eas build --platform ios --profile preview

# Submit to App Store
eas submit --platform ios

# Submit to Play Store
eas submit --platform android
```

**EAS profiles in `eas.json`:**

```json
{
  "cli": { "version": ">= 14.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "APP_ENV": "development" }
    },
    "preview": {
      "distribution": "internal",
      "env": { "APP_ENV": "staging" }
    },
    "production": {
      "env": { "APP_ENV": "production" },
      "ios": { "autoIncrement": true },
      "android": { "autoIncrement": true }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "developer@fintrack.app",
        "ascAppId": "<app-store-connect-app-id>",
        "appleTeamId": "<team-id>"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

### 9.2 Supabase Edge Functions Deploy

```bash
# Deploy all Edge Functions
supabase functions deploy

# Deploy specific function
supabase functions deploy revenuecat-webhook

# Verify deployment
supabase functions list

# Test function locally
supabase functions serve revenuecat-webhook --env-file .env.local

# View function logs
supabase functions logs revenuecat-webhook --scroll
```

### 9.3 FastAPI Service Deploy (Railway)

```bash
# Login to Railway
railway login

# Deploy (runs on every push to main via GitHub integration)
railway up

# View logs
railway logs --tail

# Set environment variable
railway variables set SUPABASE_SERVICE_KEY=eyJ...

# Redeploy with updated env vars
railway redeploy
```

**Railway Procfile (in `services/parser/`):**

```procfile
web: uvicorn main:app --host 0.0.0.0 --port $PORT --workers 2
```

**Service requirements:** Minimum 512MB RAM. CPU burst for parse spikes.

### 9.4 OTA Updates (Expo EAS Update)

```bash
# Publish OTA update (no App Store review required for JS-only changes)
eas update --branch production --message "Fix budget ring rounding"

# Check update status
eas update:list

# Rollback to previous update
eas update:rollback --branch production
```

> OTA updates work for JavaScript/TypeScript changes only. Native code changes (new native modules, permission declarations) require a full EAS Build + store submission.

### 9.5 Supabase Database Migrations (Production)

```bash
# Generate a new migration from schema changes
supabase db diff --schema public -f new_migration_name

# Apply to production
supabase db push --db-url "postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"

# ALWAYS use expand-contract pattern — no destructive renames
# 1. ADD new column (expand)
# 2. Deploy app that writes to both old + new column
# 3. Migrate existing data
# 4. Deploy app that reads from new column only
# 5. DROP old column (contract) — only when all clients are updated
```

---

## 10. Testing

### 10.1 Unit Tests — Jest

```bash
# Run all unit tests
bun run test

# Run with coverage
bun run test --coverage

# Watch mode
bun run test --watch
```

**Key unit tests to implement (US-047):**

```typescript
// __tests__/discipline-score.test.ts
import { computeDisciplineScore } from '@/lib/discipline-score';

describe('computeDisciplineScore', () => {
  test('perfect adherence to 50/30/20 = 100', () => {
    expect(computeDisciplineScore({
      needsActualPct: 50,
      wantsActualPct: 30,
      savingsActualPct: 20,
      needsTargetPct: 50,
      wantsTargetPct: 30,
      savingsTargetPct: 20,
    })).toBe(100);
  });

  test('score clamped at 0 minimum', () => {
    expect(computeDisciplineScore({
      needsActualPct: 100,
      wantsActualPct: 0,
      savingsActualPct: 0,
      needsTargetPct: 50,
      wantsTargetPct: 30,
      savingsTargetPct: 20,
    })).toBe(0);
  });

  test('zero spend returns 0', () => {
    expect(computeDisciplineScore({
      needsActualPct: 0,
      wantsActualPct: 0,
      savingsActualPct: 0,
      needsTargetPct: 50,
      wantsTargetPct: 30,
      savingsTargetPct: 20,
    })).toBe(0);
  });
});

// Implementation
export function computeDisciplineScore(params: {
  needsActualPct: number;
  wantsActualPct: number;
  savingsActualPct: number;
  needsTargetPct: number;
  wantsTargetPct: number;
  savingsTargetPct: number;
}): number {
  const { needsActualPct, wantsActualPct, savingsActualPct,
          needsTargetPct, wantsTargetPct, savingsTargetPct } = params;
  const raw = 100 - (
    Math.abs(needsActualPct - needsTargetPct) * 0.5 +
    Math.abs(wantsActualPct - wantsTargetPct) * 0.3 +
    Math.abs(savingsActualPct - savingsTargetPct) * 0.2
  ) * 2;
  return Math.max(0, Math.min(100, raw));
}
```

```typescript
// __tests__/dedup-hash.test.ts
import { computeDedupHash } from '@/lib/dedup';

describe('computeDedupHash', () => {
  test('same transaction within 30 min produces same hash', () => {
    const base = Date.now();
    const hash1 = computeDedupHash({ amount: 2999, merchant: 'amazon', timestamp: base, currency: 'USD' });
    const hash2 = computeDedupHash({ amount: 2999, merchant: 'amazon', timestamp: base + 1000, currency: 'USD' });
    expect(hash1).toBe(hash2);  // same 30-min bucket
  });

  test('different merchants produce different hashes', () => {
    const ts = Date.now();
    const h1 = computeDedupHash({ amount: 2999, merchant: 'amazon', timestamp: ts, currency: 'USD' });
    const h2 = computeDedupHash({ amount: 2999, merchant: 'flipkart', timestamp: ts, currency: 'USD' });
    expect(h1).not.toBe(h2);
  });
});
```

### 10.2 React Native Component Tests

```bash
# React Testing Library for React Native
bun add -D @testing-library/react-native
```

```typescript
// __tests__/components/BudgetRing.test.tsx
import { render, screen } from '@testing-library/react-native';
import { BudgetRing } from '@/components/BudgetRing';

describe('BudgetRing', () => {
  test('renders "Set income" prompt when income is null', () => {
    render(<BudgetRing monthlyIncome={null} needsSpend={0} wantsSpend={0} savingsSpend={0}
                       needsPct={50} wantsPct={30} savingsPct={20} />);
    expect(screen.getByText(/set income/i)).toBeTruthy();
  });

  test('shows red segment when spend exceeds budget', () => {
    const { getByTestId } = render(
      <BudgetRing monthlyIncome={500000} needsSpend={300000} wantsSpend={0} savingsSpend={0}
                  needsPct={50} wantsPct={30} savingsPct={20} />
    );
    expect(getByTestId('needs-segment')).toHaveStyle({ backgroundColor: expect.stringContaining('red') });
  });
});
```

### 10.3 RLS Policy Tests (Supabase)

```bash
# Run Supabase database tests
supabase test db

# Test files in supabase/tests/
# Uses pgTAP extension
```

```sql
-- supabase/tests/rls_transactions.test.sql
BEGIN;

SELECT plan(5);

-- Test 1: User A cannot read User B's transactions
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-a-uuid", "role": "authenticated"}';

SELECT is(
  (SELECT COUNT(*) FROM transactions WHERE user_id = 'user-b-uuid'),
  0::bigint,
  'User A cannot read User B transactions'
);

-- Test 2: User A can read their own transactions
SELECT isnt(
  (SELECT COUNT(*) FROM transactions WHERE user_id = 'user-a-uuid'),
  0::bigint,
  'User A can read own transactions'
);

-- Test 3: User A cannot insert transaction with user_b's user_id
SELECT throws_ok(
  $$INSERT INTO transactions (user_id, amount, txn_date) VALUES ('user-b-uuid', 100, '2026-05-13')$$,
  'new row violates row-level security policy',
  'Cannot insert transaction with another user_id'
);

-- Test 4: bank_connections_safe view excludes access_token
SELECT hasnt_column(
  'public', 'bank_connections_safe', 'access_token',
  'bank_connections_safe view excludes access_token'
);

-- Test 5: fx_rates readable by authenticated users
SET LOCAL request.jwt.claims TO '{"sub": "any-user", "role": "authenticated"}';
SELECT ok(
  (SELECT COUNT(*) FROM fx_rates) >= 0,
  'fx_rates readable by authenticated users'
);

SELECT finish();

ROLLBACK;
```

### 10.4 FastAPI Tests (pytest)

```bash
cd services/parser

# Run all tests
uv run pytest -v

# Run with coverage
uv run pytest --cov=. --cov-report=html
```

```python
# services/parser/tests/test_sms_parser.py
import pytest
from app.parsers import parse_hdfc_sms, parse_icici_sms

class TestHDFCSMSParser:
    """Tests for HDFC Bank SMS parsing — target: >= 92% accuracy on 200 message corpus."""

    def test_hdfc_debit_upi(self):
        sms = "Rs.450.00 debited from A/c XX1234 on 13-05-26 to Swiggy VPA swiggy@oksbi Ref No 123456789012. Available Bal Rs.15,550.00"
        result = parse_hdfc_sms(sms)
        assert result is not None
        assert result['amount'] == 45000  # paise
        assert result['merchant'] == 'swiggy'
        assert result['type'] == 'debit'
        assert result['payment_mode'] == 'upi'
        assert result['currency'] == 'INR'

    def test_hdfc_credit(self):
        sms = "Rs.10,000.00 credited to A/c XX1234 on 13-05-26. Ref No 987654321098."
        result = parse_hdfc_sms(sms)
        assert result is not None
        assert result['amount'] == 1000000  # paise
        assert result['type'] == 'credit'

    def test_unknown_format_returns_none(self):
        sms = "OTP for your HDFC Bank account is 123456. Valid for 5 minutes."
        result = parse_hdfc_sms(sms)
        assert result is None  # OTPs must not be parsed as transactions


class TestDeduplication:
    def test_23505_treated_as_success(self):
        """Duplicate insert on dedup_hash must be handled as non-error."""
        from app.queue_processor import handle_insert_error
        from postgrest import APIError

        error = APIError({'code': '23505', 'message': 'duplicate key'}, 409, {})
        result = handle_insert_error(error)
        assert result == 'dedup_conflict'  # not 'error'
```

### 10.5 E2E Tests — Maestro

```bash
# Install Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash

# Run onboarding E2E flow
maestro test .maestro/onboarding.yaml

# Run all flows
maestro test .maestro/
```

```yaml
# .maestro/onboarding.yaml
appId: app.fintrack
---
- launchApp
- assertVisible: "FinTrack"
- tapOn: "Continue with Google"
# (Google OAuth simulated in test build — bypassed for E2E)
- assertVisible: "What should we call you?"
- tapOn: "First name"
- inputText: "Mukund"
- tapOn: "Continue"
- assertVisible: "Connect your bank"
- tapOn: "Skip for now"
- assertVisible: "Good morning, Mukund"
- assertVisible: "Set monthly income"
```

### 10.6 Coverage Targets (US-047)

| Area | Target |
|------|--------|
| Business logic (discipline score, dedup, FX) | ≥ 80% |
| RLS policy tests | 100% (all tables, all roles) |
| SMS parser corpus | ≥ 92% accuracy per bank (200 messages each) |
| React Native components | ≥ 60% |
| FastAPI endpoints | ≥ 75% |

---

## 11. Monitoring & Alerts

### 11.1 PostHog — Product Analytics

```typescript
// lib/analytics.ts
import PostHog from 'posthog-react-native';

export const analytics = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_API_KEY!, {
  host: process.env.EXPO_PUBLIC_POSTHOG_HOST!,
  disabled: __DEV__,  // disable in development
});

// Key events to track
export const AnalyticsEvents = {
  // Onboarding funnel (US-047)
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_AUTH_COMPLETED: 'onboarding_auth_completed',
  ONBOARDING_PROFILE_COMPLETED: 'onboarding_profile_completed',
  ONBOARDING_BANK_CONNECTED: 'onboarding_bank_connected',
  ONBOARDING_BANK_SKIPPED: 'onboarding_bank_skipped',
  ONBOARDING_COMPLETED: 'onboarding_completed',

  // Core actions
  TRANSACTION_ADDED: 'transaction_added',
  TRANSACTION_CONFIRMED: 'transaction_confirmed',
  REPORT_VIEWED: 'report_viewed',
  EXPORT_INITIATED: 'export_initiated',
  EXPORT_COMPLETED: 'export_completed',

  // Subscription
  PAYWALL_VIEWED: 'paywall_viewed',
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',

  // Bank
  BANK_CONNECTED: 'bank_connected',
  BANK_RECONNECTED: 'bank_reconnected',
  BANK_SYNC_FAILED: 'bank_sync_failed',
} as const;
```

**Funnels to set up in PostHog:**
- Onboarding completion funnel (5 steps: Welcome → OTP → Name → Bank → Dashboard)
- Transaction add funnel (FAB tap → Amount → Category → Save)
- Subscription conversion funnel (Paywall view → Purchase initiated → Purchase confirmed)

### 11.2 Sentry — Error Tracking

```typescript
// app/_layout.tsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN!,
  environment: process.env.APP_ENV ?? 'development',
  tracesSampleRate: 0.2,   // 20% of transactions for performance monitoring
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 30000,
  integrations: [
    Sentry.reactNativeTracingIntegration(),
  ],
});

// Identify user after auth (no PII in Sentry — user_id only)
export function identifyUserInSentry(userId: string): void {
  Sentry.setUser({ id: userId });
}

// Custom error context for bank operations
export function captureParserError(error: Error, context: {
  source_type: string;
  bank_name: string;
}): void {
  Sentry.captureException(error, {
    tags: { source_type: context.source_type, bank: context.bank_name },
    // Never include raw_text or PII
  });
}
```

**FastAPI Sentry:**

```python
# services/parser/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=os.environ['SENTRY_DSN'],
    environment=os.environ.get('ENVIRONMENT', 'development'),
    traces_sample_rate=0.1,
    integrations=[FastApiIntegration()],
)
```

### 11.3 Logflare / pg — pg_cron Failure Alerts

Configure in Supabase dashboard → Logs → Logflare:

```sql
-- Logflare alert query: pg_cron job missed its window
-- Alert fires if any job has no cron_health row within 30 min of scheduled time
SELECT job_name
FROM (VALUES
  ('balance-refresh',        '0 6 * * *'),
  ('token-expiry-check',     '0 7 * * *'),
  ('fx-rate-refresh',        '0 */2 * * *'),
  ('weekly-summaries',       '0 8 * * 1'),
  ('monthly-summaries',      '0 2 1 * *'),
  ('parse-queue-cleanup',    '0 3 * * *'),
  ('setu-re-consent-alerts', '0 9 * * *'),
  ('setu-aa-pull',           '0 */4 * * *')
) AS jobs(job_name, schedule)
WHERE NOT EXISTS (
  SELECT 1 FROM cron_health
  WHERE cron_health.job_name = jobs.job_name
    AND ran_at >= NOW() - INTERVAL '30 minutes'
    AND status != 'error'
);
-- Non-empty result → alert fires
```

**Supabase Logflare alert setup:**
1. Dashboard → Logs → Log Explorer → Save query as "pg_cron_missed_jobs".
2. Set alert: trigger when query returns > 0 rows; notify via Slack webhook.

### 11.4 Railway — FastAPI Metrics

Configure in Railway dashboard:

- **CPU alert:** > 80% for 5 minutes → PagerDuty.
- **Memory alert:** > 90% of 512MB limit → PagerDuty.
- **parse_queue depth alert:** Custom metric — FastAPI `/health` endpoint reports queue depth; alert if depth > 1,000 for > 10 minutes.

```python
# services/parser/health.py
from fastapi import APIRouter
from supabase import create_client

router = APIRouter()

@router.get('/health')
async def health_check() -> dict:
    supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])
    queue_result = supabase.table('parse_queue').select(
        'id', count='exact', head=True
    ).eq('status', 'pending').execute()
    queue_depth = queue_result.count or 0

    return {
        'status': 'ok' if queue_depth < 1000 else 'degraded',
        'queue_depth': queue_depth,
        'parser_version': '1.0.0',
    }
```

### 11.5 UptimeRobot — TrueLayer Endpoint Health

TrueLayer polling can fail silently without monitoring. Set up:

1. UptimeRobot (free tier) → New Monitor → HTTPS.
2. URL: `https://<project-ref>.supabase.co/functions/v1/truelayer-health`.
3. Interval: every 5 minutes.
4. Alert after: 2 consecutive failures → Slack webhook + email.

**TrueLayer health Edge Function:**

```typescript
// supabase/functions/truelayer-health/index.ts
Deno.serve(async (): Promise<Response> => {
  try {
    // Lightweight token validation call — not a full data fetch
    const response = await fetch(
      'https://auth.truelayer.com/connect/token',
      { method: 'HEAD', signal: AbortSignal.timeout(5000) }
    );
    const isHealthy = response.status < 500;
    return new Response(
      JSON.stringify({ status: isHealthy ? 'ok' : 'degraded' }),
      { status: isHealthy ? 200 : 503 }
    );
  } catch {
    return new Response(JSON.stringify({ status: 'error' }), { status: 503 });
  }
});
```

### 11.6 Performance Targets (US-050)

| Metric | Target | Measured On |
|--------|--------|-------------|
| Cold start | < 2 seconds | Pixel 5, iPhone 12 |
| Dashboard load | < 2 seconds | After sign-in |
| Weekly report load | < 1.5 seconds | 12 weeks of data |
| Monthly report load | < 1.5 seconds | 6 months of data |
| Annual report load | < 2 seconds | 12 months of data |
| Manual transaction save | < 500ms round-trip | Average network |

Measure using Expo's built-in performance tools and React Native Perf Monitor:

```bash
# Enable Perf Monitor in development build
# Shake device → "Toggle Perf Monitor" in dev menu

# Profiling with React DevTools
npx react-devtools
```

---

## Quick Reference

### Critical Rules (from CLAUDE.md)

| Rule | Detail |
|------|--------|
| Amounts | Always `bigint` (paise/cents/pence). Never floats. Use dinero.js for display. |
| Secrets | Railway env vars + Supabase Vault + GitHub Secrets. Never in code. |
| RLS | All tables have RLS. Clients use `bank_connections_safe` view only. |
| Migrations | Versioned SQL in `supabase/migrations/`. Expand-contract pattern only. |
| SMS parsing | On-device. Only structured output transmitted. Raw SMS never leaves device. |
| Bank tokens | Vault-encrypted. Never returned in API responses. |
| Entitlement | Read from JWT `app_metadata.entitlement`. Zero DB query. |
| Dedup hash | SHA-256 of `(amount + merchant_normalized + ±30min bucket + currency)`. |
| FX storage | `fx_rate_at_insert` locked forever. `amount_base` uses bigint arithmetic only. |

### Key File Paths

| File | Purpose |
|------|---------|
| `supabase/migrations/20260513000001_rls_policies.sql` | All RLS policies |
| `supabase/migrations/20260513000002_triggers.sql` | `trg_goal_amount` trigger |
| `supabase/migrations/20260513000003_pg_cron_jobs.sql` | 8 scheduled cron jobs |
| `supabase/functions/revenuecat-webhook/index.ts` | RC webhook handler (verify bearer) |
| `lib/supabase.ts` | Supabase client with India routing |
| `lib/offline-queue.ts` | SQLite (SQLCipher) offline queue |
| `lib/discipline-score.ts` | Discipline score formula |
| `types/supabase.generated.ts` | Auto-generated TypeScript types |
| `services/parser/main.py` | FastAPI parse queue processor |

### Screen → Story Cross-Reference

| Screen | User Stories |
|--------|-------------|
| SCR-001 Welcome | US-007, US-008, US-009, US-010 |
| SCR-002 OTP | US-009, US-010 |
| SCR-003 Name+DOB | US-011 |
| SCR-004 Connect Bank | US-012, US-021, US-022, US-023 |
| SCR-005 Dashboard | US-013, US-029, US-038 |
| SCR-007 Tracker | US-016 |
| SCR-008 Add Transaction | US-015 |
| SCR-009 Review Queue | US-018 |
| SCR-013 Weekly Report | US-031 |
| SCR-014 Monthly Report | US-032 |
| SCR-015 Annual Report | US-034 |
| SCR-016 Export | US-035, US-036 |
| SCR-017 Accounts | US-039 |
| SCR-018 Account Detail | US-040 |
| SCR-021–023 Goals | US-041 |
| SCR-026 Subscription | US-044, US-046 |
| SCR-031 Privacy | US-043 |
| SCR-032 Paywall | US-046 |

---

*End of FinTrack Developer Guide — 2026-05-13.*
