# FinTrack — Screen Designs (Final)

**Date:** 2026-05-13
**Designer:** Sally (UX)
**Screens:** SCR-001 → SCR-032 (32 screens total)
**Stack:** Expo SDK 52 · React Native · NativeWind v4 · Supabase Realtime
**Markets:** 🇮🇳 India · 🇺🇸 United States · 🇬🇧 United Kingdom

---

## Screen Index

| ID | Screen | Epic | Paywall | Region |
|----|--------|------|---------|--------|
| SCR-001 | Welcome / Auth choice | E2 | Free | All |
| SCR-002 | OTP / Magic Link | E2 | Free | All |
| SCR-003 | Name + Date of Birth | E2 | Free | All |
| SCR-004 | Connect Bank (onboarding) | E2/E4 | Free | All |
| SCR-005 | Dashboard — first landing | E2 | Free | All |
| SCR-010 | Dashboard (returning user) | E3/E5 | Both | All |
| SCR-011 | Transaction List | E3 | Both | All |
| SCR-012 | Add Transaction (manual) | E3 | Free | All |
| SCR-013 | Transaction Detail / Edit | E3 | Free | All |
| SCR-014 | Budget Ring / Overview | E5 | Both | All |
| SCR-015 | Weekly Report | E5 | Both | All |
| SCR-016 | Monthly Report | E5 | Both | All |
| SCR-017 | Category Management | E3 | Both | All |
| SCR-018 | Bank Connections List | E4 | Both | All |
| SCR-019 | Bank Connect Flow | E4 | Free | IN/US/UK |
| SCR-020 | Account Detail | E4/E7 | Both | All |
| SCR-021 | Net Worth | E7 | Both | All |
| SCR-022 | Goals List | E7 | Both | All |
| SCR-023 | Goal Detail / Progress | E7 | Both | All |
| SCR-024 | Add / Edit Goal | E7 | Both | All |
| SCR-025 | Paywall / Subscription | E9 | Free | All |
| SCR-026 | Export | E6 | Premium | All |
| SCR-027 | Settings — Main | E8 | Free | All |
| SCR-028 | Settings — Profile | E8 | Free | All |
| SCR-029 | Settings — Notifications | E8 | Free | All |
| SCR-030 | Settings — Currency & Region | E8 | Free | All |
| SCR-031 | Settings — Privacy & Data | E8 | Free | All |
| SCR-032 | Settings — Subscription | E9 | Free | All |

---

## Design System Conventions

- **Currency display:** dinero.js formatting always. Raw bigint (paise/cents/pence) never shown.
- **Multi-currency:** original currency line 1, base-currency equivalent line 2 with `≈` prefix.
- **Offline badge:** amber "Queued" chip on rows pending SQLite → Supabase sync.
- **Realtime indicator:** "Updated just now" badge fades to relative time on Dashboard and Budget Ring.
- **Empty states:** actionable nudge cards — never blank screens.
- **Error messages:** always include a recovery CTA ("Retry", "Check connection", "Contact support").
- **Paywall gate:** blur overlay + upgrade card on Premium-gated content; never hard block.
- **Destructive actions:** red text, require biometric/PIN re-auth, "Are you sure?" confirmation.
- **India only:** SMS capture (Android), Setu AA flow, re-consent notifications, RBI country-change block.
- **Skeleton loading:** every screen has a shimmer skeleton matching the final layout.

---

## Group A — Onboarding & Transactions (SCR-001–SCR-013)


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

---

## Group B — Budget, Reports, Bank & Account (SCR-014–SCR-021)

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

---

## Group C — Goals, Paywall, Export & Settings (SCR-022–SCR-032)

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
