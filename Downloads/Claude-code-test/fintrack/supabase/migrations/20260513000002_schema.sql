-- =============================================================================
-- FinTrack — Complete Schema DDL
-- Migration: 20260513000002_schema.sql
-- Date: 2026-05-13
--
-- Creates all 12 application tables in dependency order (parents before children),
-- plus functions, triggers, indexes, category seed data, and pg_cron job stubs.
--
-- RLS policies are intentionally excluded — they live in 20260513000001_rls_policies.sql.
-- All monetary amounts stored as bigint (smallest currency unit — paise/cents/pence).
-- =============================================================================


-- =============================================================================
-- SECTION 1: EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================================================
-- SECTION 2: TABLES (dependency order — parents before children)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. user_profiles
-- One row per auth.users record. PK = auth.users.id (no separate user_id col).
-- DOB stored in Vault (not here) — this stores age_confirmed_at timestamptz.
-- budget_needs + budget_wants + budget_savings must sum to exactly 100.
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_profiles (
  id                   uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name         text        NOT NULL,
  date_of_birth        date        NOT NULL,
  age_confirmed_at     timestamptz NOT NULL,
  base_currency        text        NOT NULL DEFAULT 'USD',
  locale               text        NOT NULL DEFAULT 'en-US',
  monthly_income       bigint,
  budget_needs_pct     numeric(5,2) NOT NULL DEFAULT 50.00,
  budget_wants_pct     numeric(5,2) NOT NULL DEFAULT 30.00,
  budget_savings_pct   numeric(5,2) NOT NULL DEFAULT 20.00,
  weekly_spend_limit   bigint,
  updated_at           timestamptz DEFAULT now(),
  CONSTRAINT chk_budget_pcts CHECK (
    budget_needs_pct + budget_wants_pct + budget_savings_pct = 100
  )
);

COMMENT ON TABLE public.user_profiles
IS 'One row per authenticated user. PK mirrors auth.users.id.
    budget_*_pct columns must sum to 100 (enforced by chk_budget_pcts).
    All monetary columns in smallest currency unit (bigint).';

COMMENT ON COLUMN public.user_profiles.monthly_income
IS 'User-declared monthly income in base_currency smallest unit (bigint). NULL = not set.';

COMMENT ON COLUMN public.user_profiles.weekly_spend_limit
IS 'Optional weekly spend alert threshold in base_currency smallest unit.';


-- -----------------------------------------------------------------------------
-- 2. user_entitlements
-- Written exclusively by RevenueCat webhook Edge Function via service key.
-- Clients are read-only. grace_until supports 7-day lapse grace period.
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_entitlements (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                   text        NOT NULL DEFAULT 'free',
  valid_until            timestamptz,
  grace_until            timestamptz,
  revenuecat_customer_id text,
  store                  text,
  updated_at             timestamptz DEFAULT now()
);

COMMENT ON TABLE public.user_entitlements
IS 'Subscription state. Written only by RevenueCat webhook (service key).
    grace_until = valid_until + 7 days — read during subscription lapse window.
    plan: "free" | "premium". JWT app_metadata.entitlement mirrors this (max 60-min lag).';

COMMENT ON COLUMN public.user_entitlements.store
IS 'apple | google | NULL (free). Needed for refund routing.';


-- -----------------------------------------------------------------------------
-- 3. bank_connections
-- access_token is Vault-encrypted ciphertext — never returned to clients.
-- Clients query bank_connections_safe VIEW (defined in 20260513000001_rls_policies.sql).
-- -----------------------------------------------------------------------------
CREATE TABLE public.bank_connections (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider                text        NOT NULL,
  institution_name        text        NOT NULL,
  institution_logo_url    text,
  access_token            text,
  token_expires_at        timestamptz,
  consent_expires_at      timestamptz,
  tracking_from           timestamptz NOT NULL DEFAULT now(),
  balance_amount          bigint,
  balance_currency        text,
  balance_cached_at       timestamptz,
  last_manual_refresh_at  timestamptz,
  status                  text        NOT NULL DEFAULT 'active',
  created_at              timestamptz DEFAULT now(),
  CONSTRAINT chk_provider CHECK (
    provider IN ('plaid', 'truelayer', 'setu_aa', 'manual')
  ),
  CONSTRAINT chk_status CHECK (
    status IN ('active', 'expired', 'error', 'disconnected')
  )
);

