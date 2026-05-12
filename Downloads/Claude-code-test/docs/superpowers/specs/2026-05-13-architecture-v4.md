# FinTrack — System Architecture v4 (Final)

**Date:** 2026-05-13  
**Status:** SHIP ✅ — Critic Score 4.5 / 5.0  
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
| FX Rates | Open Exchange Rates API | Free tier (1000 calls/mo), hourly refresh |
| Analytics | PostHog | Product analytics, feature flags, free 1M events/mo |
| Export | ExcelJS (on-device) + Google Drive API | Excel generation + Drive upload |
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
- pg_cron fires at **00:30 UTC daily** — no "local time" promise made
- Balance stored in `bank_connections.balance_amount` + `balance_cached_at`
- App shows balance instantly from cache with "Updated X ago" badge
- Manual refresh: server-side rate limit (1 per 15 min per connection, checked via `last_manual_refresh_at`)
- HTTP 429 with `Retry-After` header on rate-limit breach
- Stale indicator shown if `balance_cached_at` > 26h

**Cost saving:** 1 API call/bank/day instead of per-tap → Plaid cost ↓75% (~$15/mo vs ~$60/mo)

### Transaction Sync — Webhook-Driven Async Queue
- Plaid / TrueLayer webhooks → HMAC-SHA256 verified → `parse_queue` table
- Setu AA: pg_cron pull every 4 hours
- SMS (Android): on-device parse → structured output → `parse_queue`
- Python FastAPI polls queue every 30s, max 3 retries with exponential backoff
- If parser down: queue builds, drains on recovery. Zero data loss.
- Push notification on new transaction: "₹450 at Uber — tap to confirm"

### Transaction Deduplication
- Provider transactions (Plaid/TrueLayer/AA): `provider_txn_id` UNIQUE constraint
- SMS/email parsed: SHA-256 hash of `(amount + merchant_normalized + ±30min timestamp window + currency)` — stored in `dedup_hash` UNIQUE column
- Bank API source wins over SMS/email parse on conflict
- Idempotency key on every parser endpoint

### Bank Token Lifecycle
- `bank_connections.token_expires_at` + `consent_expires_at` tracked
- pg_cron hourly: refresh tokens expiring within 7 days, **batched 50 at a time** with 2s delay (prevents Plaid rate-limit thundering herd)
- Setu AA: push notification 30 days before consent expiry + in-app re-consent flow
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
- FX rates: Open Exchange Rates API (1 call/hour, all pairs) → `fx_rates` table

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
| In transit | TLS 1.3 enforced · Certificate pinning on mobile |
| Bank tokens | Supabase Vault (AES-256-GCM) — server-side only |
| PII (DOB) | Encrypted column in Supabase Vault |
| At rest | Supabase default AES-256 + SOC2 Type II |
| Audit | Every token access logged with timestamp + IP |

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

---

## pg_cron Job Schedule

| Cron | Time (UTC) | Job |
|------|-----------|-----|
| `0 0 * * *` | 00:00 daily | Balance refresh trigger (batched 50/hr, staggered) |
| `30 0 * * *` | 00:30 daily | Token expiry check + staggered refresh |
| `0 * * * *` | Every hour | FX rate refresh (Open Exchange Rates) |
| `0 1 * * 1` | Mon 01:00 | Weekly summary compute |
| `0 2 1 * *` | 1st of month 02:00 | Monthly summary compute |
| `0 3 * * *` | 03:00 daily | parse_queue cleanup (processed rows > 30 days) |
| `0 4 * * *` | 04:00 daily | Bank re-consent check → push notifications |

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

## Trust Marketing Pillars

1. **"We never see your SMS"** — Parsed on-device. Only structured output (amount, merchant, date) transmitted.
2. **"Your bank credentials never touch our app"** — OAuth tokens stored server-side in Vault, never in API responses.
3. **"Works even when our servers hiccup"** — JWT-embedded entitlements require no DB lookup.
4. **"SOC2 + GDPR + RBI compliant from day one"** — Data localised per region, full audit trail.
5. **"Bank-grade AES-256 encryption"** — At rest, in transit, on device.
