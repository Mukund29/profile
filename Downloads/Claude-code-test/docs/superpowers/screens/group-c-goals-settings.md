# FinTrack — Group C Screens: Goals, Paywall, Export & Settings

**Author:** Sally (Senior UX Designer)
**Date:** 2026-05-13
**Covers:** SCR-022 through SCR-032 (11 screens)
**Stack:** Expo SDK 52 · Expo Router v3 · React Native · NativeWind v4 · Supabase
**References:** `2026-05-13-epics-stories.md` (E6, E7, E8, E9) · `2026-05-13-prd.md` · `CLAUDE.md`

---

## Screen Index

| Screen | Name | Route | Auth |
|--------|------|-------|------|
| SCR-022 | Goals List | `/(app)/(tabs)/goals` | Yes |
| SCR-023 | Goal Detail / Progress | `/(app)/goal/[id]` | Yes |
| SCR-024 | Add / Edit Goal | `/(app)/goal/new` or `/(app)/goal/[id]/edit` | Yes |
| SCR-025 | Paywall / Subscription Screen | `/(app)/paywall` | Yes |
| SCR-026 | Export Screen | `/(app)/export` | Yes |
| SCR-027 | Settings — Main Menu | `/(app)/(tabs)/settings` | Yes |
| SCR-028 | Settings — Profile | `/(app)/settings/profile` | Yes |
| SCR-029 | Settings — Notifications | `/(app)/settings/notifications` | Yes |
| SCR-030 | Settings — Currency & Region | `/(app)/settings/currency-region` | Yes |
| SCR-031 | Settings — Privacy & Data | `/(app)/settings/privacy` | Yes |
| SCR-032 | Settings — Subscription | `/(app)/settings/subscription` | Yes |

---

### SCR-022 — Goals List

**Epic/Story:** E7 · US-041
**Route:** `/(app)/(tabs)/goals`
**Auth required:** Yes
**Paywall:** Both (1 goal free; ≥ 2 active goals require Premium)
**Region variants:** All

#### Layout

```
┌─────────────────────────────┐
│  Goals                  [+] │
│                             │
│  ┌───────────────────────┐  │
│  │ Emergency Fund        │  │
│  │ ████████░░░░  67%     │  │
│  │ ₹67,000 of ₹1,00,000  │  │
│  │ 89 days remaining     │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │ Vacation — Bali       │  │
│  │ ██░░░░░░░░░░  18%     │  │
│  │ ₹9,000 of ₹50,000     │  │
│  │ No deadline           │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │ 🔒 Add another goal   │  │
│  │    Upgrade to Premium │  │
│  └───────────────────────┘  │
│                             │
│  ── Achieved ──             │
│                             │
│  ┌───────────────────────┐  │
│  │ ✓ New Laptop          │  │
│  │ ████████████  100%    │  │
│  │ Achieved 2 Apr 2026   │  │
│  └───────────────────────┘  │
│                             │
└─────────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| Header "Goals" | NavigationBar | Large title, left-aligned. Right: "+" icon button (44×44pt tap target). Tap "+" → SCR-024 (new goal). If at 5-goal limit and Premium: shows "5/5" badge in red instead of "+". |
| Goal card (active) | Card | Rounded 12px card, 16px padding. Tap anywhere on card → SCR-023 (goal detail). Swipe-left reveals "Archive" (amber) and "Delete" (red) actions. |
| Goal name | Text | 16sp semibold, single line, truncated with ellipsis. |
| Progress bar | ProgressBar | Full-width within card, 8px height, rounded ends. Colour: green (< 80% of target), amber (80–99%), green with "🎉" when 100%. Animated fill on load (0 → actual, 400ms ease-out). |
| Progress fraction | Text | 14sp regular muted. Format: "{current} of {target}" in base currency with locale formatting. |
| Days remaining | Text | 12sp muted. "X days remaining" if target date set; "No deadline" if null. "Overdue by X days" in amber if past target date. |
| Locked upsell card | Card | Shown when free user has 1 active goal and taps "+". Lock icon left, "Add another goal · Upgrade to Premium" copy, chevron right. Tap → SCR-025. |
| Achieved section divider | SectionHeader | "── Achieved ──" in 12sp muted uppercase. Shown only when ≥ 1 archived/achieved goal exists. |
| Achieved goal card | Card | Muted opacity (70%). Green checkmark badge top-right. "Achieved [date]" label. Tap → SCR-023 (read-only detail view). |

#### States

- **Default:** Active goals listed first, sorted by closest target date. Achieved goals below the divider, max 3 shown ("Show all achieved →" link if more). "+" button in header. Free users with 1 goal see locked upsell card at bottom of active list.
- **Loading:** Skeleton cards — 2 placeholder cards with shimmer, 280px height each. Header renders immediately.
- **Empty:** Centred illustration (piggy bank outline, 120×120px). Heading: "No goals yet". Body: "Set a savings target and track your progress — one Saving transaction at a time." CTA button: "Set your first goal" → SCR-024. No achieved section shown.
- **Error:** Inline error banner below header — "Couldn't load your goals. Pull down to retry." Pull-to-refresh available. Retry does not navigate away.

#### Navigation

- **Entry points:** Bottom tab bar "Goals" tab; Dashboard active goals section (tap "See all →"); SCR-024 on successful save; notification deep-link for goal milestones.
- **Exit points:**
  - Tap goal card → SCR-023 (Goal Detail)
  - Tap "+" → SCR-024 (Add Goal)
  - Tap locked upsell card → SCR-025 (Paywall)
  - Swipe-left Archive → archives goal in-place, toast "Goal archived. Undo?" (5s)
  - Swipe-left Delete → confirmation bottom sheet "Delete goal?" / "Yes, delete" (red) / "Cancel"

#### Interaction notes

- Confetti (Lottie, 2s) fires when the user lands on this screen and any goal `current_amount >= target_amount` that was not previously marked achieved — fires once per goal. Simultaneously: "Goal reached! 🎉" full-screen modal with "Mark as Achieved" CTA.
- Pull-to-refresh: standard RefreshControl spinner, reloads from Supabase.
- Progress bar fill animates on screen mount (staggered 100ms per card).
- Haptic: light impact on swipe-left reveal of destructive actions.
- PostHog events: `goals_list_viewed`, `goal_card_tapped`, `goal_add_tapped`, `goal_upsell_shown`.

---

### SCR-023 — Goal Detail / Progress

**Epic/Story:** E7 · US-041
**Route:** `/(app)/goal/[id]`
**Auth required:** Yes
**Paywall:** Both (achievable goal details visible free; progress chart Premium-only but shown blurred with lock)
**Region variants:** All

#### Layout

```
┌─────────────────────────────┐
│  ← Emergency Fund    [Edit] │
│                             │
│  ₹67,000                    │
│  of ₹1,00,000 target        │
│                             │
│  ████████████░░░░░░  67%    │
│                             │
│  ₹33,000 to go              │
│  89 days remaining          │
│                             │
│  ── Progress Over Time ──   │
│  [Line chart — 8 weeks]     │
│                             │
│  ── Contributing Txns ──    │
│  ┌───────────────────────┐  │
│  │ 🏦 Salary savings      │  │
│  │ 13 May  +₹5,000        │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ 🏦 Bonus allocation    │  │
│  │ 01 May  +₹10,000       │  │
│  └───────────────────────┘  │
│                             │
│  [Mark as Achieved]         │
└─────────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| Back chevron | NavigationBar | "← {Goal Name}" left-aligned, truncated at 20 chars. "Edit" text button right-aligned, tap → SCR-024 in edit mode. Achieved goals: "Edit" replaced by "Reopen" (ash text, reopens goal to active). |
| Current amount | Text | 28sp bold. Base currency, locale-formatted. Colour matches progress: green / amber / green+🎉 at 100%. |
| Target subtext | Text | 14sp muted. "of {target_amount} target". |
| Progress bar | ProgressBar | Full-width, 12px height, rounded. Same colour logic as SCR-022. Percentage text right-aligned below bar. |
| Amount remaining | Text | 16sp semibold. "₹X to go" (standard) or "Goal reached! 🎉" (when current ≥ target) in green. |
| Days remaining | Text | 14sp muted. "X days remaining" / "No deadline" / "Overdue by X days" (amber) / "Achieved on [date]" (green, archived goals). |
| Progress chart | LineChart | Reanimated-based line chart. X-axis: weekly ticks from goal creation date. Y-axis: amount saved. Single line (actual). Dashed horizontal line = target amount. Tap any point → tooltip with week and amount. Premium-only: free users see blurred chart overlay with lock icon + "Upgrade to see your progress trend" link → SCR-025. |
| Contributing transactions | SectionList | Sorted descending by date. Each row: emoji/icon (category), description, date, amount prefixed with "+". Tap row → `/(app)/transaction/[id]` (Transaction Detail). Load up to 20; "Show all X contributions →" link if more. |
| Mark as Achieved button | Button | Shown only for active goals where `current_amount >= target_amount` OR manually. Full-width, primary brand green, 16sp semibold. Text: "Mark as Achieved 🎉". Tap → confirmation sheet "Mark as achieved?" / "Yes, I did it!" / "Not yet". On confirm: confetti Lottie animation, goal `status = 'achieved'`, navigate back to SCR-022. |
| Reopen Goal | Button | Shown only for achieved/archived goals. Full-width, secondary outline. Text: "Reopen Goal". Tap → sets `status = 'active'`, navigates back to SCR-022. |