COMMENT ON TABLE public.bank_connections
IS 'Bank/provider connection records. access_token is Vault-encrypted (never client-visible).
    tracking_from = NOW() at connection time — no historical import.
    balance_amount cached by daily pg_cron job; manual refresh rate-limited to 1/15min.';

COMMENT ON COLUMN public.bank_connections.access_token
IS 'Vault-encrypted ciphertext. Never returned via API. Clients use bank_connections_safe VIEW.';

COMMENT ON COLUMN public.bank_connections.balance_amount
IS 'Cached balance in balance_currency smallest unit. Refreshed daily by pg_cron at 06:00 UTC.';


-- -----------------------------------------------------------------------------
-- 4. categories
-- user_id IS NULL = system default (visible to all users, immutable by clients).
-- user_id = auth.uid() = user-created custom category.
-- -----------------------------------------------------------------------------
CREATE TABLE public.categories (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid    REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text    NOT NULL,
  default_type  text    NOT NULL,
  icon          text    NOT NULL,
  colour_hex    text    NOT NULL,
  is_archived   boolean NOT NULL DEFAULT false,
  CONSTRAINT chk_default_type CHECK (
    default_type IN ('need', 'want', 'saving')
  )
);

COMMENT ON TABLE public.categories
IS 'Transaction categories. user_id IS NULL = system default (seeded, immutable by clients).
    user_id set = custom user category. RLS allows reading both; writing own only.';

COMMENT ON COLUMN public.categories.colour_hex
IS 'Hex colour string including # prefix, e.g. "#6366f1".';


-- -----------------------------------------------------------------------------
-- 5. goals
-- current_amount is kept in sync by trg_goal_amount (atomic trigger on transactions).
-- -----------------------------------------------------------------------------
CREATE TABLE public.goals (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           text    NOT NULL,
  target_amount  bigint  NOT NULL,
  current_amount bigint  NOT NULL DEFAULT 0,
  currency       text    NOT NULL,
  target_date    date,
  status         text    NOT NULL DEFAULT 'active',
  created_at     timestamptz DEFAULT now(),
  CONSTRAINT chk_goal_status CHECK (
    status IN ('active', 'achieved', 'archived')
  )
);

COMMENT ON TABLE public.goals
IS 'Savings goals. current_amount is auto-updated by trg_goal_amount trigger on transactions
    (atomic, same DB transaction — not an Edge Function).
    All amounts in currency smallest unit (bigint).';


-- -----------------------------------------------------------------------------
-- 6. transactions
-- Central fact table. provider_txn_id UNIQUE for bank API dedup.
-- dedup_hash SHA-256 (±30min window) for SMS/email dedup.
-- goal_id + txn_type = saving triggers trg_goal_amount.
-- -----------------------------------------------------------------------------
CREATE TABLE public.transactions (
  id                   uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_connection_id   uuid    REFERENCES public.bank_connections(id) ON DELETE SET NULL,
  txn_date             date    NOT NULL,
  description          text    NOT NULL,
  merchant_normalized  text,
  category_id          uuid    REFERENCES public.categories(id) ON DELETE SET NULL,
  txn_type             text    NOT NULL,
  amount               bigint  NOT NULL,
  currency             text    NOT NULL,
  amount_base          bigint  NOT NULL,
  fx_rate_at_insert    numeric(18,8) NOT NULL DEFAULT 1,
  payment_mode         text    NOT NULL DEFAULT 'other',
  source               text    NOT NULL,
  provider_txn_id      text,
  dedup_hash           text    NOT NULL,
  notes                text,
  goal_id              uuid    REFERENCES public.goals(id) ON DELETE SET NULL,
  is_confirmed         boolean NOT NULL DEFAULT false,
  created_at           timestamptz DEFAULT now(),
  CONSTRAINT chk_txn_type CHECK (
    txn_type IN ('need', 'want', 'saving')
  ),
  CONSTRAINT chk_source CHECK (
    source IN ('sms', 'email', 'plaid', 'truelayer', 'setu_aa', 'manual')
  )
);

