# Gaps found while building the mobile app

This is a running list of problems found during the mobile app work. They are **parked until the app is finished** (decided 9 Nov 2026). Each entry says where the problem is, what it affects, and the proposed fix. When one is fixed, move it to "Done" with its PR.

The plan these phases follow is [mobile-app-plan.md](mobile-app-plan.md).

## Website and backend

| # | Gap | Where | Impact | Proposed fix |
|---|---|---|---|---|
| W4 | **`/members/[id]` returns a 500** for a signed-in non-member. It has no access check, and throws on `member!.created_at` when RLS returns nothing. Nothing leaks. | `app/(portal)/members/[id]` | Error page instead of a "members only" message. | Check access first and show the same "members only" state as the directory. |
| W5 | **Placeholder pages** that the app's Resources tab links to: `/resources`, `/youth-programs`, `/get-help` ("Under construction" or a bare heading). `/resources/immigration` requires a website sign-in, so the app leaves it out. | `app/(site)/*` | Thin content; App Review may notice. | Write the content, or drop the rows from the app until it exists. |
| W7 | **Confusing column name:** `members.stripe_customer_id` holds `customers.id` (the user's UUID), not the Stripe ID. The Stripe ID is `customers.stripe_customer_id`. | schema | Easy to misread; already caught one draft of the deletion migration. | Rename to `customer_id` in a migration, or at least add a column comment. *Schema change: needs approval.* |
| W9 | **Payments with no matching member** show a blank name on the website's Funds page. The app shows "Not in the directory". | `app/(portal)/community-funds` | Cosmetic. | Use the same wording on the website. |
| W13 | **The app's receipt routes report problems as redirects to website pages**, not `{ error }` JSON, because they wrap the website's PDF routes. The app shows a general "no receipt" message. | `app/api/app/receipts/contributions`, `app/api/app/donations/[donationId]/pdf` | Members don't see the real reason (for example, no payments that year). | Return 4xx JSON with the message from the app routes. |
| W20 | **A refunded donation shows "We're confirming your payment" for ever** and keeps refreshing: any status other than completed or failed takes the pending branch. | `app/(site)/donate/confirmation/[donationId]/page.tsx:79-116` | Wrong state, endless polling. | Add a refunded state, as the app has. |
| W21 | **The donate form's options and the schema disagree.** It offers every active program, though `DonationFormSchema` accepts only `DONATION_PURPOSES`. It also offers Monthly and Yearly even when no recurring price is active, and "Other amount" pre-fills 1000.00. Its pending copy always says "Bank transfers can take a few days", even for cards. | `components/forms/donate-form.tsx:324` and the confirmation page | A purpose the schema rejects; a frequency that can't be charged. | Offer only what can be accepted, as the app does. |
| W22 | **Closed fundraisers still show Donate** on the card and "Donate Now" on the detail page (the donate page then refuses). The detail page says "Ends 2 days ago". An unnamed donor shows a blank name. | `components/fundraisers/fundraiser-card.tsx`, `fundraiser-details.tsx:82-88` | Confusing dead ends. | Hide Donate when closed and say "Ended {date}", as the app does. |
| W25 | **Member status wording and rules differ:** the website badge uses `status` only ("Active", "Pending", "Rejected"), while the app also requires `isApproved` for active. The directory says "Yet to choose contribution plan" in red. `/register` shows the form again to people who already applied. | `components/portal/member-row.tsx:9-21`, `components/member-list.tsx`, `app/(site)/register` | Inconsistent states across website and app. | One shared member-state rule, and show the application's state on `/register`. |

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
| P9 | **Apply the election migrations** `20261110120000`–`20261110120200` (Phase 1) `20261111090000` (Phase 2) and `20261111100000` (Phase 3) `20261111110000` (Phase 4) `20261111120000` (Phase 5) `20261112090000` (admins review their own nomination) and `20261112100000` (editing after publishing) to production, with the others pending in P1, after those PRs merge. Then turn on `FF_ENABLE_ELECTION_MANAGEMENT` when you want the new Admin › Elections screens. | `db push --linked --dry-run` first. The backfill turns the 2025 election into `completed`; nothing else changes for members. Elections created by SQL from then on must set `status` (see `docs/election-management-plan.md` §3). |
| P10 | **Election notifications** (Phase 5) are built but send nothing until you approve them. Then set `ELECTION_NOTIFICATIONS=send` in Vercel. Email uses `MY_EMAIL`/`MY_PASSWORD` (Gmail) unless `SMTP_URL` points elsewhere; push needs P8. | Which notices go out, and by which channel, is in `docs/election-management-plan.md` D6 and `utils/elections/notify.ts`. Each is sent once (logged in `election_notifications`). |

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
| A5 | **Browser testing needs a workaround for CORS.** The website sends CORS headers only to the app's native origins (`capacitor://localhost`, `https://localhost`), so testing the app in a desktop browser needs `--disable-web-security` or a relay. | Add a dev-only origin (for example `http://localhost:3200`) to `APP_ORIGINS` when `NODE_ENV !== 'production'`. Website change. |
| A6 | **Local Checkout can't complete.** The e2e stack's active prices have fake Stripe IDs (`price_e2e_*`). | Seed real Stripe test-mode price IDs into the e2e stack. |
| A9 | **Not yet checked live:** the contribution receipt PDF itself (no local member has Stripe payments), the portal return URL in Stripe, and the native share sheet. | The share code is the same path the donation receipt used successfully. Check on device in the manual checklist. |

## Done

| # | Gap | Fixed in |
|---|---|---|
| W19 | The website promised receipt emails that aren't sent; the copy now says the receipt is there to download | branch `gaps/website-fixes` |
| W11 | Abandoned checkouts left donations pending; checkout.session.expired now closes them as failed (needs the event enabled on the Stripe webhook) | branch `gaps/website-fixes` |
| W8 | The website treated a ballot as cast only with a completed session, so after the election page's own (combined) ballot it didn't know you'd voted; it now uses the handlers' rule (any vote counts) and shows those votes | branch `gaps/website-fixes` |
| W26 | "Elected unopposed" could show during nominations (results API); the page and the API now share electedUnopposedNow, and the old rule is deleted | branch `gaps/website-fixes` |
| W12 | A gift entered with someone else's email was filed under their donor record; signed-in givers now get their own (by account, then their own email), and the account comes from the session | branch `gaps/website-fixes` |
| W24 | Plan amounts ignored the family size; the account card and the directory now show price × quantity (directory fixed in PR #35) | branch `gaps/website-fixes` |
| W23 | Funds listed pending and failed gifts as completed, and sorted expenses by entry date; now completed gifts only, expenses by date | branch `gaps/website-fixes` |
| W10 | The website's donate form could charge a monthly or yearly gift once; it now uses the app's rule (priceForFrequency) | branch `gaps/website-fixes` |
| W3 | Any member could download another member's contribution receipt; now only the member and admins | branch `gaps/website-fixes` |
| W27 | Anonymous fundraiser gifts were readable by anyone; now only the donor and admins read them, and the donor list leaves out anonymous names and messages | branch `gaps/website-fixes` |
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
