# FinTrack — Screen Specs: Group B — Budget, Reports, Bank & Accounts

**Author:** Sally (Senior UX Designer)
**Date:** 2026-05-13
**Screens:** SCR-014 – SCR-021
**Status:** Complete — ready for dev handoff

*References: [Epics & Stories](../specs/2026-05-13-epics-stories.md) · [Data Model](../specs/2026-05-13-data-model.md) · [Architecture v4](../specs/2026-05-13-architecture-v4.md)*

---

### SCR-014 — Budget Ring / Overview

**Epic/Story:** E5 · US-029
**Route:** `/(app)/budget` (Expo Router)
**Auth required:** Yes
**Paywall:** Free (ring visible); Premium unlocks category drill-down and historical periods
**Region variants:** All

#### Layout

```
┌─────────────────────────┐
│  May 2026        ⓘ     │  ← month label · info icon opens formula tooltip
│                         │
│      ┌─────────┐        │
│      │ ●●●●●● │        │  ← donut ring (Needs/Wants/Savings arcs)
│      │  ₹ 42k │        │  ← total spend this month, centred
│      │ of ₹80k │        │  ← budget limit (income × target), centred sub-label
│      └─────────┘        │
│                         │
│  Updated just now  🔄   │  ← freshness badge · refresh icon
│                         │
│  ┌──────┐┌──────┐┌────┐ │
│  │Needs ││Wants ││Save│ │  ← three legend pills
│  │  52% ││  31% │ 17%│ │  ← actual % of total spend
│  │ ▲ 2% ││  →   │ ▼3%│ │  ← delta vs target (green/amber/red arrow)
│  └──────┘└──────┘└────┘ │
│                         │
│  ─────────────────────  │
│  Category Breakdown ›   │  ← section header; chevron → drill-down
│                         │
│  🏠 Life Infrastructure │
│     ₹ 18,400   46% ████ │  ← bar fill proportional to spend share
│  📈 Performance & Growth│
│     ₹ 12,000   30% ███  │
│  ✨ Lifestyle Enjoyment │
│     ₹  7,600   19% ██   │
│  ❤️  Relationships      │
│     ₹  2,000    5% ▌    │
│  💰 Future Me           │
│     ₹  2,000    5% ▌    │
│                         │
│  [Set income for targets]│  ← shown ONLY when monthly_income IS NULL
└─────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| MonthSelector | Header label + tap | Tap opens a bottom sheet with month picker (current month default); navigates to previous months; future months disabled |
| BudgetDonut | SVG animated ring | Three arcs: Needs (indigo `#6366f1`), Wants (orange `#fb923c`), Savings (green `#34d399`). Arc length = actual spend ÷ budget cap. Arcs animate on mount (easeOut, 600 ms). Overflow arc (> 100%) renders in red `#ef4444` on top of the full arc. Tap on a segment highlights it and scrolls to its legend pill. |
| CentreLabel | Text pair inside donut | Line 1: total spend formatted via dinero.js. Line 2: "of [budget]" — hidden if income not set; replaced with raw total only. |
| FreshnessBadge | Text + icon | Shows "Updated just now" immediately after a refresh. Otherwise "Updated X ago" computed from `balance_cached_at` (relative, e.g. "Updated 3 h ago"). Refresh icon tap triggers manual refresh (rate-limit: 1/15 min; shows spinner; 429 → toast "Please wait — refresh available in Xm"). |
| LegendPill × 3 | Pressable card | Each shows: label, actual %, delta arrow vs target. Colour: green ≤ 70% used, amber 70–99%, red ≥ 100%. Tap highlights the corresponding donut arc. |
| CategoryBreakdownRow | List row | Icon, name, formatted amount, % share, horizontal bar fill. Tap → SCR-017 (category detail, filtered to this category). Requires Premium; free users see blurred rows below position 3 with "Unlock full breakdown" CTA. |
| FormulaTooltip | Modal bottom sheet | Triggered by ⓘ icon. Shows discipline score formula with plain-English explanation of weights. Dismiss by swiping down. |
| IncomeNudgeBanner | Inline card | Shown only when `user_profiles.monthly_income IS NULL`. Copy: "Set your monthly income to see how you're tracking against targets →". Tap → Settings → Finance → Monthly Income. |

#### States

- **Default:** Donut renders with live spend data for current month. Category rows sorted by spend descending. Freshness badge shows time since last balance refresh.
- **Loading:** Donut ring replaced by a grey shimmer circle (same diameter). Three legend pills show skeleton loaders. Category rows show 4 skeleton rows with shimmer.
- **Empty (no transactions this month):** Donut ring shows as a single grey unfilled arc. Centre label: "₹ 0 spent". Legend pills all show "0%". Category section shows: "No transactions yet this month — add your first spend" with an Add Transaction button.
- **No income set:** Donut renders spend totals only (no target comparison). Legend pills show absolute amounts, not %. IncomeNudgeBanner shown at bottom.
- **Error (fetch failed):** Full-screen inline error inside the card area: "Couldn't load budget data. Check your connection." + "Try again" button that re-triggers the query.

#### Navigation

- **Entry points:** Dashboard bottom tab (Budget ring card tap → this screen); Dashboard "Set income" nudge card CTA
- **Exit points:** Category row tap → SCR-017; ⓘ tooltip → stays on screen (modal); "Set income" banner → Settings Finance screen; Add Transaction empty-state CTA → Add Transaction sheet

#### Interaction notes

- Donut updates via Supabase Realtime: the `transactions` table INSERT/UPDATE fires a React Query cache invalidation (`queryKey: ['budget', userId, currentMonthISO]`). The donut arcs animate to new values with a 400 ms ease transition — no full screen reload.
- "Updated just now" replaces the X-ago badge immediately after any invalidation event or manual refresh, then transitions to relative time.
- Manual refresh is rate-limited server-side to 1 per 15 minutes. On 429 response: toast appears: "Refresh available in [countdown]" — dismiss auto after 3 s.
- On iOS, the donut ring uses `react-native-svg` SVG arcs. On Android, same component — NativeWind does not apply to SVG children; styles applied via SVG props directly.
- The donut chart centre label switches between INR (₹), USD ($), GBP (£) based on `user_profiles.base_currency`. Multi-currency accounts: all amounts converted to base currency via latest `fx_rates`.

---

### SCR-015 — Weekly Report