COMMENT ON TABLE public.transactions
IS 'Central transaction fact table. amount in original currency smallest unit;
    amount_base in user base_currency smallest unit (converted at fx_rate_at_insert).
    dedup_hash = SHA-256 over (user_id, amount, merchant, date ±30min) for SMS/email.
    provider_txn_id UNIQUE for bank API rows (NULL for SMS/email/manual).';

COMMENT ON COLUMN public.transactions.amount
IS 'Transaction amount in currency smallest unit (paise/cents/pence). Never float.';

COMMENT ON COLUMN public.transactions.amount_base
IS 'amount converted to user base_currency at fx_rate_at_insert. Used for aggregations.';

COMMENT ON COLUMN public.transactions.dedup_hash
IS 'SHA-256 fingerprint. Prevents duplicate SMS/email transactions within ±30min window.';

COMMENT ON COLUMN public.transactions.is_confirmed
IS 'false = pending confirmation after SMS parse. true = user confirmed or bank-sourced.';


-- -----------------------------------------------------------------------------
-- 7. weekly_summaries
-- Pre-aggregated by pg_cron Monday 08:00 UTC. Read-only for clients.
-- UNIQUE on (user_id, week_start) — cron job uses UPSERT.
-- -----------------------------------------------------------------------------
CREATE TABLE public.weekly_summaries (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start          date         NOT NULL,
  week_end            date         NOT NULL,
  total_spend         bigint       NOT NULL DEFAULT 0,
  needs_spend         bigint       NOT NULL DEFAULT 0,
  wants_spend         bigint       NOT NULL DEFAULT 0,
  savings_spend       bigint       NOT NULL DEFAULT 0,
  weekly_limit        bigint,
  discipline_score    numeric(5,2),
  category_breakdown  jsonb        DEFAULT '{}',
  computed_at         timestamptz  DEFAULT now()
);

COMMENT ON TABLE public.weekly_summaries
IS 'Pre-aggregated weekly spend totals. Computed by pg_cron every Monday 08:00 UTC.
    discipline_score = formula from CLAUDE.md, clamped [0,100].
    category_breakdown: {category_id: amount_base} JSON object.
    Partial weeks have discipline_score = NULL.';


-- -----------------------------------------------------------------------------
-- 8. monthly_summaries
-- Pre-aggregated by pg_cron 1st of month 02:00 UTC. Read-only for clients.
-- UNIQUE on (user_id, month) — month stores first day of month (e.g. 2026-05-01).
-- -----------------------------------------------------------------------------
CREATE TABLE public.monthly_summaries (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month               date         NOT NULL,
  total_spend         bigint       NOT NULL DEFAULT 0,
  needs_spend         bigint       NOT NULL DEFAULT 0,
  wants_spend         bigint       NOT NULL DEFAULT 0,
  savings_spend       bigint       NOT NULL DEFAULT 0,
  budget_needs        bigint,
  budget_wants        bigint,
  budget_savings      bigint,
  discipline_score    numeric(5,2),
  is_partial          boolean      NOT NULL DEFAULT false,
  daily_breakdown     jsonb        DEFAULT '{}',
  category_breakdown  jsonb        DEFAULT '{}',
  computed_at         timestamptz  DEFAULT now()
);

COMMENT ON TABLE public.monthly_summaries
IS 'Pre-aggregated monthly spend totals. Computed by pg_cron 1st of month 02:00 UTC.
    month column stores first-of-month date (e.g. 2026-05-01).
    is_partial = true when current month is in progress — excluded from annual score.
    budget_* columns snapshot user_profiles.budget_*_pct × monthly_income at compute time.';


-- -----------------------------------------------------------------------------
-- 9. parse_queue
-- Clients INSERT raw SMS/email text for async FastAPI parsing.
-- fintrack_parser role updates status/retry_count/processed_at.
-- Rows with status = 'processed' purged after 30 days by pg_cron.
-- -----------------------------------------------------------------------------
CREATE TABLE public.parse_queue (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_text      text    NOT NULL,
  source_type   text    NOT NULL,
  status        text    NOT NULL DEFAULT 'pending',
  retry_count   int     NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  processed_at  timestamptz,
  CONSTRAINT chk_source_type CHECK (
    source_type IN ('sms', 'email')
  ),
  CONSTRAINT chk_status CHECK (
    status IN ('pending', 'processing', 'processed', 'failed')
  )
);

