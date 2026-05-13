# FinTrack — Sprint 1: Onboarding

Cross-platform personal finance app (iOS + Android) for India, US, and UK.
Stack: Expo SDK 52 · Supabase · RevenueCat · FastAPI.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |
| Expo CLI | latest (`npm install -g expo-cli`) |
| EAS CLI | latest (`npm install -g eas-cli`) |
| Xcode | 15+ (macOS, iOS only) |
| Android Studio | latest (with API 34 emulator) |

---

## Setup

**1. Clone and install**

```bash
cd fintrack
npm install --legacy-peer-deps
```

**2. Copy environment file**

```bash
cp .env.example .env
```

Fill in the values:

```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_...
EXPO_PUBLIC_POSTHOG_KEY=phc_...
EXPO_PUBLIC_SENTRY_DSN=https://...
```

**3. Configure Supabase**

- Create a project at [supabase.com](https://supabase.com)
- Enable **Google OAuth** provider (add your Google Client ID + Secret)
- Enable **Apple Sign-In** provider
- Enable **Phone OTP** (Twilio SMS — add your Twilio credentials)
- Run the database migration:

```bash
supabase db push
```

The migration at `supabase/migrations/` creates all 12 tables with RLS policies and the `fintrack_parser` role.

---

## Running Locally

```bash
# iOS Simulator (macOS only)
npx expo start --ios

# Android Emulator
npx expo start --android

# Expo Go on physical device — scan QR from terminal
npx expo start
```

> Note: SMS bank-sync features require a physical Android device (Expo Go or dev build). The iOS Simulator and Android Emulator support all other Sprint 1 screens.

---

## Building Installation Files

### Android APK (physical device testing — no Play Store needed)

```bash
eas build --platform android --profile preview
```

Downloads as `.apk`. Install on a device:

```bash
adb install fintrack.apk
```

### iOS Simulator Build (no Apple Developer account needed)

```bash
eas build --platform ios --profile preview-simulator
```

Downloads as `.app`. Drag into the Simulator window, or:

```bash
xcrun simctl install booted fintrack.app
```

### iOS Device Build (requires Apple Developer account — $99/yr)

```bash
eas build --platform ios --profile preview
```

Downloads as `.ipa`. Distribute via TestFlight or:

```bash
xcrun simctl install booted fintrack.ipa
```

---

## Running E2E Tests

**Install Maestro** (one-time):

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

**Run all flows:**

```bash
maestro test e2e/onboarding-flow.yaml
maestro test e2e/name-dob.yaml
maestro test e2e/connect-bank.yaml
maestro test e2e/dashboard-first-landing.yaml
```

**Run all at once:**

```bash
maestro test e2e/
```

> The `name-dob`, `connect-bank`, and `dashboard-first-landing` flows use `MOCK_AUTH=true` and `MOCK_SCREEN` launch arguments to skip OAuth and deeplink directly to the relevant screen. Wire these up in `app/_layout.tsx` for CI.

---

## Sprint 1 Screens

| Screen | Route | Status |
|--------|-------|--------|
| SCR-001 Welcome | `/(auth)/welcome` | Done |
| SCR-002 OTP/Magic Link | `/(auth)/otp` | Done |
| SCR-003 Name + DOB | `/(onboarding)/name-dob` | Done |
| SCR-004 Connect Bank | `/(onboarding)/connect-bank` | Done |
| SCR-005 Dashboard First Landing | `/(onboarding)/dashboard` | Done |

---

## Shared UI Components

Located in `components/ui/`:

| Component | Description |
|-----------|-------------|
| `Button.tsx` | 4 variants: primary, secondary, ghost, destructive. Scale animation on press. |
| `Input.tsx` | Labelled TextInput with focus glow, error state, optional password toggle. |
| `TopBar.tsx` | Fixed 64px header with back button, centered title, and optional step label. |
| `TrustCard.tsx` | Security/trust info card with icon, title, and body. Used on OTP + Connect Bank. |
| `Toast.tsx` | Imperative `showToast()` with slide-in animation and 3 s auto-dismiss. |

**Mount `ToastHost` once** near your root layout to enable toasts:

```tsx
// app/_layout.tsx
import { ToastHost } from '@/components/ui/Toast';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* ... */}
      <ToastHost />
    </SafeAreaProvider>
  );
}
```

---

## Design System

**Stitch Positive Finance** — Indigo (#4648d4) + Forest Green (#004c22).

- Fonts: **Manrope** (display/headlines) · **Work Sans** (body/labels)
- Tokens: `constants/colors.ts` (JS) · `tailwind.config.js` (NativeWind)
- Mockups: `stitch_positive_finance_ui_builder/` (HTML artboards)

---

## Project Structure

```
fintrack/
├── app/                    # Expo Router pages
│   ├── (auth)/             # welcome, otp
│   └── (onboarding)/       # name-dob, connect-bank, dashboard
├── components/
│   └── ui/                 # Button, Input, TopBar, TrustCard, Toast
├── constants/
│   └── colors.ts           # Design tokens
├── e2e/                    # Maestro YAML test flows
├── supabase/
│   └── migrations/         # Versioned SQL (RLS, tables, roles)
└── tailwind.config.js      # NativeWind v4 theme
```

---

## Architecture Highlights

- **Monetary amounts** — always `bigint` (paise/cents/pence), never floats
- **SMS parsing** — on-device only; only structured output leaves the device
- **India data** — stored in Supabase `ap-south-1` (RBI requirement)
- **Offline** — SQLite (SQLCipher) queue drains to Supabase on reconnect
- **JWT entitlement** — `app_metadata.entitlement` field; no DB lookup per request
- **Balance cache** — 24 h pg_cron refresh; manual refresh rate-limited to 1/15 min

See `docs/superpowers/specs/` for the full Architecture v4, Data Model, and PRD.
