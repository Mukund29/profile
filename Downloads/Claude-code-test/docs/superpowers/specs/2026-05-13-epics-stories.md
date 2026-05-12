# FinTrack — Epics & User Stories

**BMAD Phase:** Product Definition  
**Version:** 1.0 | **Date:** 2026-05-13  
**Status:** Approved  
**Author:** Product Team  
**Estimation Unit:** Story Points (Fibonacci) · 1 SP ≈ 0.5 dev-day

*References: [PRD](2026-05-13-prd.md) · [Architecture v4](2026-05-13-architecture-v4.md) · [Data Model](2026-05-13-data-model.md) · [Screen Flows](2026-05-13-screen-flows.md)*

---

## Epic Summary

| Epic | Title | SP Total | Sprint Target |
|------|-------|----------|---------------|
| E1 | Foundation & Infrastructure | 34 | Sprint 1–2 |
| E2 | Authentication & Onboarding | 29 | Sprint 2–3 |
| E3 | Transaction Management | 34 | Sprint 3–4 |
| E4 | Bank Integration & Auto-Capture | 55 | Sprint 4–7 |
| E5 | Budget, Discipline & Reporting | 42 | Sprint 6–8 |
| E6 | Export & Google Drive | 21 | Sprint 8–9 |
| E7 | Accounts, Net Worth & Goals | 21 | Sprint 7–8 |
| E8 | Settings, Privacy & Compliance | 29 | Sprint 9–10 |
| E9 | Subscription & Monetisation | 13 | Sprint 3 (early) |
| E10 | QA, Release & DevOps | 21 | Sprint 10–12 |
| **Total** | | **299** | **12 Sprints** |

**Sprint duration:** 1 week  
**Team velocity assumption:** 25–30 SP/sprint (2 developers)

---

## E1 — Foundation & Infrastructure

**Goal:** Establish the full technical foundation before any feature work. Every subsequent epic depends on this.

**Definition of Done:** Supabase project live with RLS policies, FastAPI service deployed on Railway, CI/CD pipeline running, Expo app building successfully on EAS.

### US-001 · Supabase Project Setup
**As a** developer  
**I want** a fully configured Supabase project with all tables, indexes, and RLS policies  
**So that** all feature teams can build against a stable, secure data layer

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Supabase project created in `us-east-1` (default) with separate India project in `ap-south-1`
- [ ] All 11 tables created per data model spec (user_profiles, user_entitlements, bank_connections, transactions, categories, goals, weekly_summaries, monthly_summaries, parse_queue, parse_failed, fx_rates, audit_log)
- [ ] All critical indexes created per spec
- [ ] RLS enabled and policies applied on all user-data tables
- [ ] Default category seed SQL executed (5 system categories)
- [ ] Supabase Vault configured for `access_token` and `date_of_birth` columns
- [ ] `pg_cron` extension enabled; all 7 scheduled jobs configured (balance refresh, token expiry, FX rates, weekly summaries, monthly summaries, queue cleanup, re-consent alerts)
- [ ] Supabase migrations versioned in git (`/supabase/migrations/`)

**Dependencies:** None

---

### US-002 · FastAPI Parsing Microservice Setup
**As a** developer  
**I want** a production-ready FastAPI microservice deployed on Railway  
**So that** email and SMS parsing can run asynchronously without blocking the mobile app

**Story Points:** 5

**Acceptance Criteria:**
- [ ] FastAPI app with Pydantic v2 models deployed on Railway (Python 3.12)
- [ ] `parse_queue` polling job runs every 30 seconds; processes batches of 10
- [ ] Health check endpoint `/health` returns 200 with service status
- [ ] Structured logging configured (not print statements)
- [ ] Error handling: failed parses moved to `parse_failed` after 3 retries
- [ ] Environment variables managed via Railway secrets (no hardcoded credentials)
- [ ] Railway deploy on `main` branch push

**Dependencies:** US-001

---

### US-003 · Expo + React Native Project Scaffold
**As a** developer  
**I want** an Expo SDK 52 project with Expo Router v3, NativeWind v4, and all core dependencies installed  
**So that** the mobile app has a consistent, typed, styled foundation

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Expo Router v3 file-based routing configured
- [ ] NativeWind v4 (Tailwind for React Native) installed and working
- [ ] TypeScript strict mode enabled
- [ ] Supabase JS client configured with typed schema (`supabase gen types`)
- [ ] Expo SecureStore configured for auth token storage
- [ ] RevenueCat SDK installed and initialised
- [ ] Folder structure: `app/` (routes), `components/`, `hooks/`, `lib/`, `constants/`
- [ ] EAS Build configured for development, staging, and production profiles
- [ ] GitHub Actions CI: lint → type-check → build check on every PR

**Dependencies:** US-001

---

### US-004 · CI/CD Pipeline & Environment Management
**As a** developer  
**I want** automated CI/CD for both the mobile app and API service  
**So that** every merge to `main` is tested and deployed without manual steps

**Story Points:** 5

**Acceptance Criteria:**
- [ ] GitHub Actions workflow: lint → type-check → unit tests → EAS build (development) on PR
- [ ] GitHub Actions workflow: EAS build (production) + Railway deploy on `main` merge
- [ ] Environment separation: development, staging, production configs
- [ ] Secrets stored in GitHub Secrets and Railway environment variables (not in code)
- [ ] PostHog project created; API key in environment config
- [ ] Sentry error tracking configured for React Native and FastAPI

**Dependencies:** US-002, US-003

---

### US-005 · FX Rate Service
**As a** system  
**I want** hourly FX rate updates stored in the database  
**So that** multi-currency transactions are always converted at an accurate rate

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Open Exchange Rates API key configured in Supabase Edge Function secrets
- [ ] pg_cron job runs hourly: fetches all currency pairs (USD/INR/GBP) in one API call
- [ ] `fx_rates` table populated with base, quote, rate, fetched_at
- [ ] UNIQUE constraint on (base, quote, fetched_at) prevents duplicate rows
- [ ] Monthly API calls ≤ 720 (within 1,000/month free tier)

