# FinTrack — Screen Flows (Final)

**Date:** 2026-05-13  
**Platform:** iOS + Android (React Native / Expo)  
**Navigation:** Bottom tab bar — 5 tabs (Apple HIG / Material You standard)

---

## Industry Standard: MVP Screen Count

| App | MVP tabs | Core screens |
|-----|----------|-------------|
| Google Pay | 4 | Home, New payment, Insights, Profile |
| Monzo | 4 | Home, Payments, Explore, Account |
| YNAB | 4 | Budget, Accounts, Reports, Settings |
| Mint (shutdown) | 5 | Overview, Transactions, Budgets, Bills, Investments |
| **FinTrack MVP** | **5** | Dashboard, Tracker, Reports, Accounts, Settings |

**Rule:** Apple HIG recommends 3–5 bottom tabs max. 5 is the accepted ceiling for financial apps.

---

## Navigation Structure

```
Bottom Tab Bar
├── 🏠 Dashboard      (Home — always first)
├── ➕ Tracker        (Daily spend entry + list)
├── 📊 Reports        (Weekly · Monthly · Annual)
├── 🏦 Accounts       (Banks · Net Worth · Goals)
└── ⚙️  Settings      (Profile · Budget · Privacy)
```

**Floating action button** (FAB) on Dashboard + Tracker tabs: Quick-add transaction. Accessible within 1 tap from anywhere.

---

## Tab 1 — Dashboard (Home)

**Industry benchmark:** Monzo home, Google Pay home — balance first, activity second, always personalised.

### 1.1 Dashboard Main
- **Net Worth card** (top, full-width)
  - Total balance across all connected accounts in base currency
  - Per-account breakdown (expandable chevron)
  - "Updated X ago" freshness badge
  - Manual refresh button (rate-limited 1/15 min per connection)
  - "—" with connect prompt if no bank linked
- **Budget Ring** (50/30/20 donut)
  - Current month: Needs / Wants / Savings spend vs target
  - Colour: green (on track) → amber (≥ 80%) → red (over)
  - Tap → Budget detail screen
- **Today's Spend** strip
  - Total spend today + last 3 transactions
  - Tap any → transaction detail
  - "Add transaction →" link
- **Goals Progress** (if goals set)
  - Active goals with % progress bars
  - Tap → Goals screen
- **Smart Nudge Cards** (contextual, dismissed when done)
  - "Set monthly income →" (until income set)
  - "Connect a bank →" (until bank linked)
  - "Add first transaction →" (until first txn)

### 1.2 Net Worth Breakdown (expanded)
- Per-bank account: institution name + logo + balance + currency
- Cash accounts listed separately
- "Add account →" button at bottom

---

## Tab 2 — Tracker (Daily Spend)

**Industry benchmark:** Spendee, Money Manager — date-grouped list, fast add flow.

### 2.1 Transaction List
- Grouped by date (today first, descending)
- Each row: merchant name · category icon · amount · type badge (Need / Want / Saving) · payment mode icon
- Source indicator: SMS / Email / Plaid / Manual (subtle)
- Swipe left: delete (with undo)
- Swipe right: edit
- Pull to refresh

### 2.2 Add Transaction (Manual)
**Flow optimised for speed — most common action in the app:**
1. Numpad opens immediately (amount is always first)
2. Description field (auto-suggest from past merchants)
3. Category (last used pre-selected)
4. Type: Need / Want / Saving (pill selector)
5. Payment mode (last used pre-selected)
6. Date (defaults to today, tap to change)
7. Notes (optional, collapsed by default)
8. Save

**Target time to add:** < 15 seconds

### 2.3 Auto-Parsed Transaction Review
- Card shows: source (SMS / Email / Plaid) + parsed fields
- "Confirm" (one tap) or "Edit" (opens 2.2 pre-filled)
- Auto-confirms after 24h if user doesn't act
- "Review" badge on tab icon when unconfirmed transactions exist

