# FinTrack — Group A Screens: Onboarding & Transactions

**Author:** Sally (Senior UX Designer)  
**Date:** 2026-05-13  
**Covers:** SCR-001 through SCR-013 (13 screens)  
**Stack:** Expo SDK 52 · Expo Router v3 · React Native · NativeWind v4 · Supabase  
**References:** `2026-05-13-onboarding-flow.md` · `2026-05-13-epics-stories.md` (E2, E3) · `CLAUDE.md`

---

## Screen Index

| Screen | Name | Route | Auth |
|--------|------|-------|------|
| SCR-001 | Welcome / Auth Choice | `/(auth)/welcome` | No |
| SCR-002 | OTP / Magic Link | `/(auth)/verify` | No |
| SCR-003 | Name + Date of Birth | `/(auth)/profile-setup` | Partial (token issued) |
| SCR-004 | Connect Bank (Onboarding) | `/(auth)/connect-bank` | Partial |
| SCR-005 | Dashboard — First Landing | `/(app)/(tabs)/` | Yes |
| SCR-010 | Dashboard (Returning User) | `/(app)/(tabs)/` | Yes |
| SCR-011 | Transaction List | `/(app)/(tabs)/tracker` | Yes |
| SCR-012 | Add Transaction (Manual) | `/(app)/add-transaction` | Yes |
| SCR-013 | Transaction Detail / Edit | `/(app)/transaction/[id]` | Yes |

---

### SCR-001 — Welcome / Auth Choice

**Epic/Story:** E2 · US-007, US-008, US-009, US-010  
**Route:** `/(auth)/welcome`  
**Auth required:** No  
**Paywall:** Free  
**Region variants:** All (button copy identical; country code on phone path auto-detected)

#### Layout

```
┌─────────────────────────────┐
│                             │
│                             │
│        [FinTrack Logo]      │
│          FinTrack           │
│      Your money, tracked    │
│                             │
│                             │
│  ┌─────────────────────┐   │
│  │  G  Continue with   │   │
│  │     Google          │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │    Continue with    │   │
│  │       Apple         │   │
│  └─────────────────────┘   │
│                             │
│       ─────  or  ─────      │
│                             │
│    Use phone or email →     │
│                             │
│                             │
│  By continuing you agree to │
│  our Terms of Service and   │
│  Privacy Policy             │
└─────────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| App logo | Image | 80×80px, centered, top third of screen |
| App name | Text | "FinTrack" — 32sp bold, brand primary colour |
| Tagline | Text | "Your money, tracked" — 16sp regular, muted grey |
| Continue with Google | Button | Full-width, white fill, 1px grey border, Google "G" icon left-aligned, 16sp medium. Android: hidden on iOS when not relevant. Tap → `supabase.auth.signInWithOAuth('google')` |
| Continue with Apple | Button | Full-width, black fill, white text, Apple logo icon left-aligned, 16sp medium. iOS only (hidden on Android). Tap → `supabase.auth.signInWithOAuth('apple')` |
| Divider | Separator | "or" centred with hairlines left and right, 14sp muted |
| Use phone or email | TextLink | 16sp, brand accent underline, tap → navigate to `/(auth)/verify` with `method` param |
| Terms copy | Text | 12sp muted, "Terms of Service" + "Privacy Policy" are tappable links → in-app WebView |

#### States

- **Default:** Both OAuth buttons visible; on Android, Apple button hidden (shown only on iOS per App Store requirement); Terms text at bottom; no loading indicators
- **Loading:** After tapping Google/Apple — both OAuth buttons replaced with a single centred `ActivityIndicator` (brand primary); "Use phone or email" link disabled with 50% opacity; no skeleton needed since transition is fast
- **Error:** Toast at bottom of screen — "Sign-in failed. Please try again." with "Retry" text link. Specific Google errors: "Google sign-in cancelled" (user dismissed). Specific Apple errors: "Apple Sign-In unavailable on this device"
- **Empty:** N/A — no data state on this screen

#### Navigation

- **Entry points:** App cold start (unauthenticated); session expired redirect; deep link from password-less email on new device
- **Exit points:**
  - Google OAuth → success → `/(auth)/profile-setup` (new user) or `/(app)/(tabs)/` (returning user)
  - Apple Sign-In → same fork as Google
  - "Use phone or email" → `/(auth)/verify`

#### Interaction notes

- Haptic feedback: medium impact on both OAuth button taps (immediately on press, not on completion)
- Apple button must appear on all iOS screens where Google OAuth is offered (App Store requirement — enforced at component level via `Platform.OS === 'ios'` guard)
- No animations on this screen — get users in fast; zero-distraction first impression
- PostHog events: `auth_screen_viewed`, `auth_method_selected` (property: `method: 'google' | 'apple' | 'phone_email'`)

---

### SCR-002 — OTP / Magic Link

**Epic/Story:** E2 · US-009, US-010  
**Route:** `/(auth)/verify`  
**Auth required:** No  
**Paywall:** Free  
**Region variants:** All (phone path: country code auto-detected from device locale — +91 IN, +1 US, +44 UK; magic link path is region-agnostic)

#### Layout

**Phone OTP variant:**

```
┌─────────────────────────────┐
│  ←                          │
│                             │
│  Enter the code we sent to  │
│  +91 98765 43210            │
│                             │
│  ┌───┐ ┌───┐ ┌───┐         │
│  │   │ │   │ │   │         │
│  └───┘ └───┘ └───┘         │
│  ┌───┐ ┌───┐ ┌───┐         │
│  │   │ │   │ │   │         │
│  └───┘ └───┘ └───┘         │
│                             │
│        Resend in 0:28       │
│                             │
│  Wrong number? Change it →  │
└─────────────────────────────┘
```

**Email magic link variant:**

```
┌─────────────────────────────┐
│  ←                          │
│                             │
│  Check your email           │
│                             │
│  We sent a sign-in link to  │
│  mukund@example.com         │
│                             │
│  [  Open Mail App  ]        │
│                             │
│  Tap the link in the email  │
│  to sign in. It expires in  │
│  10 minutes.                │
│                             │
│  Didn't get it?             │
│  Resend link  ·  Change email│
└─────────────────────────────┘
```

**Phone number entry sub-state** (shown when "Use phone or email" tapped from SCR-001):

```
┌─────────────────────────────┐
│  ←                          │
│                             │
│  What's your phone          │
│  number?                    │
│                             │
│  ┌────┐ ┌──────────────┐   │
│  │ +91│ │ 98765 43210  │   │
│  └────┘ └──────────────┘   │
│                             │
│  ─────────── or ───────────  │
│                             │
│  Use email instead →        │
│                             │
│  [ Send code ]              │
└─────────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| Back button | IconButton | Chevron-left, 44×44px tap target, navigates back to SCR-001 |
| Instruction text | Text | 20sp semibold, shows destination (phone number or email, truncated if > 30 chars) |
| Country code picker | Selector | Compact pill button — shows flag + dial code (e.g. "🇮🇳 +91"). Tapping opens searchable country list bottom sheet. Defaults from `Intl.DateTimeFormat().resolvedOptions().locale` |
| Phone input | TextInput | `keyboardType="phone-pad"`, `autoFocus`, placeholder "Phone number", no country code prefix (handled by picker) |
| OTP boxes | OTPInput | 6 individual boxes, 48×56px each, 8px gap, `autoFocus` on first. Filled state: white background, brand-primary border. Auto-advances focus. On Android: SMS Retriever API auto-fills all 6 digits simultaneously |
| Resend countdown | Text | Shows "Resend in 0:XX" — counts down from 30s. After 0: becomes "Resend code" tappable link (brand accent) |
| Wrong number / Change email | TextLink | 14sp muted, navigates back to phone/email entry sub-state |
| Open Mail App | Button | iOS: `Linking.openURL('message://')` — secondary styled button. Android: hidden (no equivalent) |
| Send code | Button | Full-width primary, disabled until phone field has ≥ 7 digits (after country code validation). Tap → `supabase.auth.signInWithOtp({ phone })` |

