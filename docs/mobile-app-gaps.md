# Gaps found while building the mobile app

This is a running list of problems found during the mobile app work. They are **parked until the app is finished** (decided 9 Nov 2026). Each entry says where the problem is, what it affects, and the proposed fix. When one is fixed, move it to "Done" with its PR.

The plan these phases follow is [mobile-app-plan.md](mobile-app-plan.md).

## Website and backend

| # | Gap | Where | Impact | Proposed fix |
|---|---|---|---|---|
| W1 | **Nomination photos can't be uploaded.** No migration creates storage policies for the `candidate-photos` bucket, so uploads fail with "violates row-level security policy". `nominateCandidate` uploads with the member's own client. | `utils/elections/handlers.ts`; Supabase storage | Nominating with a photo fails on the website and in the app (seen locally). Production is unverified; a policy may have been added by hand in the dashboard. | Check production Storage › Policies. If missing, add a migration that lets an authenticated member upload under a path they own. That means changing the upload path from `<uid>_<ts>.<ext>` to `<uid>/<ts>.<ext>`. *Access-rule change: needs approval.* |
| W2 | **Draft elections are visible** to every signed-in user. The website's list applies no status or `is_active` filter, and RLS allows the read. The app matches the website. | `app/(portal)/elections`, elections RLS | Members see elections that aren't ready. | Decide: hide drafts with a query filter on both (simple), or in RLS (stricter). |
| W3 | **Any active member can download another member's contribution receipt** by changing the ID in the URL. Receipts include the name and address from Stripe. | `app/(portal)/account/[memberId]/contributions/pdf` | Privacy leak between members. The app's route only returns your own receipt. | One check: the member must be the signed-in user, or an admin. Found in Phase 1, deferred. |
| W4 | **`/members/[id]` returns a 500** for a signed-in non-member. It has no access check, and throws on `member!.created_at` when RLS returns nothing. Nothing leaks. | `app/(portal)/members/[id]` | Error page instead of a "members only" message. | Check access first and show the same "members only" state as the directory. |
| W5 | **Placeholder pages** that the app's Resources tab links to: `/resources`, `/youth-programs`, `/get-help` ("Under construction" or a bare heading). `/resources/immigration` requires a website sign-in, so the app leaves it out. | `app/(site)/*` | Thin content; App Review may notice. | Write the content, or drop the rows from the app until it exists. |
| W6 | **`pnpm lint` can't run.** There's no ESLint config, so `next lint` stops at its setup prompt. The phases lint the changed files with `eslint-config-next` instead. | repo root | Lint isn't enforced. | Add `.eslintrc.json` with `next/core-web-vitals` and `next/typescript`, then fix what it reports (8 known findings in `utils/stripe/server.ts`). |
| W7 | **Confusing column name:** `members.stripe_customer_id` holds `customers.id` (the user's UUID), not the Stripe ID. The Stripe ID is `customers.stripe_customer_id`. | schema | Easy to misread; already caught one draft of the deletion migration. | Rename to `customer_id` in a migration, or at least add a column comment. *Schema change: needs approval.* |
| W8 | **Website and app disagree on two election details.** The website's detail page treats a ballot as cast only when a session is completed, while the app (like the vote handlers) treats any existing vote as cast. The website's nominate form lists every `election_positions` row, while the app lists only the positions for the election's type. | `app/(portal)/elections/[id]`, nominate form | Small inconsistencies; no wrong votes are possible, because the server checks. | Align the website with the vote handlers' rule and the election type's positions. |
| W9 | **Payments with no matching member** show a blank name on the website's Funds page. The app shows "Not in the directory". | `app/(portal)/community-funds` | Cosmetic. | Use the same wording on the website. |

## Production settings and accounts (yours to do)

| # | Item | Notes |
|---|---|---|
| P1 | **Apply the account deletion migration** `20261109120000_account_deletion.sql` to production. | Production migration history must be repaired first (BUG-071 in `docs/BUGS.md`) before `supabase db push` will run. |
| P2 | **Supabase redirect allowlist:** add `https://www.bcsseattle.org/m/**` and `org.bcsseattle.app://**`. | It's the www host: `bcsseattle.org` 308-redirects to www, and Apple doesn't follow redirects for app links. |
| P3 | **Email templates** (Magic Link, Reset Password) must include `{{ .Token }}`. Later, point the links at `{{ .SiteURL }}/m/auth/confirm?token_hash={{ .TokenHash }}&type=…`. | The app's code screens depend on the token. |
| P4 | **Vercel env:** `APPLE_TEAM_ID`, `ANDROID_CERT_SHA256`. Confirm `NEXT_PUBLIC_SITE_URL=https://www.bcsseattle.org`. | Until they're set, the association files return 404, so app links over https don't work. |
| P5 | **Stripe customer portal:** decide whether members may pause or cancel there. | It's a Stripe dashboard setting, not code. |
| P6 | **Privacy policy:** have it reviewed (PR #21). Add a mailing address if you want one shown. | Required by both stores. |
| P7 | **Apple Developer and Google Play accounts:** Team ID, signing, enabling Associated Domains on `org.bcsseattle.app`, and the Play App Signing SHA-256. | See plan §10. |

## Decisions still open

| # | Decision | Notes |
|---|---|---|
| D1 | Candid Seal (in-app Apple Pay donations later) | Doesn't block v1 (plan §4). |
| D2 | Square icon master art | Phase 5. |
| D3 | How the App Review test account becomes an active member without a real charge | Phase 5. |
| D4 | iPhone only, or iPad too | The template allows iPad. App Review tests on iPad if it's allowed. |
| D5 | Hide draft elections (W2) | |

## Design (Figma) updates

| # | Gap | Notes |
|---|---|---|
| F1 | The tab bar's fifth tab is now **More** (Account, Members, Resources). The mocks still show Account. | Decided 9 Nov 2026. |
| F2 | The Ballot mock says votes are "saved as you go". They aren't: nothing counts until the member submits. The app says so. | Mock copy. |
| F3 | The Account mock's footer has a placeholder EIN ("99-2495973"). The app leaves it out. | Provide the real line if wanted. |
| F4 | The Payment mock (24:2699) shows an in-app payment sheet. On iOS, Stripe opens in Safari instead (plan §4). | Intentional until D1. |
| F5 | Funds: the mock's "Available funds" and "Processing fees" need the bank and Stripe figures, which only the server can read. | The app shows the website's fallback estimate until the summary route exists (Phase 3 consolidation). |

## Known app limitations

| # | Limitation | Notes |
|---|---|---|
| A1 | On iOS, the Keychain keeps the session after the app is deleted, so reinstalling can come back signed in. | Clear it on first launch (Phase 4) if wanted. |
| A2 | Home can't say whether this month's contribution was paid. That's only known in Stripe. | It shows the plan and its renewal date instead. |
| A3 | The app's unit tests (`node --test`) can't import `@/` paths, so the elections phase logic is covered by Playwright runs, not unit tests. | Add a small test setup that resolves `@/` if this grows. |
| A4 | Taps in the iOS Simulator can't be automated from a Claude session: macOS blocks synthetic clicks without an Accessibility grant. iOS form flows are checked on Android and in the browser, and tapped by hand. | Not a product gap; affects how each phase is verified. |

## Done

| # | Gap | Fixed in |
|---|---|---|
| — | Privacy page was "Under construction" | PR #21 |
| — | App links named `bcsseattle.org`, which redirects; now `www.bcsseattle.org` | `da1cdb8`, Phase 3 |