**Epic/Story:** E5 · US-031
**Route:** `/(app)/reports/weekly` (Expo Router)
**Auth required:** Yes
**Paywall:** Both (partial access on Free: score + total only; Premium unlocks day chart, category breakdown, merchant list)
**Region variants:** All

#### Layout

```
┌─────────────────────────┐
│ ←  Week of May 5–11  →  │  ← swipe left/right or tap arrows to navigate
│                         │
│  ┌───────────────────┐  │
│  │ Discipline Score  │  │
│  │      78 / 100     │  │  ← large score; colour-coded
│  │    ↑ +5 vs last   │  │  ← WoW trend arrow (green ↑ / grey → / red ↓)
│  │  [ ? Score formula]│  │  ← tooltip trigger
│  └───────────────────┘  │
│                         │
│  Total Spend: ₹ 22,400  │
│  Limit:       ₹ 28,000  │
│  [████████░░░░] 80%  ⚠️  │  ← progress bar; amber at 80%; red if > 100%
│                         │
│  ─ Spend by Day ───────  │
│  ┌─┐ ┌─┐ ┌──┐ ┌─┐ ┌─┐  │
│  │ │ │ │ │  │ │ │ │ │  │  ← 7 bars Mon–Sun; colour = budget status
│  └─┘ └─┘ └──┘ └─┘ └─┘  │
│  Mo  Tu  We  Th  Fr     │
│  Sa  Su  (greyed if 0)  │
│                         │
│  ─ Category Breakdown ─  │
│  [Donut + legend]        │
│                         │
│  ─ Top 3 Merchants ─────  │
│  1. Swiggy        ₹6,200 │
│  2. BigBasket     ₹4,100 │
│  3. Netflix       ₹1,499 │
│                         │
│  ─ Need / Want / Save ─  │
│  Need  ████████░  55%   │
│  Want  █████░░░░  32%   │
│  Save  ███░░░░░░  13%   │
│                         │
│  [Share this week →]    │
│                         │
│ ⚠️ Partial month — score │
│ may not reflect full    │
│ month patterns.         │  ← shown only if is_partial = true
└─────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| WeekNavigator | Header with tap arrows + swipe | Left/right arrows + `ScrollView` horizontal swipe changes the week. Earliest navigable week = user's `tracking_from` date. Future weeks disabled. Current week label: "This week (May 5–11)"; past weeks: "May 5–11". Dropdown alternative: tap the date label to open a week-picker bottom sheet. |
| DisciplineScoreCard | Large number card | Score 0–100. Colour: ≥ 80 green, 60–79 amber, < 60 red. WoW trend: compare to prior `weekly_summaries.discipline_score`. Arrow: ↑ green if +1 or more, → grey if 0, ↓ red if –1 or less. ⓘ tooltip: opens FormulaTooltip bottom sheet showing formula and weight explanation. |
| WeeklySpendBar | Progress bar | Fill colour: green (≤ 70%), amber (70–99%), red (≥ 100%). Percentage label right-aligned. ⚠️ icon appears at ≥ 80%. Bar animates fill on mount (400 ms ease). |
| DayBarChart | Bar chart (7 bars) | Each bar = spend for that day. Tap on a bar navigates to SCR (Transaction List filtered to that date). Bar colour: green/amber/red based on that day's proportion of weekly limit. Zero-spend days show a 4 px stub. Y-axis label on left: "₹ 0" at base, max spend at top (auto-scaled). Saturday/Sunday bars greyed if zero. |
| CategoryDonut | Small donut + legend list | Same donut component as SCR-014 but smaller (120 px diameter). Legend below as rows: icon · name · amount · %. Scrollable if > 5 categories. |
| TopMerchantsRow | List rows | Rank number, merchant name, total amount. Max 3 rows. Merchant name truncated at 20 chars. Sourced from `category_breakdown` jsonb aggregated by description. |
| NWSplitBars | Three horizontal bars | Need / Want / Saving. Bar fill = actual % of total spend. Colour per type: indigo / orange / green. Target % shown as a notch marker on each bar. |
| ShareButton | Pressable link | Opens native share sheet with a pre-composed summary: "My FinTrack week (May 5–11): Score 78/100 · Spent ₹22,400 · Top: Swiggy". Share via Messages, WhatsApp, copy link. Requires Premium; Free shows "Upgrade to share". |
| PartialMonthBanner | Inline warning | Shown when `is_partial = true` on the corresponding `weekly_summaries` row. Copy: "⚠️ Partial week — you started tracking mid-week. Score reflects available data only." |

#### States

- **Default:** Loads from `weekly_summaries` row for the selected week. Score, charts, and breakdowns rendered from pre-computed data. Load time target < 1.5 s (P95).
- **Loading:** Score card shows shimmer placeholder. Bar chart shows 7 grey shimmer bars. Category donut shows grey circle. Merchant rows: 3 skeleton rows.
- **Empty (no data for week):** "No data for this week — you hadn't started tracking yet." with "Go to current week →" button. This is the expected state for weeks before `tracking_from`.
- **Current week (partial — mid-week):** `weekly_summaries` row may not exist yet for the current week. In this case: live query run client-side. Banner shown: "Live data — weekly summary updates every Monday." Score not shown for partial current week (score is only computed on Monday for the prior week).
- **Error:** "Couldn't load your weekly report. Try again." button re-triggers fetch.

#### Navigation

- **Entry points:** Dashboard "Reports" tab; push notification deep link (weekly summary Sunday notification); Annual report row tap
- **Exit points:** Day bar tap → Transaction List (filtered to date); Category donut segment tap → SCR-014 (Budget Ring filtered view); Share button → native share sheet; WeekNavigator back arrow → prior week (same screen, new data)

#### Interaction notes

- Data loaded from `weekly_summaries` table — no client-side aggregation. Current week uses live React Query that runs a direct `transactions` aggregate if no summary row exists.
- Free users see discipline score and total spend only. Category breakdown, day chart, top merchants, and NWS bars are blurred with a Premium upgrade overlay: "Unlock detailed insights — $2.99/mo".
- `is_partial` is checked on the `weekly_summaries` row (if present) or inferred if the week contains the user's `tracking_from` date.
- Swipe gesture: `react-native-gesture-handler` PanGestureHandler detects horizontal swipes ≥ 80 px velocity threshold; changes week with a slide animation (100 ms easeOut).
- Score tooltip (FormulaTooltip): bottom sheet with formula displayed as formatted equation: `score = 100 − (|Needs Δ| × 0.5 + |Wants Δ| × 0.3 + |Savings Δ| × 0.2) × 2`, clamped 0–100. Plain English below: "We compare where you actually spent vs your targets and penalise bigger misses."

---

### SCR-016 — Monthly Report

**Epic/Story:** E5 · US-032
**Route:** `/(app)/reports/monthly` (Expo Router)
**Auth required:** Yes
**Paywall:** Both (Free: score + total; Premium: heatmap, breakdown, trends)
**Region variants:** All

#### Layout

```
┌─────────────────────────┐
│ ←   May 2026         →  │  ← month navigator
│                         │
│  ⚠️ Partial month — you │
│  started tracking May 3 │  ← shown if is_partial = true
│                         │
│  ─ Calendar Heatmap ──  │
│  Mo Tu We Th Fr Sa Su   │
│  ░░ ░░ ░░ ██ ░░ ░░ ░░   │  ← each cell = daily spend; green→red gradient
│  ░░ ██ ░░ ░░ ░░ ░░ ░░   │
│  ░░ ░░ ██ ░░ ░░ ░░ ░░   │
│  ░░ ░░ ░░ ░░ ░░ ██ ░░   │  ← tap any cell → that day's transactions
│  ░░ ░░ ░░ ░░ ░░ ░░ ░░   │
│                         │
│  ─ Budget vs Actual ──  │
│  ┌────────┬──────┬──────┤
│  │        │Target│Actual│
│  ├────────┼──────┼──────┤
│  │ Needs  │₹40k  │₹43k ↑│  ← red if over; green if under
│  │ Wants  │₹24k  │₹18k ↓│
│  │ Savings│₹16k  │₹12k ↓│
│  │ Total  │₹80k  │₹73k  │
│  └────────┴──────┴──────┘
│                         │
│  ─ Category Breakdown ─  │
│  🏠 Life Infra  ₹43k ████│
│  📈 Performance ₹12k ███ │
│  ✨ Lifestyle   ₹10k ██  │
│  ❤️  Rel & Gen  ₹ 5k ▌  │
│  💰 Future Me   ₹ 3k ░  │
│                         │
│  ─ Payment Mode ───────  │
│  [Pie chart: UPI / Card │
│   / Cash breakdown]     │
│                         │
│  ─ Discipline Score ───  │
│  Month score:  72/100   │
│  Last month:   68/100 ↑ │  ← MoM trend
│                         │
│  [Export this month →]  │
└─────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| MonthNavigator | Header with arrows + swipe | Same pattern as WeekNavigator. Earliest navigable month = month containing `tracking_from`. Current month shows live data (not pre-computed). Future months disabled. |
| PartialMonthBanner | Inline warning | Shown when `is_partial = true`. Copy: "⚠️ Partial month — your tracking started [date]. This score is excluded from your annual average." Yellow background `#fef08a`, text `#713f12`. |
| CalendarHeatmap | Grid of pressable cells | 5–6 row × 7 col grid. Cells filled from `monthly_summaries.daily_breakdown` jsonb: `{"2026-05-01": 4500, ...}` where value is spend in smallest unit. Colour scale: 0 spend = `#f0fdf4` (near white), max spend = `#dc2626` (red). Scale computed per month (max = highest-spend day in that month). Empty days (no data, or before `tracking_from`) show `#f3f4f6`. Tap any day → Transaction List filtered to that date. Future days greyed out. |
| BudgetActualTable | Table component | Rows: Needs / Wants / Savings / Total. Columns: Target (from budget snapshot in `monthly_summaries`) · Actual · Variance. Variance shown with coloured arrow: red ↑ if over target (Needs/Wants), green ↓ if under. For Savings: inverse — red ↓ if under target, green ↑ if over. |
| CategoryBreakdownBars | Horizontal bar list | Category name + icon, amount, proportional bar fill. Sorted by spend descending. Requires Premium to see more than 3 rows. |
| PaymentModePie | Small pie chart | Segments: UPI / Credit Card / Debit Card / Cash / Bank Transfer / Other. Sourced from `transactions` for the month (live query for current month; pre-computed note: payment breakdown not yet in `monthly_summaries` — this is a live query). Legend shows % for each mode. |
| DisciplineScoreSection | Score text + MoM | Monthly score from `monthly_summaries.discipline_score`. MoM trend: compare to prior month. Partial months show asterisk: "72* — partial month, excluded from annual". |
| ExportMonthButton | Text CTA | "Export this month →". Tap → SCR (Export flow, pre-scoped to this month). Requires Premium. |