#### States

- **Default:** Goal name in nav title; all metrics loaded; chart renders with animation on mount (line draws left-to-right, 600ms).
- **Loading:** Hero amount area shows skeleton (80px wide, 28px tall). Chart area shows 200px shimmer rectangle. Transaction list shows 3 skeleton rows.
- **Empty (no transactions):** Contributing transactions section replaced by empty state: "No transactions linked yet." Body: "When you add a Saving transaction and assign it to this goal, it will appear here." No CTA — user must go add a transaction.
- **Error:** Navigation bar renders; content area shows inline error — "Couldn't load goal details." Retry text link. Cached last-known values shown faded if available.
- **Achieved state:** Progress bar full green, "Goal reached! 🎉" replaces amount remaining, "Mark as Achieved" button prominent.

#### Navigation

- **Entry points:** SCR-022 (goal card tap); Dashboard active goals section (tap a goal).
- **Exit points:**
  - "Edit" → SCR-024 (edit mode, `/(app)/goal/[id]/edit`)
  - Transaction row tap → `/(app)/transaction/[id]`
  - "Mark as Achieved" → SCR-022 (after confetti)
  - "Upgrade" link (blurred chart) → SCR-025
  - Back → SCR-022

#### Interaction notes

- Chart line draws on screen focus (not mount) to avoid stuttering during navigation transition.
- "Mark as Achieved" confirmation bottom sheet uses `react-native-bottom-sheet` at 40% snap point.
- Haptic: success notification haptic on "Yes, I did it!" confirmation tap.
- PostHog events: `goal_detail_viewed`, `goal_mark_achieved_tapped`, `goal_progress_chart_upgrade_tapped`.

---

### SCR-024 — Add / Edit Goal

**Epic/Story:** E7 · US-041
**Route:** `/(app)/goal/new` (add) · `/(app)/goal/[id]/edit` (edit)
**Auth required:** Yes
**Paywall:** Free (1 goal) · Premium (≥ 2 active goals)
**Region variants:** All

#### Layout

