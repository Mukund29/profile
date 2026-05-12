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

**Note:** One API call/hour returns all currency pairs simultaneously. 720 calls/month = within free tier (1,000/mo limit).

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

-- Parser queue polling
CREATE INDEX idx_queue_status_created ON parse_queue(status, created_at)
  WHERE status IN ('pending', 'processing');
```

---

## Row Level Security Policies

```sql
-- All tables follow this pattern:
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own transactions"
ON transactions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Categories: user sees own + system defaults
CREATE POLICY "Users see own and system categories"
ON categories FOR SELECT
USING (user_id = auth.uid() OR user_id IS NULL);
```

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
