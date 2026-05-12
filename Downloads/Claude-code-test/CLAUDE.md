# FinTrack — CLAUDE.md

## Project Overview

**FinTrack** is a cross-platform personal finance mobile app (iOS + Android) for users in India, US, and UK.
Subscription: $2.99/month billed annually. Stack: Expo + Supabase + RevenueCat + FastAPI.

**Session ID (initial brainstorm + BMAD):** `df171416-9a1b-407f-b7fa-dd7ab438c661`

---

## Key Docs (read before touching anything)

| Doc | Path |
|-----|------|
| Architecture v4 | `docs/superpowers/specs/2026-05-13-architecture-v4.md` |
| Data Model | `docs/superpowers/specs/2026-05-13-data-model.md` |
| Screen Flows | `docs/superpowers/specs/2026-05-13-screen-flows.md` |
| Onboarding Flow | `docs/superpowers/specs/2026-05-13-onboarding-flow.md` |
| Project Brief | `docs/superpowers/specs/2026-05-13-project-brief.md` |
| BRD | `docs/superpowers/specs/2026-05-13-brd.md` |
| PRD | `docs/superpowers/specs/2026-05-13-prd.md` |
| Epics & Stories | `docs/superpowers/specs/2026-05-13-epics-stories.md` |

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Mobile | React Native · Expo SDK 52 · Expo Router v3 |
| Styling | NativeWind v4 (Tailwind) |
| Backend / DB | Supabase (PostgreSQL 15, RLS, Vault, Edge Functions, pg_cron) |
| Parsing API | Python FastAPI on Railway (Pydantic v2) |
| Subscriptions | RevenueCat (App Store + Play Store) |
| Bank sync (US) | Plaid |
| Bank sync (UK) | TrueLayer |
| Bank sync (IN) | Setu Account Aggregator + SMS parsing (Android only) |
| Analytics | PostHog |
| Error tracking | Sentry |
| FX rates | Open Exchange Rates API (hourly, 720 calls/mo) |
| Excel export | ExcelJS (on-device) |
| Cloud export | Google Drive API (OAuth) |
| Currency math | dinero.js |

---

## Critical Architecture Decisions

1. **Balance cache** — 24h pg_cron refresh (not per-tap). Manual refresh rate-limited to 1/15min. "Updated X ago" badge.
2. **JWT entitlement** — `app_metadata.entitlement` in Supabase JWT; no DB lookup needed. RevenueCat webhook updates it.
3. **No historical import** — transactions tracked from bank connection date only (`tracking_from = NOW()`).
4. **On-device SMS parsing** — raw SMS never leaves the device; only `{amount, merchant, date, currency, type}` sent.
5. **Deduplication** — `provider_txn_id` UNIQUE for bank API; `dedup_hash` SHA-256 (±30min window) for SMS/email.
6. **India data localisation** — India user data in Supabase `ap-south-1` only (RBI requirement).
7. **Staggered token refresh** — pg_cron refreshes 50 bank tokens/hour to prevent Plaid thundering herd.
8. **E2E encryption** — Vault-encrypted bank tokens + DOB; certificate pinning; SQLCipher offline queue.
9. **Offline queue** — SQLite (SQLCipher) drains to Supabase on reconnect.
10. **Subscription grace** — 7-day grace after lapse; max 60-min JWT exposure window after cancellation.

---

## Database Schema (11 Tables)

```
auth.users → user_profiles · user_entitlements · bank_connections
           → transactions · categories · goals
           → weekly_summaries · monthly_summaries
           → parse_queue · parse_failed · audit_log
fx_rates (global, no user FK)
```

All monetary amounts: **smallest currency unit** (paise/cents/pence) — never floats.

---

## pg_cron Jobs (7 Scheduled)

| Job | Schedule | Purpose |
|-----|----------|---------|
| Balance refresh | Daily 06:00 UTC | Refresh all active bank balances (staggered 50/hr) |
| Token expiry check | Daily 07:00 UTC | Alert users 7 days before Plaid/TrueLayer token expires |
| FX rate fetch | Hourly | All currency pairs in one Open Exchange Rates call |
| Weekly summaries | Monday 08:00 UTC | Compute discipline scores for all users |
| Monthly summaries | 1st of month 02:00 UTC | Pre-aggregate monthly reports |
| Queue cleanup | Daily 03:00 UTC | Delete `parse_queue` rows processed > 30 days ago |
| Re-consent alerts | Daily 09:00 UTC | Alert India users 30 days before Setu AA expiry |

---

## Discipline Score Formula

```
score = 100 - (
  |needs_pct_actual   - needs_pct_target|   × 0.5 +
  |wants_pct_actual   - wants_pct_target|   × 0.3 +
  |savings_pct_actual - savings_pct_target| × 0.2
) × 2
```
Clamped to [0, 100]. Partial months excluded from annual score.

---

## Epics Summary (299 SP · 12 Sprints)

| Epic | Title | SP |
|------|-------|----|
| E1 | Foundation & Infrastructure | 34 |
| E2 | Authentication & Onboarding | 29 |
| E3 | Transaction Management | 34 |
| E4 | Bank Integration & Auto-Capture | 55 |
| E5 | Budget, Discipline & Reporting | 42 |
| E6 | Export & Google Drive | 21 |
| E7 | Accounts, Net Worth & Goals | 21 |
| E8 | Settings, Privacy & Compliance | 29 |
| E9 | Subscription & Monetisation | 13 |
| E10 | QA, Release & DevOps | 21 |

**Sprint 1–2:** Foundation (Supabase, FastAPI, Expo scaffold, CI/CD)  
**Sprint 3:** Auth + RevenueCat (early — entitlement gates everything)  
**Sprint 4–7:** Onboarding, Transactions, Bank Integrations  
**Sprint 8–9:** Reports, Accounts, Export  
**Sprint 10–12:** Goals, Settings, Compliance, QA, App Store submission

---

## Compliance Checklist

- [ ] GDPR Article 17 (erasure) — 30-day SLA
- [ ] GDPR Article 20 (portability) — 24h async JSON export
- [ ] RBI data localisation — `ap-south-1` for India users
- [ ] CCPA — delete/export for California users
- [ ] Age gate — server-side DOB validation ≥ 18
- [ ] Play Store financial app form + READ_SMS declaration
- [ ] Apple pre-submission financial app checklist

---

## Infrastructure Cost (~$61–74/mo at 1,000 users)

| Service | Cost/mo |
|---------|---------|
| Supabase Pro | $25 |
| Railway (FastAPI) | $5–10 |
| Plaid (US users) | $15–20 |
| Setu AA (India) | $5–8 |
| Open Exchange Rates | $0 (free) |
| PostHog | $0 (free ≤ 1M events) |
| **Total** | **~$50–63** |

---

## Development Rules

- Monetary amounts: always bigint (smallest unit), never floats
- Secrets: Railway env vars + Supabase Vault + GitHub Secrets — never in code
- All tables: RLS enabled; users access only their own rows
- Migrations: versioned SQL in `supabase/migrations/`; expand-contract pattern (no destructive renames)
- SMS parsing: on-device only; structured output only transmitted
- Bank tokens: Vault-encrypted; never returned in API responses
- Push notifications: deferred to after first weekly summary (not at onboarding)
- Google Drive OAuth: deferred to first export tap (not at onboarding)