```
┌─────────────────────────────┐
│  Cancel      New Goal  Save │
│                             │
│  Goal name                  │
│  ┌───────────────────────┐  │
│  │ e.g. Emergency Fund   │  │
│  └───────────────────────┘  │
│                             │
│  Target amount              │
│  ┌───────────────────────┐  │
│  │ ₹  0                  │  │
│  └───────────────────────┘  │
│                             │
│  Target date  (optional)    │
│  ┌───────────────────────┐  │
│  │ No deadline      [▼]  │  │
│  └───────────────────────┘  │
│                             │
│  ── 5 active goals max ──   │
│  You have 2 of 5 active     │
│                             │
│                             │
│                             │
│  [Save Goal]                │
└─────────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| Cancel | NavigationBar button | Left-aligned. Tap → dismiss modal without saving. If unsaved changes exist: confirmation bottom sheet "Discard changes?" / "Discard" (red) / "Keep editing". |
| Title | NavigationBar | "New Goal" (add mode) or "Edit Goal" (edit mode). Center-aligned. |
| Save | NavigationBar button | Right-aligned, brand primary colour. Disabled (grey, 50% opacity) until goal name non-empty AND target amount > 0. Tap → validates and saves. |
| Goal name field | TextInput | Full-width, 16sp, placeholder "e.g. Emergency Fund". Keyboard opens immediately on mount (add mode). Single line. Max 50 chars. Character count "X/50" shown right of field when > 30 chars. |
| Target amount field | TextInput | Currency symbol left-inset, right-aligned numeric value. Tapping opens custom numpad (same component as Add Transaction). Formatted with locale separators on blur. Base currency (user's `base_currency`). Must be > 0 to enable Save. |
| Target date picker | Pressable row | Shows "No deadline" initially. Tap → date picker bottom sheet (calendar wheel, iOS style). Minimum date: tomorrow. "Clear date" option inside picker. After selection, shows formatted date "31 Dec 2026". Edit mode: pre-filled with existing target date. |
| Active goals counter | InlineNote | "You have X of 5 active goals." 12sp muted. Shown only when user has ≥ 3 active goals (gentle nudge). Hidden in add mode if user is at limit — paywall shown instead. |
| Save Goal button | Button | Full-width, primary brand colour. Same enabled/disabled logic as nav Save button. Text: "Save Goal" (add mode) / "Save Changes" (edit mode). Tap → `goals.insert()` or `goals.update()`, navigate to SCR-023 on success. |
| Delete Goal | Button | Edit mode only. Shown at bottom of form, below Save, full-width, text in red, no fill. Text: "Delete Goal". Tap → confirmation bottom sheet: "Delete this goal? This won't affect your transactions." / "Yes, delete" (red) / "Cancel". On confirm: `goals.delete()`, navigate to SCR-022. |

#### States

- **Default (add):** Empty fields. Goal name focused immediately. Save disabled.
- **Default (edit):** Fields pre-populated with existing goal values. Save enabled (fields are valid). "Delete Goal" button visible at bottom.
- **Loading (edit):** Fields shimmer until data loads (typically < 300ms; cached in navigation state, so may be instant).
- **Saving:** Save button shows `ActivityIndicator` (white, 16px). Both Save buttons (nav + bottom) disabled. Cancel disabled.
- **Error — save failed:** Toast bottom-centre: "Couldn't save goal. Try again." Buttons re-enabled. Error does not clear the form.
- **Error — at goal limit (free user):** If free user taps "+" with 1 active goal already — they cannot reach this screen; upsell card in SCR-022 intercepts. If Premium user at 5/5: "+" shows "5/5" badge; navigating here directly shows inline error "You've reached the 5-goal limit. Archive a goal to add a new one." Save button disabled.

#### Navigation

- **Entry points:** SCR-022 "+" button (add); SCR-023 "Edit" button (edit).
- **Exit points:**
  - Save → SCR-023 (goal detail of newly created/updated goal)
  - Cancel → back to entry screen
  - Delete → SCR-022

#### Interaction notes

- Screen presented as modal sheet (not a push navigation) from SCR-022 and SCR-023.
- On save: haptic success notification. On delete: haptic warning.
- Target amount numpad same custom component used in SCR-012 (Add Transaction) for UI consistency.
- PostHog events: `goal_add_started`, `goal_add_completed`, `goal_edit_started`, `goal_edit_completed`, `goal_deleted`.

---

### SCR-025 — Paywall / Subscription Screen

**Epic/Story:** E9 · US-045, US-046
**Route:** `/(app)/paywall`
**Auth required:** Yes
**Paywall:** N/A (this is the paywall)
**Region variants:** All (currency localised: $2.99 USD / ₹249 INR / £2.49 GBP — RevenueCat pricing)

#### Layout

```
┌─────────────────────────────┐
│                         [✕] │
│                             │
│    FinTrack Premium         │
│    Unlock your full         │
│    financial picture        │
│                             │
│  ┌───────────────────────┐  │
│  │                       │  │
│  │  Free      Premium    │  │
│  │                       │  │
│  │  Manual tracking  ✓ ✓ │  │
│  │  Transaction list ✓ ✓ │  │
│  │  Weekly report    ✓ ✓ │  │
│  │  (last 2 periods)     │  │
│  │  Bank sync        — ✓ │  │
│  │  Email parsing    — ✓ │  │
│  │  Annual report    — ✓ │  │
│  │  Google Drive     — ✓ │  │
│  │  Unlimited goals  — ✓ │  │
│  │  Full report hist — ✓ │  │
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  $2.99 / month              │
│  billed annually · $35.88   │
│                             │
│  [  Start Free Trial 14d  ] │
│                             │
│  Already a member?          │
│  Restore purchases          │
└─────────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| Close button | IconButton | "✕" top-right, 44×44pt. Tap → dismiss. Shown only when paywall is triggered from a feature gate (not when trial has expired — no dismiss if trial is expired and entitlement is `free`). |
| Headline | Text | "FinTrack Premium" — 24sp bold, brand primary. |
| Subheadline | Text | "Unlock your full financial picture" — 16sp regular, muted. Varies by trigger context: "Bank sync is a Premium feature" / "Unlimited goals require Premium" / "Export to Drive requires Premium" etc. Passed as navigation param. |
| Feature comparison table | Table | Two columns: "Free" and "Premium". Rows: feature names left-aligned. Checkmark (✓ brand green) or dash (— muted grey). Premium column has subtle brand-tinted background. Row copy exact per PRD FR-M08 boundary. |
| Price block | Text | "{currency_symbol}{price} / month" — 20sp bold. "billed annually · {annual_total}" — 14sp muted. Currency resolved from RevenueCat offering for user's locale. |
| Trial badge | InlineBadge | Amber pill badge above CTA: "14-day free trial included". Hidden if user has already consumed their trial. |
| Start Free Trial CTA | Button | Full-width, primary brand colour, 52px height, 18sp semibold. Text: "Start Free Trial" (trial available) or "Subscribe — {price}/mo" (trial consumed). Tap → RevenueCat `purchasePackage()` → iOS/Android native purchase sheet. On success: JWT updated, screen dismissed, feature unlocked. |
| Loading state (purchase) | Overlay | Semi-transparent overlay with centred `ActivityIndicator` during RevenueCat purchase flow. CTA disabled. |
| Restore purchases | TextLink | "Restore purchases" — 14sp, brand accent underline. Tap → `RevenueCat.restorePurchases()`. Success: "Subscription restored ✓" toast, screen dismissed. Failure: "No previous subscription found." toast. |
| Already a member text | Text | 12sp muted, above restore link. |

#### States

- **Default (trial available):** Amber "14-day free trial included" badge visible. CTA reads "Start Free Trial". Close button visible.
- **Default (trial consumed):** Trial badge hidden. CTA reads "Subscribe — $2.99/mo". Close button visible.
- **Default (trial expired, forced paywall):** Close button hidden (user must subscribe to proceed). Banner at top: "Your 14-day trial has ended. Subscribe to continue." amber background. Core tracking still accessible — bottom-sheet variant of paywall used, not full-screen, with "Continue with limited access" link at very bottom (12sp muted).
- **Default (grace period active):** Amber banner: "Your subscription lapsed — 5 days left in your grace period." CTA: "Renew Subscription". Close button visible.
- **Purchasing:** Full-screen semi-transparent overlay with `ActivityIndicator`. Prevents any interaction.
- **Purchase success:** This screen is dismissed automatically; the originating feature unlocks in-place.
- **Purchase error:** Toast: "Purchase failed. Try again or contact support." Error code logged to Sentry. CTA re-enabled.

#### Navigation

- **Entry points:** Feature gate intercept (bank sync, export, goals 2+, annual report, full history); SCR-022 upsell card; SCR-027 "Upgrade" row; SCR-032 "Renew subscription" CTA.
- **Exit points:**
  - Successful purchase → dismiss modal, return to originating screen with feature unlocked
  - Close button → dismiss modal, return to originating screen (feature still locked)
  - "Continue with limited access" (grace/forced) → dismiss modal, limited mode

#### Interaction notes

- Presented as a modal sheet (not push navigation) from all feature gate intercepts.
- RevenueCat `Purchases.shared.getOfferings()` called on mount to ensure price is always current (not hardcoded).
- PostHog events: `paywall_viewed` (property: `trigger_source`), `paywall_cta_tapped`, `paywall_dismissed`, `paywall_purchase_success`, `paywall_purchase_failed`, `paywall_restore_tapped`.
- Smooth spring animation when sheet presents from bottom.

---

### SCR-026 — Export Screen

