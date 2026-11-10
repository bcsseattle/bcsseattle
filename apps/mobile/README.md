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

## Release builds (TestFlight and Play internal testing)

These need the BCS Seattle organization developer accounts (`docs/mobile-app-gaps.md`, P7). Everything below runs on your machine; no signing key ever goes in the repo.

1. **Production values.** Create `apps/mobile/.env.production.local` (git-ignored) with the production `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SITE_URL=https://www.bcsseattle.org`. Add `NEXT_PUBLIC_ANDROID_PUSH=1` once `android/app/google-services.json` is in place. The build refuses secret keys.
2. **Version.** Run `scripts/set-version.sh 1.0.0 <build>`. Raise the build number for every upload.
3. **Build the web bundle into both apps.** Run `pnpm sync` *without* `MOBILE_ENV=local`, so production stays https-only.

**iOS (TestFlight)**
1. `pnpm exec cap open ios`. In Xcode, go to App target › Signing & Capabilities, pick the BCS Seattle team and keep *Automatically manage signing*. Push Notifications and Associated Domains are already in `App.entitlements`.
2. Product › Archive, then Distribute App › App Store Connect › Upload.
3. In App Store Connect, add the build to TestFlight. `ITSAppUsesNonExemptEncryption` is already `NO` (HTTPS only), so there's no export-compliance question.

**Android (Play internal testing)**
1. **Make the upload key once, and keep it safe.** Play App Signing holds the real signing key; this upload key only proves uploads come from you.
   ```sh
   keytool -genkeypair -keystore ~/bcs-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```
2. **Write `android/keystore.properties`** (git-ignored):
   ```properties
   storeFile=/Users/<you>/bcs-upload.jks
   storePassword=…
   keyAlias=upload
   keyPassword=…
   ```
3. **Build the bundle.** In `android/`, run `JAVA_HOME=<JDK 21> ./gradlew bundleRelease`. Upload `app/build/outputs/bundle/release/app-release.aab` to Play Console › Testing › Internal testing.
4. **App Links.** From Play Console › App integrity, copy the **App signing** SHA-256 into Vercel as `ANDROID_CERT_SHA256`.

**Icons and launch screens.** `scripts/make-app-assets.sh [master.png]` regenerates every size from one square image (needs ImageMagick). The current set is a draft made from the website's seal.