#### States

- **Default:** Loads from `monthly_summaries`. Current month uses a live query (no summary yet for ongoing month). Calendar heatmap renders with colour scale computed from the month's daily_breakdown data.
- **Loading:** Calendar cells show as uniform grey shimmer grid. Table shows skeleton rows. Pie chart shows grey circle. Score shows shimmer number block.
- **Empty (month before tracking start):** Full-screen empty state inside scroll area: "You weren't tracking in [Month Year]. Navigate to a month after [tracking start date]." with back navigation.
- **Current month (partial, live):** Banner: "Live data — monthly summary is computed on the 1st of next month." Score shows as "—" (not yet computed). Calendar renders from live `transactions` query for current month's daily_breakdown, computed client-side.
- **Error:** Inline error card: "Couldn't load your monthly report. Try again."

#### Navigation

- **Entry points:** Reports tab; push notification deep link (monthly summary); Dashboard "View monthly report" link
- **Exit points:** Calendar day tap → Transaction List (filtered to date); Export button → Export flow; MonthNavigator → adjacent months (same screen)

#### Interaction notes

- `daily_breakdown` jsonb parsed on the client: `Object.entries(breakdown).forEach(([date, amount]) => ...)`. Dates keyed as `YYYY-MM-DD`.
- Heatmap colour scale is per-month relative (not absolute across all months). This makes low-spend months still show variation — absolute scale would make all cells look green for light-spend months.
- Partial months (`is_partial = true`) are included in the UI but marked with the banner. They are explicitly excluded from any annual discipline score computation.
- Free users: calendar heatmap visible (core value), but category breakdown beyond 3 rows, payment mode pie, and export CTA are Premium-gated with upgrade overlay.
- Payment mode pie is a live query because `monthly_summaries.category_breakdown` stores category amounts only — not payment mode. This query is lightweight: `SELECT payment_mode, SUM(amount_base) FROM transactions WHERE user_id = $1 AND txn_date BETWEEN $start AND $end GROUP BY payment_mode`.