#### States

- **Default (phone OTP):** 6 empty OTP boxes, native keyboard open, resend countdown running from 30s
- **Default (magic link):** "Check your email" confirmation, no inputs, just instructional copy and Open Mail App button
- **Loading (sending code):** "Send code" button → spinner + "Sending…" label; phone input disabled
- **Loading (verifying OTP):** After 6th digit entered, boxes shimmer briefly, then auto-submit. Spinner replaces boxes while verifying
- **Error (wrong OTP):** All 6 boxes highlight red border, shake animation (300ms spring), text below: "That code isn't right. Check your SMS or tap Resend." Boxes auto-clear for retry
- **Error (expired OTP):** "This code has expired. Tap Resend to get a new one." — resend timer skipped to 0 and link shown immediately
- **Error (rate limit):** "Too many attempts. Try again in 10 minutes." — all inputs disabled, countdown shown
- **Auto-fill (Android SMS Retriever):** All 6 OTP boxes fill simultaneously with subtle pulse animation; auto-submits after 300ms debounce

#### Navigation

- **Entry points:** SCR-001 → "Use phone or email" tap
- **Exit points:**
  - OTP verified successfully → `/(auth)/profile-setup` (new user) or `/(app)/(tabs)/` (returning user, skip to dashboard)
  - Magic link tapped in email → app deep-link → same fork
  - Back → SCR-001

#### Interaction notes

- Android SMS Retriever API: listener registered immediately on screen mount; OTP auto-extracted from SMS matching format `<#> [code] [app-hash]`; no user input required on Android for phone path
- Haptics: light tick on each OTP digit successfully entered; medium success impact on auto-submit; error vibration pattern on wrong OTP
- Keyboard should not push layout — use `KeyboardAvoidingView` with `behavior="padding"` (iOS) and `behavior="height"` (Android)
- Resend countdown must not restart unless user explicitly taps "Resend code" — persist countdown in component state even if user backgrounds app briefly

---

### SCR-003 — Name + Date of Birth

**Epic/Story:** E2 · US-011  
**Route:** `/(auth)/profile-setup`  
**Auth required:** Partial (Supabase session token issued, `user_profiles` row not yet created)  
**Paywall:** Free  
**Region variants:** All (currency note at bottom localised to device locale: ₹ INR / $ USD / £ GBP)

#### Layout

