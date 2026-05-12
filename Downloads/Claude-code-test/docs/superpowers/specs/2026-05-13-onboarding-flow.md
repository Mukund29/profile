# FinTrack — Onboarding Flow (Final)

**Date:** 2026-05-13  
**Critic Score:** 4.8 / 5.0 — SHIP ✅  
**Benchmark:** Google Pay (3 screens) · PhonePe (4 screens)  
**Target:** ≤ 5 screens · ≤ 45 seconds to dashboard

---

## Industry Benchmark

| App | Screens to dashboard | Est. drop-off | Key principle |
|-----|---------------------|---------------|---------------|
| Google Pay | 3 | ~8% | 1-tap OAuth, zero passwords |
| PhonePe | 4 | ~12% | OTP only, bank auto-linked from SIM |
| Monzo | 4 | ~15% | Mobile-first, selfie KYC deferred |
| Revolut | 5 | ~18% | Progressive — minimal upfront |
| **FinTrack (redesigned)** | **5 (3 for OAuth)** | **~15% target** | OAuth primary, everything else deferred |
| ~~FinTrack (original)~~ | ~~15~~ | ~~65–75% est.~~ | ~~Too much upfront~~ |

**Industry rule:** Every screen past screen 4 costs ~8–12% additional drop-off. Permissions asked without context are denied 70%+ of the time.

---

## The 5-Screen MVP Onboarding

### Screen 1 — Welcome

**Purpose:** First impression + fastest path to auth  
**Time on screen:** < 10 seconds

```
┌─────────────────────────┐
│                         │
│      [App Logo]         │
│      FinTrack           │
│   Your money, tracked   │
│                         │
│  ┌─────────────────┐   │
│  │ Continue with   │   │
│  │    Google  G    │   │
│  └─────────────────┘   │
│  ┌─────────────────┐   │
│  │ Continue with   │   │
│  │    Apple   🍎   │   │
│  └─────────────────┘   │
│                         │
│  ────── or ──────       │
│                         │
│  Use phone / email →    │
│                         │
│  By continuing you agree│
│  to our Terms & Privacy │
└─────────────────────────┘
```

**Design rules:**
- Google + Apple = full-width primary buttons (most users tap here)
- Phone/email = text link below divider (secondary path)
- No mention of features or marketing — get them in fast
- Terms link present (App Store requirement)

---

### Screen 2 — OTP / Magic Link

**Shown only if:** User chose phone or email on Screen 1  
**Skipped for:** Google OAuth + Apple Sign-In users  
**Time on screen:** < 20 seconds

```
┌─────────────────────────┐
│  ← Back                 │
│                         │
│  Enter the code we      │
│  sent to               │
│  +91 98765 43210        │
│                         │
│  ┌──┐ ┌──┐ ┌──┐        │
│  │  │ │  │ │  │        │  ← 6-digit OTP (phone)
│  └──┘ └──┘ └──┘        │
│  ┌──┐ ┌──┐ ┌──┐        │
│  │  │ │  │ │  │        │
│  └──┘ └──┘ └──┘        │
│                         │
│  Resend in 30s          │
│                         │
│  [Check your email for  │  ← Magic link (email)
│   a sign-in link]       │
└─────────────────────────┘
```

**Design rules:**
- Phone: 6-digit OTP, auto-read on Android (SMS Retriever API), auto-submit on complete
- Email: Magic link (Supabase native) — no typed code, just tap link in email
- No passwords ever — neither path requires one
- Auto-advance to Screen 3 on successful verify

---

### Screen 3 — Name + Date of Birth

**Purpose:** Personalisation + mandatory age compliance  
**Time on screen:** < 15 seconds

```
┌─────────────────────────┐
│                         │
│  Hi! What should        │
│  we call you?           │
│                         │
│  ┌─────────────────┐   │
│  │ First name      │   │
│  └─────────────────┘   │
│                         │
│  Date of birth          │
│  (Required — 18+ for    │
│   financial services)   │
│                         │
│  ┌──────┐ ┌────┐ ┌───┐ │
│  │ Day  │ │ Mo │ │ Yr│ │
│  └──────┘ └────┘ └───┘ │
│                         │
│  ┌─────────────────┐   │
│  │    Continue →   │   │
│  └─────────────────┘   │
│                         │
│  Currency auto-set:     │
│  ₹ INR · Change later  │  ← Silent auto-detect, no screen
└─────────────────────────┘
```

**Design rules:**
- First name only — full name not needed at this stage
- DOB picker (scroll wheel, not keyboard) — fast to complete
- Currency shown as a note at the bottom, not a separate screen — 95% accuracy from device locale, user can change in Settings
- "Continue" disabled until both fields filled
- Server validates: age ≥ 18 before proceeding
- Google/Apple OAuth users: name pre-filled from profile, user can edit

---

### Screen 4 — Connect a Bank (Optional)

**Purpose:** Enable auto-tracking from day 1 — but not mandatory  
**Time on screen:** < 30 seconds (or skip in 1 tap)