---

### SCR-017 — Category Management

**Epic/Story:** E3 · US-020
**Route:** `/(app)/settings/categories` (Expo Router)
**Auth required:** Yes
**Paywall:** Free (up to 3 custom categories); Premium (unlimited)
**Region variants:** All

#### Layout

```
┌─────────────────────────┐
│ ←  Categories        ⊕  │  ← back · Add Category (+) button top-right
│                         │
│  SYSTEM DEFAULTS        │
│  ─────────────────────  │
│  🏠 Life Infrastructure │
│     Need · Indigo        │
│     [read-only]         │
│                         │
│  📈 Performance & Growth│
│     Need · Violet        │
│                         │
│  💰 Future Me           │
│     Saving · Green       │
│                         │
│  ❤️  Relationships      │
│     Want · Pink          │
│                         │
│  ✨ Lifestyle Enjoyment │
│     Want · Orange        │
│                         │
│  YOUR CATEGORIES        │
│  ─────────────────────  │
│  🚗 Transport           │
│     Need · Blue       ⋮  │  ← kebab menu: Edit · Archive
│                         │
│  🎮 Gaming              │
│     Want · Purple     ⋮  │
│                         │
│  ░ Archived ▸           │  ← collapsed section; tap to expand archived
│                         │
│  [+ Add Category]       │  ← bottom CTA (also in top-right ⊕)
│                         │
│  3/3 custom categories  │  ← free tier limit counter; shown on Free only
│  Upgrade for unlimited ›│
└─────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| SystemCategoryRow | List row (read-only) | Icon, name, type badge, colour swatch. No kebab menu. Tap does nothing (or shows tooltip: "System categories can't be edited"). |
| CustomCategoryRow | List row with kebab | Icon, name, type badge, colour swatch, kebab (⋮) icon. Kebab options: "Edit" → opens Edit Category sheet; "Archive" → confirmation "Archive [name]? It will be hidden from transaction entry but historical transactions are preserved." → archives; confirms with toast "Category archived". Swipe-left on row also reveals Archive action (destructive red). |
| ArchivedSection | Collapsible group | Initially collapsed. Shows count: "Archived (2)". Tap to expand. Archived rows show at 50% opacity with "Archived" badge. Each has "Restore" action in kebab. |
| AddCategorySheet | Bottom sheet | Opens on ⊕ tap or "+ Add Category" tap. Fields: Name (text, required), Type (Need / Want / Saving — 3 pill selector, required), Icon (emoji picker — grid of 40 preset finance emojis + free text entry), Colour (6 preset swatches + custom hex). Save button: disabled until name + type filled. On save: closes sheet, new row appears in "Your Categories" section, React Query invalidated. |
| FreeTierCounter | Inline banner | Free users only: "3/3 custom categories · Upgrade for unlimited →". Shown at bottom. When limit reached: ⊕ button is disabled, pressing "Add Category" shows paywall modal. |

#### States

- **Default:** System defaults listed first (read-only). User's custom categories below. Archived section collapsed.
- **Loading:** Both sections show 3-row shimmer skeletons each.
- **Empty custom categories:** "Your Categories" section shows: "No custom categories yet. Add one to personalise your spending." with "Add Category" CTA in the empty area.
- **Free tier limit reached:** Add button is disabled; tapping it opens Premium paywall bottom sheet. Counter shows "3/3".
- **Error (load failed):** Inline error: "Couldn't load categories. Try again."

#### Navigation

- **Entry points:** Settings main screen → "Categories"; Transaction Add/Edit screen → "Manage categories" link
- **Exit points:** Back arrow → Settings; Edit sheet → stays on screen (sheet over list); Archive confirmation → stays on screen; "Upgrade" link → Paywall screen

#### Interaction notes

- Category changes propagate immediately to transaction add/edit screens via shared React Query cache (`queryKey: ['categories', userId]`).
- Archiving a category does not change `category_id` on historical transactions — `categories.is_archived = true` just hides it from pickers. Reports still show the archived category's historical spend.
- The emoji picker uses a `FlatList` grid of 40 preset emojis (finance domain: 🏠 🚗 🍔 📈 💰 ❤️ ✈️ 🎮 🛒 💊 etc.). "Custom" option opens a single-character text input — validated as emoji only.
- Colour picker: 6 presets (`#6366f1` indigo, `#8b5cf6` violet, `#34d399` green, `#f472b6` pink, `#fb923c` orange, `#60a5fa` blue). "Custom" option opens a hex input with live colour preview swatch.
- System categories cannot be archived, renamed, or deleted — the kebab menu is absent on those rows. A long-press on a system row shows a tooltip: "System categories can't be modified."

---

### SCR-018 — Bank Connections List

**Epic/Story:** E4 · US-039
**Route:** `/(app)/accounts` (Expo Router)
**Auth required:** Yes
**Paywall:** Free (1 bank connection); Premium (unlimited)
**Region variants:** All (connection options vary by region — see SCR-019)

#### Layout