**Dependencies:** US-001

---

### US-006 · Offline Queue Foundation
**As a** mobile user  
**I want** transactions I add while offline to be saved and synced when I reconnect  
**So that** I never lose data due to connectivity issues

**Story Points:** 8

**Acceptance Criteria:**
- [ ] SQLite (expo-sqlite) with SQLCipher encryption initialised on first app launch
- [ ] Offline queue stores: pending transactions, pending balance fetches
- [ ] Network state monitored via `@react-native-community/netinfo`
- [ ] Queue drains automatically when connection is restored
- [ ] Conflict resolution: server wins for bank data; client wins for manual transactions
- [ ] Queue size limit: 500 items (oldest discarded with user notification)

**Dependencies:** US-003

---

## E2 — Authentication & Onboarding

**Goal:** Get users authenticated and to the dashboard in < 45 seconds with ≥ 75% completion rate.

**Definition of Done:** All auth flows functional; onboarding state machine complete; age gate enforced server-side; smart nudge cards visible on dashboard.

### US-007 · Google OAuth Sign-In
**As a** new user  
**I want** to sign in with my Google account in one tap  
**So that** I can start using FinTrack without creating a separate password

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Google OAuth via Supabase Auth (`@supabase/auth-helpers-expo`)
- [ ] Google consent screen shows FinTrack app name and required scopes only
- [ ] On success: JWT issued with `app_metadata.entitlement` claim
- [ ] On failure: error message shown; retry available
- [ ] Display name pre-filled from Google profile on Screen 3
- [ ] Apple Sign-In shown alongside on iOS (mandatory when Google OAuth offered)

**Dependencies:** US-003, US-001

---

### US-008 · Apple Sign-In
**As an** iOS user  
**I want** to sign in with Apple  
**So that** I can use my existing Apple ID with full privacy controls

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Apple Sign-In via Supabase Auth
- [ ] Handles Apple's email relay (random relay email stored correctly)
- [ ] Display name pre-filled from Apple profile (may be empty if user hides it — handled gracefully)
- [ ] Apple Sign-In shown on all iOS screens where Google OAuth appears

**Dependencies:** US-007

---

### US-009 · Phone OTP Sign-In
**As a** user in India  
**I want** to sign in with my phone number + OTP  
**So that** I don't need to create a Google account or remember a password

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Phone number entry with country code selector (defaults to device locale: +91 / +1 / +44)
- [ ] Supabase OTP sent via SMS (Twilio)
- [ ] 6-digit OTP auto-read on Android via SMS Retriever API (no user input required)
- [ ] Auto-submits when all 6 digits filled
- [ ] Resend available after 30-second cooldown
- [ ] Expired OTP error shown clearly with resend CTA

**Dependencies:** US-003, US-001

---

### US-010 · Email Magic Link Sign-In
**As a** user  
**I want** to sign in via a magic link sent to my email  
**So that** I can authenticate without a password from any platform

**Story Points:** 2

**Acceptance Criteria:**
- [ ] Email field on Screen 2 (shown when "Use phone / email" tapped on Screen 1)
- [ ] Supabase magic link email sent
- [ ] Deep link in email opens app and completes authentication automatically
- [ ] "Check your email" confirmation UI shown after email submitted
- [ ] Handles case where user opens link on different device (fallback to manual code entry)

**Dependencies:** US-003, US-001

---

### US-011 · Onboarding — Name & DOB (Screen 3)
**As a** new user  
**I want** to enter my first name and date of birth quickly  
**So that** FinTrack can personalise my experience and confirm I meet the age requirement

**Story Points:** 3

**Acceptance Criteria:**
- [ ] First name field (keyboard opens immediately)
- [ ] DOB picker: scroll wheel (day / month / year) — not keyboard
- [ ] Continue button disabled until both fields completed
- [ ] Base currency shown as informational note at bottom (auto-detected from locale; not a separate screen)
- [ ] Server validates age ≥ 18 before proceeding; under-18 shown error and blocked
- [ ] `age_confirmed_at` timestamp stored in `user_profiles`
- [ ] DOB stored encrypted in Supabase Vault
- [ ] Google/Apple OAuth users have name pre-filled (editable)

**Dependencies:** US-007, US-008, US-009, US-010

---

### US-012 · Onboarding — Connect Bank (Screen 4)
**As a** new user  
**I want** to optionally connect my bank account during onboarding  
**So that** auto-tracking starts immediately if I choose to

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Region auto-detected from device locale: India → Setu AA; US → Plaid; UK → TrueLayer
- [ ] "Connect Bank" is primary CTA; "Skip for now" equally visible (same font size, no guilt)
- [ ] On connect: platform-appropriate OAuth flow launches (Plaid Link / TrueLayer / AA deep link)
- [ ] On success: account name + balance + "Tracking from today ✓" shown inline
- [ ] On skip: proceeds directly to Dashboard
- [ ] India AA timeout (30s): Android falls back to SMS permission prompt; iOS proceeds to Dashboard
- [ ] `tracking_from` set to current timestamp (not backdated)

**Dependencies:** US-011, US-001

---

### US-013 · Dashboard Onboarding — Smart Nudge Cards
**As a** new user  
**I want** to see contextual prompts on my dashboard for the next setup steps  
**So that** I know what to do next without feeling overwhelmed by a wall of empty states

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Three smart nudge cards shown on first dashboard: "Set monthly income →", "Connect a bank →", "Add first transaction →"
- [ ] Cards appear only until the corresponding action is completed (not permanently)
- [ ] Confetti animation fires exactly once on first dashboard landing
- [ ] If bank was connected during onboarding: "Tracking from today" banner shown instead of "Connect a bank" card
- [ ] Cards are dismissible individually (user can X them away)

**Dependencies:** US-012

---

### US-014 · Session Persistence & Biometric Lock
**As a** returning user  
**I want** to stay logged in between app sessions and use Face ID / fingerprint to unlock  
**So that** I don't have to sign in every time

