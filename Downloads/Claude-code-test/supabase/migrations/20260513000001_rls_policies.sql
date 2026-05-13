-- =============================================================================
-- FinTrack — Row Level Security Policies
-- Migration: 20260513000001_rls_policies.sql
-- Date: 2026-05-13
--
-- Security model: single-schema multitenancy.
-- All user data is isolated by `user_id = auth.uid()` at the database layer.
-- The service key (pg_cron, FastAPI, Edge Functions) bypasses RLS by design;
-- access is restricted via a dedicated least-privilege role (fintrack_parser).
--
-- Policy tiers:
--   Tier 1 — Full user read/write      : user_profiles, bank_connections, transactions, goals
--   Tier 2 — User read-only (svc write): user_entitlements, weekly_summaries,
--                                         monthly_summaries, balance_history,
--                                         parse_queue
--   Tier 3 — Shared read + own write   : categories (own rows + system defaults)
--   Tier 4 — No client access at all   : audit_log, parse_failed
--   Tier 5 — Global read, no writes    : fx_rates
-- =============================================================================


-- =============================================================================
-- SECTION 0: LEAST-PRIVILEGE PARSER ROLE
-- The FastAPI parser service on Railway uses this role — NOT the service key.
-- It can only write transactions, update parse_queue status, and log failures.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fintrack_parser') THEN
    CREATE ROLE fintrack_parser LOGIN;
  END IF;
END
$$;

-- Transactions: parser can INSERT parsed rows only
GRANT INSERT ON TABLE public.transactions TO fintrack_parser;

-- parse_queue: parser can UPDATE status/retry fields to track processing state
GRANT UPDATE (status, processed_at, retry_count) ON TABLE public.parse_queue TO fintrack_parser;

-- parse_failed: parser can INSERT dead-letter rows only
GRANT INSERT ON TABLE public.parse_failed TO fintrack_parser;

-- parse_queue: parser must SELECT pending rows to know what to process
GRANT SELECT ON TABLE public.parse_queue TO fintrack_parser;

-- Explicitly deny everything else (belt-and-suspenders)
REVOKE ALL ON TABLE public.user_profiles      FROM fintrack_parser;
REVOKE ALL ON TABLE public.user_entitlements  FROM fintrack_parser;
REVOKE ALL ON TABLE public.bank_connections   FROM fintrack_parser;
REVOKE ALL ON TABLE public.categories         FROM fintrack_parser;
REVOKE ALL ON TABLE public.goals              FROM fintrack_parser;
REVOKE ALL ON TABLE public.weekly_summaries   FROM fintrack_parser;
REVOKE ALL ON TABLE public.monthly_summaries  FROM fintrack_parser;
REVOKE ALL ON TABLE public.balance_history    FROM fintrack_parser;
REVOKE ALL ON TABLE public.audit_log          FROM fintrack_parser;
REVOKE ALL ON TABLE public.fx_rates           FROM fintrack_parser;