**Epic/Story:** E6 · US-035, US-036, US-037
**Route:** `/(app)/export`
**Auth required:** Yes
**Paywall:** Premium (Google Drive export requires Premium; on-device download available free)
**Region variants:** All

#### Layout

```
┌─────────────────────────────┐
│  ← Export Report            │
│                             │
│  Report type                │
│  ○ Monthly   ● Weekly       │
│  ○ Annual                   │
│                             │
│  Period                     │
│  ┌───────────────────────┐  │
│  │ May 2026          [▼] │  │
│  └───────────────────────┘  │
│                             │
│  Categories  (optional)     │
│  All categories    [Change] │
│                             │
│  Date range  (optional)     │
│  01 May – 31 May 2026       │
│                             │
│  ── Save to ──              │
│                             │
│  ┌──────────┐ ┌──────────┐  │
│  │ 📱 Device│ │ 🔒 Drive  │  │
│  │ Download │ │ Premium  │  │
│  └──────────┘ └──────────┘  │
│                             │
│  Filename:                  │
│  FinTrack_May2026_Month.xlsx│
│                             │
│  [  Generate & Export  ]    │
│                             │
│  ── Recent Exports ──       │
│  FinTrack_Apr2026_Month...  │
│  2 May 2026 · Drive ✓       │
└─────────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| Back chevron | NavigationBar | "← Export Report". Tap → back to originating screen (Settings or Reports tab). |
| Report type selector | RadioGroup | Three options: "Monthly", "Weekly", "Annual". Default: "Monthly". Selecting "Annual" disables the period picker (uses current calendar year). Selecting "Weekly" changes period picker to week selector. |
| Period picker | Pressable row | Tap → bottom sheet with scroll-wheel date picker. "Monthly" mode: month + year selector. "Weekly" mode: week-of-year selector showing Mon–Sun range. "Annual" mode: year selector. Defaults to current period. |
| Categories filter | Pressable row | "All categories" default. Tap → multi-select bottom sheet listing all user categories (system + custom). Selected count shown: "3 categories selected". |
| Date range display | Text | 14sp muted. Auto-calculated from report type + period selection. "Custom range" option available via date range picker for Monthly. |
| Save to — Device | Card button | Rounded card, 50% width. Icon: 📱. Label: "Device Download". Sub: "Files app / Downloads". Always available. Primary selection style (brand border) when selected. |
| Save to — Google Drive | Card button | Rounded card, 50% width. Icon: Google Drive logo (or 🔒 if not connected + not Premium). Label: "Google Drive". Sub: "Connected" (green tick, if linked) / "Connect Drive" (if Premium but not linked) / "Premium" (if free user). Tap on locked state → SCR-025. Tap on "Connect Drive" → Google Drive OAuth flow. |
| Filename preview | Text | 12sp muted. Auto-generated: `FinTrack_{Month}{Year}_{Type}.xlsx`. Non-editable (generated deterministically). |
| Generate & Export button | Button | Full-width, primary brand colour, 52px. Text: "Generate & Export". Disabled until: report type selected AND period selected AND destination selected. Tap → starts on-device ExcelJS generation. |
| Progress overlay | Modal overlay | Shown during generation and upload. Centred card with: filename, progress bar (0–100%), status text ("Generating spreadsheet..." / "Uploading to Drive..." / "Done ✓"). Cannot be dismissed until complete or errored. |
| Recent exports list | FlatList | Section header "── Recent Exports ──". Up to 5 rows. Each row: filename (14sp), date + destination badge (12sp muted). Destination: "Device" or "Drive ✓". Tap row → share sheet for device files; "Open in Drive" for Drive files. |

#### States

- **Default:** Monthly selected, current month pre-filled, all categories, Device destination selected. Generate button enabled. Recent exports shown if any.
- **Google Drive not connected (Premium user):** Drive card shows "Connect Drive" label. Tapping Drive card → Google OAuth flow inline (Expo WebBrowser). On success: Drive card updates to "Connected ✓", destination switches to Drive.
- **Generating:** Progress overlay shown. 0% → 100% animated (ExcelJS progress callback). Status text: "Generating spreadsheet..." while building, "Uploading to Drive..." (if Drive destination), "Saving to device..." (if device destination).
- **Export complete — Device:** Progress overlay shows "Done ✓" with file size. Auto-dismisses after 1.5s. Share sheet opens: "Open in Files", "Share", "Open in..." for compatible apps. Toast: "FinTrack_May2026_Monthly.xlsx saved."
- **Export complete — Drive:** Progress overlay shows "Done ✓ · Saved to Google Drive". "Open in Drive" tappable link in overlay. Toast: "Saved to Drive ✓ · Open in Drive" (3s, tappable).
- **Error — generation failed:** Progress overlay shows red ✕ icon. "Export failed — not enough storage?" with "Retry" and "Cancel" buttons. Sentry event logged.
- **Error — Drive upload failed:** Partially uploaded file cleaned up automatically. "Couldn't save to Drive. Check your connection and try again." Retry saves to device as fallback option.
- **Empty recent exports:** Recent exports section hidden entirely (no empty state copy — just not shown).

#### Navigation

- **Entry points:** Settings → Reports & Export row; Reports tab (Weekly/Monthly/Annual) "Export" button; SCR-027 Export row.
- **Exit points:**
  - Back → originating screen
  - Drive OAuth → returns inline (Expo WebBrowser), back to export screen
  - "Open in Drive" → external Safari/browser
  - Recent export tap → share sheet (modal system sheet)

#### Interaction notes

- ExcelJS generation runs on a background thread via `expo-task-manager` to avoid blocking UI.
- Drive OAuth is deferred — only triggered at first Drive tap, never during onboarding (FR-G05).
- Google Drive `drive.file` scope only — cannot read user's existing Drive files (shown in OAuth consent screen).
- PostHog events: `export_screen_viewed`, `export_type_selected`, `export_destination_selected`, `export_started`, `export_completed` (properties: `type`, `destination`, `duration_ms`, `file_size_kb`), `export_failed`, `export_drive_connect_started`.

---

### SCR-027 — Settings — Main Menu

**Epic/Story:** E8 · US-042, US-043, US-044
**Route:** `/(app)/(tabs)/settings`
**Auth required:** Yes
**Paywall:** Free (all settings accessible; subscription status shown)
**Region variants:** All

#### Layout

```
┌─────────────────────────────┐
│  Settings                   │
│                             │
│  ┌───────────────────────┐  │
│  │  [Avatar]  First Last  │  │
│  │            Premium ✓  │  │
│  └───────────────────────┘  │
│                             │
│  ── Account ──              │
│  Profile             [›]    │
│  Notifications       [›]    │
│  Currency & Region   [›]    │
│  Security            [›]    │
│                             │
│  ── Finance ──              │
│  Monthly Income      [›]    │
│  Budget Targets      [›]    │
│  Custom Categories   [›]    │
│                             │
│  ── Export ──               │
│  Reports & Export    [›]    │
│  Google Drive        [›]    │
│                             │
│  ── Connections ──          │
│  Bank Accounts       [›]    │
│  Email Connection    [›]    │
│  SMS Access (Android)[›]    │
│                             │
│  ── Privacy & Legal ──      │
│  Privacy & Data      [›]    │
│  Privacy Policy      [›]    │
│  Terms of Service    [›]    │
│                             │
│  ── Subscription ──         │
│  FinTrack Premium    [›]    │
│                             │
│  App version 1.0.0          │
└─────────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| Header "Settings" | NavigationBar | Large title, no back button (tab root). No right action. |
| Profile card | Pressable card | Avatar (initials circle if no photo, 48×48px), display name (16sp semibold), subscription badge ("Premium ✓" in brand green or "Free Trial — X days left" in amber or "Free" in grey). Full-width. Tap → SCR-028 (Profile). |
| Section dividers | SectionHeader | "── {Section Name} ──" in 12sp muted uppercase. Not tappable. |
| Settings row | Pressable | Full-width, 52px height minimum, 44px tap target. Left: optional icon (24×24px, muted grey), label (16sp, primary text). Right: chevron "›" (grey). For rows with supplemental info: subtitle (12sp muted) below label. |
| Monthly Income row | Settings row | Subtitle: current income formatted (e.g. "₹1,20,000 / month") or "Not set" in amber. |
| Budget Targets row | Settings row | Subtitle: "50% · 30% · 20%" (current split). |
| Custom Categories row | Settings row | Subtitle: "X custom" or "System defaults only". |
| Google Drive row | Settings row | Subtitle: "Connected ✓" (green) or "Not connected" (grey). |
| Bank Accounts row | Settings row | Subtitle: "X connected" or "None". |
| Email Connection row | Settings row | Subtitle: "Gmail connected ✓" or "Not connected". |
| SMS Access row | Settings row | Android only — hidden on iOS entirely. Subtitle: "Enabled" (green) or "Disabled". Tap → Android App Settings deep-link for SMS permission management. |
| Privacy & Data row | Settings row | No subtitle. Tap → SCR-031. |
| Privacy Policy row | Settings row | Tap → in-app WebView with `https://fintrack.app/privacy`. |
| Terms of Service row | Settings row | Tap → in-app WebView with `https://fintrack.app/terms`. |
| FinTrack Premium row | Settings row | Subtitle: "Active · renews 13 May 2027" (green) / "Free Trial — 9 days left" (amber) / "Lapsed — grace period" (red). Tap → SCR-032. |
| App version | Text | 12sp muted, left-aligned, non-tappable. "App version {semver} ({build_number})". |