```
┌─────────────────────────────┐
│                             │
│  Hi! What should            │
│  we call you?               │
│                             │
│  ┌─────────────────────┐   │
│  │  First name          │   │
│  └─────────────────────┘   │
│                             │
│  Date of birth              │
│  Required · You must be 18+ │
│  for financial services     │
│                             │
│  ┌────────┐ ┌─────┐ ┌────┐ │
│  │  Day   │ │ Mon │ │ Yr │ │
│  │  ↕  15 │ │ ↕ 3 │ │↕ 90│ │
│  └────────┘ └─────┘ └────┘ │
│                             │
│  ┌─────────────────────┐   │
│  │    Continue →        │   │
│  └─────────────────────┘   │
│                             │
│  Your currency is set to    │
│  ₹ INR · Change in Settings │
└─────────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| Greeting | Text | "Hi! What should we call you?" — 24sp bold. No personalisation possible yet (name not known) |
| First name input | TextInput | `autoFocus`, `autoCapitalize="words"`, `returnKeyType="done"`, placeholder "First name". For Google/Apple OAuth users: pre-filled from `user.user_metadata.full_name` (first token only); field is editable. Max 40 chars |
| DOB label | Text | 16sp semibold + 13sp muted sub-label "Required · You must be 18+ for financial services" |
| Day picker | ScrollWheelPicker | Values 1–31. Snap-to-item scroll. Styled with 3 visible items, centre item highlighted with brand primary. Syncs with month/year to hide invalid dates (e.g. Feb 30) |
| Month picker | ScrollWheelPicker | Values Jan–Dec (full names). Same snap-to behaviour. Initial position: current month |
| Year picker | ScrollWheelPicker | Values from (currentYear − 100) to (currentYear − 18). Starts at currentYear − 25 as default visible. Scrolling past currentYear − 18 is blocked |
| Continue button | Button | Full-width primary. Disabled state (50% opacity, non-tappable) until: first name ≥ 1 char AND all three DOB pickers have been touched/changed from default. Tap → validate → server call |
| Currency note | Text | 13sp muted. Auto-detected symbol + code from `Intl`. "Change in Settings" is a tappable link → opens Settings deep-link (no navigation during onboarding) |

#### States

- **Default:** Name field empty and focused (keyboard open); DOB pickers at reasonable defaults (Day 15, current month, year 25 years ago); Continue button disabled
- **Loading (after Continue tap):** Button shows inline spinner + "Checking…"; name field + pickers disabled; age validation running server-side via Supabase Edge Function
- **Error (under 18):** Red banner below pickers: "You must be 18 or older to use FinTrack. Financial services require age verification." Continue button re-enables to allow DOB correction; no navigation forward
- **Error (network failure):** Toast at bottom: "Couldn't save your profile. Check your connection and try again." Retry available via Continue button
- **OAuth pre-fill:** Name field pre-filled, cursor at end of text. User can edit freely. DOB pickers still empty (Apple/Google do not provide DOB)

#### Navigation

- **Entry points:** SCR-001 → Google/Apple OAuth success (new user); SCR-002 → OTP/magic link verified (new user)
- **Exit points:**
  - Age ≥ 18 confirmed, profile saved → `/(auth)/connect-bank` (SCR-004)
  - Age < 18 → blocked on this screen (no forward navigation)

#### Interaction notes

- DOB scroll wheel: `expo-haptics` `selectionAsync()` on each item snap — gives tactile ratchet feel matching native iOS picker
- Year picker upper bound (currentYear − 18) is a hard scroll stop — user cannot scroll past it; attempting to do so triggers a gentle spring-back animation
- DOB stored encrypted in Supabase Vault (`date_of_birth` column): never returned raw in any API response
- `age_confirmed_at` timestamp written to `user_profiles` on server-side validation success (not client-side)
- Currency auto-detection: `Intl.NumberFormat().resolvedOptions().locale` → mapped to INR/USD/GBP/other. Written to `user_profiles.base_currency` along with profile save. Not a separate screen
- PostHog event: `onboarding_profile_completed` with `{method: 'oauth' | 'otp' | 'magic_link', currency_auto_detected: boolean}`

---

### SCR-004 — Connect Bank (Onboarding)

**Epic/Story:** E2 · US-012  
**Route:** `/(auth)/connect-bank`  
**Auth required:** Partial (profile created; entitlement not yet checked)  
**Paywall:** Free  
**Region variants:** All — provider name and icon adapt by locale: IN → Setu Account Aggregator, US → Plaid, UK → TrueLayer

#### Layout

**India variant (Setu AA):**

```
┌─────────────────────────────┐
│                             │
│  Connect your bank for      │
│  automatic tracking         │
│                             │
│  ┌─────────────────────┐   │
│  │  🏦  Connect Bank   │   │
│  │  Setu Account       │   │
│  │  Aggregator         │   │
│  │                     │   │
│  │  Secure · RBI       │   │
│  │  regulated · ~30s   │   │
│  └─────────────────────┘   │
│                             │
│  ─────────── or ────────── │
│                             │
│       Skip for now →        │
│                             │
│  You can connect any time   │
│  from the dashboard         │
│                             │
└─────────────────────────────┘
```

**US variant (Plaid) / UK variant (TrueLayer):** identical layout — "Setu Account Aggregator / RBI regulated" replaced with "Plaid / Bank-grade encryption" or "TrueLayer / Open Banking PSD2" respectively.

**Post-connection success inline state:**

```
┌─────────────────────────────┐
│                             │
│  Connected ✓                │
│                             │
│  ┌─────────────────────┐   │
│  │  HDFC Bank          │   │
│  │  Savings — ••4521   │   │
│  │  ₹ 24,800           │   │
│  │  Tracking from today│   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │    Go to dashboard →│   │
│  └─────────────────────┘   │
│                             │
└─────────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| Screen title | Text | "Connect your bank for automatic tracking" — 24sp bold |
| Connect Bank card | Card | Large tappable card, brand-primary border, bank icon (🏦), provider name, 1-line trust copy, estimated time. Tap → initiates platform OAuth/AA flow |
| Trust copy | Text | IN: "Secure · RBI regulated · ~30s" / US: "Secure · Bank-grade encryption · ~2 min" / UK: "Secure · Open Banking PSD2 · ~2 min" — 13sp muted |
| Divider | Separator | "or" with hairlines |
| Skip for now | TextLink | "Skip for now →" — same 16sp as Connect Bank label, no deemphasised styling (no guilt pattern). Tap → navigate to `/(app)/(tabs)/` |
| Skip sub-copy | Text | "You can connect any time from the dashboard" — 13sp muted, below the Skip link |
| Success account card | Card | Shown after successful connection: bank logo (from provider metadata), account name + type + masked account number, balance in base currency formatted by dinero.js, "Tracking from today ✓" badge in green |
| Go to dashboard | Button | Full-width primary, shown only after successful connection. Tap → `/(app)/(tabs)/` |

#### States

- **Default:** Connect Bank card + Skip link; no loading; region already detected
- **Loading (connecting):** Connect Bank card replaced with `ActivityIndicator` + "Opening your bank's app…" — on Android for Setu AA this transitions to the AA app via deep link; on Plaid/TrueLayer the in-app browser (Expo WebBrowser) opens as a modal sheet
- **Success:** Card replaced with account details card (account name, masked number, balance, "Tracking from today ✓"). "Go to dashboard" button appears. Subtle green checkmark icon animates in with a spring (scale 0→1, 200ms)
- **Error (AA timeout — 30s, India Android):** Bottom sheet appears: "Your bank app didn't respond in time. You can try again or set up SMS auto-capture instead." Two CTAs: "Try again" + "Set up SMS capture →" (navigates to SMS permission screen — matches US-B05 flow). iOS: "Your bank app didn't respond. You can connect later from the dashboard." — no SMS option on iOS
- **Error (generic OAuth failure):** Toast: "Couldn't connect your bank. Please try again." Connect Bank card re-enabled for retry; Skip remains available
- **Error (no AA app installed, India):** "Your Account Aggregator app isn't installed. Install Finvu or OneMoney, or skip and connect manually." — "Install" CTA opens app store; Skip available

#### Navigation

- **Entry points:** SCR-003 → "Continue" after successful profile + age validation
- **Exit points:**
  - Connect Bank success → `/(app)/(tabs)/` (first landing, SCR-005 — confetti state)
  - Skip → `/(app)/(tabs)/` (first landing, SCR-005 — confetti state, no bank)
  - India AA timeout → SMS permission flow (US-B05, deferred screen) or dashboard

#### Interaction notes