**Story Points:** 5

**Acceptance Criteria:**
- [ ] JWT stored in Expo SecureStore (hardware-backed keychain/keystore)
- [ ] JWT auto-refreshed on app foreground if expiry < 10 minutes away
- [ ] Biometric lock toggle in Settings (off by default)
- [ ] When enabled: app requires Face ID / fingerprint on foreground after auto-lock timer
- [ ] Auto-lock timers: 1 min / 5 min / 15 min (user selects)
- [ ] Biometric failure: PIN/passcode fallback available

**Dependencies:** US-013

---

## E3 — Transaction Management

**Goal:** Manual transaction entry in < 15 seconds; full CRUD on all transactions; transaction list with filtering and search.

### US-015 · Add Transaction (Manual)
**As a** user  
**I want** to add a manual transaction in under 15 seconds  
**So that** logging cash or unlinked card spend is not a friction point

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Numpad opens immediately when Add Transaction tapped (amount first)
- [ ] Amount field: numeric keypad, currency symbol shown, formatted with locale separators
- [ ] Description field with auto-suggest from past merchants (fuzzy match, top 5 suggestions)
- [ ] Category picker: last-used pre-selected; shows icon + name
- [ ] Type selector: Need / Want / Saving pill buttons (last-used pre-selected)
- [ ] Payment mode: last-used pre-selected; options: UPI, Credit Card, Debit Card, Cash, Bank Transfer, ACH, Faster Payments, Other
- [ ] Date: defaults to today; tap to open date picker
- [ ] Notes: collapsed by default; tap to expand
- [ ] Save: validates required fields (amount > 0, description not empty); saves to Supabase
- [ ] Offline: saves to SQLite queue if no network; syncs on reconnect
- [ ] Target: user can complete in < 15 seconds for a typical transaction

**Dependencies:** US-001, US-003

---

### US-016 · Transaction List View
**As a** user  
**I want** to see all my transactions grouped by date  
**So that** I have a clear daily view of my spending

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Transactions grouped by date header (Today, Yesterday, [Day Month])
- [ ] Each row: merchant name · category icon · amount (formatted) · type badge (Need/Want/Saving, colour-coded) · payment mode icon · source badge (SMS/Email/Plaid/Manual, subtle)
- [ ] Today's transactions shown first; descending date order
- [ ] Infinite scroll pagination (load 30 rows, then 30 more on scroll)
- [ ] Pull-to-refresh triggers data reload
- [ ] Empty state: "No transactions yet — add your first spend" with CTA

**Dependencies:** US-015

---

### US-017 · Edit & Delete Transaction
**As a** user  
**I want** to edit or delete any transaction  
**So that** I can correct errors or remove duplicate entries

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Swipe-left gesture reveals Delete button (red)
- [ ] Swipe-right gesture reveals Edit button (blue)
- [ ] Tap on transaction row opens Transaction Detail screen with all fields editable
- [ ] Delete: confirmation not required; undo toast shown for 5 seconds (tapping Undo restores the transaction)
- [ ] Edit: all fields editable; Save updates record in Supabase
- [ ] Auto-parsed transactions: edit pre-fills all parsed fields; source shown ("Parsed from SMS")

**Dependencies:** US-016

---

### US-018 · Auto-Parsed Transaction Review Queue
**As a** user  
**I want** to quickly review and confirm auto-parsed transactions  
**So that** I can verify accuracy without re-entering data

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Unconfirmed transactions shown at top of Tracker tab in a review queue section
- [ ] Each unconfirmed card shows: source icon (SMS/Email/Plaid) + parsed fields + confidence indicator
- [ ] "Confirm" button: one-tap confirmation; marks `is_confirmed = true`
- [ ] "Edit" button: opens Add Transaction screen pre-filled with parsed values
- [ ] "Review" badge on Tracker tab icon when ≥ 1 unconfirmed transaction exists
- [ ] Auto-confirm after 24 hours if user takes no action (`pg_cron` job or scheduled Edge Function)
- [ ] Confirmed transactions move to main transaction list

**Dependencies:** US-016, E4

---

### US-019 · Transaction Search & Filter
**As a** user  
**I want** to search and filter my transactions  
**So that** I can find specific purchases quickly for review or categorisation

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Search bar: filters by merchant name or description in real-time (debounced 300ms)
- [ ] Filter panel (bottom sheet): date range picker, category multi-select, type multi-select (Need/Want/Saving), payment mode multi-select, source multi-select
- [ ] Sort: by date (default, descending) or by amount (descending)
- [ ] Active filter count badge shown on filter icon
- [ ] "Clear filters" button resets all filters
- [ ] Search + filter results show row count: "42 transactions"
- [ ] Filtered results still grouped by date

**Dependencies:** US-016

---

### US-020 · Category Management
**As a** user  
**I want** to view and create custom categories  
**So that** my transactions are organised in a way that matches my personal spending style

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Settings → Custom Categories shows system defaults (read-only) + user custom categories
- [ ] "Add Category" opens form: name, type (Need/Want/Saving), icon picker (emoji or preset), colour picker
- [ ] Custom category saved; immediately available in transaction add/edit screens
- [ ] Category can be archived (hidden from add/edit; historical transactions preserved)
- [ ] System categories cannot be deleted or renamed
- [ ] Category changes apply immediately to all existing transactions with that category

**Dependencies:** US-001, US-015

---

## E4 — Bank Integration & Auto-Capture

**Goal:** Auto-capture transactions for all three regions; maintain secure, always-fresh balance data.

**Definition of Done:** Plaid (US) + TrueLayer (UK) + Setu AA + SMS (India) all functional end-to-end; deduplication logic tested; parse accuracy ≥ 92%.

