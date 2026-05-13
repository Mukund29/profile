# FinTrack — Data Model (Final)

**Date:** 2026-05-13  
**Database:** Supabase PostgreSQL 15  
**Security:** Row Level Security (RLS) on all tables · Supabase Vault for sensitive columns  
**Convention:** All monetary amounts stored in **smallest currency unit** (paise / cents / pence) — never floats

---

## Schema Overview

```
auth.users (Supabase managed)
    │
    ├── user_profiles          (1:1 — profile, income, budget %)
    ├── user_entitlements      (1:1 — subscription plan + grace)
    ├── bank_connections       (1:many — Plaid / TrueLayer / AA / Manual)
    ├── transactions           (1:many — all financial transactions)
    ├── categories             (1:many — user custom + system defaults)
    ├── goals                  (1:many — savings goals)
    ├── weekly_summaries       (1:many — pre-aggregated, pg_cron)
    ├── monthly_summaries      (1:many — pre-aggregated, pg_cron)
    ├── parse_queue            (1:many — async SMS/email parsing buffer)
    ├── parse_failed           (1:many — dead letter queue, 90-day retention)
    ├── balance_history        (1:many — daily balance snapshots per bank connection, 90-day retention)
    └── audit_log              (1:many — GDPR compliance trail)

fx_rates                       (global — no user FK, hourly refresh)
```

---

## Table Definitions

### `auth.users` (Supabase-managed)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK — auto-generated |
| `email` | text | Unique, verified |
| `app_metadata` | jsonb | Contains `entitlement` claim — embedded in JWT. Updated by RevenueCat webhook. Zero DB lookup needed for auth checks. |
| `created_at` | timestamptz | Account creation |

---

### `user_profiles`
**RLS:** User can only read/write their own row.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | uuid | PK = auth.users.id | |
| `display_name` | text | NOT NULL | First name only |
| `date_of_birth` | date | NOT NULL · 🔒 Vault-encrypted | Age ≥ 18 enforced at signup |
| `age_confirmed_at` | timestamptz | NOT NULL | Timestamp of DOB submission |
| `base_currency` | text | NOT NULL · DEFAULT 'USD' · ⚡ Indexed | ISO 4217: 'INR' / 'USD' / 'GBP' |
| `locale` | text | NOT NULL | e.g. 'en-IN', 'en-US', 'en-GB' |
| `monthly_income` | bigint | NULLABLE | In smallest currency unit |
| `budget_needs_pct` | numeric(5,2) | DEFAULT 50.00 | |
| `budget_wants_pct` | numeric(5,2) | DEFAULT 30.00 | |
| `budget_savings_pct` | numeric(5,2) | DEFAULT 20.00 | CHECK: needs + wants + savings = 100 |
| `weekly_spend_limit` | bigint | NULLABLE | Alert at 80% |
| `updated_at` | timestamptz | Auto-updated trigger | |

---

### `user_entitlements`
**RLS:** User read-only. Server writes via service key (RevenueCat webhook).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → auth.users · UNIQUE · ⚡ Indexed |
| `plan` | text | 'premium_annual' \| 'free' |
| `valid_until` | timestamptz | Subscription period end |
| `grace_until` | timestamptz | valid_until + 7 days — hard feature cutoff |
| `revenuecat_customer_id` | text | For webhook correlation |
| `store` | text | 'app_store' \| 'play_store' |
| `updated_at` | timestamptz | Last webhook update |

**Note:** Primary entitlement check uses JWT `app_metadata.entitlement` claim (no DB query). This table is the audit trail and grace period source of truth.

---