- `tracking_from` is always set to `NOW()` at the moment of successful connection — never backdated (CLAUDE.md constraint)
- Plaid Link SDK launches as `Expo.openBrowserAsync` or native module — never navigate away from the app router; use `onSuccess` callback to update state
- TrueLayer: same pattern via `Expo.openAuthSessionAsync`
- Setu AA: `Linking.openURL(aaDeepLink)` — app goes to background; `AppState` listener detects `active` on return and polls `bank_connections` for status change (30s timeout)
- `bank_connections.balance_amount` populated immediately on connect; shown in the success card formatted by dinero.js (e.g. `₹24,800` not `2480000`)
- PostHog events: `onboarding_bank_connect_attempted` (provider), `onboarding_bank_connect_success` (provider), `onboarding_bank_skipped`

---

### SCR-005 — Dashboard — First Landing (Confetti)

**Epic/Story:** E2 · US-013  
**Route:** `/(app)/(tabs)/`  
**Auth required:** Yes  
**Paywall:** Both (free trial active; paywall not shown during trial)  
**Region variants:** All — currency formatting and bank card copy vary by locale

#### Layout

**First landing — bank connected:**

```
┌─────────────────────────────┐
│  Good morning, Priya 👋     │
│                             │
│  ══════════════════════════ │  ← confetti raining down (full-width)
│                             │
│  ┌─────────────────────┐   │
│  │  Net Worth          │   │
│  │  ₹ 24,800           │   │
│  │  HDFC ••4521        │   │
│  │  Updated just now ↻ │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │  This month         │   │
│  │  [Budget ring       │   │
│  │   placeholder -     │   │
│  │   no txns yet]      │   │
│  │  Add transactions   │   │
│  │  to see your score  │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ 💰 Set your monthly │   │
│  │    income →         │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ ➕ Add your first   │   │
│  │    spend →          │   │
│  └─────────────────────┘   │
│                             │
│           [+]               │  ← FAB
└─────────────────────────────┘
```

**First landing — bank skipped (no balance):**

```
┌─────────────────────────────┐
│  Good morning, Priya 👋     │
│  ═══════════════════════════│  ← confetti
│                             │
│  ┌─────────────────────┐   │
│  │  Net Worth          │   │
│  │  —                  │   │
│  │  Connect a bank to  │   │
│  │  see your balance   │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ 🏦 Connect your    │   │
│  │    bank →           │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ 💰 Set your monthly │   │
│  │    income →         │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ ➕ Add your first   │   │
│  │    spend →          │   │
│  └─────────────────────┘   │
│                             │
│           [+]               │
└─────────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| Greeting | Text | "Good morning/afternoon/evening, [first_name] 👋" — time-of-day aware. 20sp semibold. Single wave haptic on load (light impact) |
| Confetti overlay | Animation | `react-native-confetti-cannon` — fires on component mount if `user_profiles.first_dashboard_at IS NULL`. Full-screen burst from top-centre, 150 particles, 3s duration, brand colours (primary/accent/gold). Dismissed on any tap. Fires exactly once — `first_dashboard_at` written to `user_profiles` immediately on mount |
| Net Worth card | Card | Full-width. If bank connected: shows `balance_amount` formatted with dinero.js (₹/$/£ with locale separators), account name + masked last-4, "Updated X ago" timestamp, manual refresh icon (↻). If bank skipped: "—" with "Connect a bank to see your balance" sub-copy. Tap → Accounts tab (not yet designed in this group) |
| Budget ring | DonutChart | 50/30/20 ring. If no income set: ring segments show actual spend amounts with no % comparison; "Set income for targets" prompt inside the ring. If no transactions yet: ring shows muted grey placeholder segments with "Add transactions to see your score". Tap → Budget detail screen |
| Smart nudge: Connect bank | Card | Shown only if bank not connected. "🏦 Connect your bank →" — tappable, navigates to bank connect flow from within app. Individually dismissible via "×" in top-right corner |
| Smart nudge: Set income | Card | "💰 Set your monthly income →" — tappable, navigates to `/(app)/settings/finance`. Dismissible. Hidden after `user_profiles.monthly_income IS NOT NULL` |
| Smart nudge: Add first spend | Card | "➕ Add your first spend →" — tappable, navigates to `/(app)/add-transaction`. Dismissible. Hidden after first transaction saved |
| FAB | FloatingActionButton | "+" icon, 56×56px, brand primary, fixed bottom-right (24px from edges). Tap → `/(app)/add-transaction`. On scroll down: FAB shrinks to 40×40px + label hides (small mode). On scroll up: restores full size |

#### States

- **Default (first landing, bank connected):** Confetti fires, greeting shown, Net Worth card with real balance, budget ring placeholder (no txns), 2 nudge cards (income + first spend)
- **Default (first landing, bank skipped):** Confetti fires, greeting shown, Net Worth "—", 3 nudge cards (bank + income + first spend)
- **Loading:** On screen mount before data arrives — Net Worth card shows shimmer skeleton (full-width rectangle), budget ring shows grey skeleton circle, nudge cards not shown until profile data loaded. Skeleton duration max 1.5s
- **Error (data load failure):** Net Worth card shows "Couldn't load balance. Tap to retry." Budget ring shows "No data available." Nudge cards still shown (they don't depend on balance data)
- **Confetti dismissed:** Any tap anywhere on screen during confetti stops the animation immediately

#### Navigation

- **Entry points:** SCR-004 → bank connected or skipped; deep link from email/push notification (post-onboarding)
- **Exit points:**
  - FAB → SCR-012 (Add Transaction)
  - "Set income" nudge card → `/(app)/settings/finance`
  - "Connect bank" nudge card → bank connect flow (in-app, not onboarding route)
  - "Add first spend" nudge card → SCR-012
  - Net Worth card tap → Accounts tab
  - Budget ring tap → Budget detail screen
  - Bottom tab bar → other tabs (Tracker, Reports, Accounts, Settings)

#### Interaction notes

- Confetti fires exactly once: guarded by `user_profiles.first_dashboard_at IS NULL` server-side + local flag in `AsyncStorage` as secondary guard against race conditions
- `first_dashboard_at` written via `supabase.from('user_profiles').update({first_dashboard_at: new Date().toISOString()})` immediately on mount, before confetti starts — prevents refiring if user backgrounds and returns during confetti
- Supabase Realtime: NOT subscribed on first landing (no transactions to update); Realtime subscription added from SCR-010 (returning user) after first transaction exists
- Nudge cards are individually dismissible; dismissed state stored in `user_profiles.dismissed_nudges` jsonb array
- FAB uses `react-native-reanimated` `useAnimatedScrollHandler` for shrink/expand behaviour

---

### SCR-010 — Dashboard (Home, Returning User)

**Epic/Story:** E2 · US-013, US-029 · E5 · US-029, US-038  
**Route:** `/(app)/(tabs)/`  
**Auth required:** Yes  
**Paywall:** Both (premium features: full report access, bank sync; free: manual tracking)  
**Region variants:** All — currency formatting adapts; balance refresh cadence same across regions

#### Layout

```
┌─────────────────────────────┐
│  Good afternoon, Priya      │
│                             │ ← "Updated 2h ago" only if data is stale
│  ┌─────────────────────┐   │
│  │  Net Worth          │   │
│  │  ₹ 1,24,800         │   │
│  │  ↓ 2 accounts       │   │
│  │  Updated 6h ago  ↻  │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │  This month         │   │
│  │       [●]           │   │
│  │    Budget ring      │   │
│  │  ₹18,400 of ₹40,000 │   │
│  │  46% used · on track│   │
│  └─────────────────────┘   │
│                             │
│  Recent                     │
│  ┌─────────────────────┐   │
│  │ 🍕 Zomato   Wants   │   │
│  │    ₹ 349         ↗  │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ 🚌 Metro    Needs   │   │
│  │    ₹ 45          ↗  │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ 🛒 BigBazaar Needs  │   │
│  │    ₹ 1,240       ↗  │   │
│  └─────────────────────┘   │
│     See all transactions →  │
│                             │
│           [+]               │
└─────────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| Greeting | Text | "Good [morning/afternoon/evening], [first_name]" — no emoji for returning users (confetti was the celebration moment). 20sp semibold |
| Net Worth card | Card | Full-width. Balance from `bank_connections.balance_amount` (cached). "Updated X ago" from `balance_cached_at`. Expand chevron (↓) shows per-account breakdown inline. Manual refresh (↻): tappable, rate-limited to 1/15min server-side — if within rate limit, shows spinner; if rate-limited, shows toast "Balance updated recently. Try again in X min." |
| Budget ring | DonutChart | Live Supabase Realtime subscription on `transactions` table for current user + current month. Three segments: Needs (blue) / Wants (amber) / Savings (green). Colour logic: ≤ 70% budget used → segment shows green; 70–99% → amber; ≥ 100% → red. Centre: "₹18,400 of ₹40,000" and "46% used". Tap → Budget detail |
| Realtime badge | Indicator | Tiny green dot top-right of budget ring when Realtime subscription is active. Grey dot when offline |
| Recent transactions | List | 3 most recent transactions. Each row: category emoji + merchant + type badge + amount. Tap row → SCR-013. "See all transactions →" text link below → SCR-011 |
| "Queued" offline badge | Badge | On any recent transaction row that has `synced = false` (from offline queue): amber "Queued" pill badge. Tooltip on long-press: "This transaction is saved and will sync when you reconnect." |
| FAB | FloatingActionButton | Same as SCR-005; persists across tab sessions |

