# BCS Seattle mobile app: plan (Phase 0)

Status: **draft, waiting for go-ahead.** Nothing here has been built yet.
Branch: `mobile/phase-0-plan` (from `develop`). Date: 9 Nov 2026.

This plan covers the iOS and Android apps for signed-in BCS Seattle members, built with Capacitor. It compares architectures, proposes the repo layout and IDs, and works through auth, payments and store policy, store requirements, native features, and a mapping from each feature to its screen. Each decision you need to make is marked **Decide**, and §9 collects them.

Policy quotes come from the live pages, fetched 9 Nov 2026. The App Review Guidelines page reads "Last Updated: October 16, 2026".

---

## 0. Scope as the code has it today

I checked the scope list in the brief against the code. Corrections are in bold.

| Area | What the code does today | Where |
|---|---|---|
| **Route groups** | **Sign-in, register, donate and fundraisers live in `app/(site)`, not `app/(portal)`.** The app still needs them, so "only `(portal)`" means the portal *features* plus those four `(site)` flows. Content pages such as programs and resources open in an in-app browser. | `app/(site)/signin`, `register`, `donate`, `fundraisers` |
| Sign in | Password, and email **code** (6-digit OTP, `verify_otp` view). The same `signInWithOtp` email also carries a link to `/auth/callback`. | `utils/auth-helpers/server.ts` |
| **OAuth** | **Off.** `allowOauth = false` in `utils/auth-helpers/settings.ts`, and the local `config.toml` has no providers enabled. `OauthSignIn.tsx` exists but isn't shown. So guideline 4.8 doesn't apply (see §3.4). | `utils/auth-helpers/settings.ts` |
| Register / apply | Supabase `signUp`, then the `/register` form (`registerMember`, which writes with the service role). Applicants wait on `/members/[id]/pending` until an admin approves them. | `utils/membership/handlers.ts` |
| Forgot / update password | `resetPasswordForEmail` sends a link to `/auth/reset_password`, which leads to `/signin/update_password`. **There is no "change password" on the account page.** The only way today is the reset flow. | `utils/auth-helpers/server.ts` |
| Sign out | `SignOut` server action. | `components/portal/sign-out-button.tsx` |
| Account: name, email | `updateName` (auth metadata plus `users.full_name`) and `updateEmail` (double confirmation). | `components/ui/AccountForms/*` |
| My plan | `createStripePortal`. **Whether members can pause depends on the Stripe customer portal configuration, not on our code.** Check it in the Stripe dashboard. | `utils/stripe/server.ts` |
| Receipts | Contribution receipts by tax year: PDF at `/account/[memberId]/contributions/pdf`, which reads Stripe on the server. Donation receipts and history: `DonationReceiptForm`, plus the public PDF at `/donate/confirmation/[id]/pdf`. | `app/(portal)/account/**` |
| **Contributions** | **`/contribute` only starts a plan.** It redirects to `/account` if the member already has an active subscription, so *changing* a plan always goes through the Stripe portal. `/membership-fee` serves inactive members. Both use `checkoutWithStripe`, which returns a Checkout session ID. | `components/plans.tsx`, `membership-plan.tsx` |
| Community funds | Approved active members only. The page reads `expenses` and `funds` under RLS, recent contributions from Stripe through the service role (`getStripePayments`), and the bank balance stored by the weekly `refresh-bank-balance` cron. | `app/(portal)/community-funds` |
| Elections | List, detail, nominate (`nominateCandidate`, with a photo upload), and candidate pages. Results are a client page calling `/api/elections/[id]/results` and `candidate-results`. | `app/(portal)/elections/**` |
| **Voting** | **There are three entry points.** The current one is the `Ballot` component on the detail page: one review screen and one confirm sheet, then it posts **two separate sessions**, `/api/elections/[id]/vote/candidates` and `/vote/initiatives`. Each session gets its own confirmation code and confirmation page. The older `/vote/candidates` and `/vote/initiatives` pages do the same. **The legacy `/vote` page posts to the combined `/api/elections/[id]/vote`.** The app uses the `Ballot` pattern. | `components/elections/ballot.tsx` |
| Members | **Yes, members can see them.** The directory (`/members`) and profiles (`/members/[id]`, which shows total contributions read from Stripe with the service role) are visible to approved active members (RLS `current_user_is_active_member()`). Side note: `/members/[id]` has no access check of its own. For a signed-in non-member the RLS read returns null and the page throws on `member!.created_at`. It leaks nothing, but it is a 500. | `app/(portal)/members/**` |
| Giving | Public. The donate wizard runs `submitDonation` then `checkoutWithStripeForDonation`. It accepts **card, US bank account, Zelle, check, cash**. Only card and bank go to Stripe; the others record a pledge. Fundraisers: list, detail, donate (`checkoutWithStripeForFundraiser`) and confirmation. | `components/forms/donate-form.tsx`, `components/fundraisers/*` |
| **Account deletion** | **Doesn't exist anywhere.** Both stores require it (§5.1). | — |
| Admin | Out of scope. Admin rows open in the system browser. | `/admin/*`, `/fundraisers/admin/*` |