### US-021 · Plaid Bank Connection (US)
**As a** US user  
**I want** to connect my bank account via Plaid  
**So that** my transactions and balance are automatically synced

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Plaid Link SDK integrated in React Native (`react-native-plaid-link-sdk`)
- [ ] On success: `access_token` stored encrypted in Supabase Vault; `bank_connections` row created
- [ ] `tracking_from` set to connection timestamp; no historical transaction import
- [ ] Plaid webhooks configured (Transaction, Item): received by Supabase Edge Function
- [ ] Webhook: new transactions written to `transactions` table with `source = 'plaid'`
- [ ] Webhook: `provider_txn_id` UNIQUE constraint prevents duplicates
- [ ] Token expiry checked: pg_cron alerts user 7 days before `token_expires_at`
- [ ] Re-auth flow (Plaid Link update mode) available from Accounts tab
- [ ] Cost guard: Plaid cost logged per connected account/month for billing monitoring

**Dependencies:** US-001, US-012

---

### US-022 · TrueLayer Bank Connection (UK)
**As a** UK user  
**I want** to connect my bank account via TrueLayer (Open Banking)  
**So that** my transactions and balance are automatically synced under PSD2

**Story Points:** 8

**Acceptance Criteria:**
- [ ] TrueLayer OAuth flow via in-app browser (Expo WebBrowser)
- [ ] On success: `access_token` + `refresh_token` stored encrypted in Supabase Vault
- [ ] Transactions polled every 6 hours via Supabase Edge Function (TrueLayer has no webhooks)
- [ ] `tracking_from` set to connection timestamp; no historical import
- [ ] `provider_txn_id` UNIQUE prevents duplicate transaction rows
- [ ] Token refresh handled automatically before expiry
- [ ] UK users see TrueLayer flow automatically based on device locale (en-GB)

**Dependencies:** US-001, US-012

---

### US-023 · Setu Account Aggregator Connection (India)
**As an** India user  
**I want** to connect my bank via RBI Account Aggregator  
**So that** my transactions and balance are synced under the secure AA framework

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Setu AA consent journey initiated via deep link to AA app (Finvu / OneMoney)
- [ ] Consent: 6-month validity, auto-renewal prompt 30 days before expiry
- [ ] On consent grant: AA pulls transactions via FIP; written to `transactions` table
- [ ] `tracking_from` set to consent timestamp
- [ ] Consent expiry stored in `bank_connections.consent_expires_at`
- [ ] pg_cron re-consent alert sent 30 days before expiry via push notification
- [ ] Fallback path: AA timeout (30s) → Android SMS prompt shown
- [ ] India user data stored in `ap-south-1` Supabase project

**Dependencies:** US-001, US-012

---

### US-024 · Android SMS Parsing
**As an** Android user in India  
**I want** the app to automatically read my bank SMS alerts  
**So that** transactions are captured without any input from me

**Story Points:** 13

**Acceptance Criteria:**
- [ ] `READ_SMS` permission requested contextually (after first manual transaction, not at onboarding)
- [ ] Permission request includes rationale screen: "FinTrack reads bank SMS to auto-log transactions. Raw messages stay on your device."
- [ ] On-device parsing only: regex patterns for HDFC, ICICI, SBI, Axis, Kotak
- [ ] Parsed output format: `{amount, merchant, date, currency, type, bank}` — only this sent to server
- [ ] Raw SMS body never transmitted
- [ ] Supported message types: debit alert, credit alert, UPI confirmation
- [ ] Parse accuracy: ≥ 92% on test corpus of 200 messages (per bank)
- [ ] Failed parses queued to `parse_failed` with raw text for debugging (on-device log; not transmitted)
- [ ] SMS listener active only in foreground + background (not killed by Android battery optimization; handles Doze mode)
- [ ] Play Store SMS_READ declaration + financial app form submitted

**Dependencies:** US-001, US-003

---

### US-025 · Gmail OAuth Email Parsing
**As a** user  
**I want** the app to parse my bank transaction emails from Gmail  
**So that** iOS users and users with bank email notifications have auto-capture too

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Gmail OAuth requested from Settings → Email Connection (deferred from onboarding)
- [ ] Required scope: `gmail.readonly` only
- [ ] FastAPI service polls Gmail API every 15 minutes for new bank emails (label filter)
- [ ] Parsed output: `{amount, merchant, date, currency, bank, account_last4}` written to `parse_queue`
- [ ] FastAPI processes `parse_queue`; writes confirmed transactions to `transactions` table
- [ ] Dedup: `dedup_hash` prevents duplicate if also parsed from SMS
- [ ] OAuth token stored encrypted in Supabase Vault
- [ ] User can revoke Gmail access from Settings → Email Connection → Disconnect
- [ ] Supports: HDFC, ICICI, SBI, Axis, Kotak, Chase, Wells Fargo, Barclays transaction emails

**Dependencies:** US-002, US-001, US-003

---

### US-026 · Balance Auto-Refresh & Cache
**As a** user  
**I want** my account balances to load instantly and always be reasonably current  
**So that** checking my net worth is as fast as opening Google Pay

**Story Points:** 5

**Acceptance Criteria:**
- [ ] pg_cron refreshes all active bank connection balances every 24 hours (at 06:00 local time approximation via UTC scheduling)
- [ ] Staggered refresh: max 50 connections/hour, 2-second delay between calls (prevents Plaid thundering herd)
- [ ] Balance cached in `bank_connections.balance_amount` + `balance_cached_at`
- [ ] Dashboard Net Worth card loads from cache instantly (< 200ms)
- [ ] "Updated X ago" badge shows time since `balance_cached_at`
- [ ] Manual refresh button: rate-limited to 1 per 15 minutes per connection (server-side enforcement)
- [ ] Manual refresh updates cache and refreshes UI without full page reload
- [ ] Balance displayed in original currency + base currency equivalent

**Dependencies:** US-021, US-022, US-023

---

### US-027 · Transaction Deduplication
**As a** system  
**I want** duplicate transaction detection across all ingestion sources  
**So that** a transaction captured by both SMS and Plaid never appears twice

**Story Points:** 5