COMMENT ON TABLE public.parse_queue
IS 'Async SMS/email parse queue. Clients INSERT; fintrack_parser role processes.
    raw_text: on-device pre-screened text (only financial messages forwarded).
    Processed rows purged after 30 days by pg_cron daily 03:00 UTC.';

COMMENT ON COLUMN public.parse_queue.raw_text
IS 'Raw SMS/email text. Never transmitted off-device before insertion here.
    Only structured output {amount, merchant, date, currency, type} leaves the parser.';


-- -----------------------------------------------------------------------------
-- 10. parse_failed
-- Dead-letter table for parser errors. Written by fintrack_parser only.
-- No client access (RLS enabled, zero permissive policies).
-- -----------------------------------------------------------------------------
CREATE TABLE public.parse_failed (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_text       text    NOT NULL,
  source_type    text    NOT NULL,
  error_message  text    NOT NULL,
  failed_at      timestamptz DEFAULT now()
);

COMMENT ON TABLE public.parse_failed
IS 'Dead-letter queue for parse failures. Written by fintrack_parser role only.
    Stores raw_text + error for debugging. Purged after 90 days by pg_cron.
    No client access — RLS enabled with zero permissive policies.';


-- -----------------------------------------------------------------------------
-- 11. balance_history
-- Point-in-time balance snapshots. Written by pg_cron daily 06:00 UTC.
-- user_id denormalised to make RLS policy possible without a join.
-- Old rows (> 90 days) purged by pg_cron.
-- -----------------------------------------------------------------------------
CREATE TABLE public.balance_history (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_connection_id  uuid    NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  user_id             uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_amount      bigint  NOT NULL,
  balance_currency    text    NOT NULL,
  recorded_at         timestamptz DEFAULT now()
);

COMMENT ON TABLE public.balance_history
IS 'Point-in-time balance snapshots for 7-day balance chart.
    user_id denormalised (not just bank_connection_id) to enable RLS without a join.
    Written by pg_cron balance refresh (daily 06:00 UTC). Purged after 90 days.';