#### States

- **Default:** Full data loaded — net worth, budget ring with current month spend, 3 recent transactions
- **Loading (cold start):** Net Worth card shimmer, budget ring grey skeleton circle, recent transactions show 3 rows of shimmer. Data loads from Supabase within 1.5s target (P95)
- **Empty (no transactions this month):** Budget ring shows grey placeholder segments + "No transactions this month. Add one to see your budget." inside ring. Recent transactions section hidden; "Add your first transaction →" text link shown instead
- **Offline:** Yellow banner at top: "You're offline. Transactions are saved and will sync when you reconnect." Net Worth card shows "Possibly outdated" sub-label. Realtime dot turns grey. FAB still functional (routes to SCR-012 which supports offline mode)
- **Error (Realtime disconnect):** Budget ring shows last-known data with "Live updates paused" tooltip. Realtime reconnects automatically; no user action needed

#### Navigation

- **Entry points:** App foreground (returning session); bottom tab bar "Home"; deep links from push notifications (weekly score, budget alert)
- **Exit points:**
  - FAB → SCR-012
  - Net Worth card → Accounts tab
  - Budget ring → Budget detail screen
  - Recent transaction row → SCR-013
  - "See all transactions →" → SCR-011
  - Bottom tab bar → Tracker / Reports / Accounts / Settings tabs

#### Interaction notes

- Supabase Realtime: `supabase.channel('user-transactions').on('postgres_changes', {event: '*', schema: 'public', table: 'transactions', filter: \`user_id=eq.${userId}\`}, handleChange).subscribe()` — mounted on tab focus, unmounted on tab blur (not on unmount — avoids re-subscription on every render)
- Budget ring updates: on Realtime `INSERT` or `UPDATE` event, re-query current month aggregates and update ring state. No full page reload
- Pull-to-refresh on the whole screen: refreshes net worth balance (respects rate limit), re-queries budget ring and recent transactions
- Balance freshness: "Updated X ago" calculated from `balance_cached_at` — shows seconds/minutes/hours. Format: "just now" (<1 min), "2 min ago", "6h ago", "yesterday"
- PostHog event: `dashboard_viewed` with `{has_bank_connected: boolean, monthly_income_set: boolean, transaction_count: number}`

---

### SCR-011 — Transaction List

**Epic/Story:** E3 · US-016, US-017, US-018, US-019  
**Route:** `/(app)/(tabs)/tracker`  
**Auth required:** Yes  
**Paywall:** Both (free: manual transactions; premium: auto-parsed bank transactions visible)  
**Region variants:** All — currency formatted by dinero.js; payment mode options include UPI (IN), ACH (US), Faster Payments (UK)

#### Layout