#### States

- **Default (Premium):** Profile card shows "Premium ✓" badge. Subscription row shows renewal date. All rows visible.
- **Default (Free trial):** Profile card shows "Free Trial — X days left" amber badge. Subscription row shows trial countdown.
- **Default (Free / lapsed):** Profile card shows "Free" grey badge. Subscription row shows "Lapsed" in red. "Upgrade" label appended to Premium row.
- **Loading:** Profile card shimmers for 300ms. Section rows render immediately from cached data; no shimmer.
- **Error:** Profile card shows "—" for name. Income/budget subtitles show "—". All navigation rows still tappable.

#### Navigation

- **Entry points:** Bottom tab bar "Settings" tab.
- **Exit points:**
  - Profile → SCR-028
  - Notifications → SCR-029
  - Currency & Region → SCR-030
  - Security → `/(app)/settings/security` (biometric lock + auto-lock timer — not in Group C scope)
  - Monthly Income / Budget Targets / Custom Categories → respective settings screens
  - Reports & Export → SCR-026
  - Google Drive → `/(app)/settings/google-drive` (link/unlink screen)
  - Bank Accounts → `/(app)/(tabs)/accounts` (Accounts tab)
  - Email Connection → `/(app)/settings/email-connection`
  - SMS Access → Android Settings deep-link (exits app briefly)
  - Privacy & Data → SCR-031
  - Privacy Policy / Terms → in-app WebView
  - FinTrack Premium → SCR-032

#### Interaction notes

- No haptics on list rows (standard iOS/Android scroll list behaviour).
- SMS Access row conditionally rendered: `Platform.OS === 'android'` only.
- Settings rows use `AccessibilityRole = 'button'` for VoiceOver/TalkBack compliance.
- PostHog events: `settings_screen_viewed`, `settings_row_tapped` (property: `row`).

---

### SCR-028 — Settings — Profile

**Epic/Story:** E8 · US-043 (profile data); E2 · US-011 (first-name collect at onboarding)
**Route:** `/(app)/settings/profile`
**Auth required:** Yes
**Paywall:** Free
**Region variants:** All

#### Layout