-- -----------------------------------------------------------------------------
-- 12. audit_log
-- GDPR/RBI compliance trail. Append-only via service key Edge Functions.
-- user_id ON DELETE SET NULL — audit row kept even after user deletion.
-- No client access.
-- -----------------------------------------------------------------------------
CREATE TABLE public.audit_log (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid    REFERENCES auth.users(id) ON DELETE SET NULL,
  action     text    NOT NULL,
  metadata   jsonb   DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.audit_log
IS 'GDPR/RBI compliance audit trail. Append-only via service key.
    user_id ON DELETE SET NULL — row retained after account deletion (30-day erasure SLA).
    action examples: user_deleted, data_exported, bank_disconnected, sms_parsed.
    No client read or write access (RLS enabled, zero permissive policies).';


-- -----------------------------------------------------------------------------
-- 13. fx_rates
-- Global table — no user FK. Written by pg_cron every 2h (Open Exchange Rates).
-- All authenticated users can read. No client writes.
-- -----------------------------------------------------------------------------
CREATE TABLE public.fx_rates (
  id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  base       text         NOT NULL,
  quote      text         NOT NULL,
  rate       numeric(18,8) NOT NULL,
  fetched_at timestamptz  DEFAULT now()
);

COMMENT ON TABLE public.fx_rates
IS 'FX rate snapshots. Global — no user FK. Written by pg_cron every 2h via service key.
    Open Exchange Rates API: 372 calls/mo (free tier: 1,000/mo).
    Used at transaction insert time to populate transactions.fx_rate_at_insert.
    Query pattern: SELECT rate FROM fx_rates WHERE base=X AND quote=Y ORDER BY fetched_at DESC LIMIT 1.';


-- =============================================================================
-- SECTION 3: FUNCTIONS & TRIGGERS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- set_updated_at() — generic before-update trigger function
-- Stamped on user_profiles (and user_entitlements via separate trigger).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.set_updated_at()
IS 'Generic BEFORE UPDATE trigger function that sets updated_at = now().
    Attach to any table with an updated_at column.';

-- Attach to user_profiles
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Attach to user_entitlements (RevenueCat webhook updates this row)
CREATE TRIGGER trg_user_entitlements_updated_at
  BEFORE UPDATE ON public.user_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- -----------------------------------------------------------------------------
-- update_goal_amount() — auto-updates goals.current_amount
--
-- Fires AFTER INSERT OR UPDATE on transactions.
-- Recomputes current_amount as SUM(amount_base) for all 'saving' transactions
-- linked to the same goal. Atomic — runs in the same DB transaction as the
-- INSERT/UPDATE, so there is no window where the goal is out of sync.
--
-- Design note (CLAUDE.md): this is intentionally a trigger, NOT an Edge Function,
-- to guarantee atomicity. Edge Functions are async and can fail silently.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_goal_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.goal_id IS NOT NULL AND NEW.txn_type = 'saving' THEN
    UPDATE public.goals
    SET current_amount = (
      SELECT COALESCE(SUM(amount_base), 0)
      FROM public.transactions
      WHERE goal_id = NEW.goal_id
        AND txn_type = 'saving'
    )
    WHERE id = NEW.goal_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_goal_amount()
IS 'Atomic goal balance updater. Fired AFTER INSERT OR UPDATE on transactions.
    Recomputes goals.current_amount = SUM(amount_base) for all saving txns on that goal.
    Uses amount_base (base-currency converted) so multi-currency goals are consistent.
    Atomic within the same DB transaction — no Edge Function lag or failure window.';

CREATE TRIGGER trg_goal_amount
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_goal_amount();


-- =============================================================================
-- SECTION 4: INDEXES
-- =============================================================================

-- transactions — primary query patterns
CREATE INDEX idx_txn_user_date
  ON public.transactions(user_id, txn_date DESC);

CREATE INDEX idx_txn_user_date_type
  ON public.transactions(user_id, txn_date, txn_type);

-- transactions — deduplication (unique)
CREATE UNIQUE INDEX idx_txn_dedup_hash
  ON public.transactions(dedup_hash);

-- transactions — provider dedup (unique, NULLS NOT DISTINCT so multiple NULLs allowed)
CREATE UNIQUE INDEX idx_txn_provider_id
  ON public.transactions(provider_txn_id) NULLS NOT DISTINCT;

-- bank_connections — user status lookup + token expiry scan
CREATE INDEX idx_bank_user_status
  ON public.bank_connections(user_id, status);

CREATE INDEX idx_bank_token_expiry
  ON public.bank_connections(token_expires_at)
  WHERE status = 'active';

-- weekly/monthly summaries — unique per user per period (cron UPSERTs)
CREATE UNIQUE INDEX idx_weekly_user_week
  ON public.weekly_summaries(user_id, week_start);

CREATE UNIQUE INDEX idx_monthly_user_month
  ON public.monthly_summaries(user_id, month);

-- fx_rates — latest rate lookup
CREATE INDEX idx_fx_base_quote_time
  ON public.fx_rates(base, quote, fetched_at DESC);

-- transactions — goal linkage (sparse, only saving transactions)
CREATE INDEX idx_txn_goal
  ON public.transactions(goal_id)
  WHERE goal_id IS NOT NULL;

-- balance_history — time-series per connection (7-day chart)
CREATE INDEX idx_bal_hist_conn_time
  ON public.balance_history(bank_connection_id, recorded_at DESC);

-- parse_queue — worker poll (only pending/processing rows indexed)
CREATE INDEX idx_queue_status_created
  ON public.parse_queue(status, created_at)
  WHERE status IN ('pending', 'processing');

-- audit_log — time-ordered compliance queries
CREATE INDEX idx_audit_created
  ON public.audit_log(created_at);

-- user_entitlements — user lookup (also covered by UNIQUE, belt-and-suspenders)
CREATE INDEX idx_entitlements_user
  ON public.user_entitlements(user_id);


-- =============================================================================
-- SECTION 5: CATEGORY SEED DATA
-- user_id = NULL → system defaults, visible to all users, immutable by clients.
-- Five categories matching the 50/30/20 budget framework (need/want/saving).
-- =============================================================================

INSERT INTO public.categories (id, user_id, name, default_type, icon, colour_hex) VALUES
  (gen_random_uuid(), NULL, 'Life Infrastructure',        'need',   '🏠', '#6366f1'),
  (gen_random_uuid(), NULL, 'Performance & Growth',       'need',   '📈', '#8b5cf6'),
  (gen_random_uuid(), NULL, 'Future Me',                  'saving', '💰', '#34d399'),
  (gen_random_uuid(), NULL, 'Relationships & Generosity', 'want',   '❤️', '#f472b6'),
  (gen_random_uuid(), NULL, 'Lifestyle Enjoyment',        'want',   '✨', '#fb923c');

COMMENT ON TABLE public.categories
IS 'System defaults seeded above (user_id IS NULL): 2 need, 1 saving, 2 want.
    Aligns with 50/30/20 budget split (needs/wants/savings).';


-- =============================================================================
-- SECTION 6: pg_cron STUB PROCEDURES & JOB SCHEDULE
--
-- Procedures are intentionally empty stubs — implementation deferred to the
-- sprints that build bank integrations (E4) and reporting (E5).
-- pg_cron schedules are registered now so the job names are stable and
-- cron.job_run_details telemetry starts accumulating from day one.
--
-- All times UTC. 8 jobs total (7 from spec + 1 balance_history cleanup).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Stub procedure: daily balance refresh (staggered 50 connections/hr, 2s delay)
CREATE OR REPLACE PROCEDURE public.refresh_bank_balances()
LANGUAGE plpgsql AS $$
BEGIN
  -- TODO (E4 Sprint 5): Iterate active bank_connections, call provider APIs,
  --   update bank_connections.balance_amount + balance_cached_at,
  --   insert row into balance_history. Process max 50/hr with 2s delay
  --   to prevent Plaid/TrueLayer thundering herd.
END;
$$;

COMMENT ON PROCEDURE public.refresh_bank_balances()
IS 'Stub. Refreshes cached balances for all active bank connections.
    Scheduled: daily 06:00 UTC. Processes max 50 connections/hr (staggered).
    Inserts into balance_history; updates bank_connections.balance_cached_at.';

-- Stub procedure: token expiry alerts (7 days warning)
CREATE OR REPLACE PROCEDURE public.check_token_expiry()
LANGUAGE plpgsql AS $$
BEGIN
  -- TODO (E4 Sprint 5): SELECT bank_connections WHERE token_expires_at
  --   BETWEEN NOW() AND NOW() + INTERVAL '7 days' AND status = 'active'.
  --   Send push notification / email for each expiring connection.
END;
$$;

COMMENT ON PROCEDURE public.check_token_expiry()
IS 'Stub. Alerts users 7 days before Plaid/TrueLayer access token expires.
    Scheduled: daily 07:00 UTC.';

-- Stub procedure: FX rate fetch (Open Exchange Rates API)
CREATE OR REPLACE PROCEDURE public.fetch_fx_rates()
LANGUAGE plpgsql AS $$
BEGIN
  -- TODO (E1 Sprint 2): Call Open Exchange Rates API for all currency pairs
  --   (USD, GBP, EUR, INR). Insert rows into fx_rates.
  --   372 calls/mo on every-2h schedule (free tier: 1,000/mo).
END;
$$;

COMMENT ON PROCEDURE public.fetch_fx_rates()
IS 'Stub. Fetches latest FX rates from Open Exchange Rates API and inserts into fx_rates.
    Scheduled: every 2 hours (0 */2 * * *). 372 calls/mo — within free tier.';

-- Stub procedure: weekly discipline score computation
CREATE OR REPLACE PROCEDURE public.compute_weekly_summaries()
LANGUAGE plpgsql AS $$
BEGIN
  -- TODO (E5 Sprint 8): For each user, aggregate transactions for the past week.
  --   Compute discipline_score using formula from CLAUDE.md.
  --   Upsert into weekly_summaries (unique on user_id, week_start).
  --   Skip partial weeks for annual score (is_partial flag on monthly_summaries).
END;
$$;

COMMENT ON PROCEDURE public.compute_weekly_summaries()
IS 'Stub. Aggregates weekly spend and computes discipline scores for all users.
    Scheduled: Monday 08:00 UTC (0 8 * * 1).
    Formula: score = 100 - (|needs_delta|×0.5 + |wants_delta|×0.3 + |savings_delta|×0.2) × 2, clamped [0,100].';

-- Stub procedure: monthly summary pre-aggregation
CREATE OR REPLACE PROCEDURE public.compute_monthly_summaries()
LANGUAGE plpgsql AS $$
BEGIN
  -- TODO (E5 Sprint 8): For each user, aggregate transactions for the prior month.
  --   Snapshot budget_* from user_profiles at compute time.
  --   Upsert into monthly_summaries (unique on user_id, month).
  --   Set is_partial = false (prior month is complete).
END;
$$;

COMMENT ON PROCEDURE public.compute_monthly_summaries()
IS 'Stub. Pre-aggregates monthly spend totals and discipline scores for all users.
    Scheduled: 1st of month 02:00 UTC (0 2 1 * *).
    Snapshots budget_* from user_profiles so historical reports are stable.';

-- Stub procedure: Setu AA re-consent alerts (India, 30-day warning)
CREATE OR REPLACE PROCEDURE public.send_reconsent_alerts()
LANGUAGE plpgsql AS $$
BEGIN
  -- TODO (E4 Sprint 6): SELECT bank_connections WHERE provider = 'setu_aa'
  --   AND consent_expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'.
  --   Send push notification to affected users.
END;
$$;

COMMENT ON PROCEDURE public.send_reconsent_alerts()
IS 'Stub. Alerts India users 30 days before Setu AA consent expires.
    Scheduled: daily 09:00 UTC (0 9 * * *).';

-- Stub procedure: Setu AA transaction pull (India, no webhook — must poll)
CREATE OR REPLACE PROCEDURE public.pull_setu_aa_transactions()
LANGUAGE plpgsql AS $$
BEGIN
  -- TODO (E4 Sprint 6): For each active setu_aa bank_connection, call Setu AA
  --   fetch transactions API. Dedup via dedup_hash. Insert into transactions.
  --   Setu AA has no webhook — polling every 4h is the required approach.
END;
$$;

COMMENT ON PROCEDURE public.pull_setu_aa_transactions()
IS 'Stub. Polls Setu Account Aggregator for new India transactions (no webhook available).
    Scheduled: every 4 hours (0 */4 * * *).';

-- Register all pg_cron jobs
-- Using SELECT not DO block so errors surface immediately during migration.

SELECT cron.schedule(
  'balance-refresh',
  '0 6 * * *',
  'CALL public.refresh_bank_balances()'
);

SELECT cron.schedule(
  'token-expiry-check',
  '0 7 * * *',
  'CALL public.check_token_expiry()'
);

SELECT cron.schedule(
  'fx-rate-fetch',
  '0 */2 * * *',
  'CALL public.fetch_fx_rates()'
);

SELECT cron.schedule(
  'weekly-summaries',
  '0 8 * * 1',
  'CALL public.compute_weekly_summaries()'
);

SELECT cron.schedule(
  'monthly-summaries',
  '0 2 1 * *',
  'CALL public.compute_monthly_summaries()'
);

SELECT cron.schedule(
  'parse-queue-cleanup',
  '0 3 * * *',
  $$DELETE FROM public.parse_queue WHERE status = 'processed' AND processed_at < NOW() - INTERVAL '30 days'$$
);

SELECT cron.schedule(
  'reconsent-alerts',
  '0 9 * * *',
  'CALL public.send_reconsent_alerts()'
);

SELECT cron.schedule(
  'setu-aa-pull',
  '0 */4 * * *',
  'CALL public.pull_setu_aa_transactions()'
);

SELECT cron.schedule(
  'balance-history-cleanup',
  '0 4 * * *',
  $$DELETE FROM public.balance_history WHERE recorded_at < NOW() - INTERVAL '90 days'$$
);
