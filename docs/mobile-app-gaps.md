# Gaps found while building the mobile app

This is a running list of problems found during the mobile app work. They are **parked until the app is finished** (decided 9 Nov 2026). Each entry says where the problem is, what it affects, and the proposed fix. When one is fixed, move it to "Done" with its PR.

The plan these phases follow is [mobile-app-plan.md](mobile-app-plan.md).

## Website and backend

| # | Gap | Where | Impact | Proposed fix |
|---|---|---|---|---|

## Production settings and accounts (yours to do)

| # | Item | Notes |
|---|---|---|
| P1 | **Apply the pending migrations to production** with `supabase db push --linked` after the PRs merge: `20261108050000`–`20261108080000` (already on `develop`), `20261109120000`, `20261109130000` (#22) and `20261110090000` (#23). | BUG-071 was fixed on 2026-11-08 (history repaired), so `db push` works. Run `db push --linked --dry-run` first; steps in the reply of 10 Nov 2026 (back up, dry run, push, `migration list --linked`). |
| P2 | **Supabase redirect allowlist:** add `https://www.bcsseattle.org/m/**` and `org.bcsseattle.app://**`. | It's the www host: `bcsseattle.org` 308-redirects to www, and Apple doesn't follow redirects for app links. |
| P3 | **Email templates** (Magic Link, Reset Password) must include `{{ .Token }}`. Later, point the links at `{{ .SiteURL }}/m/auth/confirm?token_hash={{ .TokenHash }}&type=…`. | The app's code screens depend on the token. |
| P4 | **Vercel env:** `APPLE_TEAM_ID`, `ANDROID_CERT_SHA256`. Confirm `NEXT_PUBLIC_SITE_URL=https://www.bcsseattle.org`. | Until they're set, the association files return 404, so app links over https don't work. |
| P5 | **Stripe customer portal:** decide whether members may pause or cancel there. | It's a Stripe dashboard setting, not code. |
| P6 | **Privacy policy:** have it reviewed (PR #21). Add a mailing address if you want one shown. | Required by both stores. |
| P7 | **Apple: enroll Baloch Community Services of Seattle as an organization** (decided 10 Nov 2026). The current membership (Team ID `JAK975JG8T`) is enrolled as an Individual, so the App Store would show a personal seller name. Steps: (1) ✅ **D-U-N-S 135-455577**, "BALOCH COMMUNITY SERVICES OF SEATTLE", 16224 Meadow Rd APT 502, Lynnwood, WA 98087-6576 (found 10 Nov 2026). Enroll with the legal name and address exactly as D&B has them; (2) create an Apple Account on a `@bcsseattle.org` address that BCS controls; (3) enroll at developer.apple.com/programs/enroll as an organization: legal name exactly as registered, D-U-N-S, the website `www.bcsseattle.org`, and an enroller with authority to bind BCS (Apple calls to verify); (4) as a 501(c)(3), ask for the **fee waiver** instead of paying US$99; (5) add other admins under Users and Access. Nothing was created on the individual team; the App ID, APNs key and App Store record wait for the new team. Also: the individual account's updated license agreement is due 13 Nov 2026, and its card has expired. | Blocks App ID, APNs key, TestFlight and submission. Google Play: same idea, a BCS organization developer account. |
| P8 | **Push notifications:** (1) Apple Developer › Keys: create a key with APNs, then set `APNS_KEY` (the .p8 contents), `APNS_KEY_ID` and `APNS_PRODUCTION=true` for TestFlight/App Store builds in Vercel; enable Push Notifications on the `org.bcsseattle.app` App ID. (2) Create a Firebase project with an Android app `org.bcsseattle.app`; put its `google-services.json` in `apps/mobile/android/app/`, set `FCM_SERVICE_ACCOUNT` (service account JSON) in Vercel, and build the app with `NEXT_PUBLIC_ANDROID_PUSH=1`. (3) Apply migration `20261110090000_device_tokens.sql` to production. | Until then nothing is sent and the app hides the Notifications row on Android; iOS shows it. |
| P9 | **Apply the election migrations** `20261110120000`–`20261110120200` (Phase 1) `20261111090000` (Phase 2) and `20261111100000` (Phase 3) `20261111110000` (Phase 4) `20261111120000` (Phase 5) `20261112090000` (admins review their own nomination) `20261112100000` (editing after publishing), `20261112110000` (standing admins run elections), `20261113090000` (initiative proposals), and from the website gaps (#39) `20261113100000` (W27) and `20261113110000` (W7) to production, with the others pending in P1, after those PRs merge. Then turn on `FF_ENABLE_ELECTION_MANAGEMENT` when you want the new Admin › Elections screens. | `db push --linked --dry-run` first. The backfill turns the 2025 election into `completed`; nothing else changes for members. Elections created by SQL from then on must set `status` (see `docs/election-management-plan.md` §3). |
| P10 | **Election notifications** (Phase 5) are built but send nothing until you approve them. Then set `ELECTION_NOTIFICATIONS=send` in Vercel. Email uses `MY_EMAIL`/`MY_PASSWORD` (Gmail) unless `SMTP_URL` points elsewhere; push needs P8. | Which notices go out, and by which channel, is in `docs/election-management-plan.md` D6 and `utils/elections/notify.ts`. Each is sent once (logged in `election_notifications`). |
| P11 | **Write the content** for `/youth-programs`, `/resources` and `/get-help` (W5). They are placeholders ("Under construction"); the app stopped linking to them until they have content. | Then add them back in `apps/mobile/components/home/site-links.ts`. |
| P12 | **Stripe webhook:** add the `checkout.session.expired` event to the webhook endpoint (Stripe dashboard › Developers › Webhooks), for live and test mode (W11). | Until then abandoned checkouts stay pending, as before. |

## Decisions still open

| # | Decision | Notes |
|---|---|---|
| D1 | Candid Seal (in-app Apple Pay donations later) | Doesn't block v1 (plan §4). |
| D2 | Square icon master art | Phase 5 ships a **draft** set made from the website's seal (`apps/mobile/scripts/make-app-assets.sh`). Its ring text is unreadable at small sizes; send a square master (1024+, no transparency) and re-run the script. |
| D3 | How the App Review test account becomes an active member without a real charge | Phase 5. |
| D4 | iPhone only, or iPad too | The template allows iPad. App Review tests on iPad if it's allowed. |
| D6 | Apple's **Sensitive Info** privacy category ("political opinion", "racial or ethnic data"): votes are listed as Other Data | `docs/app-store-listing.md` explains; add Sensitive Info there and in `PrivacyInfo.xcprivacy` if BCS reads it more broadly. |

## Design (Figma) updates

| # | Gap | Notes |
|---|---|---|
| F1 | The tab bar's fifth tab is now **More** (Account, Members, Resources). The mocks still show Account. | Decided 9 Nov 2026. |
| F2 | The Ballot mock says votes are "saved as you go". They aren't: nothing counts until the member submits. The app says so. | Mock copy. |
| F4 | The Payment mock (24:2699) shows an in-app payment sheet. On iOS, Stripe opens in Safari instead (plan §4). | Intentional until D1. |

## Known app limitations

| # | Limitation | Notes |
|---|---|---|
| A2 | Home can't say whether this month's contribution was paid. That's only known in Stripe. | It shows the plan and its renewal date instead. |
| A3 | The app's unit tests (`node --test`) can't import `@/` paths, so the elections phase logic is covered by Playwright runs, not unit tests. | Add a small test setup that resolves `@/` if this grows. |
| A4 | Taps in the iOS Simulator can't be automated from a Claude session: macOS blocks synthetic clicks without an Accessibility grant. iOS form flows are checked on Android and in the browser, and tapped by hand. | Not a product gap; affects how each phase is verified. |
| A6 | **Local Checkout can't complete.** The e2e stack's active prices have fake Stripe IDs (`price_e2e_*`). | Seed real Stripe test-mode price IDs into the e2e stack. |
| A9 | **Not yet checked live:** the contribution receipt PDF itself (no local member has Stripe payments), the portal return URL in Stripe, and the native share sheet. | The share code is the same path the donation receipt used successfully. Check on device in the manual checklist. |

## Done

| # | Gap | Fixed in |
|---|---|---|
| A5 | Testing the app in a desktop browser needed CORS off; the app's dev origin (localhost:3200) is now allowed outside production | PR #39 |
| W4 | /members/[id] returned a 500 to a signed-in non-member; it now says the page is for members | PR #39 |
| W5 | The app linked to placeholder pages; it no longer does until they have content (writing it is P11) | PR #39 |
| W7 | members.stripe_customer_id looked like the Stripe id; it now carries a column comment (a rename would break older app builds) | PR #39 |
| W9 | Payments with no matching member showed a blank name (and a broken link) on Funds; now "Not in the directory", as in the app | PR #39 |
| W13 | The app's receipt routes reported problems as redirects; they now return 404 JSON with the message, which the app shows | PR #39 |
| W25 | Member status wording and rules differed; the website now uses the app's rule (utils/membership/state.ts), the directory says "No contribution plan yet", and /register shows an application's state | PR #39 |
| W22 | Closed fundraisers still offered Donate and said "Ends 2 days ago"; now no Donate, "Ended {date}", and unnamed donors show as anonymous | PR #39 |
| W21 | The donate form offered purposes and frequencies it couldn't accept or charge, and pre-filled "Other amount" with 1000; it now offers what the app does | PR #39 |
| W20 | A refunded donation showed "confirming your payment" for ever; it now says it was refunded | PR #39 |
| W19 | The website promised receipt emails that aren't sent; the copy now says the receipt is there to download | PR #39 |
| W11 | Abandoned checkouts left donations pending; checkout.session.expired now closes them as failed (needs the event enabled on the Stripe webhook) | PR #39 |
| W8 | The website treated a ballot as cast only with a completed session, so after the election page's own (combined) ballot it didn't know you'd voted; it now uses the handlers' rule (any vote counts) and shows those votes | PR #39 |
| W26 | "Elected unopposed" could show during nominations (results API); the page and the API now share electedUnopposedNow, and the old rule is deleted | PR #39 |
| W12 | A gift entered with someone else's email was filed under their donor record; signed-in givers now get their own (by account, then their own email), and the account comes from the session | PR #39 |
| W24 | Plan amounts ignored the family size; the account card and the directory now show price × quantity (directory fixed in PR #35) | PR #39 |
| W23 | Funds listed pending and failed gifts as completed, and sorted expenses by entry date; now completed gifts only, expenses by date | PR #39 |
| W10 | The website's donate form could charge a monthly or yearly gift once; it now uses the app's rule (priceForFrequency) | PR #39 |
| W3 | Any member could download another member's contribution receipt; now only the member and admins | PR #39 |
| W27 | Anonymous fundraiser gifts were readable by anyone; now only the donor and admins read them, and the donor list leaves out anonymous names and messages | PR #39 |
| A10 | The app couldn't propose initiatives and offered Nominate on initiative-only elections; it now has a Propose screen with the examples, lists your proposals (withdraw in the app) and offers Propose instead | PR #38 |
| — | Privacy page was "Under construction" | PR #21 |
| — | App links named `bcsseattle.org`, which redirects; now `www.bcsseattle.org` | `da1cdb8`, Phase 3 |
| — | The app's donation route could charge a monthly gift once | `2578bb8`, Phase 3 |
| — | Funds couldn't show the real bank and Stripe figures (was W14, F5): `GET /api/app/community-funds/summary` | Phase 3 |
| — | Account deletion's confirm button wasn't marked destructive (was A7): `ConfirmSheet` `tone="destructive"` | Phase 3 |
| — | The new password screen always returned to Home (was A8): `?from=account` returns to Account | Phase 3 |
| — | iOS reinstall came back signed in (was A1): the stored session is wiped on the first launch after an install | Phase 4 |
| — | `pnpm lint` couldn't run (was W6): `.eslintrc.json` (`next/core-web-vitals`, `next/typescript`). Unused variables and `any` are warnings for now; hooks called conditionally are fixed | Elections Phase 1 |
| — | Nomination photos couldn't be uploaded (was W1): storage policies for `candidate-photos`, uploads under `<uid>/` | Elections Phase 1 |
| — | Draft elections were visible to members (was W2, D5): hidden in RLS | Elections Phase 1 |
| — | The website refused nominations at the exact start and end (was W15): both platforms use the shared `electionPhase` | Elections Phase 1 |
| — | The website timeline showed the candidate step whenever `candidate_voting_end` was set (was W16): only when separate periods are on | Elections Phase 4 |
| — | The candidate page showed the raw status and ignored the candidate window (was W18): the shared `electionPhase` | Elections Phase 4 |
| — | Results read as provisional after voting closed (was W17): certified outcomes and final words (Elected, Passed, Supported, Opposed, Tied, No votes) | Elections Phase 5 |