### `bank_connections`
**RLS:** User can only read/write their own rows.  
**Security:** `access_token` stored in Supabase Vault (AES-256-GCM). Never returned in API responses.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → auth.users · ⚡ Indexed |
| `provider` | text | 'plaid' \| 'truelayer' \| 'setu_aa' \| 'manual' |
| `institution_name` | text | e.g. 'HDFC Bank', 'Chase', 'Barclays' |
| `institution_logo_url` | text | NULLABLE — from provider metadata |
| `access_token` | text | 🔒 Vault-encrypted · server-side only |
| `token_expires_at` | timestamptz | NULLABLE · Plaid / TrueLayer |
| `consent_expires_at` | timestamptz | NULLABLE · Setu AA (6–12 months) |
| `tracking_from` | timestamptz | NOT NULL · = connection timestamp (no historical import) |
| `balance_amount` | bigint | Cached balance in smallest unit |
| `balance_currency` | text | ISO 4217 |
| `balance_cached_at` | timestamptz | ⚡ Indexed · when balance was fetched |
| `last_manual_refresh_at` | timestamptz | Server-side rate limit: 1 refresh / 15 min |
| `status` | text | 'active' \| 'expired' \| 'error' \| 'disconnected' |
| `created_at` | timestamptz | Connection date |

---

### `transactions`
**RLS:** User can only read/write their own rows.  
**Volume:** ~30 txns/user/day · partition by month when > 10M rows.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → auth.users · ⚡ Indexed |
| `bank_connection_id` | uuid | NULLABLE FK → bank_connections (null = manual cash) |
| `txn_date` | date | ⚡ Indexed · transaction date (not insert time) |
| `description` | text | Merchant / description as entered or parsed |
| `merchant_normalized` | text | ⚡ Indexed · lowercased, stripped for dedup matching |
| `category_id` | uuid | ⚡ Indexed · FK → categories |
| `txn_type` | text | 'need' \| 'want' \| 'saving' |
| `amount` | bigint | In smallest currency unit · always positive |
| `currency` | text | ISO 4217 · original transaction currency |
| `amount_base` | bigint | Converted to user's `base_currency` at insert time |
| `fx_rate_at_insert` | numeric(18,8) | FX rate used — locked forever for historical accuracy |
| `payment_mode` | text | 'upi' \| 'credit_card' \| 'debit_card' \| 'cash' \| 'bank_transfer' \| 'ach' \| 'faster_payments' \| 'other' |
| `source` | text | 'sms' \| 'email' \| 'plaid' \| 'truelayer' \| 'setu_aa' \| 'manual' |
| `provider_txn_id` | text | NULLABLE · UNIQUE NULLS NOT DISTINCT · Plaid/TrueLayer/AA canonical dedup ID |
| `dedup_hash` | text | UNIQUE · SHA-256 of (amount + merchant_normalized + ±30min timestamp + currency) — SMS/email dedup |
| `notes` | text | NULLABLE · user-entered |
| `goal_id` | uuid | NULLABLE FK → goals · ⚡ Indexed · set when txn_type = 'saving' and user assigns to a goal |
| `is_confirmed` | boolean | DEFAULT false for auto-parsed · true for manual · auto-confirmed after 24h |
| `created_at` | timestamptz | Row insert time |

**Deduplication logic:**
- Provider transactions: unique on `provider_txn_id`
- SMS/email parsed: unique on `dedup_hash` (±30 min window, not hour bucket — avoids midnight boundary bug)
- On conflict: bank API source wins over SMS/email parse

---

### `categories`
**RLS:** User reads their own + system defaults (user_id IS NULL).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | NULLABLE FK → auth.users (null = system default) |
| `name` | text | e.g. 'Life Infrastructure', 'Future Me' |
| `default_type` | text | 'need' \| 'want' \| 'saving' |
| `icon` | text | Emoji or icon identifier |
| `colour_hex` | text | e.g. '#6366f1' |
| `is_archived` | boolean | DEFAULT false · hides from UI, preserves history |

**System default categories (seeded at DB init):**

| Category | Type |
|----------|------|
| Life Infrastructure | Need |
| Performance & Growth | Need |
| Future Me | Saving |
| Relationships & Generosity | Want |
| Lifestyle Enjoyment | Want |

---

### `goals`
**RLS:** User can only read/write their own rows.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → auth.users · ⚡ Indexed |
| `name` | text | e.g. "Emergency Fund" |
| `target_amount` | bigint | In base_currency smallest unit |
| `current_amount` | bigint | Updated manually or via savings transactions |
| `currency` | text | = user's base_currency at creation |
| `target_date` | date | NULLABLE |
| `status` | text | 'active' \| 'achieved' \| 'archived' |
| `created_at` | timestamptz | |

---