```
┌─────────────────────────────┐
│  Transactions      [🔍] [⚡] │
│                    search filter│
│                             │
│  ┌─────────────────────┐   │  ← Review queue (if unconfirmed exist)
│  │  ⚡ 2 to review     │   │
│  │  SMS auto-captures  │   │
│  │  need confirmation  │   │
│  └─────────────────────┘   │
│                             │
│  Today                      │
│  ┌─────────────────────┐   │
│  │ 🍕  Zomato          │   │
│  │     Wants · UPI     │   │
│  │              ₹ 349  │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ 🚌  Metro           │   │
│  │     Needs · UPI     │   │
│  │               ₹ 45  │   │
│  └─────────────────────┘   │
│                             │
│  Yesterday                  │
│  ┌─────────────────────┐   │
│  │ 🛒  BigBazaar  [SMS]│   │
│  │     Needs · Debit   │   │
│  │            ₹ 1,240  │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ ☕  Starbucks        │   │
│  │     Wants · Card  ⚡│   │ ← Queued badge (offline)
│  │              ₹ 480  │   │
│  └─────────────────────┘   │
│                             │
│  13 May 2026                │
│  ...                        │
│                             │
│           [+]               │
└─────────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| Header | NavigationBar | "Transactions" title left-aligned, search icon (🔍) and filter icon right-aligned. Filter icon shows amber badge with active filter count (e.g. "2") when filters applied |
| Search bar | TextInput | Expands below header on 🔍 tap. `autoFocus`, placeholder "Search transactions…", debounced 300ms. Results filter inline without page navigation. "✕ Cancel" closes search and resets results |
| Filter bottom sheet | BottomSheet | Opens on filter icon tap. Sections: Date Range (from/to pickers), Category (multi-select chips), Type (Need / Want / Saving chips), Payment Mode (multi-select chips), Source (Manual / SMS / Email / Plaid / TrueLayer / AA chips). "Apply filters" primary button, "Clear all" text link. Active filter count shown in header badge |
| Review queue banner | Card | Brand amber background, "⚡ X to review — SMS auto-captures need confirmation". Tappable → scrolls to inline review cards. Shown only when `is_confirmed = false` transactions exist |
| Date header | SectionHeader | "Today" / "Yesterday" / "13 May 2026" etc. 13sp semibold muted. Sticky while scrolling within section |
| Transaction row | ListItem | Category emoji + merchant name (16sp semibold) + type badge (colour-coded pill: blue Need / amber Want / green Saving) + payment mode text (13sp muted) + source badge (tiny: "SMS" "Plaid" "AA" "Email" — only shown if not Manual) + amount right-aligned (16sp semibold, negative spend in muted, positive savings/income in green). Tap → SCR-013 |
| Queued badge | Badge | Amber "⚡ Queued" pill on right side of row when transaction `synced = false` in SQLite offline queue. Long-press tooltip: "Saved offline. Will sync when you reconnect." |
| Swipe-left (delete) | SwipeAction | Red background, "Delete" label. On full swipe: row removed from list with spring animation; "Transaction deleted" undo toast appears for 5 seconds. Tap Undo → transaction restored (soft-undelete in Supabase or SQLite) |
| Swipe-right (edit) | SwipeAction | Blue background, "Edit" label. On swipe: navigates to SCR-013 in edit mode |
| Unconfirmed review card | ReviewCard | Expanded card within the list for auto-parsed transactions awaiting review. Shows: source icon + confidence bar + all parsed fields. "Confirm ✓" button (one-tap, marks `is_confirmed = true`) + "Edit" button (opens SCR-013 pre-filled). After confirm: card slides up and disappears |
| Infinite scroll | FlatList | Loads 30 rows initially. On scroll to within 10 rows of bottom: fetches next 30 from Supabase. Loading indicator at bottom during fetch |
| FAB | FloatingActionButton | Same as SCR-005/010; shrinks on scroll down |

#### States

- **Default:** Grouped transaction list, descending date order, no search active, no filters active
- **Loading (initial):** 3 date group skeletons, each with 2 shimmer rows. Replaced by real data within 1.5s
- **Loading (pagination):** Spinner at bottom of list while next page fetches
- **Empty (no transactions at all):** Centred illustration + "No transactions yet" in 20sp + "Start tracking by adding your first spend" in 16sp muted + "Add transaction" primary button (→ SCR-012). FAB still visible
- **Empty (search/filter no results):** "No transactions match your search. Try adjusting your filters." + "Clear filters" text link
- **Search active:** List filters in real-time. Row count shown below search bar: "12 transactions". Date headers hidden when searching (results shown ungrouped)
- **Offline:** Amber top banner: "You're offline. Showing cached transactions." Queued badge visible on offline-saved rows. New additions still possible via FAB
- **Review queue visible:** Banner + review cards shown above Today's transactions. "Review" tab badge on tracker tab icon in bottom nav

#### Navigation

- **Entry points:** Bottom tab bar "Tracker"; SCR-010 "See all transactions →"; push notification deep links (new transaction, review needed)
- **Exit points:**
  - Transaction row tap → SCR-013
  - Swipe-right "Edit" → SCR-013 (edit mode)
  - FAB → SCR-012
  - Review card "Edit" → SCR-013 (pre-filled)

#### Interaction notes

- Pull-to-refresh: triggers `supabase.from('transactions').select()` with current user filter + current sort + current filters; clears pagination and reloads from page 1
- Swipe gestures: use `react-native-gesture-handler` `Swipeable` — rubber-band spring feel on release; full-swipe threshold at 70% of row width
- Delete undo: transaction row slides out immediately (optimistic UI); undo restores it with a slide-in animation. If undo not tapped in 5s: actual `DELETE` called on Supabase. If offline: delete queued in SQLite
- Source badge visibility: "Manual" transactions have no source badge (assumed default). Only bank-synced/parsed transactions show source
- PostHog event: `transaction_list_viewed`, `transaction_search_used`, `transaction_filter_applied` (filter types used)

---

### SCR-012 — Add Transaction (Manual)

**Epic/Story:** E3 · US-015  
**Route:** `/(app)/add-transaction`  
**Auth required:** Yes  
**Paywall:** Free (manual entry always free; premium = auto-capture)  
**Region variants:** All — payment mode options include UPI (IN), ACH (US), Faster Payments (UK); currency symbol from `user_profiles.base_currency`

#### Layout

```
┌─────────────────────────────┐
│  ←  Add Transaction         │
│                             │
│  ┌─────────────────────┐   │
│  │  ₹ 0               │   │ ← Amount, numpad auto-opens
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │  Where did you spend?│  │ ← Description / merchant
│  │  [Zomato            │   │
│  │   Swiggy            │   │ ← Autocomplete suggestions
│  │   Zepto]            │   │
│  └─────────────────────┘   │
│                             │
│  Category                   │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐  │
│  │ 🍕 │ │ 🚌 │ │ 🛒 │ │ + │  │ ← Category chips, scrollable
│  └───┘ └───┘ └───┘ └───┘  │
│  Food  Trans  Shop  More   │
│                             │
│  Need   Want   Saving       │ ← Type pill selector
│  [___] [●___] [___]        │
│                             │
│  Payment mode               │
│  [UPI ●] [Card] [Cash]      │ ← Mode chips, scrollable
│                             │
│  Date                       │
│  Today, 13 May 2026    [📅] │ ← Tap to open date picker
│                             │
│  Notes  (optional)      [↓] │ ← Collapsed, tap to expand
│                             │
│  ┌─────────────────────┐   │
│  │    Save transaction  │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| Header | NavigationBar | "← Add Transaction" — back arrow dismisses sheet; changes prompt if "Save transaction" modified to "← Discard changes?" (native Alert) |
| Amount field | NumberInput | Large display: currency symbol (₹/$/ £) + amount. `autoFocus`. Native numpad opens immediately. Locale-formatted: `₹ 1,450` not `1450`. Dinero.js converts display value; underlying storage is bigint in smallest unit (paise/cents/pence). Backspace supported. Prevents non-numeric input. 0 is shown until first digit entered |
| Description input | TextInput | `placeholder="Where did you spend?"`. After 2+ chars typed: fuzzy match against past 90 days of `transactions.description` — top 5 unique matches shown as tappable autocomplete chips below the field. Selecting a chip fills description, auto-selects category and payment mode of last matching transaction |
| Category picker | HorizontalChipScroll | Emoji icon + short label per category. Scrollable horizontally. Last-used pre-selected on screen open. "+" chip at end opens full category list bottom sheet (including custom categories). Selected chip: filled brand-primary background. Tap → selects, deselects any other |
| Type selector | SegmentedControl | Three pills: "Need" / "Want" / "Saving". Last-used pre-selected. Tap to toggle — only one active at a time. Colour-coded: blue/amber/green |
| Payment mode | HorizontalChipScroll | IN: UPI / Credit Card / Debit Card / Cash / Bank Transfer / Other; US: ACH / Credit Card / Debit Card / Cash / Wire / Other; UK: Faster Payments / Credit Card / Debit Card / Cash / BACS / Other. Last-used pre-selected |
| Date | DateRow | Shows "Today, 13 May 2026". Tap → modal date picker (calendar). Default: today. Cannot select future dates |
| Notes | CollapsibleInput | "Notes (optional)" label with chevron. Collapsed by default. Tap to expand — text area with `placeholder="Add a note…"`, max 280 chars. Chevron rotates 180° on expand |
| Save button | Button | Full-width primary. Disabled until: amount > 0 AND description not empty. Label: "Save transaction". Tap → validate → save |
| Offline indicator | Banner | Shown when `NetInfo.isConnected === false`: amber banner below header "You're offline. This will save locally and sync when you reconnect." Save button still functional |