**Acceptance Criteria:**
- [ ] `provider_txn_id` UNIQUE constraint (NULLS NOT DISTINCT) for Plaid/TrueLayer/AA transactions
- [ ] `dedup_hash` UNIQUE constraint: SHA-256 of (amount + merchant_normalized + timestamp-bucket-30min + currency)
- [ ] On conflict with `provider_txn_id`: bank API version updates existing row (not inserted as duplicate)
- [ ] On conflict with `dedup_hash`: bank API source wins; SMS/email row discarded
- [ ] `merchant_normalized`: lowercase, stripped of special characters, trimmed
- [ ] ±30-minute bucket avoids midnight boundary bug (e.g., 23:45 and 00:05 are same bucket if within 30 min)
- [ ] Unit tests: 10 deduplication scenarios covering all conflict cases

**Dependencies:** US-021, US-022, US-023, US-024, US-025

---

## E5 — Budget, Discipline & Reporting

**Goal:** Deliver the core value proposition — discipline scoring, budget visibility, and pre-computed reports that load instantly.

### US-028 · Income & Budget Configuration
**As a** user  
**I want** to set my monthly income and budget split  
**So that** FinTrack can calculate how well I'm staying within my financial targets

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Settings → Finance → Monthly Income: currency input, saved to `user_profiles.monthly_income`
- [ ] Settings → Finance → Budget Targets: three sliders (Needs / Wants / Savings)
- [ ] Real-time validation: sliders must sum to 100%; error shown if they don't
- [ ] Budget change banner: "Changes effective from next month" (no retroactive recalculation)
- [ ] Weekly spend limit field: optional; alert at 80% threshold
- [ ] Income setup nudge card on Dashboard until income is set

**Dependencies:** US-001, US-003

---

### US-029 · Dashboard Budget Ring
**As a** user  
**I want** to see a real-time 50/30/20 donut ring on my dashboard  
**So that** I know instantly if I'm on track for this month

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Donut ring: three segments (Needs/Wants/Savings) with actual vs target
- [ ] Green: ≤ 70% of budget used; Amber: 70–99%; Red: ≥ 100%
- [ ] Donut updates in real-time when new transactions are added
- [ ] Tap on donut → Budget detail screen (breakdown by category)
- [ ] Current month only (not rolling 30 days)
- [ ] If no income set: ring shows spend totals without % comparison; "Set income for targets" prompt

**Dependencies:** US-028, US-015

---

### US-030 · Weekly Discipline Score Computation
**As a** system  
**I want** to compute weekly discipline scores automatically every Monday  
**So that** users receive an objective assessment of their financial week without manual intervention

**Story Points:** 5

**Acceptance Criteria:**
- [ ] pg_cron job runs every Monday at 08:00 UTC
- [ ] For each user with transactions in prior week: compute `weekly_summaries` row
- [ ] Formula: `score = 100 - (|needs_pct_actual - needs_pct_target| × 0.5 + |wants_pct_actual - wants_pct_target| × 0.3 + |savings_pct_actual - savings_pct_target| × 0.2) × 2`, clamped [0, 100]
- [ ] `category_breakdown` jsonb computed per category
- [ ] No duplicate rows: UNIQUE constraint on (user_id, week_start) handles re-runs
- [ ] Score of 0 for weeks with zero spend (not null)
- [ ] Push notification sent Sunday evening: "Your weekly score: 78/100 · Top spend: Food"

**Dependencies:** US-028, US-015

---

### US-031 · Weekly Report Screen
**As a** user  
**I want** to see a detailed weekly spending report  
**So that** I can understand my spending patterns and discipline score for the week

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Week date range header + total spend
- [ ] Spend vs weekly limit: progress bar (green / amber / red)
- [ ] Day-by-day bar chart (Mon–Sun): each bar coloured by budget status; tap opens that day's transactions
- [ ] Category breakdown donut chart with legend
- [ ] Top 3 merchants (by total spend)
- [ ] Need / Want / Saving split horizontal bars
- [ ] Discipline score: large number (0–100), WoW trend arrow (↑↓→)
- [ ] Period navigation: swipe left/right or dropdown
- [ ] "Share week" → export option
- [ ] Screen loads from `weekly_summaries` (pre-computed); no client-side aggregation
- [ ] Load time < 1.5 seconds (P95)

**Dependencies:** US-030

---

### US-032 · Monthly Report Screen
**As a** user  
**I want** to see a detailed monthly spending report with a calendar heatmap  
**So that** I can identify high-spend days and track my monthly discipline

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Calendar heatmap: each day 1–31 coloured green (low) → red (high spend)
- [ ] Tap any day on heatmap → that day's transaction list
- [ ] Budget vs Actual table: Need / Want / Saving rows — target · actual · variance · %
- [ ] Category breakdown: horizontal bars with amounts
- [ ] Payment mode breakdown: pie chart
- [ ] Discipline score for month with MoM trend
- [ ] "⚠️ Partial month" banner if `is_partial = true`
- [ ] Period navigation: swipe or dropdown; supports previous months
- [ ] Load time < 1.5 seconds (P95)

**Dependencies:** US-030

---

### US-033 · Monthly Summary Computation
**As a** system  
**I want** monthly summaries computed automatically on the 1st of each month  
**So that** monthly reports load instantly without client-side SQL aggregation

**Story Points:** 5

**Acceptance Criteria:**
- [ ] pg_cron runs on 1st of each month at 02:00 UTC
- [ ] Computes `monthly_summaries` per user: total_spend, needs_spend, wants_spend, savings_spend, budget_targets (snapshot), discipline_score, is_partial, daily_breakdown, category_breakdown
- [ ] `is_partial = true` if user's bank connection `tracking_from` is within the month
- [ ] UNIQUE on (user_id, month) handles idempotent re-runs
- [ ] Mid-month partial summary computed on-demand for current month (live query, not cached)

**Dependencies:** US-030, US-001

---