---

## 1. Architecture

### What the code allows

- **Reads mostly happen under RLS already.** Almost every portal page is a server component that calls `createClient()` (anon key plus the user's cookie session) and runs plain `select`s. The RLS rules from `20261108010000_close_rls_holes.sql` enforce who sees what. A client holding the user's access token can make the same reads directly.
- **A small set of operations need the server.** Each one needs a secret (Stripe secret key or service role):
  - starting checkout (3 functions)
  - the billing portal
  - `registerMember`
  - `nominateCandidate`
  - casting votes (`supabaseAdmin` writes, after the checks in `utils/elections/handlers.ts`)
  - results
  - Stripe payment lists (`getStripePayments`, `getTotalCustomerSpent`)
  - the contribution receipt PDF
- **The server identifies the user from cookies only.** `utils/supabase/server.ts#createClient` reads cookies. Every server action and API route that needs the user goes through it.
- **A plain `next build` static export can't work.** The project has middleware, server actions and server components with per-request data, and `output: 'export'` is a single setting for the whole project.

### The options

| | **A. Remote shell** (WebView loads the hosted portal) | **B. Bundled client** (all screens in the app bundle; Supabase directly under RLS; server-only work behind token-authenticated API routes) | **C. Hybrid** (B for member screens; the web for payments, admin and long-form content) |
|---|---|---|---|
| Guideline 4.2 (minimum functionality) | **High risk.** "Your app should include features, content, and UI that elevate it beyond a repackaged website." | Low. | Low. The parts that are web pages (payments, admin, content) are hand-offs, not the app itself. |
| Matching the mocks (tab bar, large or inline headers, action bar, confirm sheet) | We'd have to add an "app mode" to the website's portal layout, which touches web code for every screen. | Built for the app. | Built for the app. |
| Auth in a WebView | Password and email code work. Google OAuth would get `disallowed_useragent`, but OAuth is off. | No WebView auth at all. supabase-js runs in the app. | Same as B. |
| Session storage | Cookies in the WKWebView store. **Not Keychain/Keystore.** | Keychain/Keystore through a storage adapter. | Same as B. |
| Stripe redirects | Checkout would load inside the WebView. That's a policy problem on iOS (§4) and an awkward return. | Open in the system browser, then return via a link (§3.3). | Same as B. |
| Offline | Blank page. | We control it: offline/retry screen, optional cache. | Same as B. |
| How fast updates reach users | Instant (it's the website). | UI changes need a store release. Data and server rules update instantly. | Like B, but payment, admin and content pages update instantly. |
| Duplicated code | None. | About 15 screens re-done as client screens. Shared UI comes from `components/ui`, `components/portal` and the Tailwind tokens. Server logic is **not** duplicated: routes wrap the existing functions. | Same as B, minus the screens we leave on the web. |
| Work | Small at first. Large once you count app mode and review rejections. | Largest. | Large but bounded. Payments and admin stay on the web. |

### Recommendation: **C, hybrid**

The member screens are bundled in the app, payments and admin are hand-offs to the web, and the server keeps its secrets and checks.

- **Screens.** All member screens are client screens in the app bundle. Reads go straight to Supabase with the user's token, so existing RLS applies unchanged.
- **One server change makes the existing routes usable.** `createClient()` in `utils/supabase/server.ts` learns to accept `Authorization: Bearer <access token>` when there are no auth cookies. Every route that resolves the user through it, including the vote routes and `getVotingStatus`, then works for the app with no other change. Votes still go through the existing vote routes and checks.
  - Implementation note for Phase 1: `auth.getUser()` with no argument reads the session from storage. So for bearer requests the client must either be handed a session built from the verified token, or the routes must call `getUser(token)`. Phase 1 starts with that spike and its tests. If it gets fiddly, the fallback is a `getRequestUser()` helper used by the roughly eight functions the app calls.
- **Thin new routes** under `app/api/app/*` wrap the server actions the app can't call directly. Server action IDs aren't a stable API. These routes contain no new business logic.
- **Payments, the billing portal and admin open in the system browser.** Programs and resources content opens in an in-app browser.
- **Why a second Next.js app** (`output: 'export'`) and not Vite: 34 shared components (`components/ui`, `portal`, `elections`, `fundraisers`) import `next/link`, `next/navigation` or `next/image`, and a static Next app can use them unchanged with no shims. Dynamic segments become query parameters (`/elections/view?id=…`) because static export can't pre-render unknown IDs. A small function maps website URLs to app routes for deep links.
- **Why not A:** the 4.2 risk, no Keychain storage, and it would need app-mode changes throughout the web portal.

**Decide 1:** architecture C, with a static Next.js app in `apps/mobile`.

---

## 2. Repo layout and IDs (proposed)

```
apps/mobile/                 # new pnpm workspace package "bcs-mobile"
  package.json               # next, react, @supabase/supabase-js, @capacitor/*
  next.config.mjs            # output: 'export', images.unoptimized, externalDir for ../../components
  capacitor.config.ts        # webDir: 'out'
  app/                       # client-only screens: (tabs)/home, give, elections, funds, account; auth/*
  lib/                       # supabase client (secure storage adapter), api client, deep-link router
  ios/  android/             # generated by `cap add`, committed
pnpm-workspace.yaml          # packages: ['apps/*']; the root stays the website
```

- **Keep the website build out of `apps/`.** Root `tsconfig.json`, Jest, ESLint and Tailwind `content` exclude `apps/`, so `pnpm build`, `tsc`, `pnpm test` and Vercel stay as they are. The mobile app imports `components/ui/*`, `components/portal/*`, `tailwind.config.js` and `styles` from the root. The `.next-e2e` build is untouched.
- **App name:** "BCS Seattle" (display name). The store listing name could be "BCS Seattle Members".
- **IDs:**
  - iOS bundle ID and Android applicationId: `org.bcsseattle.app`
  - Custom URL scheme: `org.bcsseattle.app://`. A reverse-DNS scheme can't collide with another app's.
- **Production domain:** the repo doesn't name it. `NEXT_PUBLIC_SITE_URL` is set in Vercel, and the mocks use `billing@bcsseattle.org`. I've assumed **`bcsseattle.org`**.

**Decide 2:** the domain, the app name and the IDs. IDs can't be changed after the first store upload.

---

## 3. Auth on device

### 3.1 Client and session storage
- **Client settings.** supabase-js in the app uses `flowType: 'pkce'`, `persistSession: true`, `autoRefreshToken: true` and `detectSessionInUrl: false`, with a **storage adapter backed by Keychain (iOS) and Keystore-encrypted storage (Android)**. `@capacitor/preferences` is plain UserDefaults/SharedPreferences and isn't used for tokens.
- **Plugin.** There's no official Capacitor secure-storage plugin. Proposed: `@aparajita/capacitor-secure-storage` (community). *Needs approval.*
- **Refresh on resume.** Pause auto-refresh when the app goes to the background and resume it on `appStateChange`, as Supabase recommends for mobile.
- **Sign-out.** Sign-out runs `supabase.auth.signOut()`, wipes the secure storage keys, clears in-memory caches and deletes this device's push token row (§6).

### 3.2 Sign-in methods in the app

| Method | In the app | Needs a deep link? |
|---|---|---|
| Password | `signInWithPassword` directly. The server action is only a wrapper. | No |
| Email code | `signInWithOtp({ shouldCreateUser: false })`, then `verifyOtp({ type: 'email' })`. Same as the web's `verify_otp` view. | No |
| Magic link | Email link opens the app, which verifies the `token_hash`. | Yes (§3.3) |
| Sign up | `signUp` in the app, then the Register screen posts to `/api/app/register`. | Only if email confirmation is on in production |
| Forgot password | `resetPasswordForEmail`. Reset with a **code** (`verifyOtp({ type: 'recovery' })`) or the link (§3.3). Then `updateUser({ password })`. | Code: no. Link: yes |
| Change password (signed in) | New Account › "Password & sign-in" row, matching the mock: `updateUser({ password })`. The web has no such screen today. | No |
| Sign out | As in §3.1. | No |

- **Codes before links.** Codes need no universal-link setup and work even when the email is opened on another device. Links are a convenience on top.
- **Needs a production check:** the production email templates (Magic link, Reset password) must include `{{ .Token }}`. The web's code view implies the magic-link template does.

### 3.3 Deep links (universal links and Android App Links)

- **The app claims only the `/m/*` paths.** If the app also claimed `/auth/callback`, a web user with the app installed would be sent into the app mid-flow. Their PKCE verifier lives in the browser, so sign-in would break, and the website must keep working unchanged.

| Path (website serves a fallback page at each) | Used for | App action |
|---|---|---|
| `/m/auth/confirm?token_hash=…&type=…` | Magic link, signup confirmation, email change, recovery | `verifyOtp({ token_hash, type })`; for recovery, go to the set-password screen |
| `/m/return/checkout?session_id=…&kind=…` | Stripe Checkout success or cancel | Close the browser and re-fetch the plan or donation. Show Gift complete or Gift pending (24:2778 / 24:2843). |
| `/m/return/portal` | Stripe billing portal `return_url` | Re-fetch the plan |

- **Email links.**
  - `token_hash` links don't depend on a PKCE verifier, so they work across devices. But they need **email templates that link to our domain** (`{{ .SiteURL }}/m/auth/confirm?token_hash={{ .TokenHash }}&type=email`). That's a production Supabase change for you to make.
  - The website's `/m/auth/confirm` route verifies server-side and sets cookies, so a web user who opens the same email in a browser is still signed in. That is the web's fallback.
  - Until then, the app relies on codes (§3.2) and the website's links keep working for web users.
- **Stripe returns.**
  - iOS doesn't reliably open universal links on a server redirect, and a tap on a same-domain link inside Safari doesn't open them either. So the `/m/return/*` page shows **"Return to BCS Seattle"**, a link to `org.bcsseattle.app://return/…` that iOS offers to open in the app. Android uses App Links, with the scheme as a fallback.
  - Whatever happens, the app re-fetches on `resume`. The Stripe webhook stays the source of truth, so a missed return never loses a payment.
- **Files the website must serve.** Both go in `public/.well-known/`, served as `application/json` (set in `next.config.js` `headers()`), with no redirects:
  - `apple-app-site-association`:
    ```json
    {"applinks":{"details":[{"appIDs":["<TEAMID>.org.bcsseattle.app"],"components":[{"/":"/m/*"}]}]}}
    ```
  - `assetlinks.json`:
    ```json
    [{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"org.bcsseattle.app","sha256_cert_fingerprints":["<Play App Signing SHA-256>"]}}]
    ```
  - Use the fingerprint from Play Console › App signing, not your local keystore.
  - Apple's CDN can take up to 24 hours to pick up AASA changes.
- **Supabase redirect allowlist** (for you to add): `https://bcsseattle.org/m/**` and `org.bcsseattle.app://**`.

### 3.4 OAuth and Sign in with Apple
OAuth is off, so guideline 4.8 doesn't apply. Its exemption: "Another login service is not required if: Your app exclusively uses your company's own account setup and sign-in systems."

If Google sign-in is turned on later:
- The app must also offer an equivalent login service. Sign in with Apple qualifies.
- The flow must run in the system auth session (ASWebAuthenticationSession on iOS, Custom Tabs on Android), never in the WebView. Google's policy: "must not direct a Google OAuth 2.0 authorization request to an embedded user-agent."

---

## 4. Payments and store policy

| Rule | What it says | What it means for us |
|---|---|---|
| Apple 3.2.2(iv) | "Unless you are an approved nonprofit … may only collect funds outside of the app, such as via Safari or SMS." | Until BCS is approved, donations happen outside the app. |
| Apple 3.2.1(vi) | "Approved nonprofits may fundraise directly within their own apps … provided those fundraising campaigns … offer Apple Pay support." In the US, approval comes with a **Candid Seal of Transparency**. | In-app giving is possible later, if BCS gets a Candid Seal. |
| Apple 3.1.1 | IAP is required to "unlock features or functionality within your app". | Voting and the funds view only work for members, so a reviewer could argue that dues unlock features. |
| Apple 3.1.3(e) | Goods or "services that will be consumed outside of the app" must use methods other than IAP. | Our case for dues: membership is a real-world community membership. |
| Apple 3.1.1(a) / 3.1.3, US storefront | Entitlements "are not required for developers to include buttons, external links, or other calls to action in their United States storefront apps." | Backstop if a reviewer calls dues digital: on the US storefront, linking out to pay is allowed. |
| Google Play Payments | Play Billing "must not be used" for "physical services (such as … gym memberships …)" or "tax exempt donations". | Stripe is fine on Android for both donations and dues. We don't need the US external-payments programs or their fees, which start 1 Oct 2026. |

There's no Apple ruling on nonprofit dues specifically. Forum threads show dues apps getting 3.1.1 rejections, so the US-storefront rule matters.

**Recommendation.** Ship on the **US storefront only**, in both stores. BCS serves Seattle, and this makes 3.1.1(a) available as a fallback.

| Payment | iOS | Android | Server |
|---|---|---|---|
| One-time donation and fundraiser gift | Choose amount, purpose and method in the app (Give, Your information). **Card and bank open Stripe Checkout in Safari** (`@capacitor/app-launcher`). Not SFSafariViewController, which Apple doesn't clearly treat as "outside the app". Zelle, check and cash record a pledge in the app and show instructions; no money moves in the app. | Same flow for simplicity. Stripe in the app would be allowed. | `/api/app/donations` and `/api/app/fundraisers/[id]/donations` wrap `submitDonation` plus `checkoutWith…`, and return the Checkout **URL** with `success_url`/`cancel_url` set to `/m/return/checkout`. |
| Recurring member contribution (start) | "Start contribution" opens Checkout in Safari. No IAP. | Same. | `/api/app/checkout` wraps `checkoutWithStripe`. |
| Change, pause or cancel a plan | "Plan & payment method" opens the Stripe portal in Safari. | Same. | `/api/app/billing-portal` wraps `createStripePortal`, with a new optional `returnUrl`. The web default is unchanged. |

- **Different from the mocks:** the Payment mock (24:2699) says "Card details are entered in Stripe's secure payment sheet", meaning a native PaymentSheet. Under 3.2.2(iv) that isn't allowed on iOS until BCS is an approved nonprofit. So the Payment step becomes **"Continue to secure payment"**, which opens Stripe in Safari.
- **If BCS gets a Candid Seal** (Decide 6), card donations can move into the app with Apple Pay in a later release.
- **Small server change:** the checkout functions return a `sessionId` for `redirectToCheckout`. They will also return `session.url`, and the web's use stays the same.

---

## 5. Store requirements

### 5.1 Account deletion

**What the stores require**
- **Apple 5.1.1(v):** "If your app supports account creation, you must also offer account deletion within the app."
  - Deactivation alone isn't enough.
  - Deleting can't require an email or a phone call.
  - Manual processing is acceptable if we say how long it takes.
- **Google:** an in-app path **and** a web page where people can request deletion without the app.

**Why it can't be built without a schema decision (current foreign keys):**
- `votes`, `vote_sessions` and `vote_confirmations` are `ON DELETE CASCADE` to `auth.users`. **Deleting a user would delete their votes and change past election results.**
- `donors.user_id` is `ON DELETE RESTRICT`. Donation records have to stay for tax receipts and bookkeeping.
- `users.id`, `customers.id`, `subscriptions.user_id`, `candidates.user_id` and `audit_logs.user_id` have no `ON DELETE` action, so a delete fails.

**Proposed flow**
1. Account › "Delete account" opens a confirm sheet (23:2006) that says what's retained.
2. The member re-authenticates with their password or an email code.
3. The app calls `POST /api/app/account/delete`, which:
   - cancels their Stripe subscriptions immediately
   - anonymizes the `members` and `users` rows
   - detaches `donors` and `votes` from the user, keeping them anonymously
   - deletes the auth user with `auth.admin.deleteUser`
4. The app signs out.

**Options for that route**
- **(a) Automated deletion (recommended).** Needs a migration that changes those foreign keys to `ON DELETE SET NULL`, so votes and donations are kept anonymously. **That's a schema change; I need your approval.**
- **(b) Request now, manual deletion.** The app records a request and tells the member "within 7 days", and an admin deletes it by hand. No schema change, but it leaves ongoing admin work.

**Web page.** A new public page `/account-deletion`:
- Signed-in members get the same button.
- Everyone else gets a request form.

It's additive; no existing page changes.

**Decide 3:** option (a) or (b), and the new `/account-deletion` web page.

### 5.2 Privacy
- **Privacy manifest.** `ios/App/App/PrivacyInfo.xcprivacy`, required since 1 May 2024:
  - `NSPrivacyTracking: false`
  - required-reason APIs for any plugin that uses UserDefaults or file timestamps
  - Capacitor and plugins ship their own manifests; we'll check them all.
- **App Store privacy labels and Play Data safety**
  - Collected, linked to the user, for app functionality:
    - name, email, phone, address (registration)
    - user ID
    - candidate photo and statement (nomination)
    - votes (sensitive; stored with session data)
    - purchase history (contributions and donations)
  - Not collected: payment card data. It's entered on Stripe's pages.
  - Not used for tracking.
  - Stripe and Supabase are processors, which Google doesn't count as "sharing".
- **Keep web analytics out of the app.** `@vercel/analytics` and `GoogleAnalytics.tsx` must not ship in the bundle, or the labels change.
- **Privacy policy URL:** `/privacy` (exists).

### 5.3 Icons and splash
- **Source:** a 1024×1024 icon and a splash logo, generated with `@capacitor/assets` (a dev tool; *needs approval*). `public/bcss-logo.png` and `logo.png` exist; I need a square master with no transparency for iOS. **Decide 7:** provide the master art.
- **Splash:** `@capacitor/splash-screen`, plain background in the brand token colour. Hide it once the session is restored.

### 5.4 Review notes and test account

**Test account:** a dedicated production account that is an approved active member, signs in with a password (no email code needed), and has an active $0-impact plan or a comped subscription. **Decide 8:** how to make that account active without a real charge.

**Review notes should cover:**
- BCS is a 501(c)(3), and the app is for members.
- Distribution is US only.
- Dues and donations are paid outside the app on the web, per 3.1.3(e), 3.2.2(iv) and 3.1.1(a) for the US.
- How to reach each tab.
- Account deletion: where it is and what is retained.
- Elections are seasonal. We'll attach a screen recording of the vote and confirmation flow from staging rather than create a fake election in production that every member would see.

---

## 6. Native features

| Feature | What members get | Backend work | Plugins |
|---|---|---|---|
| **Push notifications** | Election opening and closing reminders, nominations open, "a payment failed" | <ul><li>A `device_tokens` table (user, platform, token) with RLS: owner insert and delete. **Schema change, needs approval.**</li><li>`POST`/`DELETE` `/api/app/devices`.</li><li>Sender: FCM HTTP v1 for both platforms (APNs through FCM), using a service-account secret on the server, signed with Node `crypto` so nothing new is added.</li><li>Triggers: the existing Stripe webhook's failed-payment branch (next to `sendPaymentFailedEmail`), and a daily cron that finds elections opening or closing in the next 24 hours (`vercel.json`).</li></ul> | `@capacitor/push-notifications` (official). A Firebase project (yours). |
| **Biometric unlock** | Face ID or fingerprint to reopen the app after 5 minutes in the background. Tokens stay in Keychain/Keystore either way. | None | `@aparajita/capacitor-biometric-auth` (community). `NSFaceIDUsageDescription`. |
| **Offline / retry** | A clear offline screen with Retry instead of a broken page. Votes and payments are never queued offline. The confirm step needs a connection. | None | `@capacitor/network` (official) |
| **Share and save receipt PDFs** | Contribution receipt for a tax year and donation receipts: save to Files, print, email. | None beyond the bearer-aware `createClient()`: the existing PDF routes work as they are. | `@capacitor/filesystem` and `@capacitor/share` (official) |

**Decide 4:** which native features to build in Phase 4.

---

## 7. Feature mapping

Figma node IDs are on the "Mobile app" page. "Direct" means the app reads Supabase with the user's token under the existing RLS. "Existing route" means an existing API route, usable once `createClient()` accepts bearer tokens.

| Feature | Screen (Figma) | Data | Server change |
|---|---|---|---|
| Sign in: password, code | Auth screens (no mock; built from the web's AuthForms with mobile parts) | supabase-js | None |
| Magic link, reset link | Opened from `/m/auth/confirm` | supabase-js `verifyOtp(token_hash)` | `/m/auth/confirm` web route and fallback page; AASA and assetlinks |
| Register / apply, pending | Auth, then the Register form, then a pending state | supabase-js `signUp`, then `POST /api/app/register` | New route wrapping `registerMember` |
| Home | Home 14:1723 | Direct: member, open elections, subscription. Featured fundraiser from the `fundraisers` table. | None |
| Give, choose a gift | Give 14:1906, Your information 24:2596 | Direct: prices, purpose list | None |
| Give, pay | Payment 24:2699 (card details move to Stripe in Safari, §4) | `POST /api/app/donations`, which returns a Checkout URL | New route (wraps `submitDonation` and `checkoutWithStripeForDonation`) and `/m/return/checkout` |
| Gift complete or pending | 24:2778 / 24:2843 | Direct: `donations` status after return | None |
| Fundraisers, list and detail | Fundraisers 14:2052 | Existing `GET /api/fundraisers/[id]` or direct (public read RLS) | None |
| Fundraiser gift | Give flow as above | `POST /api/app/fundraisers/[id]/donations` | New route (wraps `submitDonation` and `checkoutWithStripeForFundraiser`) |
| Elections, list and detail | Elections 17:2110 | Direct: `elections`, `candidates`, `initiatives`, own `vote_sessions` | None |
| Candidate page | Pushed screen built from List row 13:2112 | Direct | None |
| Nominate | Pushed form | `POST /api/app/elections/[id]/nominate` (multipart, photo) | New route (wraps `nominateCandidate`) |
| Vote, candidates and initiatives | Ballot 17:2284, Review votes 25:2792, Submit ballot sheet 25:2931, Ballot submitted 25:3075 | **Existing** `POST /api/elections/[id]/vote/candidates` and `/vote/initiatives`. Two sessions and two confirmation codes, as in `Ballot`. | Bearer support only. The security checks in `utils/elections/handlers.ts` are unchanged. |
| Vote confirmations | Ballot submitted, showing both codes | Direct: own `vote_sessions` and `vote_confirmations` | None |
| Results | Result header 23:2005 on a pushed screen | Existing `GET /api/elections/[id]/results` and `candidate-results` | Bearer support only |
| Community funds | Funds 19:2389 | Direct: `funds`, `expenses`, donations. Contributions list: `GET /api/app/community-funds/payments`. | New route (wraps `getStripePayments`) |
| Account | Account 19:2559 | Direct: users, members, subscriptions | None |
| My contribution, plan | Account rows; "Plan & payment method" goes to the portal in Safari | `POST /api/app/checkout`, `POST /api/app/billing-portal` | New routes; `createStripePortal(returnUrl?)` |
| Contribution receipts by tax year | Account › Contribution receipts | Existing `/account/[memberId]/contributions/pdf` | Bearer support only |
| Donation history and receipts | Account › Donation history | Direct: `donations`; PDF from `/donate/confirmation/[id]/pdf` | None |
| Name, email, password | Account › Profile rows | supabase-js `updateUser`; `users.full_name` update (RLS allows) | None |
| Delete account | Account › Delete account plus Confirm sheet 23:2006 (**not in the mock**) | `POST /api/app/account/delete` | New route, plus Decide 3 |
| Member directory and profile | **Not in the mocks.** Proposed: Funds › "Members" row, as a pushed list built from List row 13:2112 | Direct for the list. Profile total: `GET /api/app/members/[id]/total` | New route (wraps `getTotalCustomerSpent`, active members only) |
| Programs, resources, funeral fund signup | Home › Programs rows | In-app browser (`@capacitor/browser`) to the website pages | None |
| Admin | Account › "Admin" row, admins only | System browser | None |

**Cross-cutting server work for Phase 1**
- **Bearer auth in `createClient()`**, with Jest tests:
  - no header: unchanged
  - valid token: user resolved
  - expired or forged token: rejected
- **CORS for the app's origins** (`capacitor://localhost`, `https://localhost`) on `/api/*`: one early-return branch in `middleware.ts` plus an `/api/:path*` matcher. Requests from other origins pass through untouched, so web behaviour doesn't change.
- **The new `app/api/app/*` routes.** Each one requires a token, runs the existing function, and has Jest tests covering 401 without a token and RLS still applying.

**Decide 5:** where the member directory goes (Funds row, Account row, or a later release).

---

## 8. Phases (from the brief), with what each delivers

| Phase | PR into `develop` | Delivers |
|---|---|---|
| 0 | this one | This plan |
| 1. Backend readiness | `mobile/phase-1-backend` | <ul><li>Bearer auth, CORS, `/api/app/*` routes and their tests</li><li>`/m/*` web routes and `.well-known` files</li><li>Optional `returnUrl` and `url` additions to the Stripe functions</li><li>Checklist for you: Supabase allowlist, email templates, Stripe portal and redirect settings</li><li>Migrations only after Decide 3 and 4</li></ul> |
| 2. App shell | `mobile/phase-2-shell` | <ul><li>`apps/mobile`, iOS and Android projects, tab bar, headers, action bar</li><li>Auth screens and secure session storage</li><li>Deep-link router; a spike on the Stripe return behaviour</li></ul> |
| 3. Features | `mobile/phase-3-features` | Home, Give, Elections (nominate, vote, results), Funds and Account (plan, receipts, profile, deletion) |
| 4. Native polish | `mobile/phase-4-native` | <ul><li>The native features you approve</li><li>Android back button (`@capacitor/app` `backButton`: pop the stack, then exit from a tab root)</li><li>Haptics on vote and gift confirmation, status bar per screen, safe areas, Dynamic Type (rem-based type plus `-webkit-text-size-adjust`)</li><li>Offline screen</li></ul> |
| 5. Store readiness | `mobile/phase-5-store` | <ul><li>Icons, splash, privacy manifest, permission strings</li><li>Release signing configuration</li><li>README section: local runs, TestFlight and Play internal-testing builds</li></ul> |

Every phase runs `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm build`, `pnpm e2e:smoke` and `pnpm e2e:bugs`. Phases 2–5 also build on the iOS Simulator and an Android emulator, include the manual checklist from the brief, and compare screens against the Figma nodes with `get_screenshot`.

### Plugins and dependencies to approve
- **Official Capacitor:** `@capacitor/core`, `cli`, `ios`, `android`, `app`, `app-launcher`, `browser`, `status-bar`, `splash-screen`, `keyboard`, `haptics`, `network`, `filesystem`, `share`, `push-notifications`, and `@capacitor/assets` (dev).
- **Community:** `@aparajita/capacitor-secure-storage` (Keychain/Keystore) and `@aparajita/capacitor-biometric-auth` (only if biometrics is approved).
- No new dependencies for the website itself.

---

## 9. Decisions I need from you
1. Architecture **C** with a static Next.js app in `apps/mobile` (§1).
2. The domain (`bcsseattle.org`?), app name "BCS Seattle", and IDs `org.bcsseattle.app` (§2).
3. Account deletion, option (a) migration or (b) manual requests, and the new `/account-deletion` web page (§5.1).
4. Which native features to build, and the `device_tokens` table if push is approved (§6).
5. Where the member directory goes (§7).
6. Will BCS seek a Candid Seal (for in-app Apple Pay donations later)? It doesn't block v1.
7. Square icon master art (§5.3).
8. How the App Review test account becomes an active member without a real charge (§5.4).
9. Approval for the plugin list above.

## 10. What you need to do outside the code

**Accounts**
- **Apple Developer Program**, enrolled as an organization. This needs a D-U-N-S number. Send me the Team ID (for AASA).
- **Google Play Console**, organization account. Under App signing, get the SHA-256 (for `assetlinks.json`).
- **Firebase project** (if push is approved): `GoogleService-Info.plist` and `google-services.json`, an APNs auth key uploaded to Firebase, and an FCM service-account key stored as a server secret in Vercel.

**Supabase (production)**
- Add `https://bcsseattle.org/m/**` and `org.bcsseattle.app://**` to the redirect allowlist.
- Check that the email templates include `{{ .Token }}`.
- Later, switch the links to `/m/auth/confirm?token_hash=…` (§3.3).

**Stripe**
- Decide whether the customer portal allows pause.
- Check that portal settings allow the new return URL.

**Store listings**
- Set availability to US only in both stores.
- Fill in the privacy labels and Data safety form (§5.2), and give the privacy policy URL.
- Add the account-deletion URL to the Play listing.
- Create the reviewer account, and write the review notes (§5.4).