```
┌─────────────────────────┐
│                         │
│  Connect your bank      │
│  for auto-tracking      │
│                         │
│  ┌─────────────────┐   │
│  │ 🏦 Connect Bank │   │  ← Region auto-detected
│  │                 │   │     IN → Setu AA / SMS
│  │ Secure · 2 min  │   │     US → Plaid
│  └─────────────────┘   │     UK → TrueLayer
│                         │
│  ──── or ────           │
│                         │
│  Skip for now →         │  ← Prominent, no guilt
│                         │
│  You can connect anytime│
│  from the dashboard     │
└─────────────────────────┘
```

**Design rules:**
- Region auto-detected from device locale — show the right provider directly (no region picker screen)
- "Connect Bank" = primary CTA but "Skip for now" equally visible (no dark pattern)
- On connect: Plaid Link / TrueLayer / AA deep link launches
- On success: show account name + balance + "Tracking from today" confirmation inline
- On skip: proceed directly to Screen 5

**India (Setu AA) tiered flow:**
1. AA deep link → user opens consent app → approves → returns (< 30s)
2. If AA times out or app not installed → Android: SMS fallback prompt / iOS: skip to manual

---

### Screen 5 — Dashboard (You're In)

**Purpose:** Immediate value — user sees the app before any more setup  
**Time on screen:** User's choice — they're in the app

```
┌─────────────────────────┐
│  Good morning, Mukund 👋│
│                         │
│  ┌─────────────────┐   │
│  │  Net Worth      │   │
│  │  ₹ —           │   │  ← Shows "—" until bank connected
│  │  [Connect bank] │   │
│  └─────────────────┘   │
│                         │
│  ┌─────────────────┐   │  ← Smart nudge cards
│  │ 💰 Set monthly  │   │     shown until completed,
│  │    income →     │   │     dismissed when done
│  └─────────────────┘   │
│  ┌─────────────────┐   │
│  │ ➕ Add your     │   │
│  │ first spend →   │   │
│  └─────────────────┘   │
│                         │
│  [+] Add Transaction    │  ← Floating action button
└─────────────────────────┘
```

**Design rules:**
- User lands on Dashboard immediately — no loading, no "Getting ready" screen
- If bank was connected: show balance + "Tracking from today" banner
- If bank was skipped: Net Worth shows "—" with a connect prompt card
- Smart nudge cards replace empty states — actionable, not discouraging
- Cards dismissed one by one as user completes them
- Confetti animation fires once on first landing (celebration moment)

---

## Deferred — Not in Onboarding

Everything below is shown at the right contextual moment, never during onboarding:

| Feature | When shown | Trigger |
|---------|-----------|---------|
| SMS permission (Android) | After first manual transaction | "Auto-detect your next bank SMS?" |
| Gmail / Outlook connect | After 1 day of use | Dashboard nudge card |
| Monthly income | Day 3 or when user visits Budget screen | Empty state prompt |
| Budget % targets (50/30/20) | When income is set | "Personalise your budget split →" |
| Weekly spend limit | When first weekly report is generated | Report screen prompt |
| Savings goal | After first weekly report | "Ready to set a savings goal?" |
| Push notifications | When first weekly summary is ready | Contextual permission request |
| Google Drive | First time user taps Export | OAuth flow at export time |

---

## Auth Methods — Technical Detail

| Method | Flow | Screen 2 needed? |
|--------|------|-----------------|
| Google OAuth | Tap → Google consent → auto-login | No |
| Apple Sign-In | Tap → Face ID → auto-login | No |
| Phone number | Enter number → OTP (SMS, auto-read Android) → login | Yes |
| Email | Enter email → Magic link sent → tap link → login | Yes |

**No typed passwords in any flow.** Supabase Auth supports all four natively.

---

## Onboarding State Machine

```
Welcome
   │
   ├─ Google/Apple → ─────────────────────────┐
   │                                          │
   └─ Phone/Email → OTP/Magic Link ───────────┤
                                              │
                                    Name + DOB (Screen 3)
                                              │
                                    ┌─────────▼──────────┐
                                    │  Age ≥ 18?         │
                                    │  Yes → continue    │
                                    │  No  → error + exit│
                                    └─────────┬──────────┘
                                              │
                                    Connect Bank (Screen 4)
                                              │
                                    ┌─────────┴──────────┐
                                    │   Connected?       │
                                    ├─ Yes → balance fetch│
                                    └─ Skip → continue   │
                                              │
                                    Dashboard (Screen 5) ✓
```

---

## Success Metrics (Industry Benchmarks)

| Metric | Industry avg | FinTrack target |
|--------|-------------|----------------|
| Onboarding completion rate | 40–60% | ≥ 75% |
| Time to dashboard | 2–5 min | < 45 seconds |
| Bank connection rate (during onboarding) | 35–50% | 40% |
| SMS permission acceptance | 25–35% (cold ask) | 70%+ (contextual) |
| Day-1 retention | 25–35% | ≥ 40% |
| Day-7 retention | 10–20% | ≥ 25% |