### US-034 · Annual Report Screen
**As a** user  
**I want** to see an annual financial report with year-over-year insights  
**So that** I can review my financial year and prepare for annual planning

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Year selector (supports all years with data)
- [ ] 12-month spend trend line chart
- [ ] Total spend vs total income (if income set) — savings rate %
- [ ] Year-over-year savings rate comparison (if prior year data available)
- [ ] Month-by-month summary table: month · Need · Want · Saving · vs budget · discipline score
- [ ] Partial months marked ⚠️ in table; excluded from annual discipline score
- [ ] Auto-generated insights (3 max): "Highest spend month", "Best discipline month", "Most spent category"
- [ ] Load time < 2 seconds (P95)

**Dependencies:** US-033

---

## E6 — Export & Google Drive

**Goal:** Excel export that mirrors the original Finance Tracker Template; frictionless Google Drive save.

### US-035 · Excel Report Generation (On-Device)
**As a** user  
**I want** to export my financial data as an Excel file  
**So that** I have a portable record I can review in Excel or Google Sheets

**Story Points:** 8

**Acceptance Criteria:**
- [ ] ExcelJS integrated in React Native (via expo-file-system for file write)
- [ ] 6-sheet structure mirrors Finance Tracker Template: Setup · Daily Expense Tracker · Weekly Analysis · Monthly Analysis · Yearly Calendar · Calc
- [ ] Setup sheet: salary, budget %, categories
- [ ] Daily Expense Tracker sheet: Date · Description · Category · Amount · Payment Mode · Type · Notes — one row per transaction
- [ ] Weekly Analysis: week-by-week summary table with discipline scores
- [ ] Monthly Analysis: daily breakdown + budget vs actual
- [ ] Yearly Calendar: heatmap data (spend per day, formatted as numbers for Excel conditional formatting)
- [ ] Calc: budget vs actual formulas
- [ ] Export time: < 5 seconds for 1 month of data (~900 transactions) on mid-range device
- [ ] File accessible from Files app (iOS) / Downloads (Android)

**Dependencies:** US-031, US-032, US-034

---

### US-036 · Google Drive Export
**As a** user  
**I want** to save my Excel report directly to Google Drive  
**So that** I have an automated, organised cloud backup of my financial records

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Google Drive OAuth requested at first export tap (not during onboarding)
- [ ] Required scope: `drive.file` only (FinTrack can only access files it creates)
- [ ] Folder picker: browse existing folders or create new "FinTrack Reports" folder
- [ ] Auto-naming: `FinTrack_[Month][Year]_[Type].xlsx` (e.g. `FinTrack_May2026_Monthly.xlsx`)
- [ ] Upload progress indicator
- [ ] Success toast: "Saved to Drive ✓ · Open in Drive"
- [ ] Error handling: network failure shows retry CTA; partial upload cleaned up
- [ ] OAuth token stored encrypted in Supabase Vault; refresh handled automatically
- [ ] User can unlink Google Drive from Settings → Reports & Export

**Dependencies:** US-035

---

### US-037 · Export Settings & Auto-Export
**As a** user  
**I want** to configure export preferences  
**So that** my reports are automatically saved without manual steps

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Settings → Reports & Export: Google Drive link/unlink, default folder, auto-export toggles
- [ ] Auto-export weekly: sends weekly Excel to Drive every Sunday after score computation
- [ ] Auto-export monthly: sends monthly Excel to Drive on 1st of each month
- [ ] Auto-export only runs if Google Drive is linked; otherwise shows nudge in Settings
- [ ] Export history: last 5 exports shown with filename + timestamp + destination

**Dependencies:** US-036

---

## E7 — Accounts, Net Worth & Goals

**Goal:** Real-time net worth view across all accounts; basic savings goals with progress tracking.

### US-038 · Net Worth Dashboard Card
**As a** user  
**I want** to see my total net worth prominently on the dashboard  
**So that** I have an at-a-glance understanding of my financial position

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Net Worth card at top of Dashboard; full width
- [ ] Total: sum of all connected account balances in base currency
- [ ] Per-account breakdown expandable via chevron
- [ ] "Updated X ago" freshness badge
- [ ] Manual refresh button (rate-limited; shows spinner during refresh)
- [ ] "—" shown with "Connect a bank" prompt if no accounts connected
- [ ] Multi-currency: amounts converted using latest cached FX rate

**Dependencies:** US-026, US-013

---

### US-039 · Accounts Tab
**As a** user  
**I want** a dedicated screen for managing all my bank accounts and cash  
**So that** I can view balances, check connection status, and manage my linked accounts in one place

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Net Worth total at top (same value as Dashboard; single source of truth)
- [ ] One card per connected account: logo · name · account type · balance (original + base) · "Updated X ago" · status badge
- [ ] Status badges: Active (green) / Expired (amber) / Error (red) / Disconnected (grey)
- [ ] Cash accounts listed separately
- [ ] "Add Account +" button at bottom
- [ ] Loans section: "Coming in v2" placeholder card

**Dependencies:** US-026, US-038

---

### US-040 · Account Detail & Reconnect
**As a** user  
**I want** to see the detail of a specific account and reconnect if the token expires  
**So that** I can monitor individual accounts and fix connection issues without going through full re-onboarding

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Account name + current balance
- [ ] 7-day balance history line chart (from stored `balance_amount` snapshots)
- [ ] Recent transactions from this account (filtered by `bank_connection_id`)
- [ ] "Refresh Balance" button (rate-limited)
- [ ] "Reconnect" CTA shown when `status = 'expired'` — launches provider re-auth flow
- [ ] "Remove account" (destructive): confirmation dialog → sets `status = 'disconnected'`; does not delete historical transactions
- [ ] Removing account does not affect Net Worth retroactively (balance removed from total)

**Dependencies:** US-039

---

### US-041 · Savings Goals
**As a** user  
**I want** to create and track savings goals  
**So that** I have visible progress toward my financial targets

**Story Points:** 8

**Acceptance Criteria:**
- [ ] "Add Goal" form: name · target amount (base currency) · target date (optional)
- [ ] Goal list with progress bars (% complete) + days remaining countdown
- [ ] Goal detail: progress line chart over time, list of transactions contributing to goal
- [ ] Goals linked to "Saving" type transactions (contribution tracked automatically)
- [ ] "Mark as achieved" button: confetti animation + goal archived
- [ ] Goals visible on Dashboard (active goals section with progress bars)
- [ ] Maximum 5 active goals enforced (MVP scope)
- [ ] Goals can be archived or deleted