### `balance_history`
**RLS:** User read-only. Written by pg_cron balance refresh job (service key).  
**Purpose:** Powers the 7-day balance history line chart on Account Detail screen (US-040).  
**Retention:** 90 days — pg_cron prunes rows older than 90 days daily.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `bank_connection_id` | uuid | FK → bank_connections · ⚡ Indexed |
| `user_id` | uuid | FK → auth.users · ⚡ Indexed (for RLS) |
| `balance_amount` | bigint | Snapshot balance in smallest currency unit |
| `balance_currency` | text | ISO 4217 |
| `recorded_at` | timestamptz | ⚡ Indexed · timestamp of the balance fetch |

**Insert rule:** One row written per bank_connection per pg_cron balance refresh cycle (daily). Manual refresh triggers also write a row.

```sql
CREATE INDEX idx_bal_hist_conn_time ON balance_history(bank_connection_id, recorded_at DESC);
```

**Cleanup pg_cron (daily 04:00 UTC):**
```sql
DELETE FROM balance_history WHERE recorded_at < NOW() - INTERVAL '90 days';
```

---

### `weekly_summaries`
**RLS:** User read-only. Written by pg_cron (service key).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK · ⚡ Indexed |
| `week_start` | date | ⚡ Indexed · Monday · UNIQUE per user |
| `week_end` | date | Sunday |
| `total_spend` | bigint | In base_currency |
| `needs_spend` | bigint | |
| `wants_spend` | bigint | |
| `savings_spend` | bigint | |
| `weekly_limit` | bigint | Snapshot of limit at time of calc |
| `discipline_score` | numeric(5,2) | 0–100 |
| `category_breakdown` | jsonb | `{category_id: amount}` map |
| `computed_at` | timestamptz | |

**Discipline score formula:**
```
score = 100 - (
  ABS(needs_pct_actual - needs_pct_target) * 0.5 +
  ABS(wants_pct_actual - wants_pct_target) * 0.3 +
  ABS(savings_pct_actual - savings_pct_target) * 0.2
) * 2
```
Clamped to [0, 100].

---

### `monthly_summaries`
**RLS:** User read-only. Written by pg_cron (service key).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK · ⚡ Indexed |
| `month` | date | ⚡ Indexed · first day of month · UNIQUE per user |
| `total_spend` | bigint | In base_currency |
| `needs_spend` | bigint | |
| `wants_spend` | bigint | |
| `savings_spend` | bigint | |
| `budget_needs` | bigint | Snapshot of budget target (income × pct) |
| `budget_wants` | bigint | |
| `budget_savings` | bigint | |
| `discipline_score` | numeric(5,2) | Same formula as weekly |
| `is_partial` | boolean | True if user connected mid-month |
| `daily_breakdown` | jsonb | `{"2026-05-01": 4500, ...}` for calendar heatmap |
| `category_breakdown` | jsonb | `{category_id: amount}` |
| `computed_at` | timestamptz | |

**Note:** `is_partial = true` months are displayed with a "⚠️ Partial month" banner and excluded from annual discipline score calculation.

---

### `parse_queue`
**RLS:** User read-only. Parser service writes via service key.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK · ⚡ Indexed |
| `raw_text` | text | SMS body or email snippet |
| `source_type` | text | 'sms' \| 'email' |
| `status` | text | ⚡ Indexed · 'pending' \| 'processing' \| 'processed' \| 'failed' |
| `retry_count` | int | DEFAULT 0 · max 3 → then → parse_failed |
| `created_at` | timestamptz | ⚡ Indexed (for cleanup job) |
| `processed_at` | timestamptz | NULLABLE |

**Cleanup:** pg_cron daily at 03:00 UTC:
```sql
DELETE FROM parse_queue
WHERE status = 'processed'
AND processed_at < NOW() - INTERVAL '30 days';
```

---

### `parse_failed`
Dead letter queue — 90-day retention for debugging.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK |
| `raw_text` | text | |
| `source_type` | text | |
| `error_message` | text | Last parser error |
| `failed_at` | timestamptz | |

---

