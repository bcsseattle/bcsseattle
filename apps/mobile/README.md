# BCS Seattle app (iOS and Android)

A static Next.js export wrapped by Capacitor 8. The design and the reasons behind it are in [docs/mobile-app-plan.md](../../docs/mobile-app-plan.md).

- **Screens:** `app/`. They are client components only, because there is no server in the app.
- **Shared UI:** comes from the website's `components/ui` and Tailwind tokens. Inside the app, `@/` means the repo root and `~/` means this folder.
- **Dependencies:** Next, React, Supabase and Tailwind resolve from the root package, so the app and the shared components always use the same copy. This package declares only the Capacitor packages.
- **Session:** stored in the Keychain on iOS and in Keystore-encrypted storage on Android (`lib/supabase.ts`).
- **Links that open the app:** `org.bcsseattle.app://…`, and `https://www.bcsseattle.org/m/*` once the website serves the association files. `lib/app-links.ts` maps each link to a screen.

## Setup

1. Run `pnpm install` at the repo root. This also installs this workspace package.
2. Copy `.env.example` to `.env.local` and fill it in. Public values only: the build refuses a secret key.

To point the app at the local e2e stack:

```sh
grep -E 'NEXT_PUBLIC_SUPABASE_(URL|ANON_KEY)' ../../e2e/.env.e2e > .env.local
echo 'NEXT_PUBLIC_SITE_URL=http://localhost:3100' >> .env.local
```

## Run

| | |
|---|---|
| In a browser | `pnpm dev` (port 3200). Plugins use their web versions: the session lives in `localStorage` and links don't open. |
| Build the web bundle | `pnpm build` (writes `out/`) |
| Copy it into the native projects | `pnpm exec cap sync`. Prefix it with `MOBILE_ENV=local` for a local stack, which allows plain http. |
| iOS Simulator | `pnpm ios`, or open `ios/App/App.xcodeproj` in Xcode |
| Android emulator | `pnpm android`. This needs JDK 21 (`JAVA_HOME`), because Gradle 8.14 doesn't run on JDK 25. For a local stack, also run `adb reverse tcp:57321 tcp:57321` and `adb reverse tcp:3100 tcp:3100`. |
| Tests | `pnpm test` (Node's test runner, no extra dependencies) and `pnpm typecheck` |

To open a link in the app from the command line:
- iOS: `xcrun simctl openurl booted 'org.bcsseattle.app://return/portal'`. iOS asks "Open in BCS Seattle?" first.
- Android: `adb shell am start -a android.intent.action.VIEW -d "'org.bcsseattle.app://return/portal'"`. Quote the URL, or the device's shell cuts it at `&`.

## Push notifications

- **Server:** `utils/push.ts` sends to iOS through APNs and to Android through FCM. Each platform is skipped until its env values are set (see the root `.env.example`).
- **Senders:** the Stripe webhook (failed payment) and the daily `/api/cron/election-reminders`.
- **App:** Account › Notifications asks for permission; the app never asks on launch. A tapped notification opens its `url`.
- **Android:** add `android/app/google-services.json` from your Firebase project, then build with `NEXT_PUBLIC_ANDROID_PUSH=1`.
- **Simulator test (iOS):** this shows a notification without APNs; tapping it opens `url`:
  ```sh
  xcrun simctl push booted org.bcsseattle.app payload.json
  ```
  with `payload.json`:
  ```json
  {"aps":{"alert":{"title":"Voting is open","body":"Cast your ballot."}},"url":"/elections/"}
  ```