```
┌─────────────────────────┐
│  Accounts               │
│                         │
│  ┌─────────────────────┐│
│  │ Net Worth           ││
│  │ ₹ 2,14,500         ││  ← sum of all active balances in base currency
│  │ Updated 2 h ago   🔄││  ← freshness + manual refresh icon
│  └─────────────────────┘│
│                         │
│  BANK ACCOUNTS          │
│  ─────────────────────  │
│  ┌─────────────────────┐│
│  │ [HDFC logo]         ││
│  │ HDFC Bank           ││
│  │ Savings Account     ││  ← institution_name + account type
│  │ ₹ 1,82,000  ● Active││  ← balance + status badge
│  │ Updated 2 h ago     ││
│  └─────────────────────┘│
│  ┌─────────────────────┐│
│  │ [Chase logo]        ││
│  │ Chase               ││
│  │ Checking            ││
│  │ $ 4,200  ⚠️ Expired ││  ← amber expired badge; shows Reconnect CTA
│  │ [Reconnect]         ││
│  └─────────────────────┘│
│                         │
│  CASH ACCOUNTS          │
│  ─────────────────────  │
│  ┌─────────────────────┐│
│  │ 💵 Cash (Manual)    ││
│  │ ₹ 3,500             ││
│  │ Manual tracking     ││
│  └─────────────────────┘│
│                         │
│  COMING IN v2           │
│  ─────────────────────  │
│  🏦 Loans & Liabilities │  ← placeholder card, not tappable
│     Credit cards, home  │
│     loans, and more     │
│                         │
│  [+ Add Bank Account]   │  ← primary CTA at bottom
│                         │
│  Free: 1/1 banks used   │  ← Free tier only; Premium unlocks unlimited
│  Upgrade for more →     │
└─────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| NetWorthCard | Summary card | Pulls total from `bank_connections_safe` view: SUM of `balance_amount` for `status IN ('active')`, converted to base currency using `fx_rates`. "Updated X ago" = oldest `balance_cached_at` across active connections (the most stale one). 🔄 tap = manual refresh for all accounts (single API call; rate-limited globally per user 1/15min). |
| BankConnectionCard | Pressable card | Logo (from `institution_logo_url` — fallback to first-letter avatar if null), institution name, account type (provider metadata), balance (original currency + base currency equivalent if multi-currency), status badge, "Updated X ago". Tap → SCR-020 (Account Detail). |
| StatusBadge | Inline pill | Active = green `#22c55e`; Expired = amber `#f59e0b`; Error = red `#ef4444`; Disconnected = grey `#9ca3af`. |
| ReconnectButton | Inline CTA | Shown inside the card when `status = 'expired'`. Copy: "Reconnect". Tap → SCR-019 (Bank Connect Flow in re-auth mode, same provider pre-selected). |
| AddBankButton | Primary CTA | Bottom of screen. On Free tier with 1 connection: disabled; tap opens paywall. On Premium or under limit: tap → SCR-019. |
| FreeTierBanner | Inline note | Free users only: "Free plan includes 1 bank connection. Upgrade to add more." with "Upgrade →" link. |
| LoansPlaceholder | Non-tappable card | Grey dashed border. Copy: "Loans & Liabilities — credit cards, home loans, and more — coming in v2." |

#### States

- **Default:** All `bank_connections_safe` rows fetched for the user. Net Worth computed. Cards sorted: active first, expired/error after, disconnected last.
- **Loading:** Net Worth card shows shimmer. Bank cards: 2 skeleton cards with shimmer logo + text blocks.
- **Empty (no banks connected):** Net Worth shows "—". Bank Accounts section shows empty state: "No bank accounts connected yet. Connect your first bank to start automatic tracking." with a prominent "+ Connect Bank" button. Smart nudge card from Dashboard links here.
- **Error (refresh rate-limited):** Toast: "Balance refresh available in [Xm Ys]. Last updated: [relative time]."
- **Error (fetch failed):** Inline error in the Net Worth card area: "Couldn't load accounts. Try again."

#### Navigation

- **Entry points:** Bottom tab nav "Accounts"; Dashboard Net Worth card tap; Dashboard "Connect a bank" nudge card
- **Exit points:** Bank card tap → SCR-020; Reconnect tap → SCR-019 (re-auth mode); "+ Add Bank Account" → SCR-019; "Upgrade" link → Paywall screen

#### Interaction notes

- Net Worth does NOT include disconnected or error-status connections. Balance is zeroed out for those.
- Multi-currency balances: each account's `balance_amount` (in `balance_currency`) is converted to `base_currency` using the latest `fx_rates` row. ISO currency code displayed alongside converted amount: e.g. "$ 4,200 USD · ₹ 3,53,400".
- Institution logo: loaded via `institution_logo_url`. On load error or null: first-letter avatar rendered as a coloured circle (colour derived from hash of institution_name for consistency).
- Real-time status updates: if a bank connection's status changes (e.g. token expires during session), Supabase Realtime fires and the card's status badge updates without page reload.

---

### SCR-019 — Bank Connect Flow

**Epic/Story:** E4 · US-021 (US) · US-022 (UK) · US-023 (IN)
**Route:** `/(app)/accounts/connect` (Expo Router)
**Auth required:** Yes
**Paywall:** Free (first connection); Premium (additional connections)
**Region variants:** IN (Setu AA) · US (Plaid) · UK (TrueLayer) — auto-detected from device locale; no picker shown

#### Layout — Shared Entry Screen (all regions)

```
┌─────────────────────────┐
│ ←  Connect Your Bank    │
│                         │
│     [Bank icon hero]    │
│                         │
│  Your bank data is      │
│  encrypted and secure.  │
│  FinTrack never stores  │
│  your bank login.       │
│                         │
│  What we access:        │
│  ✓ Account balance      │
│  ✓ New transactions     │
│    (from today only)    │
│                         │
│  What we never access:  │
│  ✗ Past transactions    │
│  ✗ Bank login / PIN     │
│  ✗ Ability to move money│
│                         │
│  [region-specific CTA]  │  ← see variant layouts below
│                         │
│  Skip for now           │  ← text link, same font size as CTA
└─────────────────────────┘
```

#### Layout — IN variant (Setu Account Aggregator)

```
┌─────────────────────────┐
│  [Entry screen above]   │
│                         │
│  [Connect via AA →]     │  ← primary CTA: launches AA deep link
│                         │
│  ── or ──               │
│  [Use SMS auto-capture] │  ← Android only; iOS skips directly to "Skip"
│                         │
│  Skip for now           │
│                         │
│  ─────── On AA tap ───  │
│  ┌─────────────────────┐│
│  │ Opening Finvu...    ││  ← deep link to AA app; 30s timeout spinner
│  │ [Cancel]            ││
│  └─────────────────────┘│
│                         │
│  ─ If AA times out ───  │
│  Android:               │
│  "AA didn't respond.    │
│  Allow SMS access for   │
│  auto-capture instead?" │
│  [Allow SMS] [Skip]     │
│                         │
│  iOS:                   │
│  "AA didn't respond.    │
│  You can connect later  │
│  from Accounts →"       │
│  [Got it]               │
│                         │
│  ─ On AA success ─────  │
│  ┌─────────────────────┐│
│  │ ✓ HDFC Bank linked  ││
│  │ ₹ 1,82,000 balance  ││
│  │ Tracking from today ││
│  │ [Done]              ││
│  └─────────────────────┘│
└─────────────────────────┘
```

#### Layout — US variant (Plaid Link)