### `fx_rates`
Global table — no user FK. Written by pg_cron hourly.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `base` | text | ⚡ Indexed · e.g. 'USD' (Open Exchange Rates base) |
| `quote` | text | ⚡ Indexed · e.g. 'INR' |
| `rate` | numeric(18,8) | Exchange rate |
| `fetched_at` | timestamptz | UNIQUE on (base, quote, fetched_at) |

**Note:** One API call per 2 hours returns all currency pairs simultaneously. 372 calls/month — well within the 1,000/mo free tier ceiling.

---

### `audit_log`
GDPR / RBI compliance trail. Append-only.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK (NULLABLE — system events) |
| `action` | text | 'token_accessed' \| 'data_exported' \| 'account_deleted' \| etc. |
| `metadata` | jsonb | IP address, user agent, resource ID |
| `created_at` | timestamptz | ⚡ Indexed |

---

## Critical Indexes

```sql
-- Transaction queries (all reports hit this)
CREATE INDEX idx_txn_user_date ON transactions(user_id, txn_date DESC);
CREATE INDEX idx_txn_user_date_type ON transactions(user_id, txn_date, txn_type);

-- Deduplication
CREATE UNIQUE INDEX idx_txn_dedup_hash ON transactions(dedup_hash);
CREATE UNIQUE INDEX idx_txn_provider_id ON transactions(provider_txn_id)
  NULLS NOT DISTINCT;

-- Bank connection management
CREATE INDEX idx_bank_user_status ON bank_connections(user_id, status);
CREATE INDEX idx_bank_token_expiry ON bank_connections(token_expires_at)
  WHERE status = 'active';

-- Summary lookups
CREATE UNIQUE INDEX idx_weekly_user_week ON weekly_summaries(user_id, week_start);
CREATE UNIQUE INDEX idx_monthly_user_month ON monthly_summaries(user_id, month);

-- FX rate lookup (latest)
CREATE INDEX idx_fx_base_quote_time ON fx_rates(base, quote, fetched_at DESC);

-- Goal contribution lookup
CREATE INDEX idx_txn_goal ON transactions(goal_id) WHERE goal_id IS NOT NULL;

-- Balance history (7-day chart on account detail)
CREATE INDEX idx_bal_hist_conn_time ON balance_history(bank_connection_id, recorded_at DESC);

-- Parser queue polling
CREATE INDEX idx_queue_status_created ON parse_queue(status, created_at)
  WHERE status IN ('pending', 'processing');
```

---

## Row Level Security Policies

**Full migration:** `supabase/migrations/20260513000001_rls_policies.sql`

### Policy Tier Summary

| Table | RLS Enabled | Client Access | Writer |
|-------|-------------|---------------|--------|
| `user_profiles` | ✅ | Read + Write own | Client |
| `bank_connections` | ✅ | Via safe VIEW only (access_token excluded) | Client |
| `transactions` | ✅ | Read + Write own | Client + `fintrack_parser` role |
| `goals` | ✅ | Read + Write own | Client |
| `categories` | ✅ | Read own + system; Write own only | Client |
| `user_entitlements` | ✅ | Read own only | RevenueCat webhook (svc key) |
| `weekly_summaries` | ✅ | Read own only | pg_cron (svc key) |
| `monthly_summaries` | ✅ | Read own only | pg_cron (svc key) |
| `balance_history` | ✅ | Read own only | pg_cron (svc key) |
| `parse_queue` | ✅ | Insert + Read own; no UPDATE/DELETE | Client insert · `fintrack_parser` updates |
| `parse_failed` | ✅ | **No access** | `fintrack_parser` role |
| `audit_log` | ✅ | **No access** | Edge Functions (svc key) |
| `fx_rates` | ✅ | Read all (no user scoping) | pg_cron (svc key) |

### Tier 1 — Full User Read/Write

```sql
-- Pattern: transactions, bank_connections, goals, user_profiles
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_own_all"
ON transactions FOR ALL
USING     (auth.uid() = user_id)   -- blocks reads of other users' rows
WITH CHECK(auth.uid() = user_id);  -- blocks writes with a forged user_id
```

`WITH CHECK` is critical — without it, a client could INSERT a row with an arbitrary `user_id` (privilege escalation).

### Tier 2 — User Read-Only (Service Key Writes)