```
┌─────────────────────────────┐
│  ← Profile           [Save] │
│                             │
│         [Avatar photo]      │
│       Change photo          │
│                             │
│  Display name               │
│  ┌───────────────────────┐  │
│  │ Mukund                │  │
│  └───────────────────────┘  │
│                             │
│  Email                      │
│  mukund@gmail.com           │
│  (via Google)               │
│                             │
│  Phone                      │
│  +91 98765 43210            │
│                             │
│  Date of birth              │
│  28 years old               │
│  To update: contact support │
│                             │
│  Base currency              │
│  Indian Rupee (₹)      [›]  │
│                             │
│  Member since               │
│  13 May 2026                │
└─────────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| Back chevron | NavigationBar | "← Profile". "Save" text button right-aligned, disabled until changes made. Tap Save → saves name + photo changes to Supabase `user_profiles`. |
| Avatar | Pressable image | 96×96px circle. Shows profile photo if uploaded; initials in brand colour on grey background if none. Tap → bottom sheet: "Take Photo" / "Choose from Library" / "Remove Photo". `expo-image-picker` handles camera and library. Photo stored in Supabase Storage (public URL, not Vault). |
| Change photo label | TextLink | 14sp brand accent below avatar. Same tap action as avatar press. |
| Display name field | TextInput | 16sp, 48px height. Pre-filled from `user_profiles.display_name`. Single line. Max 50 chars. Label "Display name" above field. Editing enables the "Save" nav button. |
| Email row | InformationRow | Label: "Email". Value: email address + "(via Google)" or "(via Apple)" or "(verified)" sub-label. Non-editable (auth provider email). Read-only — no chevron. |
| Phone row | InformationRow | Label: "Phone". Value: formatted phone number or "Not set" (muted). Shown only if user signed in with OTP. Non-editable from this screen. |
| Date of birth row | InformationRow | Label: "Date of birth". Value: "{X} years old" — derived from DOB stored in Vault but displayed as computed age only, never raw date. Sub-label: "To update your date of birth, contact support." 12sp muted italic. Non-editable, no chevron. |
| Base currency | Pressable row | Label: "Base currency". Value: "Indian Rupee (₹)" / "US Dollar ($)" / "British Pound (£)". Chevron right. Tap → SCR-030 (Currency & Region). Note: currency change triggers re-aggregation banner: "Changing your base currency will update all historical amounts. This may take a moment." shown as bottom sheet before confirming. |
| Member since | InformationRow | Label: "Member since". Value: formatted join date from `user_profiles.created_at`. Non-editable. |

#### States

- **Default:** Form pre-filled. Save button disabled. Read-only rows rendered with muted style.
- **Unsaved changes:** Save button enabled (brand primary colour). If user taps Back with unsaved changes: confirmation sheet "Discard changes?" / "Discard" / "Keep editing".
- **Saving:** Save button shows `ActivityIndicator`. All fields disabled. Takes < 500ms for name update. Photo upload may take 1–5s depending on image size.
- **Photo uploading:** Circular progress ring overlaid on avatar (Reanimated). Percentage shown inside. Cancel not available once started.
- **Save success:** Toast bottom-centre: "Profile updated ✓". Save button resets to disabled.
- **Save error:** Toast: "Couldn't update profile. Try again." Save button re-enabled.
- **Error:** If `user_profiles` fails to load: fields show "—" placeholder. Retry pull-to-refresh.

#### Navigation

- **Entry points:** SCR-027 Profile card; SCR-027 Profile row.
- **Exit points:**
  - Save → same screen (stays, shows success toast)
  - Back → SCR-027
  - Base currency row → SCR-030

#### Interaction notes

- Age computation: `floor((today - dob_date) / 365.25)`. DOB never shown raw — only computed age integer.
- Profile photo resized to 512×512px on-device before upload (`expo-image-manipulator`).
- WCAG: all form labels above inputs (not placeholder-only) for screen reader compatibility.
- PostHog events: `profile_screen_viewed`, `profile_photo_changed`, `profile_name_updated`, `profile_currency_tap`.

---

### SCR-029 — Settings — Notifications

**Epic/Story:** E8 · US-042
**Route:** `/(app)/settings/notifications`
**Auth required:** Yes
**Paywall:** Free
**Region variants:** All (SMS-specific notifications Android-only; AA re-consent India-only)

#### Layout

```
┌─────────────────────────────┐
│  ← Notifications            │
│                             │
│  Push notifications are     │
│  enabled                    │
│                             │
│  ── Transactions ──         │
│  New transaction detected   │
│  Auto-parsed, needs review  │
│              [Toggle ON]    │
│                             │
│  ── Budget & Discipline ──  │
│  Budget alert (80%)         │
│  When a category hits 80%   │
│              [Toggle ON]    │
│                             │
│  Weekly score summary       │
│  Every Sunday evening       │
│              [Toggle ON]    │
│                             │
│  ── Bank & Connections ──   │
│  Bank token expiry          │
│  7 days before expiry       │
│              [Toggle ON]    │
│                             │
│  Bank connection error      │
│              [Toggle ON]    │
│                             │
│  Re-consent reminder (AA)   │
│  India only · 30 days before│
│              [Toggle ON]    │
│                             │
│  ── System ──               │
│  Manage in iOS Settings [›] │
└─────────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| Back chevron | NavigationBar | "← Notifications". No right action (auto-saves on toggle). |
| Push permission status banner | InlineBanner | "Push notifications are enabled" (green, icon ✓) or "Push notifications are disabled — tap here to enable in Settings" (amber, tappable → iOS/Android notification settings deep-link). Shown at top above all toggles. |
| Section dividers | SectionHeader | "── {Section Name} ──" 12sp muted uppercase. |
| Notification toggle row | Row with Switch | Label 16sp primary, subtitle 12sp muted below. Right: `Switch` component (brand primary ON colour, grey OFF). Toggle state saved immediately to Supabase `user_profiles.notification_prefs` jsonb column. No save button needed. |
| Re-consent reminder row | Row with Switch | Shown only when `user_profiles.country = 'IN'`. Label: "Re-consent reminder (AA)". Subtitle: "India only · 30 days before AA expiry". Hidden for US/UK users. |
| Manage in iOS Settings | Pressable row | Label: "Manage in iOS Settings" (iOS) / "Manage in Android Settings" (Android). Right: chevron "›". Tap → `Linking.openSettings()`. Subtitle: 12sp muted "Grant or revoke push permission from your device settings." |

#### States

- **Default (notifications enabled):** Green permission banner. All toggles reflect saved preferences. Default (if first visit): all ON.
- **Default (notifications disabled at OS level):** Amber banner "Push notifications are disabled." All toggles greyed-out and non-interactive with overlay message: "Enable notifications in Settings to use these controls." Manage in Settings row highlighted.
- **Toggle change:** Optimistic UI update (toggle flips immediately). Background Supabase write. On write failure: toggle reverts + toast "Couldn't save preference. Try again."
- **Loading:** Toggle rows render as skeleton (shimmer placeholder) until prefs load from Supabase. Typically < 200ms.
- **Error (prefs load failed):** All toggles show OFF state with "—" instead of subtitle. Inline error: "Couldn't load your preferences. Pull down to retry."

#### Navigation

- **Entry points:** SCR-027 Notifications row.
- **Exit points:**
  - Back → SCR-027
  - Manage in Settings → OS Settings app (exits app, returns to app on back)

#### Interaction notes

- All toggles auto-save — no explicit save button. Reduces friction for a quick preferences adjustment.
- Re-consent reminder row uses `user.country` from JWT, not device locale (authoritative source).
- PostHog events: `notifications_screen_viewed`, `notification_toggle_changed` (properties: `notification_type`, `new_value`).

---

### SCR-030 — Settings — Currency & Region

**Epic/Story:** E8 · US-043; E2 · US-011
**Route:** `/(app)/settings/currency-region`
**Auth required:** Yes
**Paywall:** Free
**Region variants:** All

#### Layout

