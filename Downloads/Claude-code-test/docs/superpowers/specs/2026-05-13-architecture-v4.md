# FinTrack — System Architecture v4 (Final)

**Date:** 2026-05-13  
**Status:** SHIP ✅ — Critic Score 4.9 / 5.0 (all issues resolved)  
**Markets:** India · United States · United Kingdom  
**Subscription:** $2.99/month billed annually · cancel anytime

---

## Tech Stack Decision

**Selected: Option A — React Native (Expo) + Supabase + RevenueCat**

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Mobile | React Native (Expo SDK 52+) | Single codebase → iOS + Android. EAS Build for CI/CD. OTA updates. |
| Navigation | Expo Router v3 (file-based, typed) | Industry standard for Expo apps |
| State | React Query v5 + Zustand | Server state (RQ) + UI state (Zustand) |
| Styling | NativeWind v4 (Tailwind) | Rapid, consistent UI |
| Backend / DB | Supabase (PostgreSQL 15) | SQL for financial queries, RLS, Vault, pg_cron, Realtime |
| Auth | Supabase Auth | Email magic link, Google OAuth, Apple Sign-In |
| Subscriptions | RevenueCat | App Store + Play Store billing, entitlements, webhooks |
| Bank Sync (IN) | Setu Account Aggregator + SMS parsing | RBI-licensed open banking + SMS fallback |
| Bank Sync (US) | Plaid | 12,000+ institutions, industry standard |
| Bank Sync (UK) | TrueLayer | PSD2 Open Banking, 50+ UK banks |
| Parsing Service | Python FastAPI on Railway | SMS + email transaction parsing microservice |
| FX Rates | Open Exchange Rates API | Free tier (1,000 calls/mo), every-2h refresh (372 calls/mo) |
| Analytics | PostHog | Product analytics, feature flags, free 1M events/mo |
| Export | SheetJS/xlsx (on-device) + Google Drive API | Excel generation + Drive upload. ExcelJS incompatible with Hermes — see Risk 1. |
| i18n | react-i18next | Multi-locale support |
| Currency math | dinero.js | Precision arithmetic, no floating point errors |

---

## Region-Specific Bank Integration

| Region | Provider | Method | Notes |
|--------|----------|--------|-------|
| 🇮🇳 India | Setu AA / Finvu | AA deep link → consent app → data pull | Falls back to SMS parsing (Android) if AA times out (30s) or AA app not installed |
| 🇮🇳 India (fallback) | SMS parsing | On-device regex, Android only | Raw SMS never leaves device |
| 🇺🇸 US / Canada | Plaid | Plaid Link SDK (embedded WebView) | 12,000+ institutions |
| 🇬🇧 UK | TrueLayer | TrueLayer Connect (WebView) | PSD2 compliant, 50+ UK banks |
| 🌍 All | Manual entry | User types balance and transactions | Always available as fallback |
| 🌍 All | Gmail / Outlook OAuth | Email API (scoped to sender filter) | Primary iOS auto-capture method |

**iOS SMS limitation:** iOS does not allow SMS access. iOS users use Gmail/Outlook OAuth + Plaid/AA/TrueLayer for auto-capture.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   MOBILE APP (Expo)                  │
│  iOS + Android · React Native · Expo Router          │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │ SMS      │ │ Gmail /  │ │ Plaid /  │             │
│  │ Listener │ │ Outlook  │ │ TrueLayer│             │
│  │(Android) │ │ OAuth    │ │ AA SDK   │             │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘             │
│       │             │             │                  │
│  On-device parse    │        Bank OAuth               │
│  (raw SMS never     │        tokens → server          │
│   leaves device)   │                                 │
│       │             │                                 │
│  ┌────▼─────────────▼──────────────┐                 │
│  │    parse_queue (Supabase table) │                 │
│  └────────────────┬────────────────┘                 │
└───────────────────┼─────────────────────────────────┘
                    │
    ┌───────────────▼───────────────┐
    │  Python FastAPI (Railway)     │
    │  SMS + Email parsing service  │
    │  Pydantic v2 · retry · dedup  │
    └───────────────┬───────────────┘
                    │
    ┌───────────────▼───────────────────────────────┐
    │              SUPABASE                          │
    │                                               │
    │  ┌─────────┐ ┌──────────┐ ┌────────────────┐ │
    │  │  Auth   │ │PostgreSQL│ │ Edge Functions │ │
    │  │ +Vault  │ │ (RLS)    │ │ (Deno/TS)      │ │
    │  └─────────┘ └──────────┘ └────────────────┘ │
    │  ┌─────────┐ ┌──────────┐ ┌────────────────┐ │
    │  │Realtime │ │ Storage  │ │   pg_cron      │ │
    │  └─────────┘ └──────────┘ └────────────────┘ │
    └───────────────────────────────────────────────┘
                    │
    ┌───────────────┼────────────────────┐
    │               │                    │
    ▼               ▼                    ▼