```sql
-- Pattern: user_entitlements, weekly_summaries, monthly_summaries,
--          balance_history, parse_queue (read + insert only)
ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_entitlements_own_read"
ON user_entitlements FOR SELECT
USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policy → any authenticated write is rejected.
-- Only service key (bypasses RLS) can write.
```

### Tier 3 — Shared Read + Own Write (categories)

```sql
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Read own + system defaults (user_id IS NULL = seeded defaults)
CREATE POLICY "categories_read_own_and_system"
ON categories FOR SELECT
USING (user_id = auth.uid() OR user_id IS NULL);

-- Write own custom rows only — system defaults are immutable by clients
CREATE POLICY "categories_write_own"
ON categories FOR INSERT, UPDATE, DELETE
USING     (user_id = auth.uid())
WITH CHECK(user_id = auth.uid());
```

### Tier 4 — No Client Access (audit_log, parse_failed)

```sql
-- RLS enabled + zero permissive policies = no rows for any authenticated query
ALTER TABLE audit_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE parse_failed ENABLE ROW LEVEL SECURITY;
-- Intentionally no CREATE POLICY statements.
```

### Tier 5 — Global Read, No Client Writes (fx_rates)

```sql
ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fx_rates_authenticated_read"
ON fx_rates FOR SELECT
USING (true);  -- all authenticated users; anon blocked by default

-- No INSERT/UPDATE/DELETE policy → rates are written only by pg_cron (svc key).
```

### bank_connections_safe View

Clients must never receive the `access_token` column — even Vault-encrypted ciphertext must not be returned (defence-in-depth for Vault key compromise scenarios).

```sql
CREATE OR REPLACE VIEW public.bank_connections_safe AS
SELECT
    id, user_id, provider, institution_name, institution_logo_url,
    -- access_token intentionally omitted
    token_expires_at, consent_expires_at, tracking_from,
    balance_amount, balance_currency, balance_cached_at,
    last_manual_refresh_at, status, created_at
FROM public.bank_connections;

GRANT  SELECT ON public.bank_connections_safe TO authenticated;
REVOKE SELECT ON public.bank_connections      FROM authenticated;
```

The view is `SECURITY INVOKER` (PostgreSQL default) — `auth.uid()` resolves correctly when queried by an authenticated client, so the RLS policy on the underlying table is honoured.

### fintrack_parser Least-Privilege Role

FastAPI on Railway uses this role instead of the Supabase service key. Scope is column-level:

```sql
CREATE ROLE fintrack_parser LOGIN;

GRANT INSERT                                   ON transactions  TO fintrack_parser;
GRANT UPDATE (status, processed_at, retry_count) ON parse_queue TO fintrack_parser;
GRANT SELECT                                   ON parse_queue   TO fintrack_parser;
GRANT INSERT                                   ON parse_failed  TO fintrack_parser;
-- All other tables: access explicitly revoked
```

If Railway is compromised, the blast radius is bounded to: insert transactions, update parse_queue status, insert parse_failed errors. No reads of user PII, no access to bank tokens, no writes to entitlements.

---

## Storage Estimate

| Metric | Value |
|--------|-------|
| Avg transactions/user/day | 30 |
| Bytes per transaction row | ~200 bytes |
| Users (year 1) | 1,000 |
| Transaction rows/year | ~11M |
| Transaction table size | ~2.2 GB/year |
| Supabase Pro storage | 8 GB included |
| Headroom | ~3.5 years before storage upgrade |

**Partitioning trigger:** Apply `pg_partman` monthly partitioning when `transactions` exceeds 10M rows.

---

## Default Categories Seed

```sql
INSERT INTO categories (id, user_id, name, default_type, icon, colour_hex) VALUES
  (gen_random_uuid(), NULL, 'Life Infrastructure',      'need',   '🏠', '#6366f1'),
  (gen_random_uuid(), NULL, 'Performance & Growth',     'need',   '📈', '#8b5cf6'),
  (gen_random_uuid(), NULL, 'Future Me',                'saving', '💰', '#34d399'),
  (gen_random_uuid(), NULL, 'Relationships & Generosity','want',  '❤️',  '#f472b6'),
  (gen_random_uuid(), NULL, 'Lifestyle Enjoyment',      'want',   '✨', '#fb923c');
```