```
┌─────────────────────────────┐
│  ← Currency & Region        │
│                             │
│  Base currency              │
│                             │
│  ○  🇮🇳  Indian Rupee  ₹     │
│  ●  🇺🇸  US Dollar    $     │
│  ○  🇬🇧  British Pound £     │
│                             │
│  Other currencies [›]       │
│                             │
│  Example:                   │
│  $1,00,000                  │
│                             │
│  ── Region ──               │
│  Country                    │
│  United States         [›]  │
│                             │
│  ── About currency change   │
│  Changing your base currency│
│  updates all historical     │
│  reports. Amounts convert   │
│  using the rate at each     │
│  transaction's date.        │
│                             │
│  [Apply Changes]            │
└─────────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| Back chevron | NavigationBar | "← Currency & Region". No right action (save via bottom CTA). |
| Currency radio group | RadioGroup | Three large tappable rows (INR / USD / GBP) with flag emoji, full name, symbol. Currently selected highlighted with brand primary border and filled radio dot. Each row 56px height. |
| Other currencies | Pressable row | "Other currencies ›". Tap → searchable ISO 4217 picker bottom sheet (full list, searchable by name or code). On select: radio group auto-deselects the three primary options and shows selected currency inline. |
| Example formatting | InlineBanner | Grey background box. "Example: {locale_formatted_amount}" — shows 100,000 in the selected currency's locale format. Updates live as currency changes. India INR example uses Indian number system: "₹1,00,000". |
| Country row | Pressable row | Label: "Country". Value: country name. Chevron. Tap → searchable country list bottom sheet. Country drives: India → RBI localisation routing (ap-south-1); US/UK → standard project. Warning shown if changing from India: "Moving your data region requires contacting support." |
| Disclaimer copy | Text | 14sp muted. Explains that changing base currency converts historical data using historical FX rates. Non-tappable. |
| Apply Changes button | Button | Full-width, primary brand colour. Disabled until a change is made. Text: "Apply Changes". Tap → confirmation bottom sheet: "Change base currency to {currency}? Historical amounts will be converted." / "Apply" (primary) / "Cancel". On confirm: `user_profiles.base_currency` updated, FX re-aggregation job triggered server-side, success toast, navigate back to SCR-027. |

#### States

- **Default:** Current currency pre-selected. Example formatting shown. Apply Changes disabled.
- **Changed (unsaved):** Apply Changes enabled. Example updates to new currency format.
- **Confirming:** Bottom sheet shown. User must confirm before applying.
- **Applying:** Apply Changes button shows `ActivityIndicator`. Re-aggregation is async (< 2s for small datasets). Toast: "Currency updated. Reports will refresh shortly." Navigate to SCR-027.
- **Error:** Toast: "Couldn't update currency. Try again." Button re-enabled.
- **India country warning:** Shown as amber inline note if user tries to change country away from India: "Your data is stored in India for RBI compliance. Changing region requires contacting support." Apply button disabled for country row in this case.

#### Navigation

- **Entry points:** SCR-027 Currency & Region row; SCR-028 Base currency row.
- **Exit points:**
  - Apply Changes → SCR-027
  - Back (no changes) → SCR-027
  - Back (unsaved changes) → confirmation sheet

#### Interaction notes

- Locale example updates synchronously on radio selection — no network call needed.
- Country change for India is blocked in-app (RBI requirement); user shown support contact link.
- PostHog events: `currency_region_screen_viewed`, `currency_changed` (property: `new_currency`), `currency_change_applied`.

---

### SCR-031 — Settings — Privacy & Data

**Epic/Story:** E8 · US-043
**Route:** `/(app)/settings/privacy`
**Auth required:** Yes
**Paywall:** Free
**Region variants:** All (GDPR references for EU/UK; CCPA badge for US; RBI note for India)

#### Layout

```
┌─────────────────────────────┐
│  ← Privacy & Data           │
│                             │
│  Your data, your rights.    │
│  We comply with GDPR,       │
│  CCPA, and RBI guidelines.  │
│                             │
│  ── Data Export ──          │
│  Export my data        [›]  │
│  GDPR Article 20            │
│  Receive a JSON file of all │
│  your FinTrack data within  │
│  24 hours.                  │
│                             │
│  ── Data Connections ──     │
│  SMS Access (Android)  [›]  │
│  Gmail / Outlook       [›]  │
│  Google Drive          [›]  │
│                             │
│  ── Account Deletion ──     │
│  Delete my account          │
│  [  Delete Account  ]  ←red │
│  Permanent · 30-day SLA     │
│  All data erased (GDPR      │
│  Article 17).               │
└─────────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| Back chevron | NavigationBar | "← Privacy & Data". No right action. |
| Intro text | Text | 14sp muted. "Your data, your rights. We comply with GDPR, CCPA, and RBI guidelines." Non-tappable. |
| Export my data row | Pressable row | Label: "Export my data". Subtitle: "GDPR Article 20". Right: chevron. Below row: 12sp muted explanation "Receive a JSON file of all your FinTrack data within 24 hours." Tap → PIN/biometric re-auth prompt (see Interaction notes). On auth success: confirmation bottom sheet: "We'll email your data to {email} within 24 hours." / "Request Export" (primary) / "Cancel". On confirm: Edge Function triggered, audit log written, toast "Export requested. Check your email in up to 24 hours." |
| SMS Access row | Pressable row | Android only. Tap → Android App Settings deep-link (`Intent.ACTION_APPLICATION_DETAILS_SETTINGS`). |
| Gmail / Outlook row | Pressable row | Tap → `/(app)/settings/email-connection` (shows connected status + revoke option). |
| Google Drive row | Pressable row | Tap → `/(app)/settings/google-drive` (shows connected status + unlink option). |
| Delete Account button | Button | Full-width, RED fill (destructive), 52px, 18sp semibold, white text. Text: "Delete Account". NOT a row with chevron — a full-width button to make the destructive action visually intentional and weighty. Below: 12sp muted "Permanent · 30-day processing SLA · All data erased (GDPR Article 17)." Tap → see deletion flow below. |

#### Account Deletion Flow (inline, not a separate screen)

Tap "Delete Account" → sequential steps:

**Step 1 — Biometric / PIN re-auth:**
Bottom sheet: "Confirm it's you before deleting your account." Face ID / fingerprint prompt (or PIN if biometric unavailable). On fail: "Authentication failed. Try again." (max 3 attempts, then blocked for 5 min).

**Step 2 — Confirmation bottom sheet:**
Title: "Delete your FinTrack account?"
Body: "This will permanently erase all your transactions, reports, bank connections, and account data. This cannot be undone."
Warning badge: "⚠️ This action is irreversible."
Below: text input with label "Type DELETE to confirm" — `TextInput`, uppercase forced, placeholder "DELETE", 48px height, red border.
CTA: "Yes, permanently delete my account" — RED, disabled until input equals exactly "DELETE".
Secondary: "Cancel" — grey text, no fill.

**Step 3 — On confirm:**
Edge Function called: cascade deletion queued. `audit_log` row written with `event = 'account_deleted'`, IP, timestamp. Supabase auth session invalidated immediately. App navigates to `/(auth)/welcome` with all local state cleared (SQLite offline queue wiped, SecureStore JWT removed). Email sent to user within 5 minutes: "Your FinTrack account deletion has been confirmed. Your data will be fully erased within 30 days."

#### States

- **Default:** All rows rendered. Delete button prominent at bottom. No loading states.
- **Export requested:** Export row disabled for 24h after request (prevents duplicate requests). Subtitle changes to "Export requested — {timestamp}. Check your email."
- **Deletion in progress (Step 2):** Delete button shows spinner. Bottom sheet stays open. On success: navigate to welcome screen. On error: "Deletion failed — please contact support@fintrack.app" with email tappable.
- **Loading:** Screen renders immediately (no remote data needed). All rows static.
- **Error (export):** Toast: "Couldn't submit export request. Please try again or email privacy@fintrack.app."

#### Navigation

- **Entry points:** SCR-027 Privacy & Data row.
- **Exit points:**
  - Export request → same screen (stays, row disabled)
  - Account deletion → `/(auth)/welcome` (session cleared)
  - SMS Access → Android Settings
  - Gmail row → `/(app)/settings/email-connection`
  - Google Drive row → `/(app)/settings/google-drive`
  - Back → SCR-027

#### Interaction notes