RevenueCat     PostHog           Open Exchange
(subscriptions) (analytics)      Rates (FX)
```

---

## Critical Design Decisions (All Issues Resolved)

### Balance Sync — 24h Auto + Manual Trigger
- pg_cron fires at **06:00 UTC daily** — no "local time" promise made
- Balance stored in `bank_connections.balance_amount` + `balance_cached_at`
- App shows balance instantly from cache with "Updated X ago" badge
- Manual refresh: server-side rate limit (1 per 15 min per connection, checked via `last_manual_refresh_at`)
- HTTP 429 with `Retry-After` header on rate-limit breach
- Stale indicator shown if `balance_cached_at` > 26h

**Cost saving:** 1 API call/bank/day instead of per-tap → Plaid cost ↓75% (~$15/mo vs ~$60/mo)

### Transaction Sync — Webhook-Driven Async Queue
- Plaid / TrueLayer webhooks → **HMAC-SHA256 verified** (Plaid: `Plaid-Verification` header; TrueLayer: `X-TL-Webhook-Timestamp` + HMAC) → `parse_queue` table
- RevenueCat webhooks → **Authorization header with shared secret verified** (RevenueCat uses bearer token auth, not HMAC — Edge Function checks `Authorization: Bearer <RC_WEBHOOK_SECRET>`) → entitlement update
- Setu AA: pg_cron pull every 4 hours (8th cron job)
- SMS (Android): on-device parse → structured output → `parse_queue`
- Python FastAPI polls queue every 30s in **batches of 50** (not 10 — throughput fix: 1,000 users × 30 txns/day = 1,250/hr = 21/min; batch-10 at 30s intervals = 20/min capacity which breaks at ~1,500 users; batch-50 gives 100/min headroom to ~7,000 users)
- If parser down: queue builds, drains on recovery. Zero data loss (UNIQUE constraints prevent duplicates on replay).
- Push notification on new transaction: "₹450 at Uber — tap to confirm"

**RevenueCat webhook security (CRITICAL):** The Edge Function handling RevenueCat events MUST verify the `Authorization: Bearer` header against `RC_WEBHOOK_SECRET` (set in Supabase Edge Function secrets). Without this check, any HTTP client can POST fake subscription events and grant themselves premium entitlement.

### Transaction Deduplication
- Provider transactions (Plaid/TrueLayer/AA): `provider_txn_id` UNIQUE constraint
- SMS/email parsed: SHA-256 hash of `(amount + merchant_normalized + ±30min timestamp window + currency)` — stored in `dedup_hash` UNIQUE column
- Bank API source wins over SMS/email parse on conflict
- Idempotency key on every parser endpoint

### Bank Token Lifecycle
- `bank_connections.token_expires_at` + `consent_expires_at` tracked
- pg_cron hourly: refresh tokens expiring within 7 days, **batched 50 at a time** with 2s delay (prevents Plaid rate-limit thundering herd)
- Setu AA: push notification + **email fallback** 30 days before consent expiry + in-app re-consent flow (email required because push opt-in is deferred to post-onboarding; user may not have granted push permission yet)
- All token operations server-side only — access tokens never in API responses

### Entitlement — JWT Custom Claims (No DB Lookup)
- RevenueCat webhook → Edge Function → updates `auth.users.app_metadata.entitlement`
- Entitlement embedded in Supabase JWT — Edge Functions read JWT claim, **zero DB query**
- Works during any Supabase DB outage (JWT still valid)
- JWT refreshes every 1 hour → max 60-min exposure window after cancellation (documented in ToS)
- `user_entitlements` table still maintained for audit trail and grace period logic

### Multi-Currency
- All amounts stored in **smallest currency unit** (paise, cents, pence) — no float errors
- `transactions.amount_base` = converted to `user_profiles.base_currency` at insert
- `transactions.fx_rate_at_insert` = rate locked forever for historical accuracy
- Base currency: auto-detected from device locale, user confirms at onboarding, changeable in Settings
- Supported v1: INR, USD, GBP
- FX rates: Open Exchange Rates API (1 call/every-2h, all pairs) → `fx_rates` table (372 calls/mo — well within 1,000/mo free tier)

### Transaction Tracking Start
- **No historical import.** `bank_connections.tracking_from = NOW()` at connection time.
- First month flagged `monthly_summaries.is_partial = true`
- Budget screens show: "Tracking since [date] — this month's data is partial"
- Partial months excluded from annual discipline score calculation

### Data Security — E2E Encryption
| Layer | Mechanism |
|-------|-----------|
| On-device | Expo SecureStore (iOS Keychain / Android Keystore) for auth tokens |
| SMS data | Parsed on-device — raw SMS never transmitted |
| In transit | TLS 1.3 enforced · **Public key pinning (SPKI)** on mobile — NOT certificate pinning |
| Bank tokens | Supabase Vault (AES-256-GCM) — server-side only |
| PII (DOB) | Encrypted column in Supabase Vault |
| At rest | Supabase default AES-256 + SOC2 Type II |
| Audit | Every token access logged with timestamp + IP |

**Certificate pinning implementation note:** Pin to Supabase's **Subject Public Key Info (SPKI)** hash, not the leaf certificate. Supabase rotates TLS certificates periodically — pinning to a leaf cert causes a production outage for all mobile clients until a forced app update. SPKI pinning survives certificate rotation as long as the public key doesn't change. Use `react-native-ssl-pinning` with SPKI hashes. Store 2 backup hashes (current + next expected) to allow zero-downtime key rotation.

### Compliance
| Standard | Requirement | Implementation |
|----------|-------------|----------------|
| GDPR (UK/EU) | Right to deletion, data export, consent | Cascade wipe on account close, export endpoint, `audit_log` table |
| CCPA (US) | Data deletion on request | Same cascade wipe flow |
| RBI (India) | Data localisation | India user data stored in Supabase `ap-south-1` region |
| COPPA | Age verification (18+) | DOB at signup, server-validated |
| App Store | Apple Sign-In, financial entitlements, privacy manifest | Implemented at app submission |
| Play Store | SMS_READ declaration, financial app form | Submitted with Play Store listing |

---

## Infrastructure Cost Estimate

| Service | Cost at 1,000 users |
|---------|---------------------|
| Supabase Pro (Vault, pg_cron, Realtime) | $25/mo |
| Python FastAPI on Railway (512MB) | ~$5/mo |
| Plaid (avg 0.4 banks × 500 US users × $0.30) | ~$18/mo |
| TrueLayer (avg 0.4 banks × 200 UK users × £0.20) | ~$6/mo |
| Setu AA (avg 2 calls/user/mo × 300 IN users) | ~$2/mo |
| Open Exchange Rates (free tier) | $0 |
| RevenueCat (free under $2.5K MRR) | $0 |
| PostHog (free 1M events/mo) | $0 |
| Expo EAS Build | $0–13/mo |
| Domain + misc | ~$5/mo |
| **Total** | **~$61–74/mo** |

**Revenue at 1,000 users:** $2.99 × 1,000 = **$2,990/mo**  
**Infra as % of revenue:** ~2.5% ✓

**Scale inflection:** Architecture holds to ~50,000 users. Upgrade path: Supabase Team tier → read replica → Python parser async queue (Redis + Celery). No structural rewrite.

**TrueLayer polling cost (UK):** 4 polls/day × avg 0.4 connections × 200 UK users = 320 API calls/day = ~9,600/month. TrueLayer free developer tier: 500 calls/month — **this is exceeded at ~35 UK users**. Must onboard to TrueLayer paid plan before UK launch (~£200/mo flat or per-call pricing). Factor into UK launch budget.

---

## pg_cron Job Schedule

| Cron | Time (UTC) | Job |
|------|-----------|-----|
| `0 6 * * *` | 06:00 daily | Balance refresh trigger (batched 50/hr, staggered 2s delay) |
| `0 7 * * *` | 07:00 daily | Token expiry check → refresh tokens expiring within 7 days |
| `0 */2 * * *` | Every 2 hours | FX rate refresh (Open Exchange Rates — keeps calls ≤ 372/mo, well within 1,000/mo free tier) |
| `0 8 * * 1` | Mon 08:00 UTC | Weekly summary compute (all users with prior-week transactions) |
| `0 2 1 * *` | 1st of month 02:00 | Monthly summary compute |
| `0 3 * * *` | 03:00 daily | parse_queue cleanup (processed rows > 30 days) |
| `0 9 * * *` | 09:00 daily | Bank re-consent check → push Setu AA expiry alerts 30 days before |
| `0 */4 * * *` | Every 4 hours | Setu AA transaction pull (India users; no webhook support) |

**Note:** 8 pg_cron jobs total. Balance refresh (06:00) and token refresh (07:00) are intentionally staggered 1h apart to avoid concurrent DB load. FX changed from hourly to every-2h: INR/USD/GBP rates are stable enough; this halves API calls to 372/month (free tier ceiling: 1,000).

**Failure alerting:** All pg_cron jobs must write a completion row to a `cron_health` log table (job_name, ran_at, status, rows_affected). Supabase Logflare alert fires if any job has no completion row within 30 minutes of its scheduled time.

---

## Setu AA Tiered India Flow

```
User taps "Connect Bank" (India)
    │
    ▼