### 2.4 Transaction Detail / Edit
- All fields editable
- Shows source and parse confidence
- Delete option

### 2.5 Filter / Search
- Search by merchant / description
- Filter: date range · category · type · payment mode · source
- Sort: date (default) · amount

---

## Tab 3 — Reports

**Industry benchmark:** Mint monthly view, YNAB reports — pre-computed, never slow.

### 3.1 Reports Hub
- Toggle: Weekly · Monthly · Annual
- Period picker (swipe left/right or dropdown)

### 3.2 Weekly Report
- Week date range + total spend
- Spend vs weekly limit (progress bar, coloured by status)
- Day-by-day bar chart (Mon–Sun), colour = budget status, tap = that day's transactions
- Category breakdown donut
- Top 3 merchants
- Need / Want / Saving split bars
- **Discipline Score** (0–100): adherence to 50/30/20 with week-on-week trend arrow
- "Share week" → export option

### 3.3 Monthly Report
- Month + year header with swipe navigation
- **Calendar heatmap** (mirrors Excel Yearly Calendar sheet): each day coloured by spend intensity (green → red)
- Tap any day → that day's transactions
- Budget vs Actual table: Need / Want / Saving — target · actual · variance · %
- Category breakdown (horizontal bars)
- Payment mode breakdown (pie)
- Discipline Score for month
- "⚠️ Partial month" banner if `is_partial = true`

### 3.4 Annual Report
- Year selector
- 12-month spend trend line chart
- Total spend vs total income (if income set)
- Savings rate % (year-over-year if data available)
- Month-by-month summary table: Need / Want / Saving vs budget, discipline score
- Partial months marked ⚠️, excluded from annual score calculation
- Top insights (auto-generated):
  - "Highest spend month: August"
  - "Best discipline: March (94/100)"
  - "Most spent category: Life Infrastructure"

### 3.5 Export
- Select: Weekly / Monthly / Annual
- Select period
- Format: **Download Excel (.xlsx)** or **Save to Google Drive**
- Excel generated on-device (ExcelJS) — mirrors original template sheet structure (Setup, Daily Expense Tracker, Weekly Analysis, Monthly Analysis, Yearly Calendar, Calc)
- Google Drive: OAuth if not linked, select/create folder, auto-name `FinTrack_May2026_Monthly.xlsx`
- Confirmation: "Saved to Drive ✓" or share sheet for download

---

## Tab 4 — Accounts

**Industry benchmark:** Plaid-connected apps (Copilot, Monarch) — balance first, per-account detail.

### 4.1 Accounts List
- **Net Worth total** (same as Dashboard card — single source of truth)
- Connected bank accounts (card per account):
  - Institution logo + name
  - Account type (Current / Savings / Credit)
  - Balance in original currency + base currency equivalent
  - "Updated X ago" + manual refresh button
  - Status badge: Active / Expired / Error
- Cash accounts (manual)
- Loans section (placeholder for v2)
- "Add Account +" button

### 4.2 Account Detail
- Account name + balance history (7-day line chart)
- Recent transactions from this account only
- "Refresh Balance" (rate-limited)
- "Reconnect" (if token expired)
- "Remove account" (destructive, confirmation required)

### 4.3 Add Bank Account
- Region auto-detected, show right provider
- Same flow as onboarding Screen 4
- Success → back to Accounts list with new account appearing

### 4.4 Add Cash Account
- Name (e.g. "Wallet", "Petty Cash")
- Opening balance + currency
- No sync — manual transactions only

### 4.5 Goals
- Active goals list with progress bars + target date countdown
- Tap → Goal detail (progress chart, transaction history contributing to goal)
- "Add Goal +" → Name · Target amount · Target date (optional)
- "Mark as achieved" → confetti animation + archived

---

## Tab 5 — Settings

**Industry benchmark:** Revolut settings — clean categories, no clutter, dangerous actions at bottom.