- Both "Export my data" and "Delete Account" require biometric/PIN re-auth before proceeding (FR-L02 compliance; prevents accidental or unauthorized data actions).
- "DELETE" typed confirmation prevents accidental deletion — must match exactly (case-sensitive after `.toUpperCase()` coercion).
- Sentry event logged on account deletion for monitoring.
- Deletion does NOT immediately remove Supabase Auth user (that happens async within 30 days per GDPR SLA) — but the JWT is invalidated immediately, preventing login.
- CCPA: California users see same export + delete flow; no additional UI difference (same rights).
- PostHog events: `privacy_screen_viewed`, `data_export_requested`, `account_deletion_step1_completed`, `account_deletion_step2_completed`, `account_deleted_confirmed`. Note: PostHog events cease after deletion.

---

### SCR-032 — Settings — Subscription Management

**Epic/Story:** E9 · US-044; E8 · US-044
**Route:** `/(app)/settings/subscription`
**Auth required:** Yes
**Paywall:** Free (this screen is accessible to all; shows paywall CTA for free/lapsed users)
**Region variants:** All

#### Layout

```
┌─────────────────────────────┐
│  ← Subscription             │
│                             │
│  ┌───────────────────────┐  │
│  │ FinTrack Premium      │  │
│  │ $2.99 / month         │  │
│  │ Billed annually       │  │
│  │                       │  │
│  │ Status: Active ✓      │  │
│  │ Next renewal: 13 May  │  │
│  │ 2027                  │  │
│  └───────────────────────┘  │
│                             │
│  ── What's included ──      │
│  Bank sync              ✓   │
│  Email auto-capture     ✓   │
│  Annual reports         ✓   │
│  Google Drive export    ✓   │
│  Unlimited goals (5)    ✓   │
│  Full report history    ✓   │
│                             │
│  ── Manage ──               │
│  Cancel subscription   [›]  │
│  Restore purchases     [›]  │
│                             │
│  Access continues until     │
│  your billing period ends   │
│  if you cancel.             │
│                             │
│  ⚠️ Note: Access may take   │
│  up to 60 minutes to update │
│  after changes.             │
└─────────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| Back chevron | NavigationBar | "← Subscription". No right action. |
| Plan card | Card | Rounded 12px card, brand-tinted background (#F0FBF5 green tint). Plan name: "FinTrack Premium" 18sp bold. Price: "$2.99 / month" 16sp. "Billed annually" 12sp muted. Status badge: "Active ✓" green pill / "Free Trial — X days left" amber pill / "Grace period — X days left" amber pill with countdown / "Expired" red pill / "Free" grey pill. Renewal date: "Next renewal: {date}" 14sp muted (hidden if not active). |
| What's included list | StaticList | Checkmark rows (✓ brand green). Feature name 14sp. Non-tappable. Shows same feature boundary as SCR-025 paywall comparison. |
| Cancel subscription row | Pressable row | Shown only for ACTIVE and GRACE PERIOD states. Label: "Cancel subscription". Right chevron. Tap → confirmation bottom sheet: "Cancel your subscription?" / body: "You'll keep Premium access until {renewal_date}. After that, bank sync, export, and bank auto-capture will be paused." / "Cancel subscription" (red) / "Keep my subscription" (brand primary, default focus). On confirm: RevenueCat cancellation flow — `Purchases.shared.beginRefundRequest()` (iOS) / opens Play Store subscription management (`Linking.openURL('https://play.google.com/store/account/subscriptions')`) (Android). Post-cancel: plan card status changes to "Cancelling — access until {date}". Toast: "Subscription cancelled. Access continues until {renewal_date}." |
| Restore purchases row | Pressable row | Always visible. Label: "Restore purchases". Right chevron. Tap → `RevenueCat.restorePurchases()`. Success: "Subscription restored ✓" toast, plan card updates. Failure: "No previous subscription found." |
| Access continuation note | Text | 12sp muted italic. "Access continues until your billing period ends if you cancel." Shown below Manage section. |
| JWT disclaimer note | Text | 12sp muted, amber icon ⚠️ prefix. "Note: Access may take up to 60 minutes to update after plan changes." Always shown (FR-M07 transparency). |
| Upgrade CTA | Button | Shown ONLY for Free / Expired / Grace states. Full-width, primary brand colour, 52px. Text: "Upgrade to Premium" (free/expired) or "Renew subscription" (grace). Tap → SCR-025 (Paywall). |
| Grace countdown | InlineBanner | Shown ONLY during grace period (amber background). "Your subscription lapsed. You have {X} days left in your grace period." X = `grace_until - today`. Tap → SCR-025. |
| Trial countdown | InlineBanner | Shown ONLY during trial. Green-ish background. "Free trial — {X} days remaining. Trial ends {date}." |

#### States

- **Active:** Plan card green status. Cancel + Restore rows visible. No upgrade CTA. Trial/grace banners hidden.
- **Free trial:** Plan card shows "Free Trial — X days left" amber pill. Trial countdown banner shown. Cancel row hidden (can't cancel a trial — just let it expire). Restore row visible.
- **Grace period (lapsed, within 7 days):** Plan card "Grace period — X days left" amber pill. Grace countdown banner shown. Upgrade CTA shown. Cancel row hidden.
- **Expired / Free:** Plan card "Expired" red pill or "Free" grey pill. Upgrade CTA prominent. Cancel + restore rows still shown (restore for re-activate). Grace banner hidden.
- **Cancelled (pending end of period):** Plan card shows "Cancelling — access until {date}" amber pill. Cancel row replaced with "Reactivate subscription" row (tap → store subscription management). Toast shown once on load: "Your subscription will end on {date}."
- **Loading:** Plan card shimmers. Feature list renders immediately (static). RevenueCat `getCustomerInfo()` called on mount.
- **Error (RevenueCat unavailable):** Plan card shows cached status from JWT claim with note: "Subscription status from cache — may be up to 1 hour old." Cancel row disabled. Restore row still tappable.

#### Navigation

- **Entry points:** SCR-027 FinTrack Premium row; SCR-025 (after purchase, dismiss → may route here); grace period banner (if implemented on Dashboard).
- **Exit points:**
  - Back → SCR-027
  - Upgrade CTA → SCR-025
  - Cancel subscription → iOS/Android store (system sheet or external browser)
  - Restore purchases → same screen (updates in-place)

#### Interaction notes

- RevenueCat `getCustomerInfo()` called on every mount to ensure fresh status (not cached from JWT for this management screen specifically).
- iOS cancellation uses `SKPaymentQueue` / RevenueCat `beginRefundRequest()` which presents the native iOS refund sheet. Android opens Play Store subscription management via deep-link — no in-app cancel sheet on Android.
- PostHog events: `subscription_screen_viewed`, `subscription_cancel_tapped`, `subscription_cancel_confirmed`, `subscription_restore_tapped`, `subscription_upgrade_tapped`.

---

*Document end — Group C: SCR-022 through SCR-032*

*References: `2026-05-13-epics-stories.md` · `2026-05-13-prd.md` · `CLAUDE.md` · Group A: `group-a-onboarding-transactions.md`*