**Dependencies:** US-001, US-015

---

## E8 — Settings, Privacy & Compliance

**Goal:** Full privacy controls, GDPR/CCPA/RBI compliance, and notification management.

### US-042 · Notification System
**As a** user  
**I want** relevant push notifications at the right moment  
**So that** I stay aware of my finances without being overwhelmed by noise

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Push notification permission requested contextually: when first weekly summary is ready (not at onboarding)
- [ ] Notification types: new transaction detected, transaction needs review, budget alert (80% threshold), weekly summary (Sunday), bank re-consent (30 days before expiry), bank connection error
- [ ] Notification preferences: per-type on/off toggle in Settings → Notifications
- [ ] Budget alert: sent once per category per month (not per transaction)
- [ ] Deep links: new transaction → review screen; budget alert → Monthly report; weekly summary → Weekly report; bank error → Accounts tab
- [ ] Expo Push Notifications via Supabase Edge Function + Expo Push API
- [ ] Failed push attempts logged; no retry spam (max 1 retry per notification)

**Dependencies:** US-030, US-031

---

### US-043 · Privacy Controls & GDPR Compliance
**As a** user  
**I want** full control over my data and the ability to export or delete it  
**So that** my privacy rights under GDPR, CCPA, and RBI regulations are respected

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Settings → Privacy & Legal: Export my data · Privacy Policy · Terms of Service · Delete Account
- [ ] Data export (GDPR Article 20): triggers async job; JSON file with all user data emailed within 24 hours
- [ ] Account deletion: 2-step confirmation ("Delete account" → "Yes, permanently delete") → cascade wipe of all user data from all tables → confirmation email sent
- [ ] Deletion queued as async job; completed within 30 days (GDPR Article 17 SLA)
- [ ] Audit log: `account_deleted` event written with timestamp and IP
- [ ] CCPA: California users can access same export + delete rights
- [ ] SMS access: Android settings deep-link to revoke READ_SMS permission
- [ ] Email OAuth: Gmail/Outlook OAuth can be revoked inline from Settings
- [ ] India user data: stored only in `ap-south-1`; export data includes region note

**Dependencies:** US-001, US-014

---

### US-044 · Subscription Management
**As a** user  
**I want** to view and manage my FinTrack subscription  
**So that** I can see my plan status and cancel if needed without confusion

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Settings → Subscription: plan name ("FinTrack Premium"), price, billing cycle, next renewal date
- [ ] "Cancel subscription" → RevenueCat cancellation flow (App Store / Play Store native)
- [ ] "Access continues until [date]" shown after cancellation (no immediate cut-off)
- [ ] ToS disclosure: "Access limited to 60 minutes after cancellation" (JWT grace window)
- [ ] Lapsed subscription: 7-day grace period; paywall shown after grace period expires
- [ ] Paywall CTA: "Renew subscription" deep-links to store subscription management

**Dependencies:** E9, US-001

---

## E9 — Subscription & Monetisation

**Goal:** RevenueCat integration with JWT entitlement; 14-day free trial; App Store + Play Store billing.

### US-045 · RevenueCat Integration & JWT Entitlement
**As a** developer  
**I want** RevenueCat managing subscriptions and JWT entitlement claims reflecting subscription status  
**So that** entitlement checks work without a database query and survive Supabase outages

**Story Points:** 8

**Acceptance Criteria:**
- [ ] RevenueCat SDK configured: iOS + Android packages and entitlement identifiers
- [ ] RevenueCat webhook configured to receive subscription events (new purchase, renewal, cancellation, expiry)
- [ ] Webhook handler: Supabase Edge Function updates `user_entitlements` table + calls Supabase Admin API to update `app_metadata.entitlement` claim
- [ ] JWT `app_metadata.entitlement` = `'premium_annual'` when active; `'free'` when lapsed
- [ ] Mobile app reads entitlement from decoded JWT (zero DB query)
- [ ] JWT refreshed every hour; max 60-minute window after cancellation before entitlement revoked
- [ ] Grace period: `grace_until = valid_until + 7 days`; features accessible during grace

**Dependencies:** US-001, US-003

---

### US-046 · Free Trial & Paywall
**As a** new user  
**I want** to try FinTrack free for 14 days before deciding to subscribe  
**So that** I can experience full value before committing

**Story Points:** 5

**Acceptance Criteria:**
- [ ] 14-day free trial: full feature access, RevenueCat managed
- [ ] Trial expiry: in-app paywall shown; core tracker still usable (bank sync + export paywalled)
- [ ] Paywall screen: plan details ($2.99/mo billed annually = $35.88/year), "Start subscription" CTA, feature comparison
- [ ] "Start subscription" initiates App Store / Play Store native purchase flow
- [ ] Purchase confirmation: JWT updated within 60 seconds (webhook → entitlement update)
- [ ] Trial days remaining shown in Settings → Subscription during trial

**Dependencies:** US-045

---

## E10 — QA, Release & DevOps

**Goal:** Ship a stable, App Store-approved v1 by Week 24.

### US-047 · Test Suite — Unit & Integration
**As a** developer  
**I want** comprehensive automated tests  
**So that** regressions are caught before they reach users

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Unit tests: discipline score formula, deduplication hash logic, FX conversion, parse queue state machine
- [ ] Integration tests: Supabase RLS policies (each table; each role), RevenueCat webhook handler, transaction CRUD end-to-end
- [ ] SMS parser corpus tests: 200 messages per bank (HDFC, ICICI, SBI, Axis, Kotak) → ≥ 92% accuracy
- [ ] React Native component tests (React Testing Library): Add Transaction screen, Transaction List, Budget Ring, Discipline Score
- [ ] Coverage target: ≥ 80% on business logic; ≥ 60% overall
- [ ] All tests run in GitHub Actions CI on every PR; PR blocked if tests fail