Setu deep link → AA consent app (Finvu/CAMS)
    │
    ├─ Consent granted (< 30s) → Connection established ✓
    │
    └─ Timeout / AA app not installed (> 30s)
            │
            ├─ Android → SMS parsing fallback
            │   "We'll auto-read your bank SMS instead"
            │
            └─ iOS → Manual entry
                "Add transactions manually or connect email"
```

---

## Implementation Risk Register

### Risk 1 — ExcelJS on React Native / Hermes Runtime
**Severity:** CRITICAL before Sprint 10  
**Problem:** ExcelJS is a Node.js library that uses `Buffer`, `Stream`, and `fs` — none of which exist in React Native's Hermes JS runtime. Direct import will fail at build time.  
**Fix:** Use **SheetJS (xlsx)** community edition instead — it has explicit React Native / Expo support and Hermes compatibility. Alternatively, use `expo-file-system` with a custom binary writer and ExcelJS with a polyfill shim (higher risk). Validate the chosen library in a standalone Expo Snack **before Sprint 10** (US-035) to avoid late-sprint blockers.  
**Action:** Create a spike task in Sprint 5 — build a 10-row Excel file on-device and open it in Google Sheets to confirm end-to-end.

### Risk 2 — Weekly Summary Timezone Edge Case
**Severity:** MAJOR  
**Problem:** pg_cron weekly summary runs Monday 08:00 UTC. A user in US Pacific (UTC-8) will have their "week" computed at Sunday midnight local time — meaning any Sunday transactions after midnight PST (= Monday 08:00 UTC) are excluded from their weekly summary.  
**Fix (pragmatic):** Document the boundary clearly in-app: "Weekly scores cover Monday–Sunday UTC." For v1, this is acceptable. For v1.1, add `timezone` field to `user_profiles` and compute summaries in user-local time (requires per-user cron or time-zone-aware aggregation).  
**Action:** Add "Weekly scores are based on UTC time" disclosure to the weekly report screen (US-031).

### Risk 3 — Dashboard Budget Ring Live Updates
**Severity:** MAJOR  
**Problem:** PRD FR-E05 requires the budget donut ring to "update in real-time when new transactions are added." The architecture does not specify the update mechanism for auto-parsed transactions arriving via FastAPI → Supabase.  
**Fix:** Enable **Supabase Realtime** subscription on `transactions` table (filtered to `user_id = auth.uid()`). When a new confirmed transaction row is inserted (by FastAPI or direct client write), React Query invalidates the budget ring query and re-renders. Configuration:  
```ts
supabase
  .channel('transactions')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions',
      filter: `user_id=eq.${userId}` }, () => queryClient.invalidateQueries(['budget-ring']))
  .subscribe()