```
┌─────────────────────────┐
│  [Entry screen above]   │
│                         │
│  [Connect with Plaid →] │  ← primary CTA
│                         │
│  Skip for now           │
│                         │
│  ─ On Plaid tap ──────  │
│  ┌─────────────────────┐│
│  │ [Plaid Link WebView]││  ← react-native-plaid-link-sdk embedded
│  │  (full-screen)      ││
│  │                     ││
│  │  Search your bank.. ││
│  │  [Bank list]        ││
│  └─────────────────────┘│
│                         │
│  ─ On Plaid success ──  │
│  ┌─────────────────────┐│
│  │ ✓ Chase linked      ││
│  │ $ 4,200 balance     ││
│  │ Tracking from today ││
│  │ [Done]              ││
│  └─────────────────────┘│
│                         │
│  ─ Plaid error ────────  │
│  "Bank connection failed.│
│  Your credentials were  │
│  not saved. Try again?" │
│  [Try Again] [Skip]     │
└─────────────────────────┘
```

#### Layout — UK variant (TrueLayer)

```
┌─────────────────────────┐
│  [Entry screen above]   │
│                         │
│  [Connect with          │
│   Open Banking →]       │  ← primary CTA (TrueLayer branding)
│                         │
│  Skip for now           │
│                         │
│  ─ On TrueLayer tap ──  │
│  ┌─────────────────────┐│
│  │ [TrueLayer OAuth    ││  ← Expo WebBrowser (not WebView)
│  │  in-app browser]    ││
│  │  (full-screen)      ││
│  │                     ││
│  │  Select your bank.. ││
│  │  [Bank list]        ││
│  └─────────────────────┘│
│                         │
│  ─ On TrueLayer success │
│  ┌─────────────────────┐│
│  │ ✓ Barclays linked   ││
│  │ £ 2,800 balance     ││
│  │ Tracking from today ││
│  │ [Done]              ││
│  └─────────────────────┘│
│                         │
│  ─ TrueLayer error ───  │
│  "Open Banking consent  │
│  wasn't completed. Your │
│  data wasn't shared.    │
│  Try again?"            │
│  [Try Again] [Skip]     │
└─────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| RegionDetector | Logic (no UI) | Detects locale from `Intl.DateTimeFormat().resolvedOptions().locale` on app boot. `en-IN` → Setu AA flow; `en-US` → Plaid; `en-GB` → TrueLayer. Stored in `user_profiles.locale`. No manual picker shown. Fallback (other locales) → Plaid as default. |
| EntryScreen | Static layout | Shared across all regions. Security copy, access list, "never access" list. CTA label swapped per region: "Connect via AA", "Connect with Plaid", "Connect with Open Banking". |
| SetuAALauncher | Deep link + timeout | Builds Setu AA consent URL with `fip_id`, `redirect_uri`, and FinTrack client credentials. Calls `Linking.openURL(aaDeepLink)`. Starts 30 s countdown. On return from AA app: checks callback with consent token. 30 s timeout: shows fallback options. |
| SetuTimeoutFallback | Conditional screen | Android: "Allow SMS access for auto-capture instead?" → if allowed, requests `READ_SMS` permission → starts SMS listener (US-024a). iOS: "Connect later from Accounts →" → dismisses to previous screen. |
| PlaidLinkView | Native SDK view | `react-native-plaid-link-sdk` `PlaidLink` component rendered full-screen in a Modal. Receives `linkToken` from Supabase Edge Function (pre-fetched on CTA tap to reduce latency). On success callback: passes `publicToken` to Supabase Edge Function → exchanges for `access_token` → stores in Vault → creates `bank_connections` row. |
| TrueLayerBrowser | In-app browser | `Expo.WebBrowser.openAuthSessionAsync(truelayerOAuthUrl, redirectUri)`. On success: parses `code` from redirect URL → Edge Function exchanges for tokens → stores in Vault. |
| SuccessCard | Inline confirmation | Shows provider logo, institution name, formatted balance, "Tracking from today ✓". "Done" CTA navigates to SCR-018 (Accounts List) or back to Onboarding Dashboard (if in onboarding context). |
| ErrorCard | Inline error | Provider-specific copy (see layouts above). "Try Again" re-triggers the flow. "Skip" navigates to Dashboard / Accounts. |

#### States

- **Default (entry):** Entry screen with region-appropriate CTA. "Skip for now" text link at bottom.
- **Loading (pre-fetch):** On CTA tap, a brief spinner (< 1 s) while the link token / OAuth URL is fetched from the Edge Function. "Connecting to [provider]..."
- **In-flow:** Plaid / TrueLayer rendered full-screen. AA: spinner with "Opening Finvu..." and countdown.
- **AA timeout (30 s):** Spinner dismissed. Region-appropriate fallback shown.
- **Success:** SuccessCard shown. `bank_connections` row created. `tracking_from` set to `NOW()`. Balance fetched immediately (first insert to `balance_history`).
- **Error:** ErrorCard shown with provider-specific copy. Retry available.
- **Re-auth mode (from SCR-018 Reconnect):** Entry screen skips the "What we access" explainer (user has already seen it). Goes directly to the provider flow. On success: updates existing `bank_connections` row (new token, status = 'active').

#### Navigation

- **Entry points:** SCR-018 → "+ Add Bank Account"; Onboarding Screen 4 (US-012); Dashboard nudge card "Connect a bank"
- **Exit points:** Success → SCR-018 (or Dashboard if onboarding); Skip → previous screen; Done on SuccessCard → SCR-018

#### Interaction notes

- **Region detection** happens once at app boot and is cached. Not re-detected on this screen. Users who travel cannot switch region here — they change it in Settings (v1.1 deferred feature).
- **Plaid link token**: fetched server-side from Supabase Edge Function: `POST /functions/v1/plaid-link-token` with the user's JWT. Token has 30-minute TTL. Pre-fetched on CTA tap (not on screen mount, to avoid wasting unused tokens).
- **Setu AA deep link format**: `finvu://consent?fi=HDFC&redirect=fintrack://aa-callback`. Actual URL constructed with Setu-issued client credentials from Supabase Vault. The 30-second timeout uses `setTimeout` + `AppState` listener: if app returns to foreground within 30 s with a valid callback, the timeout is cleared.
- **TrueLayer**: `WebBrowser.openAuthSessionAsync` handles the PKCE flow. On Android, this opens Chrome Custom Tabs; on iOS, `SFSafariViewController`. Neither platform shows the raw URL bar — branded experience maintained.
- **No historical import**: `tracking_from` is always set to the connection timestamp. Copy on the SuccessCard reinforces this: "Tracking from today ✓ — we'll capture all new transactions automatically."
- **Error copy — never blame the bank**: Error messages avoid "your bank rejected" framing. Always: "The connection wasn't completed. Your credentials weren't stored."