#### States

- **Default:** Amount "₹ 0", numpad open, description empty, category = last-used, type = last-used, payment mode = last-used, date = today, notes collapsed. Save button disabled
- **Autocomplete active:** After typing 2+ chars in description: up to 5 suggestion chips appear below the field in a floating container. Selecting one fills the field and dismisses suggestions. Tapping elsewhere dismisses without selecting
- **Saving (online):** Save button shows spinner + "Saving…"; all fields disabled. On success: sheet dismisses with a slide-down animation + "Transaction saved ✓" toast on parent screen. Transaction appears at top of SCR-011 list via Realtime
- **Saving (offline):** Save button shows spinner + "Saving locally…"; on success: sheet dismisses + "Saved offline. Will sync when you reconnect." toast on parent screen. Row appears in SCR-011 with "⚡ Queued" badge
- **Validation error:** If Save tapped with empty description: description field highlights red + shakes; "Please add a description" text appears below field. If amount = 0: amount field highlights red + shakes; "Please enter an amount" appears below. No navigation until resolved
- **Loading (autocomplete):** While querying past transactions: small spinner inside description field right side. Results appear within 300ms (debounced)

#### Navigation

- **Entry points:** FAB from SCR-005, SCR-010, SCR-011; nudge card "Add your first spend →" from SCR-005; Review card "Edit" from SCR-011 (pre-filled mode)
- **Exit points:**
  - Save success → dismisses back to originating screen (SCR-010 dashboard or SCR-011 tracker)
  - Back / swipe-down → "Discard changes?" Alert if any field modified; dismiss or confirm

#### Interaction notes

- Numpad opens immediately on mount — `autoFocus` on the amount input; no extra tap required to start entering
- Amount entry: user types raw digits; formatted display updates in real-time. Example: typing "349" shows "₹ 349". Typing "1450" shows "₹ 1,450". The underlying value stored is `34900` paise (for ₹349)
- Offline queue: SQLite (SQLCipher) stores `{amount_smallest_unit, description, category_id, type, payment_mode, date, notes, user_id, created_at, synced: false}`. On reconnect, `NetInfo` event triggers queue drain to Supabase; on success, row updated with server-assigned `id` and `synced: true`; "⚡ Queued" badge removed from SCR-011 row
- Haptics: `selectionAsync` on category/type/payment mode chip selection; `notificationAsync('success')` on successful save
- Autocomplete fuzzy match: client-side against in-memory cache of last 90 days of unique descriptions (fetched on screen mount, max 200 entries). No extra network call per keystroke
- PostHog event: `transaction_added` with `{type, category, payment_mode, source: 'manual', was_offline: boolean}`; `transaction_add_abandoned` if back pressed with modified fields

---

### SCR-013 — Transaction Detail / Edit

**Epic/Story:** E3 · US-017  
**Route:** `/(app)/transaction/[id]`  
**Auth required:** Yes  
**Paywall:** Free (view/edit manual; premium — auto-parsed transactions visible)  
**Region variants:** All — currency formatting and payment modes vary by region

#### Layout

**View mode (default):**

```
┌─────────────────────────────┐
│  ←  Transaction      [Edit] │
│                             │
│  🍕                         │
│  Zomato                     │
│  ₹ 349                      │
│                             │
│  ┌──────────┬──────────┐   │
│  │ Type     │  Want    │   │
│  ├──────────┼──────────┤   │
│  │ Category │ Food     │   │
│  ├──────────┼──────────┤   │
│  │ Payment  │ UPI      │   │
│  ├──────────┼──────────┤   │
│  │ Date     │ Today    │   │
│  ├──────────┼──────────┤   │
│  │ Source   │ Manual   │   │
│  └──────────┴──────────┘   │
│                             │
│  Notes                      │
│  —                          │
│                             │
│  ┌─────────────────────┐   │
│  │  🗑  Delete         │   │  ← Destructive, muted red text
│  └─────────────────────┘   │
└─────────────────────────────┘
```

**Edit mode (tapping "Edit" or swipe-right from SCR-011):**