### 5.1 Settings Menu
```
Profile
  My Profile (name, email, base currency)
  Subscription (plan, renewal, cancel)

Finance
  Monthly Income
  Budget Targets (50/30/20 sliders)
  Custom Categories
  Weekly Spend Limit

Banks & Connections
  Manage Banks (connected accounts)
  Email Connection (Gmail / Outlook)
  SMS Settings (Android)

Reports & Export
  Google Drive (link / unlink / default folder)
  Auto-export (weekly / monthly toggle)

Notifications
  Transaction alerts
  Budget alerts (80% threshold)
  Weekly summary
  Bank re-consent reminders

Security
  Biometric lock toggle
  Auto-lock timer (1 / 5 / 15 min)
  Change password / PIN

Privacy & Legal
  Export my data (GDPR)
  Privacy Policy
  Terms of Service
  Delete Account (⚠️ destructive — bottom of list)
```

### 5.2 Profile
- Display name, email (read-only), base currency (editable → triggers re-aggregation)
- DOB (view only — "Contact support to update")

### 5.3 Subscription
- Plan: FinTrack Premium · $2.99/mo billed annually
- Next renewal date
- "Cancel subscription" → RevenueCat cancellation flow
- "Access continues until [date]" (no immediate cut-off)
- "60 minutes max access after cancellation" — per ToS disclosure

### 5.4 Budget Targets
- Needs % / Wants % / Savings % sliders
- Live validation: must sum to 100%
- Monthly income field (drives absolute budget amounts)
- Weekly spend limit field
- "Effective from next month" — no retroactive changes

### 5.5 Manage Banks
- Same as Accounts list but focused on connection management
- Token expiry warnings
- Re-consent CTAs for Setu AA

### 5.6 Privacy Controls
- Export all my data (GDPR Article 20 — JSON export, 24h async)
- SMS access: on / off (Android)
- Email access: revoke OAuth (Google / Outlook)
- Delete account: 2-step confirmation → cascade wipe → confirmation email

---

## Notification Strategy

| Notification | Trigger | Frequency |
|-------------|---------|-----------|
| New transaction detected | SMS / email / Plaid webhook | Per transaction |
| Transaction needs review | Auto-parsed, unconfirmed > 1h | Once per batch |
| Budget alert | 80% of Need / Want / Saving category | Once per category per month |
| Weekly summary | Every Sunday | Weekly |
| Bank re-consent | 30 days before Setu AA expiry | Once |
| Bank connection error | Token expired / API error | Once per incident |

**Permission request:** Deferred to after onboarding, triggered when first weekly summary is ready.

---

## Deep Link Map

| Notification tap | Destination |
|-----------------|-------------|
| New transaction | Transaction review screen (2.3) |
| Budget alert | Reports → Monthly (3.3) |
| Weekly summary | Reports → Weekly (3.2) |
| Bank re-consent | Accounts → Account detail (4.2) |
| Bank error | Accounts list (4.1) |

---

## MVP Scope — In vs Out

### ✅ MVP (v1)
- 5-tab navigation
- Full onboarding (5 screens)
- Bank connection: Plaid (US) · TrueLayer (UK) · Setu AA + SMS (India)
- Gmail / Outlook OAuth email parsing
- Daily transaction tracker (manual + auto)
- Budget ring (50/30/20 user-definable)
- Weekly + Monthly reports
- Annual report
- Excel export + Google Drive save
- Net worth (multi-bank)
- Goals (basic)
- Custom categories
- Biometric lock
- Push notifications

### 🚫 Out of MVP (v2+)
- Loans / liabilities tracking
- Split transactions
- Recurring transaction detection (auto)
- Investment portfolio tracking
- Bill reminders
- Multi-user / family accounts
- AI-powered insights (ML anomaly detection)
- Apple Watch / widget
- Web dashboard
- CSV import from other apps