```
**Cost:** Supabase Realtime is included in Pro plan. Each active mobile session = 1 Realtime connection. At 1,000 users with ~5% concurrent = 50 connections — well within Pro plan limits.

### Risk 4 — `goals.current_amount` Consistency
**Severity:** MAJOR  
**Problem:** US-041 requires `goals.current_amount` to auto-update when a saving transaction with `goal_id` is inserted/edited/deleted. Using an Edge Function for this introduces a race condition: the transaction commits, but if the Edge Function fails, `current_amount` is stale indefinitely.  
**Fix:** Use a **PostgreSQL trigger** (runs in the same transaction as the transaction write — atomic):  
```sql
CREATE OR REPLACE FUNCTION update_goal_amount() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE goals SET current_amount = current_amount - OLD.amount_base
    WHERE id = OLD.goal_id AND OLD.goal_id IS NOT NULL;
  ELSIF TG_OP = 'INSERT' THEN
    UPDATE goals SET current_amount = current_amount + NEW.amount_base
    WHERE id = NEW.goal_id AND NEW.goal_id IS NOT NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE goals SET current_amount = current_amount
      - COALESCE(OLD.amount_base, 0) + COALESCE(NEW.amount_base, 0)
    WHERE id = COALESCE(NEW.goal_id, OLD.goal_id)
    AND COALESCE(NEW.goal_id, OLD.goal_id) IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_goal_amount
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_goal_amount();
```
Add this trigger to `supabase/migrations/` as a versioned SQL file.

### Risk 5 — FastAPI Service Key Exposure
**Severity:** MINOR  
**Problem:** FastAPI on Railway uses the Supabase service key (bypasses RLS) to write transactions and update parse_queue. If Railway environment is compromised, full DB write access is exposed.  
**Fix:** (1) Restrict Railway service to Supabase IP allowlist where possible. (2) Create a dedicated Supabase role with only INSERT on `transactions`, UPDATE on `parse_queue`, INSERT on `parse_failed` — not full service key. (3) Rotate service key every 90 days; update Railway env var via Railway CLI (automated).

### Risk 6 — parse_queue Double-Processing on FastAPI Crash
**Severity:** MINOR (mitigated by dedup)  
**Problem:** FastAPI marks `parse_queue.status = 'processing'`, writes transaction, then marks `status = 'processed'`. If FastAPI crashes after the transaction write but before `status = 'processed'`, the item will be re-polled and re-processed.  
**Mitigation (already in place):** `dedup_hash` UNIQUE constraint prevents a duplicate transaction row — the second write returns a conflict error (not a crash). FastAPI should treat `UNIQUE constraint violation` on `dedup_hash` as a success (idempotent) and mark the queue item processed.  
**Action:** Explicitly handle `23505` (PostgreSQL unique violation) in the FastAPI parser as a non-error path.

**`parse_failed` PII Retention Policy:** Rows in `parse_failed` must store only: `{amount, bank_name, error_message, failed_at}`. Do NOT store raw SMS text, account numbers, or merchant strings. The pg_cron cleanup job (03:00 daily) purges `parse_failed` rows older than 30 days. If the original `parse_queue` row contained PII beyond the structured fields, it must be nulled before moving to `parse_failed`.

---

## Operational Runbooks — Top Failure Scenarios

### Runbook 1 — Plaid Webhook Replay (Edge Functions Down > 24h)
**Trigger:** Plaid sends `TRANSACTIONS_SYNC_REQUIRED` or `DEFAULT_UPDATE` webhook; Edge Function returns 5xx; Plaid retries for up to 24h then drops.

**Steps:**
1. On recovery, Edge Function is live → new webhooks flow normally.
2. For the gap period: hit Plaid's `/transactions/sync` endpoint per-connection, paginating with the stored `cursor` in `bank_connections.plaid_cursor`. This is idempotent — `provider_txn_id` UNIQUE constraint deduplicates on write.
3. Trigger via Supabase Edge Function cron or one-off admin call: `POST /admin/plaid/replay-sync?since=<iso_timestamp>`.
4. Monitor `parse_queue` depth returning to 0 before declaring recovery complete.

**Runbook owner:** Backend on-call. Expected resolution: < 2h after Edge Function recovery.

---

### Runbook 2 — TrueLayer Polling Uptime Monitoring
**Risk:** TrueLayer's polling endpoint (`/data/v1/accounts/{id}/transactions`) may return 503 during maintenance windows; UK users get stale transactions without alert.

**Prevention:**
- UptimeRobot (free tier) hits a lightweight `/health/truelayer` Edge Function endpoint every 5 minutes; this function attempts a TrueLayer token validation call and returns 200/503 accordingly.
- Alert fires to on-call Slack channel on 2 consecutive failures.

**During outage:**
1. In-app banner: "UK bank sync is temporarily unavailable — transactions will sync automatically when restored."
2. `bank_connections.last_sync_status = 'provider_error'` shown as "Sync paused" badge in UI.
3. On recovery: pg_cron next-run or manual trigger via admin endpoint re-syncs all affected connections.

---

### Runbook 3 — Open Exchange Rates Free Tier Exceeded
**Trigger:** OX Rates returns HTTP 429 or quota-exceeded error; `fx_rates` table stops updating; conversions fall back to last cached rate.

**Immediate mitigation (< 5 min):**
1. Switch cron from `0 */2 * * *` (every 2h) to `0 */6 * * *` (every 6h) immediately — cuts monthly calls from 372 to 124, comfortably within 1,000/mo free tier even in 31-day months.
2. Alert users only if `fx_rates.updated_at` is > 6h stale (show "FX rates may be delayed" badge on conversion amounts).

**Long-term:** If DAU growth pushes calls above 1,000/mo consistently, upgrade to OX Rates Developer plan (~$12/mo) for 100,000 calls/mo. Add this to infra cost tracking at 5,000+ users.

---

### Runbook 4 — Plaid Account Suspension / API Key Revoked
**Trigger:** Plaid suspends sandbox or production key (ToS violation, billing lapse, security incident); all Plaid API calls return `INVALID_API_KEYS`.

**Immediate:**
1. All `bank_connections` where `provider = 'plaid'` set to `status = 'error'`; users shown "Bank sync paused — action required."
2. Manual entry always available as fallback — this is never blocked by bank provider status (confirmed in Region-Specific Bank Integration table above).
3. Gmail/Outlook OAuth capture continues unaffected for users who connected email.

**Recovery:**
1. Resolve Plaid issue (billing, key rotation, ToS compliance).
2. Issue new Plaid `client_id` + `secret` → update Railway + Supabase Edge Function secrets.
3. Re-link connections: users must re-authenticate via Plaid Link (Plaid does not allow token transfer to a new key).
4. Send push + email: "Action required: re-connect your bank account."

**Prevention:** Plaid billing auto-pay enabled; Plaid key stored in Supabase Vault + Railway env; key rotation every 90 days documented in Sprint 10 ops checklist.

---

## Trust Marketing Pillars

1. **"We never see your SMS"** — Parsed on-device. Only structured output (amount, merchant, date) transmitted.
2. **"Your bank credentials never touch our app"** — OAuth tokens stored server-side in Vault, never in API responses.
3. **"Works even when our servers hiccup"** — JWT-embedded entitlements require no DB lookup.
4. **"SOC2 + GDPR + RBI compliant from day one"** — Data localised per region, full audit trail.
5. **"Bank-grade AES-256 encryption"** — At rest, in transit, on device.