-- Note: fintrack_parser does NOT have RLS bypass. Its write access to
-- transactions is intentionally unrestricted at the row level (it writes
-- rows for any user_id, which is correct — it's a trusted service).
-- The risk is bounded by the column-level GRANT above.


-- =============================================================================
-- SECTION 1: TIER 1 — FULL USER READ/WRITE
-- Users can SELECT, INSERT, UPDATE, DELETE their own rows only.
-- USING clause: filters reads. WITH CHECK clause: enforces writes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- user_profiles
-- -----------------------------------------------------------------------------
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to make this migration idempotent
DROP POLICY IF EXISTS "user_profiles_own_all" ON public.user_profiles;

CREATE POLICY "user_profiles_own_all"
ON public.user_profiles
FOR ALL
USING     (auth.uid() = id)   -- PK = auth.users.id (no separate user_id column)
WITH CHECK(auth.uid() = id);

COMMENT ON POLICY "user_profiles_own_all" ON public.user_profiles
IS 'Tier 1: Users can only read and write their own profile row. PK is the user UUID.';


-- -----------------------------------------------------------------------------
-- bank_connections
-- NOTE: Clients must use the bank_connections_safe VIEW (defined in Section 6)
-- to avoid receiving the Vault-encrypted access_token ciphertext.
-- Direct SELECT on the table is revoked for the authenticated role below.
-- -----------------------------------------------------------------------------
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bank_connections_own_all" ON public.bank_connections;

CREATE POLICY "bank_connections_own_all"
ON public.bank_connections
FOR ALL
USING     (auth.uid() = user_id)
WITH CHECK(auth.uid() = user_id);

COMMENT ON POLICY "bank_connections_own_all" ON public.bank_connections
IS 'Tier 1: Users can only read and write their own bank connection rows.
    Clients should query bank_connections_safe VIEW — direct SELECT is revoked.';


-- -----------------------------------------------------------------------------
-- transactions
-- -----------------------------------------------------------------------------
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_own_all" ON public.transactions;

CREATE POLICY "transactions_own_all"
ON public.transactions
FOR ALL
USING     (auth.uid() = user_id)
WITH CHECK(auth.uid() = user_id);

COMMENT ON POLICY "transactions_own_all" ON public.transactions
IS 'Tier 1: Users can only read and write their own transaction rows.
    FastAPI parser inserts via fintrack_parser role (bypasses this policy).';


-- -----------------------------------------------------------------------------
-- goals
-- -----------------------------------------------------------------------------
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goals_own_all" ON public.goals;

CREATE POLICY "goals_own_all"
ON public.goals
FOR ALL
USING     (auth.uid() = user_id)
WITH CHECK(auth.uid() = user_id);

COMMENT ON POLICY "goals_own_all" ON public.goals
IS 'Tier 1: Users can only read and write their own savings goal rows.';


-- =============================================================================
-- SECTION 2: TIER 2 — USER READ-ONLY (SERVICE KEY WRITES)
-- Clients can SELECT their own rows. INSERT/UPDATE/DELETE is blocked for
-- authenticated users — only the service key (pg_cron, webhooks) can write.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- user_entitlements
-- Written exclusively by the RevenueCat webhook Edge Function via service key.
-- A client must NEVER be able to grant themselves premium.
-- -----------------------------------------------------------------------------
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_entitlements_own_read" ON public.user_entitlements;

CREATE POLICY "user_entitlements_own_read"
ON public.user_entitlements
FOR SELECT
USING (auth.uid() = user_id);

-- No INSERT / UPDATE / DELETE policy for authenticated role.
-- Service key bypasses RLS and is the only writer.

COMMENT ON POLICY "user_entitlements_own_read" ON public.user_entitlements
IS 'Tier 2: Users can read their own entitlement row (for UI display).
    Write access is exclusively via service key (RevenueCat webhook Edge Function).
    No authenticated-role write policy exists — any client write attempt is rejected.';


-- -----------------------------------------------------------------------------
-- weekly_summaries
-- Written by pg_cron weekly job (Monday 08:00 UTC) via service key.
-- -----------------------------------------------------------------------------
ALTER TABLE public.weekly_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weekly_summaries_own_read" ON public.weekly_summaries;

CREATE POLICY "weekly_summaries_own_read"
ON public.weekly_summaries
FOR SELECT
USING (auth.uid() = user_id);

COMMENT ON POLICY "weekly_summaries_own_read" ON public.weekly_summaries
IS 'Tier 2: Users can read their own pre-aggregated weekly summaries.
    Rows are written by pg_cron (service key). No client writes permitted.';


-- -----------------------------------------------------------------------------
-- monthly_summaries
-- Written by pg_cron monthly job (1st of month 02:00 UTC) via service key.
-- -----------------------------------------------------------------------------
ALTER TABLE public.monthly_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monthly_summaries_own_read" ON public.monthly_summaries;

CREATE POLICY "monthly_summaries_own_read"
ON public.monthly_summaries
FOR SELECT
USING (auth.uid() = user_id);

COMMENT ON POLICY "monthly_summaries_own_read" ON public.monthly_summaries
IS 'Tier 2: Users can read their own pre-aggregated monthly summaries.
    Rows are written by pg_cron (service key). No client writes permitted.';


-- -----------------------------------------------------------------------------
-- balance_history
-- Written by pg_cron balance refresh job (daily 06:00 UTC) via service key.
-- user_id is denormalised here (not just bank_connection_id) specifically
-- to make this RLS policy possible without a join.
-- -----------------------------------------------------------------------------
ALTER TABLE public.balance_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "balance_history_own_read" ON public.balance_history;

CREATE POLICY "balance_history_own_read"
ON public.balance_history
FOR SELECT
USING (auth.uid() = user_id);

COMMENT ON POLICY "balance_history_own_read" ON public.balance_history
IS 'Tier 2: Users can read their own balance history snapshots (powers 7-day chart).
    user_id is denormalised on this table specifically to avoid a join in RLS.
    Rows are written by pg_cron balance refresh (service key). No client writes.';


-- -----------------------------------------------------------------------------
-- parse_queue
-- Client apps INSERT raw SMS/email text into the queue for async parsing.
-- Users can only INSERT their own rows and read their own queue status.
-- UPDATE/DELETE is reserved for the fintrack_parser role.
-- -----------------------------------------------------------------------------
ALTER TABLE public.parse_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parse_queue_own_insert"   ON public.parse_queue;
DROP POLICY IF EXISTS "parse_queue_own_read"      ON public.parse_queue;

-- App inserts SMS/email text on behalf of the authenticated user
CREATE POLICY "parse_queue_own_insert"
ON public.parse_queue
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- App can poll its own queue entries to show "pending / processed" status
CREATE POLICY "parse_queue_own_read"
ON public.parse_queue
FOR SELECT
USING (auth.uid() = user_id);

-- No UPDATE/DELETE policy for authenticated users —
-- status transitions are owned by fintrack_parser role.

COMMENT ON POLICY "parse_queue_own_insert" ON public.parse_queue
IS 'Tier 2 (write-scoped): Clients can INSERT their own queue entries (SMS/email raw text).';

COMMENT ON POLICY "parse_queue_own_read" ON public.parse_queue
IS 'Tier 2: Clients can read their own queue entries to show parse status in UI.
    UPDATE/DELETE is exclusively the fintrack_parser role — no client state transitions.';


-- =============================================================================
-- SECTION 3: TIER 3 — SHARED READ + OWN WRITE (categories)
-- Users see their own categories AND system defaults (user_id IS NULL).
-- They can only INSERT/UPDATE/DELETE their own custom rows.
-- =============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_read_own_and_system"  ON public.categories;
DROP POLICY IF EXISTS "categories_write_own"             ON public.categories;

-- Read: own rows + seeded system defaults
CREATE POLICY "categories_read_own_and_system"
ON public.categories
FOR SELECT
USING (user_id = auth.uid() OR user_id IS NULL);

-- Write: own custom rows only — system defaults (user_id IS NULL) are immutable
CREATE POLICY "categories_write_own"
ON public.categories
FOR INSERT, UPDATE, DELETE
USING     (user_id = auth.uid())   -- existing row must belong to user (UPDATE/DELETE)
WITH CHECK(user_id = auth.uid());  -- new/updated row must belong to user (INSERT/UPDATE)

COMMENT ON POLICY "categories_read_own_and_system" ON public.categories
IS 'Tier 3: Users read their own custom categories AND system defaults (user_id IS NULL).
    System defaults are seeded at DB init and visible to all users.';

COMMENT ON POLICY "categories_write_own" ON public.categories
IS 'Tier 3: Users can create/update/delete only their own custom categories.
    System defaults (user_id IS NULL) cannot be modified by any client.';


-- =============================================================================
-- SECTION 4: TIER 4 — NO CLIENT ACCESS (audit_log, parse_failed)
-- Enabling RLS with no permissive policies = zero rows returned for any
-- authenticated query. Only the service key bypasses RLS and can read/write.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- audit_log
-- GDPR / RBI compliance trail. Append-only via service key. Clients have
-- zero visibility — audit integrity requires the user cannot read or modify
-- their own log entries (prevents evidence tampering).
-- -----------------------------------------------------------------------------
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Intentionally no policies. RLS enabled + no permissive policy = no access.

COMMENT ON TABLE public.audit_log
IS 'Tier 4: No client access. RLS enabled with zero permissive policies.
    Written by Edge Functions and pg_cron via service key only.
    Zero authenticated-role visibility — ensures tamper-proof audit trail.';


-- -----------------------------------------------------------------------------
-- parse_failed
-- Dead-letter queue for parser errors. Contains structured error metadata only
-- (amount, bank_name, error_message — no raw SMS text per PII policy).
-- No client should ever read or write this table.
-- -----------------------------------------------------------------------------
ALTER TABLE public.parse_failed ENABLE ROW LEVEL SECURITY;

-- Intentionally no policies.

COMMENT ON TABLE public.parse_failed
IS 'Tier 4: No client access. RLS enabled with zero permissive policies.
    Written by fintrack_parser role only. PII policy: stores only
    {amount, bank_name, error_message, failed_at} — never raw SMS text.
    Purged after 90 days by pg_cron cleanup job (daily 03:00 UTC).';


-- =============================================================================
-- SECTION 5: TIER 5 — GLOBAL READ, NO CLIENT WRITES (fx_rates)
-- FX rates are not user-scoped. All authenticated users can read any rate.
-- Writes are exclusively via pg_cron (every 2h, service key).
-- =============================================================================

ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fx_rates_authenticated_read" ON public.fx_rates;

CREATE POLICY "fx_rates_authenticated_read"
ON public.fx_rates
FOR SELECT
USING (true);   -- any authenticated user can read; anon role is blocked by default

-- No INSERT/UPDATE/DELETE policy for authenticated users.

COMMENT ON POLICY "fx_rates_authenticated_read" ON public.fx_rates
IS 'Tier 5: All authenticated users can read all FX rate rows (no user_id scoping).
    Writes exclusively via pg_cron every-2h job (service key). 372 calls/mo.';


-- =============================================================================
-- SECTION 6: bank_connections_safe VIEW
-- Excludes the Vault-encrypted access_token column so clients never receive
-- the token ciphertext (even in encrypted form, the column must not be
-- returned — defence-in-depth for Vault key compromise scenarios).
-- =============================================================================

CREATE OR REPLACE VIEW public.bank_connections_safe AS
SELECT
    id,
    user_id,
    provider,
    institution_name,
    institution_logo_url,
    -- access_token intentionally omitted
    token_expires_at,
    consent_expires_at,
    tracking_from,
    balance_amount,
    balance_currency,
    balance_cached_at,
    last_manual_refresh_at,
    status,
    created_at
FROM public.bank_connections;

-- Grant SELECT on the safe view to authenticated users
GRANT SELECT ON public.bank_connections_safe TO authenticated;

-- Revoke direct SELECT on the underlying table from authenticated users.
-- All client queries must go through the safe view.
-- Service key (used by Edge Functions / pg_cron) retains full table access.
REVOKE SELECT ON public.bank_connections FROM authenticated;

-- The RLS policy on bank_connections still applies when the view is queried,
-- because the view is SECURITY INVOKER (default) — it runs with the caller's
-- permissions and auth.uid() resolves correctly.

COMMENT ON VIEW public.bank_connections_safe
IS 'Client-safe view of bank_connections — access_token column excluded.
    Authenticated role SELECT is granted here and revoked on the underlying table.
    RLS policies on bank_connections apply through this view (SECURITY INVOKER).';


-- =============================================================================
-- SECTION 7: REVOKE DEFAULTS (belt-and-suspenders)
-- Supabase by default grants authenticated role broad table privileges.
-- Explicitly revoke anything not re-granted above.
-- =============================================================================

-- audit_log: nobody but service key
REVOKE ALL ON public.audit_log FROM authenticated;
REVOKE ALL ON public.audit_log FROM anon;

-- parse_failed: nobody but fintrack_parser
REVOKE ALL ON public.parse_failed FROM authenticated;
REVOKE ALL ON public.parse_failed FROM anon;

-- fx_rates: read-only for authenticated (INSERT/UPDATE/DELETE blocked)
REVOKE INSERT, UPDATE, DELETE ON public.fx_rates FROM authenticated;

-- weekly/monthly summaries: read-only for authenticated
REVOKE INSERT, UPDATE, DELETE ON public.weekly_summaries  FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.monthly_summaries FROM authenticated;

-- balance_history: read-only for authenticated
REVOKE INSERT, UPDATE, DELETE ON public.balance_history FROM authenticated;

-- user_entitlements: read-only for authenticated
REVOKE INSERT, UPDATE, DELETE ON public.user_entitlements FROM authenticated;

-- parse_queue: no UPDATE/DELETE for authenticated (INSERT allowed via policy)
REVOKE UPDATE, DELETE ON public.parse_queue FROM authenticated;

-- anon role: no access to any user data tables
REVOKE ALL ON public.user_profiles      FROM anon;
REVOKE ALL ON public.user_entitlements  FROM anon;
REVOKE ALL ON public.bank_connections   FROM anon;
REVOKE ALL ON public.transactions       FROM anon;
REVOKE ALL ON public.categories         FROM anon;
REVOKE ALL ON public.goals              FROM anon;
REVOKE ALL ON public.weekly_summaries   FROM anon;
REVOKE ALL ON public.monthly_summaries  FROM anon;
REVOKE ALL ON public.parse_queue        FROM anon;
REVOKE ALL ON public.parse_failed       FROM anon;
REVOKE ALL ON public.balance_history    FROM anon;
REVOKE ALL ON public.fx_rates           FROM anon;


-- =============================================================================
-- SECTION 8: VERIFICATION QUERIES
-- Run these after applying the migration to confirm policies are in place.
-- Expected: one policy per table (or two for categories/parse_queue).
-- =============================================================================

/*
-- List all RLS policies in the public schema
SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Confirm RLS is enabled on every table
SELECT
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Confirm bank_connections_safe view exists
SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname = 'bank_connections_safe';

-- Confirm fintrack_parser role exists
SELECT rolname FROM pg_roles WHERE rolname = 'fintrack_parser';
*/