**Dependencies:** All feature epics

---

### US-048 · App Store & Play Store Submission
**As a** team  
**I want** both apps submitted and approved in the stores  
**So that** users can download and install FinTrack

**Story Points:** 5

**Acceptance Criteria:**
- [ ] iOS: app icon (1024×1024), 6.7" + 5.5" screenshots, App Store description, privacy nutrition label completed
- [ ] iOS: Apple pre-submission review checklist completed (financial app requirements)
- [ ] Android: all screenshot sizes, Play Store listing, content rating form completed
- [ ] Android: Play Store financial app form + READ_SMS declaration submitted and approved
- [ ] iOS: privacy policy URL in App Store metadata (required for data collection)
- [ ] Both apps reviewed by at least 2 beta testers on target devices before submission
- [ ] App crash rate < 0.1% in TestFlight + Play Store internal testing

**Dependencies:** US-047

---

### US-049 · Monitoring & Alerting
**As a** developer  
**I want** production monitoring and alerting in place  
**So that** on-call can diagnose and resolve issues quickly

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Sentry: error tracking configured for React Native crashes and FastAPI exceptions
- [ ] PostHog: funnel tracking for onboarding steps, transaction add, report view, export, subscription events
- [ ] Supabase: Logflare alerts for: pg_cron job failures, Edge Function errors, API latency > 3s
- [ ] Railway: FastAPI CPU > 80% or memory > 90% → PagerDuty alert
- [ ] Runbook documented for top 5 scenarios: Plaid token expiry spike, Supabase outage, parse queue backlog > 1000, RevenueCat webhook failure, Play Store financial app rejection
- [ ] On-call rotation documented (even if solo — defines response SLA)

**Dependencies:** US-004

---

### US-050 · Performance Validation
**As a** team  
**I want** to validate performance targets on real devices before launch  
**So that** the app meets its < 1.5 second load time SLA in production

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Tested on: Pixel 5 (Android mid-range) and iPhone 12 (iOS mid-range)
- [ ] Cold start time measured: < 2 seconds
- [ ] Dashboard load (first open after sign-in): < 2 seconds
- [ ] Weekly report load (12 weeks of data): < 1.5 seconds
- [ ] Monthly report load (6 months of data): < 1.5 seconds
- [ ] Annual report load (12 months of data): < 2 seconds
- [ ] Manual transaction save round-trip: < 500ms
- [ ] Failed tests result in performance optimisation spike before submission

**Dependencies:** US-048

---

## Story Dependency Map

```
E1: Foundation (US-001 → US-006)
    └── All other epics depend on E1

E2: Auth & Onboarding (US-007 → US-014)
    └── Depends on: US-001, US-003

E3: Transaction Management (US-015 → US-020)
    └── Depends on: US-001, US-003 (E1)
    └── US-018 also depends on E4 (auto-parsed transactions)

E4: Bank Integration (US-021 → US-027)
    └── Depends on: US-001, US-003, US-012 (E2)

E5: Budget & Reporting (US-028 → US-034)
    └── Depends on: US-001, US-003, US-015 (E3)

E6: Export (US-035 → US-037)
    └── Depends on: US-031, US-032, US-034 (E5)

E7: Accounts & Goals (US-038 → US-041)
    └── Depends on: US-026 (E4), US-013 (E2), US-015 (E3)

E8: Settings & Compliance (US-042 → US-044)
    └── Depends on: US-030 (E5), US-001, US-014 (E2)

E9: Subscription (US-045 → US-046)
    └── Depends on: US-001, US-003
    └── E9 should start early (Sprint 3) — entitlement gates other features

E10: QA & Release (US-047 → US-050)
    └── Depends on: all epics
```

---

## Sprint Plan (Recommended Sequence)

| Sprint | Focus | Key Stories |
|--------|-------|-------------|
| 1 | Foundation | US-001 (Supabase), US-002 (FastAPI), US-003 (Expo scaffold), US-004 (CI/CD) |
| 2 | Foundation + Auth | US-005 (FX), US-006 (Offline queue), US-007 (Google OAuth), US-008 (Apple) |
| 3 | Auth + Subscription | US-009 (OTP), US-010 (Magic link), US-045 (RevenueCat), US-046 (Trial/Paywall) |
| 4 | Onboarding + Core Transactions | US-011, US-012, US-013, US-014 (Onboarding), US-015 (Add transaction) |
| 5 | Transactions | US-016 (List), US-017 (Edit/Delete), US-019 (Search/Filter), US-020 (Categories) |
| 6 | Bank Integration — Plaid + Budget | US-021 (Plaid), US-026 (Balance cache), US-027 (Dedup), US-028 (Budget config) |
| 7 | Bank Integration — TrueLayer + Setu | US-022 (TrueLayer), US-023 (Setu AA), US-024 (SMS parsing) |
| 8 | Email Parsing + Reports | US-025 (Gmail), US-029 (Dashboard ring), US-030 (Score), US-031 (Weekly report) |
| 9 | Reports + Accounts | US-032 (Monthly), US-033 (Monthly summary), US-034 (Annual), US-038 (Net Worth), US-039 (Accounts tab) |
| 10 | Goals + Export | US-040 (Account detail), US-041 (Goals), US-035 (Excel), US-036 (Drive) |
| 11 | Settings + Compliance | US-037 (Export settings), US-042 (Notifications), US-043 (GDPR), US-044 (Subscription mgmt) |
| 12 | QA + Release | US-047 (Tests), US-048 (App Store), US-049 (Monitoring), US-050 (Performance) |

---

*Document references: [PRD](2026-05-13-prd.md) · [Architecture v4](2026-05-13-architecture-v4.md) · [Data Model](2026-05-13-data-model.md) · [Screen Flows](2026-05-13-screen-flows.md) · [Onboarding](2026-05-13-onboarding-flow.md) · [Project Brief](2026-05-13-project-brief.md) · [BRD](2026-05-13-brd.md)*