---

### SCR-020 — Account Detail

**Epic/Story:** E7 · US-040
**Route:** `/(app)/accounts/[id]` (Expo Router dynamic route)
**Auth required:** Yes
**Paywall:** Free (balance + recent 10 transactions); Premium (full history, 7-day chart)
**Region variants:** All

#### Layout

```
┌─────────────────────────┐
│ ←  HDFC Bank        ⋮  │  ← back · kebab (Edit / Remove)
│    Savings Account      │
│                         │
│  ┌─────────────────────┐│
│  │ Current Balance     ││
│  │ ₹ 1,82,000         ││  ← formatted via dinero.js
│  │ Updated 2 h ago  🔄 ││  ← freshness badge · refresh icon
│  └─────────────────────┘│
│                         │
│  ─ 7-Day Balance ──────  │
│  ₹200k ╭──────────╮    │  ← line chart; Y axis auto-scaled
│  ₹180k │          ╰──  │
│  ₹160k │              │  │
│         Mon Tue Wed ... │
│  "Partial history (3d)" │  ← shown if < 7 rows in balance_history
│                         │
│  ─ Recent Transactions ─ │
│  Today                  │
│  🛒 BigBasket  ₹ 2,400  │
│     Debit · 10:32 AM    │
│                         │
│  Yesterday              │
│  🍔 Swiggy     ₹   840  │
│     UPI · 8:15 PM       │
│  ✈️ IndiGo    ₹12,600   │
│     Credit · 3:00 PM    │
│                         │
│  [Load more ↓]          │  ← pagination; 10 rows per page
│                         │
│  ─────────────────────  │
│  Status:  ● Active      │
│  Provider: Setu AA      │
│  Connected: May 3, 2026 │
│  Consent expires: Nov 3 │  ← shown for Setu AA connections only
│                         │
│  [Reconnect]            │  ← shown if status = 'expired'
│  [Remove Account]       │  ← destructive; confirmation dialog
└─────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| BalanceCard | Header card | Institution name, account type, `balance_amount` formatted via dinero.js (smallest unit → display). ISO code shown alongside if connection currency differs from user's base currency. FreshnessBadge: "Updated X ago" from `balance_cached_at`. 🔄 tap: triggers manual refresh for this connection. Rate-limit: 1/15 min per connection. On 429: toast "Refresh available in [Xm] — last updated [time]." |
| BalanceLineChart | Line chart | Queries `balance_history WHERE bank_connection_id = $id ORDER BY recorded_at DESC LIMIT 7`. Plots daily balance over 7 days. X-axis: day labels (Mon, Tue ...). Y-axis: auto-scaled to min/max balance range + 10% padding. Line colour: `#6366f1` indigo. Data points as small circles. If fewer than 7 rows exist: chart renders available data and shows note below: "Partial history — [N] days of data available." Note is not an error; expected for newly connected accounts. |
| TransactionList | Grouped flat list | Transactions filtered by `bank_connection_id`. Grouped by `txn_date` header (Today / Yesterday / [Day Month]). Each row: category icon, merchant name, amount (formatted), payment mode, time. Tap → Transaction Detail. Initial load: 10 rows. "Load more" button loads next 10. |
| AccountInfoSection | Static text block | Shows: Status (coloured badge), Provider name, Connected date (`tracking_from`), Consent expires (`consent_expires_at` for Setu AA only). For Plaid/TrueLayer: Token expires (`token_expires_at`). |
| ReconnectButton | Inline CTA | Shown when `status = 'expired'`. Copy: "Reconnect — tap to re-authorise". Tap → SCR-019 (re-auth mode, same provider). |
| RemoveAccountButton | Destructive text button | Red text: "Remove Account". Tap → confirmation dialog: "Remove HDFC Bank? Your transaction history is preserved, but this account will stop syncing and its balance will be removed from your Net Worth." Two buttons: "Remove" (red, confirms) / "Cancel". On confirm: PATCH `bank_connections.status = 'disconnected'`. Does not delete transactions. Navigates back to SCR-018. |
| KebabMenu | Top-right ⋮ | Options: "Rename account" (edits `institution_name` label only) / "Remove account" (same as button above). |

#### States

- **Default:** Balance card rendered. Line chart rendered. Transactions loaded (10 rows).
- **Loading:** Balance card: shimmer. Chart: grey shimmer rectangle (same height as chart). Transaction list: 5 shimmer rows.
- **Empty transactions:** Transaction section shows: "No transactions from this account yet. New transactions will appear here as they're synced." (Expected for a freshly connected account with `tracking_from` = today.)
- **Expired connection:** Balance card shows last known balance with an amber warning: "⚠️ Connection expired — balance may be outdated." ReconnectButton shown prominently below balance card.
- **Error connection:** Balance card shows: "⚠️ Sync error — we couldn't reach your bank. Last balance: [amount] as of [date]." Reconnect CTA shown.
- **Refresh rate-limited:** Toast: "Balance refresh available in [Xm]. Last updated: [time]."

#### Navigation

- **Entry points:** SCR-018 (bank card tap)
- **Exit points:** Back arrow → SCR-018; Transaction row tap → Transaction Detail; Reconnect → SCR-019; Remove → SCR-018 (after removal)

#### Interaction notes

- 7-day balance chart data: `SELECT balance_amount, balance_currency, recorded_at FROM balance_history WHERE bank_connection_id = $id AND user_id = $uid ORDER BY recorded_at DESC LIMIT 7`. Results reversed for display (oldest→newest left-to-right).
- If `balance_history` has 0 rows (connection never refreshed yet): chart area shows a soft placeholder: "Balance history will appear after your first daily sync (tomorrow)."
- The `balance_amount` in the header is from `bank_connections_safe.balance_amount` — the latest cached value. The chart shows historical snapshots. These may differ (chart is historical, header is current).
- Manual refresh: calls `POST /functions/v1/refresh-balance` with `bank_connection_id`. Edge Function fetches from Plaid/TrueLayer/AA, updates `bank_connections.balance_amount` and `balance_cached_at`, inserts a row in `balance_history`. React Query cache invalidated on success.
- Setu AA: `consent_expires_at` shown in the info section. If within 30 days of expiry: amber banner at top: "⚠️ Your AA consent expires in [N] days. Tap to renew →" (links to Setu re-consent flow via deep link).