```
┌─────────────────────────────┐
│  ←  Edit Transaction [Save] │
│                             │
│  ┌─────────────────────┐   │
│  │  ₹ 349              │   │ ← Editable numpad
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │  Zomato             │   │ ← Editable description
│  └─────────────────────┘   │
│                             │
│  [same fields as SCR-012]   │
│  Category / Type /          │
│  Payment mode / Date /      │
│  Notes                      │
│                             │
│  ┌─────────────────────┐   │
│  │  Save changes        │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │  🗑  Delete         │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

**Auto-parsed transaction variant (view mode):**

```
┌─────────────────────────────┐
│  ←  Transaction      [Edit] │
│                             │
│  [SMS] Parsed from bank SMS │
│                             │
│  HDFC Bank Alert            │
│  ₹ 1,240                    │
│  [● Confirmed]              │  ← or [⚡ Awaiting review]
│                             │
│  ┌──────────┬──────────┐   │
│  │ Merchant │ BigBazaar│   │
│  ├──────────┼──────────┤   │
│  │ Type     │ Need     │   │
│  ├──────────┼──────────┤   │
│  │ Category │ Shopping │   │
│  ├──────────┼──────────┤   │
│  │ Payment  │ Debit    │   │
│  ├──────────┼──────────┤   │
│  │ Date     │ 12 May   │   │
│  ├──────────┼──────────┤   │
│  │ Source   │ SMS ↗    │   │  ← tap opens source detail sheet
│  └──────────┴──────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │  ✓  Confirm         │   │  ← shown only if awaiting review
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │  🗑  Delete         │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

#### Components

| Component | Type | Behaviour / variants |
|-----------|------|----------------------|
| Header (view) | NavigationBar | "← Transaction" + "Edit" text button (brand accent colour, top-right). Back → SCR-011 or SCR-010 (use `router.back()`) |
| Header (edit) | NavigationBar | "← Edit Transaction" + "Save" text button (brand primary, bold, top-right). Disabled until any field changed |
| Category emoji | Icon | Large (48px) centred category emoji. In edit mode: tappable → opens category picker bottom sheet |
| Merchant name | Text | 24sp bold. In edit mode: becomes inline TextInput, `autoFocus` on edit mode entry |
| Amount | Text / NumberInput | 32sp bold in view mode. In edit mode: same numpad as SCR-012 |
| Detail table | TableView | Two-column table: label (muted) / value (semibold). Rows: Type, Category, Payment, Date, Source. In edit mode: each row becomes its respective editor component (matching SCR-012 components) |
| Source badge | Badge | "Manual" — no badge. "SMS" — amber pill, tappable → bottom sheet showing: "Parsed from bank SMS on [date]. Raw message not stored on server." "Plaid" — blue pill → "Synced from Plaid on [date]." "Email" — purple pill → "Parsed from Gmail on [date]." "AA" — teal pill → "Synced from Account Aggregator on [date]." |
| Parsed label | Banner | Auto-parsed transactions only: small "Parsed from bank SMS / Plaid / AA / Email" label in muted text above the merchant name. Edit button still available |
| Confirm button | Button | Auto-parsed, unconfirmed transactions only: full-width secondary (outline) "✓ Confirm". Tap → sets `is_confirmed = true`, removes from review queue, shows "Confirmed ✓" toast. Button hides after confirmation |
| Notes section | TextBlock | "Notes" label + content below. If no notes: "—". In edit mode: becomes TextArea |
| Delete button | Button | Muted red text, trash icon, full-width outlined. Tap → immediate deletion (no confirmation alert per US-017). Row removed from SCR-011 optimistically. "Transaction deleted" undo toast for 5 seconds on parent screen. Undo calls `INSERT` to restore. After 5s: permanent `DELETE` |
| Save changes | Button | Edit mode only. Full-width primary. Disabled until any field changed. Tap → `UPDATE` on Supabase, navigate back, "Changes saved ✓" toast |

#### States

- **Default (view mode):** All fields shown in read-only table layout. Edit button top-right
- **Edit mode:** All fields become editable. Form layout matches SCR-012. Numpad opens if amount tapped
- **Loading (save):** "Save" button → spinner. All fields disabled. On success: navigate back + toast
- **Loading (delete):** Delete button → brief spinner (< 300ms). Row removed optimistically; if server call fails: row restored + error toast "Couldn't delete. Try again."
- **Auto-parsed, unconfirmed:** Source banner shown, confidence badge shown (e.g. "92% confidence"), "Confirm" button shown. All fields editable even before confirming
- **Auto-parsed, confirmed:** "Confirmed ✓" status shown in source area. Confirm button hidden
- **Offline (edit/delete):** Changes saved to SQLite offline queue; "Saved offline. Will sync when you reconnect." toast. `synced: false` flag set on the row in SCR-011
- **Error (load failure):** "Couldn't load transaction details. Tap to retry." centred with retry CTA

#### Navigation

- **Entry points:** SCR-011 transaction row tap; SCR-011 swipe-right "Edit"; SCR-010 recent transaction row tap; SCR-011 review card "Edit" (pre-filled, unconfirmed state)
- **Exit points:**
  - Back (view mode) → `router.back()` to SCR-011 or SCR-010
  - Save changes (edit mode) → `router.back()` + success toast on parent
  - Delete → `router.back()` + "Transaction deleted" undo toast on parent
  - Back (edit mode, modified fields) → Alert: "Discard changes?" with "Discard" (destructive) and "Keep editing" options

#### Interaction notes

- Edit mode entry: tapping "Edit" in header triggers a smooth transition — table cells animate to become input fields (staggered 50ms delays top-to-bottom using `react-native-reanimated` layout animations)
- Currency display: always dinero.js formatted. Never raw bigint. `₹ 1,240` not `124000`. Edit mode numpad works in display units and converts on save
- Auto-parsed transactions: fields pre-filled from parsed values. User can edit any field freely regardless of source. Edits do not affect the original SMS/email source — they update the `transactions` row only
- Offline queue for edits: queues `{operation: 'UPDATE', transaction_id: id, changes: {...}, queued_at: timestamp}` to SQLite. On reconnect, drains in FIFO order
- PostHog events: `transaction_viewed` (source type), `transaction_edited`, `transaction_deleted`, `transaction_confirmed` (for auto-parsed)
- Swipe-down to dismiss: if navigated to via modal presentation (from FAB → SCR-012 edit pre-filled), swipe-down gesture supported with same "Discard changes?" guard

---

*End of Group A — SCR-001 through SCR-013*

*Next groups: Group B (Budget & Reports), Group C (Accounts, Net Worth & Goals), Group D (Settings, Subscription & Compliance)*