---

### SCR-021 — Net Worth Screen

**Epic/Story:** E7 · US-038 · US-039
**Route:** `/(app)/accounts/net-worth` (Expo Router)
**Auth required:** Yes
**Paywall:** Free (total only); Premium (per-account breakdown + historical trend)
**Region variants:** All

#### Layout

```
┌─────────────────────────┐
│ ←  Net Worth            │
│                         │
│  ┌─────────────────────┐│
│  │  Total Net Worth    ││
│  │                     ││
│  │    ₹ 2,14,500       ││  ← sum of active balances in base currency
│  │                     ││  ← shows "—" if no banks connected
│  │  Updated 2 h ago 🔄 ││
│  └─────────────────────┘│
│                         │
│  ─ Accounts ───────────  │
│  HDFC Bank              │
│  ₹ 1,82,000    Savings  │  ← balance + account type; right-aligned
│                         │
│  Cash (Manual)          │
│  ₹ 3,500       Manual   │
│                         │
│  Chase Bank             │
│  $ 4,200 USD            │  ← foreign currency shown with ISO code
│  ≈ ₹ 29,000             │  ← base currency equivalent, lighter text
│                         │
│  ─ Trend ─────────────  │
│  [7-day net worth line  │  ← Premium only
│   chart — sum of all    │
│   balance snapshots]    │
│                         │
│  [Premium upgrade lock  │  ← Free users see blurred chart + upgrade CTA
│   over chart area]      │
│                         │
│  ─────────────────────  │
│  [Connect a bank →]     │  ← shown only if no banks connected
│                         │
│  Currency: INR (₹)      │  ← base currency indicator; tap → Settings
│  Exchange rates updated │
│  2 h ago                │
└─────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| NetWorthHero | Primary display card | Full-width. Large type: total formatted via dinero.js. Shows "—" (em dash) when no banks connected (never "₹ 0" — zero and no data are meaningfully different). FreshnessBadge: computed from the oldest `balance_cached_at` across all active connections. 🔄 tap: manual refresh all connections. Rate-limit: 1/15 min per user globally; on 429: toast "Balance refresh available in [Xm]." |
| AccountBreakdownRow | List row | Per-account: institution name, balance in original currency, account type label (right). For cross-currency: original amount on line 1, base-currency equivalent on line 2 (lighter text, smaller). ISO code shown inline when currency ≠ base currency. Tap → SCR-020. |
| NetWorthTrendChart | Line chart (Premium) | 7-day trend: for each day in the last 7 days, sums the most recent `balance_history` row per `bank_connection_id` active on that day. All amounts converted to base currency. Renders as a smooth line chart. Colour: same as BalanceLineChart (`#6366f1`). Free users: chart blurred with 8 px blur; overlay reads "Unlock Net Worth trend — upgrade to Premium". "Upgrade" button opens paywall. |
| ConnectBankCTA | Inline card | Shown only when user has zero active bank connections. Copy: "Connect your first bank to see your real net worth." Primary button: "Connect Bank →" → SCR-019. |
| CurrencyFootnote | Footer text | "All amounts shown in [base_currency] (ISO code). FX rates updated [X ago]." Tap → Settings Finance (currency preference). |

#### States

- **Default (1+ banks connected):** Hero shows total. Account breakdown rows listed. Trend chart shown (Premium) or blurred (Free).
- **Default (no banks connected):** Hero shows "—". Account breakdown section empty. ConnectBankCTA shown prominently. Trend chart not shown.
- **Loading:** Hero shimmer (large rectangle). Account rows: 2 skeleton rows. Chart: grey shimmer rectangle.
- **Partial data (some connections errored):** Hero shows total from active connections only. Amber banner: "⚠️ [N] account(s) couldn't sync — balance may be incomplete. [Manage accounts →]" links to SCR-018.
- **All connections expired/error:** Hero shows "—" (not last-known total — stale total without refresh timestamp would be misleading). Error state: "All accounts need attention — tap Manage to reconnect." + "Manage Accounts →" CTA.
- **Refresh rate-limited:** Toast: "Refresh available in [Xm]. Balances last updated [time]."

#### Navigation

- **Entry points:** SCR-018 (Net Worth total tap); Dashboard Net Worth card tap; Bottom tab "Accounts" → sub-tab or nested route
- **Exit points:** Account row tap → SCR-020; Connect Bank CTA → SCR-019; Upgrade CTA → Paywall; Currency footnote tap → Settings Finance; 🔄 → stays on screen (refreshes in-place)

#### Interaction notes

- **Net Worth total calculation**: `SELECT SUM(CASE WHEN balance_currency = base_currency THEN balance_amount ELSE ROUND(balance_amount * fx_rate) END) FROM bank_connections_safe JOIN user_profiles ON ... JOIN fx_rates ON ...` — done client-side from React Query data to avoid a bespoke Edge Function. FX rate used is the latest row in `fx_rates` for the relevant currency pair.
- **"—" vs ₹ 0**: The hero deliberately shows "—" (not zero) when no banks are connected, because ₹ 0 net worth implies the data is present and correct — not that it's absent. Empty state copy supports this distinction.
- **Trend chart data**: Built from `balance_history` by grouping on `DATE(recorded_at)` per connection and summing across connections after FX conversion. This is a live query for Premium users (not pre-computed). Expected to be fast given 90-day retention and indexed on `(bank_connection_id, recorded_at DESC)`.
- **Multi-currency display rules**: When `balance_currency = base_currency` → show only one amount. When different → show original on line 1 (`$ 4,200 USD`) and base equivalent on line 2 (`≈ ₹ 29,000`). The `≈` prefix signals approximate conversion.
- **FX rate freshness**: FX rates update every 2 hours via pg_cron. The footnote shows "FX rates updated X ago" using the `MAX(fetched_at)` from the relevant `fx_rates` rows for this user's currency pairs.

---

*Document: Group B — Budget, Reports, Bank & Accounts (SCR-014–SCR-021)*
*Author: Sally · Version 1.0 · 2026-05-13*
*Next: Group C — Goals, Export, Settings, Paywall (SCR-022–SCR-030)*
