# BCS Seattle Website — Product Requirements & Status

The single source of truth for what the bcsseattle.org website does today, what is broken, and what is missing. When this document and an older doc in `docs/` disagree, this one wins; the older docs are kept as implementation history (see [Appendix B](#appendix-b--existing-docs)).

- **Last audited:** 2026-10-02, against `develop` @ `e76f16e`
- **Method:** static read of the code, migrations and docs. Nothing was run against the live Supabase project or Stripe account.
- **Big caveat:** database security findings (RLS policies) come from `supabase/migrations/`. Several "remote_schema" migrations show policies were edited in the Supabase dashboard, so **confirm every RLS item against production before acting on it** (see [Open decisions](#7-open-decisions)).

**How to keep this current:** when you ship a fix, change the bug's status in the table rather than deleting the row, and update "Last audited". New features get a row in [Features](#3-features).

---

## 1. Product overview

Baloch Community Services of Seattle (BCSS) is a 501(c)(3) serving Baloch families in Washington. The website exists to:

1. Tell families what BCSS does and how to get help.
2. Run membership: registration, admin approval, and dues ($20 registration + $60/year per the bylaws).
3. Collect money: general donations, member contributions, and named fundraisers (for example funeral costs).
4. Run member elections and initiative votes.
5. Give members access to resources (immigration guides) and to the organisation's finances (community funds).

**Stack:** Next.js (App Router) on Vercel · Supabase (Postgres, auth, storage, realtime) · Stripe (Checkout, subscriptions, billing portal) · Resend and Gmail SMTP (email) · Twilio (SMS) · Notion (immigration resource pages) · Google Analytics and Vercel Analytics.

### Roles

| Role | How someone gets it | What they can do |
|---|---|---|
| Visitor | — | Public pages, `/donate`, contact form, funeral fund interest form |
| Signed-in user | Creates an account | Everything behind login: elections, fundraisers, `/register` |
| Registered member (pending) | Submits `/register` | Waits for admin approval; pays the membership fee |
| Approved member | Admin approves (`members.isApproved`, `status = 'active'`) | Member directory, community funds, immigration resources, account page |
| Admin | `users.is_admin = true`, set by hand in the database | `/admin/members`, creating fundraisers |

> Admin is currently decided in four different ways (see BUG-004, GAP-A3). `users.is_admin` is the one the app mostly uses.

---

## 2. Status legend

| Status | Meaning |
|---|---|
| ✅ Live | Works as intended, as far as static reading shows |
| ⚠️ Partial | Works, but with a known bug or a missing part |
| ❌ Broken | The main path fails |
| 🚧 Stub | The page exists but says "Under construction" or is empty |

---

## 3. Features

### 3.1 Public site

| Feature | Status | Route(s) | Notes |
|---|---|---|---|
| Home page: hero, mission, program cards, contact form | ⚠️ | `/` | "Youth Programs" card links to a 404 (BUG-047). No donate, membership or fundraiser calls to action. |
| About, Mission, Vision | ✅ | `/about-us`, `/about-us/mission`, `/about-us/vision` | Static copy |
| Bylaws (HTML) | ⚠️ | `/about-us/bylaws` | Typos ("C2ECKS", "B2LAWS"), an empty eligibility list, "Section 1" used twice. `public/bylaws.pdf` is never linked. |
| Contact form → email | ⚠️ | `/contact-us`, `/api/send-email` | Always reports success even when sending fails (BUG-031) |
| Funeral and burial fund interest form + cost table | ⚠️ | `/funeral-burials`, `/api/signup-funeral` | The table is probably empty: RLS is on with no read policy |
| Immigration resources (Notion-backed) | ⚠️ | `/resources/immigration`, `/resources/immigration/[slug]` | Members only. The subscription check never applies (BUG-055). |
| Terms | ⚠️ | `/terms` | One line pointing to the bylaws |
| What we do, Get help, Get involved, Youth programs, Resources, Privacy | 🚧 | | "Under construction" or empty |
| Duplicate funeral page | 🚧 | `/funeral-burial` | Stub; the nav uses `/funeral-burials` |
| Navigation, breadcrumbs, footer | ⚠️ | all pages | No mobile menu, dead admin links, breadcrumbs link to pages that don't exist |
| Analytics | ⚠️ | all pages | Google Analytics and Vercel Analytics, no consent banner, no privacy policy |

### 3.2 Accounts and membership

| Feature | Status | Route(s) | Notes |
|---|---|---|---|
| Email and password sign-up and sign-in | ✅ | `/signin/*` | |
| Email one-time code sign-in | ✅ | `/signin/email_signin` | Always lands on `/` and ignores `redirectTo` |
| OAuth sign-in (Google, Facebook) | Off | | Coded, but disabled in `utils/auth-helpers/settings.ts` |
| Forgot and reset password | ⚠️ | `/signin/forgot_password`, `/auth/reset_password` | Password changes even when the confirmation doesn't match (BUG-029) |
| Member registration (WA residents, individual or family) | ⚠️ | `/register` | Resubmitting un-approves an approved member (BUG-034) |
| Admin approve, reject or deactivate members | ⚠️ | `/admin/members` | Emails show as "No email" (BUG-036). "Reactivate" never renders. A rejected member looks the same as a new applicant. |
| Member directory | ⚠️ | `/members` | |
| Member detail | ❌ | `/members/[id]` | Any signed-in user can see any member (BUG-010) |
| Pending-status page | ❌ | `/members/[id]/pending` | Status is never set to `pending`, so the page shows the wrong message |
| Account page: receipts, Stripe portal, name and email changes | ⚠️ | `/account` | Newly registered (inactive) members can't reach it |
| Transactional email | ⚠️ | `/api/send-email/*` | Welcome and new-member emails on registration, a payment-failed email (Resend). The endpoints are open to anyone (BUG-008). |
| SMS dues reminder | ✅ | Stripe `invoice.upcoming` webhook | Twilio, once per month per subscription |

### 3.3 Payments, donations and fundraisers

| Feature | Status | Route(s) | Notes |
|---|---|---|---|
| General donation: one-time, monthly or yearly, card or ACH | ⚠️ | `/donate` | Amounts with cents fail (BUG-014). The client sets the price (BUG-013). |
| Zelle, check and cash instructions | ❌ | `/donate` | Pressing "Done" still calls Stripe and errors (BUG-018) |
| Donation receipt page + PDF | ⚠️ | `/donate/confirmation/[donationId]` | Guest donors are sent to sign-in (BUG-026). Renders for unpaid donations too. |
| Year-end contribution statement PDF | ❌ | `/account/[memberId]/contributions/pdf` | Anyone signed in can download anyone's statement (BUG-009). Membership fees are counted as deductible. |
| Membership fee and contribution subscriptions | ⚠️ | `/membership-fee`, `/contribute` | Member status set before payment (BUG-024). The bylaws' $20 registration fee isn't modelled. |
| Stripe billing portal | ✅ | `/account` | |
| Community funds dashboard: balance, payouts, expenses, donations | ⚠️ | `/community-funds` | "Outside Stripe" total counts pending donations (BUG-040) |
| Fundraiser list and detail, progress bar, updates, donor wall | ⚠️ | `/fundraisers`, `/fundraisers/[id]` | Login required (BUG-021). The donor wall may error at runtime (BUG-039). |
| Donate to a fundraiser | ⚠️ | `/fundraisers/[id]/donate` | A fundraiser with no end date shows as closed (BUG-038). The client sets the amount (BUG-013). |
| Admin: create a fundraiser | ✅ | `/fundraisers/admin/new` | Goes live immediately; no draft step |
| Admin: edit, pause or complete a fundraiser | ❌ | `/fundraisers/admin/[id]/edit` | Form sends `PUT`, the API only has `PATCH` (BUG-017) |
| Admin: post fundraiser updates | ❌ | | "Add Update" links to a route that doesn't exist |
| Stripe webhook: product sync, subscriptions, checkout completed, payouts, failures | ⚠️ | `/api/webhooks` | Signature is verified. Not idempotent (BUG-012). ACH donations marked paid before the money settles. |
| Donation campaigns | Not built | | `docs/DONATION_CAMPAIGNS.md` only |

### 3.4 Elections and voting

| Feature | Status | Route(s) | Notes |
|---|---|---|---|
| Election list and detail (timeline, positions, candidates, initiatives) | ⚠️ | `/elections`, `/elections/[id]` | Every election shows "Voting Open" (BUG-015) |
| Self-nomination with photo | ❌ | `/elections/[id]/nominate` | Anyone can nominate anyone, at any time (BUG-006) |
| Candidate ballot (one vote per position) + confirmation code | ⚠️ | `/elections/[id]/vote/candidates` | No membership check (BUG-007). Can vote twice per position (BUG-011, BUG-016). |
| Initiative ballot (yes, no, abstain) | ⚠️ | `/elections/[id]/vote/initiatives` | No membership check |
| Combined ballot (legacy) | ❌ | `/elections/[id]/vote` | Sends `true`/`false` to a yes/no/abstain column, so initiative votes fail |
| Live and final results with turnout | ⚠️ | `/elections/[id]/results` | Percentages wrong across positions. "Live" only refreshes on your own vote. API is public. |
| Candidate roster and profile | ❌ | `/elections/[id]/candidate`, `/candidate/[candidateId]` | Every candidate shows 0 votes (BUG-019) |
| Separate candidate voting period, early close, "Elected Unopposed" | ❌ | | Logic always returns "open"; can only be set in SQL |
| Feature flags (env, database, URL override) | ⚠️ | `utils/feature-flags.ts` | The URL override works in production for anyone (BUG-020) |
| Security self-test endpoint | ⚠️ | `/api/elections/security` | Admin check is commented out |
| Debug pages | ❌ | `/test-voting-config`, `/test-election-types` | Public in production |

---

## 4. Known bugs

IDs are stable; reference them in commits and PRs. "Verified" means confirmed by reading the code or SQL. "Needs live check" means it depends on what is actually deployed in Supabase.

### 4.1 Critical: fix before the next election or fundraiser

| ID | Area | Location | Problem | Verified |
|---|---|---|---|---|
| BUG-001 | Auth | `supabase/migrations/20250619204105_remote_schema.sql:911`, `:1480`; `20250807002100_add_is_admin_to_users.sql` | The policy "Can update own user data" allows updating any column of your own `users` row, including `is_admin`. Any signed-in user can make themselves admin from the browser console with the public key. | SQL ✓, needs live check |
| BUG-002 | Membership | `20250629210450_remote_schema.sql:44-52` | Members can update their own row without column limits, so they can set `isApproved = true, status = 'active'` and approve themselves. | SQL ✓, needs live check |
| BUG-003 | Privacy | `20250619204105_remote_schema.sql:931-971` | `members`, `donations`, `donors`, `customers`, `subscriptions`, `email_logs`, `sms_notifications` and `organization` are readable by anyone, signed in or not (`USING (true)`). Names, phones, addresses, emails and Stripe IDs are exposed through the public API. | SQL ✓, needs live check |
| BUG-004 | Auth | `app/fundraisers/page.tsx:31`, `app/fundraisers/admin/[id]/edit/page.tsx:31` | These pages treat `user_metadata.role === 'admin'` as admin, and users can set that field themselves. Real admins (`users.is_admin`) are locked out of the edit page. | ✓ |
| BUG-005 | Elections | `20250619230000_add_separate_voting_sessions.sql:189-202` | The vote insert policy allows `session_id IS NULL`, so a user can insert votes directly. That skips the voting window, sessions and one-vote-per-position. | SQL ✓, needs live check |
| BUG-006 | Elections | `utils/elections/handlers.ts:648-666`; `20250619210730_update_voting_tables_for_feature.sql:170-175` | `nominateCandidate` trusts a `userId` sent from the browser and writes with the service-role key: anyone can nominate anyone, outside the nomination window. Separately, any signed-in user can edit or delete initiatives, which deletes their votes. | ✓ |
| BUG-007 | Elections | `utils/elections/handlers.ts:54-104, 216-260, 372-416` | No membership or dues check when voting. `user_has_active_membership()` exists but is never called. Any account can vote, against bylaws Art. III §3. | ✓ |
| BUG-008 | Email | `app/api/send-email/payment-failed/route.tsx:7-23`; `welcome`, `new-member-joined`, `send-email/route.ts` | Email endpoints have no auth and no rate limit. Anyone can send a BCSS-branded "Payment failed" email with their own link to any address (phishing), or flood the org's inboxes. | ✓ |
| BUG-009 | Payments | `app/account/[memberId]/contributions/pdf/route.tsx:34-38` | Any signed-in user can download any member's contribution statement (name, address, payments) by changing the ID in the URL. | ✓ |
| BUG-010 | Membership | `app/members/[id]/page.tsx:21-36` | Any signed-in user can view any member's details and contribution history. Crashes on an unknown ID. | ✓ |
| BUG-011 | Elections | `utils/elections/handlers.ts:122-127` | One-vote-per-position uses the position name sent by the browser, so you can vote for two candidates in one position by mislabelling one. | ✓ |
| BUG-012 | Payments | `utils/supabase/fundraiser.ts:32-47` | The raised total is updated by read-then-write with no idempotency. Stripe retries or two donations at once double-count or lose updates. | ✓ |
| BUG-013 | Payments | `utils/stripe/server.ts:33,169,303`; `components/fundraisers/donation-form.tsx:99-126`; `components/forms/donate-form.tsx:132` | The browser sends the price and amount and the server trusts them. Someone can record $10,000 on a donor wall while paying $1, or change the membership fee price. | ✓ |
| BUG-014 | Payments | `donation-form.tsx:126`, `donate-form.tsx:132` | `amount * 100` isn't rounded (19.99 → 1998.9999…), and Stripe rejects it, so many amounts with cents fail at checkout. | ✓ |

### 4.2 High

| ID | Area | Location | Problem | Verified |
|---|---|---|---|---|
| BUG-015 | Elections | `utils/election-config.ts:68-70` → `app/elections/[id]/page.tsx:225-253` | `isCandidateVotingOpen` returns `true` whenever separate periods are off (the default) and ignores dates. Closed and upcoming elections show "Voting Open" and a vote button. "Elected Unopposed" never appears. | ✓ |
| BUG-016 | Elections | `utils/elections/handlers.ts:93-104` vs `406-416` | The combined and per-ballot vote paths check different tables, so a user can vote once through each and both count. | ✓ |
| BUG-017 | Fundraisers | `components/fundraisers/admin/fundraiser-update-form.tsx:90`; `types.ts:223` | Edit sends `PUT`, the API has only `PATCH`, so every edit fails. Even with the method fixed, `status` isn't in the schema, so pause and complete are dropped. | ✓ |
| BUG-018 | Payments | `components/forms/donate-form.tsx:123-164`; `utils/stripe/server.ts:208` | Choosing Zelle, check or cash still calls Stripe with `payment_method_types: ['zelle']`. The user sees an error and a pending donation row is left behind. | ✓ |
| BUG-019 | Elections | `app/api/elections/[id]/candidate-results/route.ts:21,42`; `components/elections/candidates.tsx:34` | Tallies use the user's own client, but users can only read their own votes, so everyone sees 0 votes and wrong winner badges. | Needs live check |
| BUG-020 | Platform | `utils/feature-flags.ts:211-213` | `?configoverride={"features":{"skipMembershipCheck":true}}` works in production for anyone. The docs say it is limited. | ✓ |
| BUG-021 | Fundraisers | `middleware.ts:21`; `utils/supabase/middleware.ts:35-54` | `/fundraisers` requires login, so signed-out visitors clicking "Fundraisers" in the nav are sent to sign-in. | ✓ |
| BUG-022 | Platform | 7 components import `toast` from `sonner`; `app/layout.tsx:78` mounts only the Radix `Toaster` | No success or error messages appear in the vote, donation, fundraiser-admin or member-approval flows. | ✓ |
| BUG-023 | Membership | `utils/supabase/admin.ts:522-535` | Every subscription event, including cancel and past-due, sets `members.status = 'active'`. Lapsed members keep voting and member access. | ✓ |
| BUG-024 | Membership | `utils/stripe/server.ts:136` → `utils/supabase/admin.ts:343-357` | Member status is set when checkout *starts*, before payment. Members with two subscription rows are set inactive. | ✓ |
| BUG-025 | Platform | `styles/main.css:13-14` | Primary orange button with near-white text is about 2:1 contrast (WCAG AA needs 4.5:1). Affects every default button (Donate, Send, Learn more). | ✓ |
| BUG-026 | Payments | `middleware.ts:21`; `utils/supabase/middleware.ts:40` | Guest donors on `/donate` are redirected to `/donate/confirmation/{id}`, which requires login, so they can't see their receipt. | ✓ |
| BUG-027 | Database | `supabase/migrations/20250807000000_*` (3 files), `20250807001000`, `20250808044402` | Three migrations share one version number and create the same tables and types with different columns. Another is empty. A fresh `supabase db reset` will fail; the history can't be replayed. | ✓ |
| BUG-028 | Database | `20250807002000_add_profiles_table.sql:24-35` | Replaces `handle_new_user` with a version that only writes `profiles`. New sign-ups after this get no `users` row, so `is_admin`, name updates and billing details silently do nothing. | SQL ✓, needs live check |
| BUG-029 | Auth | `utils/auth-helpers/server.ts:304-315` (same pattern at 57, 147, 242) | Validation failure sets a redirect but doesn't return, so the password changes even when the confirmation doesn't match. | ✓ |
| BUG-030 | Payments | `20250809010000_create_fundraiser_donors_table.sql`; `utils/fundraisers/handlers.ts:149` | `fundraiser_donors` (emails, phones) has no RLS. Submitting a donation with someone else's email overwrites their name and phone. | ✓ |

### 4.3 Medium

| ID | Area | Location | Problem |
|---|---|---|---|
| BUG-031 | Contact | `utils/auth-helpers/server.ts:457-461, 486` | Contact and funeral forms call `fetch` without `await`. They always report success; failures are lost. |
| BUG-032 | Auth | `app/signin/[id]/page.tsx:59-62`; `utils/auth-helpers/server.ts:189,210` | Open redirect through `redirectTo` (`//evil.com` passes the check). |
| BUG-033 | Elections | `app/api/elections/security/route.ts:16-25` and the security RPCs | Admin check commented out. The RPCs return voter IDs and other users' confirmation codes, which breaks ballot secrecy. |
| BUG-034 | Membership | `utils/membership/handlers.ts:50-66` | Resubmitting `/register` resets an approved member to unapproved and re-sends both emails. No server-side validation. |
| BUG-035 | Membership | `utils/membership/handlers.ts:349-351` | Reject is the same as "new application", so rejected people reappear as pending. |
| BUG-036 | Admin | `app/admin/members/page.tsx:60` | Calls an admin-only auth API with the regular client, so every email shows "No email" and the `mailto:` link is blank. Also an N+1 query. |
| BUG-037 | Elections | `app/api/elections/[id]/results/route.ts:72-76, 189-191` | Results API is public, includes draft and inactive elections, and divides each candidate's share by votes across *all* positions. |
| BUG-038 | Fundraisers | `app/fundraisers/[id]/donate/page.tsx:47` | No end date → `new Date(null)` = 1970, so open-ended fundraisers always show as closed. |
| BUG-039 | Fundraisers | `components/fundraisers/fundraiser-details.tsx:1,91`; `fundraiser-donors.tsx:16` | An async server component is rendered inside a client component, so the donor wall will likely error. |
| BUG-040 | Payments | `app/community-funds/page.tsx:77-83` | "Outside Stripe" counts pending and subscription donations, which overstates funds collected. |
| BUG-041 | Payments | `app/api/webhooks/route.ts:78-96, 163` | Doesn't check `payment_status`, so ACH counts as paid before settling. Unhandled event types return 400, so Stripe retries and may disable the endpoint. |
| BUG-042 | Payments | `app/donate/confirmation/[donationId]/pdf/route.tsx:72-83` | Receipts render for pending or abandoned donations; a GET request marks the receipt as generated. |
| BUG-043 | Fundraisers | `components/fundraisers/donation-form.tsx:90`; `utils/fundraisers/handlers.ts:123` | Minimum donation checked only in the browser; $0.01 is allowed (Stripe's minimum is $0.50). |
| BUG-044 | Payments | `utils/stripe/server.ts:88` | Family contribution quantity becomes 0 or NaN when the family size is missing, so checkout fails. |
| BUG-045 | Elections | `hooks/useElectionResults.ts:96-123` | Realtime listens to tables users can only see their own rows of, so "live" results don't update. |
| BUG-046 | Elections | `20250619204105_remote_schema.sql:919, 995, 1011` | Any user can create an election, which then appears to everyone. Candidates can edit or delete their own row mid-election, and deleting wipes their votes. |
| BUG-047 | Navigation | `components/programs-and-services.tsx:29`; `components/ui/Navbar/Navlinks.tsx:141,153`; `app/admin/layout.tsx:69` | Links to `/programs/youth-programs`, `/admin/elections` and `/admin/settings` all 404. |
| BUG-048 | Navigation | `components/ui/breadcrumbs.tsx:16-20` | Breadcrumbs link every path segment, which gives dead links and raw UUIDs. |
| BUG-049 | Platform | `app/global-error.tsx.tsx` | The double extension means Next never uses it. No root `error.tsx` or `not-found.tsx`. |
| BUG-050 | Platform | `components/ui/Navbar/Navbar.tsx:39`; `Navlinks.tsx:94,136,164`; `components/ui/ctonact-form.tsx:95` | Fixed widths cause sideways scrolling on phones (320–375px). No mobile menu. |
| BUG-051 | Platform | `Navbar.tsx:42`, `Hero.tsx:9`, `mission.tsx:4` | Several `<h1>`s per page (the nav title is an h1 everywhere). |
| BUG-052 | Elections | `components/elections/voting-client.tsx:47-51` | Combined ballot sends booleans to the yes/no/abstain column, so initiative votes fail. |
| BUG-053 | Accounts | `utils/supabase/admin.ts:708-725` | `getOrCreateUser` only checks the first page (about 50) of users, then creates donor accounts with a shared default password. |
| BUG-054 | Platform | `app/signin/robots.ts` | Dead file (`robots.ts` only works at the app root). No sitemap. |

### 4.4 Low

| ID | Location | Problem |
|---|---|---|
| BUG-055 | `app/resources/immigration/[slug]/page.tsx:25,35` | `isSubscriptionActive` is an array, so it's always truthy and the check never applies |
| BUG-056 | `app/members/page.tsx:42`, `app/elections/page.tsx:84` | No member row → redirect to `/members/undefined/pending` |
| BUG-057 | `components/admin/MemberApprovalActions.tsx:193` | Operator precedence: "Reactivate" never renders |
| BUG-058 | `app/account/[memberId]/contributions/pdf/route.tsx:25` | Default tax year evaluates to 0 |
| BUG-059 | `app/elections/page.tsx:104-107` | Queries a column that doesn't exist, so the "Leadership" badge never shows |
| BUG-060 | `utils/election-config.ts:45` | Per-type default settings never apply; `candidate_voting_start` is ignored |
| BUG-061 | `utils/fundraisers/handlers.ts:47-59, 198, 306` | `beneficiary` is collected but not saved; the confirmation code is generated then discarded |
| BUG-062 | `app/api/fundraisers/[id]/route.ts:132-150` | DELETE reports success but deletes nothing (no RLS delete policy) |
| BUG-063 | `components/GoogleAnalytics.tsx:9,12` | Loads `gtag/js?id=undefined` when unset; script rendered outside `<body>` |
| BUG-064 | `utils/auth-helpers/server.ts:98,122` | `/signin/email_sigin` typo; redirect to a sign-in view that doesn't exist |
| BUG-065 | `app/about-us/bylaws/page.tsx:75-78, 396, 577` | Bylaws page typos and an empty list |
| BUG-066 | Several components | Links nested inside buttons and invalid list markup (keyboard and screen-reader issues) |
| BUG-067 | `test-feature-flags.mjs:11` | Imports a `.js` file that doesn't exist, so the script can't run |
| BUG-068 | `jest.config.js` | `moduleNameMapping` typo (should be `moduleNameMapper`); TypeScript tests probably don't parse |
| BUG-069 | `package.json` scripts | `supabase:push`, `supabase:pull` and `supabase:reset` call CLI commands that don't exist (should be `supabase db …`) |
| BUG-070 | `seed.ts:28` | Seeds the org as "Bangladeshi Community in Seattle" |

---

## 5. Gaps

### 5.1 Admin tooling (biggest product gap)

- **GAP-A1. Election admin.** Only `/admin/members` exists. Creating elections, positions, candidates and initiatives, and closing voting early, all need SQL. The helpers in `utils/election-admin.ts` have no callers.
- **GAP-A2. Fundraiser admin.** Can create, but can't edit (BUG-017), post updates, see a donation list, export donors, publish from draft, or set a minimum donation.
- **GAP-A3. One admin model.** Admin is decided in four ways: `users.is_admin`, `profiles.is_admin`, `user_metadata.role`, plus a `user_roles` table and `profiles.role` column that don't exist. Pick one and enforce it in RLS. There is no UI to grant admin.
- **GAP-A4. Debug pages.** `/test-voting-config` and `/test-election-types` are the documented way to operate elections and are public. They should move behind admin.

### 5.2 Membership lifecycle

- No "rejected" or "pending" state that the code actually sets. Approval and payment share one `status` field.
- No email or SMS telling a member they were approved or rejected.
- No renewal or expiry tracking and no dues ledger. Bylaws Art. III §5 (termination after 3 months unpaid) isn't automated.
- The $20 registration fee isn't modelled. The site says "$5/month or $60/year".
- Family size validation allows 0.

### 5.3 Elections versus the bylaws

- **Officers.** Bylaws Art. VI say the **Board** elects officers, and members elect **Directors** at the annual meeting (Art. IV §1). The app runs a member-wide vote for officer positions and has no director election.
- **Directors.** There are 3–9 seats with 2-year terms. The app allows one vote per position, so a multi-seat election isn't possible.
- **Election rules.** No candidate vetting or approval step, no tie-break rule, no quorum, no certification or publish step, no results export, no notifications.
- **Data collected.** Votes store `user_id`, IP address and user agent, which conflicts with the "anonymity" claim in `VOTING_SECURITY.md`.

### 5.4 Payments and receipts

- No refund or dispute handling. Raised totals and receipts are never reversed.
- Recurring charges after the first one create no donation record, so history and statements are incomplete.
- Fundraiser donations never reach `donations`, so they're missing from year-end statements. There's no fundraiser receipt and no thank-you email.
- No IRS quid-pro-quo wording for donations over $75. Membership fees are counted as tax-deductible.
- Donation campaigns (documented) aren't built.
- Fundraiser images are URL only, with no upload.

### 5.5 Content and SEO

- Seven public pages are stubs, including the core "Get help" and "What we do" pages. **The privacy policy is empty while the site collects personal data and payments and runs Google Analytics.**
- The home page doesn't send people to donate, fundraisers, membership or the burial fund.
- The footer has no address, phone, email or social links.
- Every page has the same title and description.
- The OG image is the Vercel starter's "$24/month" picture. No sitemap or canonical URLs. `site.webmanifest` has an empty name.
- The root layout calls `auth.getUser()` plus two database queries, so no page can be static.

### 5.6 Design system (`docs/DESIGN.md`)

Essentially none of it is implemented yet:

- **Tokens.** No colour tokens; the site still uses the shadcn defaults plus an orange primary. There are 558 raw Tailwind colour classes across 44 files.
- **Fonts.** The site uses Inter, not Atkinson Hyperlegible or Noto Naskh Arabic.
- **Doch and Sound.** No Balochi text, `lang="bal"` or RTL. No stitched band. No page registers.
- **Accessibility floor.** Buttons are 36–40px tall, not 44px. No skip link. No `prefers-reduced-motion` handling. Text smaller than 16px in the footer.
- **Funeral styling.** The `funeral` fundraiser category exists in the database, but nothing applies the condolence page style.

### 5.7 Platform and engineering

- **CI and lint.** No CI (`.github/` doesn't exist). No ESLint config, so `next lint` doesn't run.
- **Tests.** Only three test files, all for voting, and the Jest config is likely broken (BUG-068). No tests for auth, membership, payments, the webhook or the UI.
- **Environment variables.** `.env.example` lists 3 variables, but the code reads about 28.
- **Database types.** `types_db.ts` is out of date with the migrations.
- **Migrations.** Need squashing or rebaselining against production (BUG-027).
- **Hardening.** No security headers (CSP, HSTS), no rate limiting or CAPTCHA on public forms, no error monitoring (only `console.error`).
- **Duplicates.** Two email stacks (Resend and Gmail SMTP), two date libraries, two toast systems.
- **Unused dependencies.** `add`, `breadcrumb`, `react-merge-refs`, `uuid`. `@snaplet/seed`'s vendor has shut down.
- **Template leftovers.** `README.md` is the Vercel subscription starter's. Unused starter files: `public/demo.png`, `og.png`, `architecture_diagram.svg`, `vercel-deploy.png`, the vendor SVGs, `schema.sql`, `fixtures/stripe-fixtures.json`, `tailwind.config.js-text`. Empty `utils/plaid/`, `utils/wf/` and `cemetry/` folders.
- **Stray files.** 12 loose `.sql` files at the repo root. `components/ui/ctonact-form.tsx` (typo in the name). `app/elections/[id]/candidate/clean-page.tsx`. `utils/stripe/main.py` (a one-off script with a hard-coded subscription ID).

---

## 6. Where docs disagree with the code

| Doc | Says | Reality |
|---|---|---|
| `VOTING_SECURITY.md` | Inserts limited to the voting window; validation is admin-only; votes are anonymous; membership checked in the API | None of these hold (BUG-005, BUG-033, BUG-007) |
| `scope.md`, `scope2.md` | Phases "✅ completed / production-ready", admin-only initiative management, full test coverage | No admin UI, any user can manage initiatives, three test files |
| `FEATURE_FLAGS.md` | URL overrides only for signed-in users | Anyone, in production |
| `FUNDRAISER.md` | `NUMERIC` amounts, `PUT` API, `/donate` endpoint, admin via `profiles.role`, minimum donation in the admin forms | `INTEGER` amounts, `PATCH`, server actions, `users.is_admin`, no minimum field |
| `FUNDRAISER.md` (trigger) | Trigger keeps `current_amount` up to date | Trigger fires on `'succeeded'`, the code writes `'completed'`, so a manual increment in the webhook does it instead (BUG-012) |
| `ELECTION_TYPE_ENHANCEMENTS.md` | Smart defaults per election type | Never apply (BUG-060) |
| `RESULTS_PAGE_UPDATES.md` | Real-time results | Blocked by RLS (BUG-045) |
| `README.md` | Next.js Subscription Payments Starter | Not this product |
| Bylaws | Directors elected by members; officers by the Board; $20 + $60/yr; member list kept by the Secretary | See 5.2, 5.3; the member list is publicly readable (BUG-003) |

---

## 7. Open decisions

These need an owner's answer before some fixes can be built.

1. **What is live in Supabase?** Which RLS policies are deployed, and which of the three `20250807000000` migrations ran? This changes the severity of BUG-001–003, 005 and 027. *(It needs the Supabase connector authorised, or a dump of production policies.)*
2. **Who is eligible to vote?** `isApproved AND status = 'active'`, or dues paid up to date?
3. **Officer elections.** Should members vote for officers directly? If yes, the bylaws need amending; if no, the product needs a director election.
4. **Results during voting.** Should results be visible while voting is open?
5. **Vote metadata.** Should IP address and user agent be stored per vote, and for how long?
6. **Public pages.** Should fundraisers and donation receipts be public for guests?
7. **Member directory.** Who may see it, and with which fields?
8. **Approval and payment order.** Does approval come before payment or after?
9. **Registration fee.** Is the $20 fee charged anywhere?
10. **Email provider.** Keep one: Resend or Gmail SMTP?
11. **Funeral pages.** One route, `/funeral-burial` or `/funeral-burials`? Should the interest list be public?
12. **Dues terms.** Bylaws Art. III (terminated after 3 months unpaid) vs Art. XI (annual dues): which is intended?

---

## 8. Recommended order of work

1. **P0, data exposure and integrity.**
   - Confirm production RLS.
   - Then lock down `users`, `members`, `donations`, `donors`, `customers` and `fundraiser_donors` (BUG-001–003, 030).
   - Fix the vote insert policy and add the membership check (BUG-005–007, 011, 016).
   - Close the open email endpoints and the ID-in-URL leaks (BUG-008–010).
   - Make admin a single mechanism (BUG-004, GAP-A3).
2. **P1, money correctness.**
   - Price and amount computed on the server (BUG-013, 014).
   - Idempotent webhook and totals (BUG-012, 041).
   - Zelle, check and cash flow (BUG-018).
   - Member status driven only by real payment events (BUG-023, 024).
   - Fundraiser edit (BUG-017).
3. **P1, election correctness.**
   - Voting-window logic (BUG-015), tallies (BUG-019, 037).
   - Move debug pages behind admin.
   - Minimal election admin UI (GAP-A1).
4. **P2, trust and reach.** Privacy policy, public fundraisers (BUG-021), toasts (BUG-022), contrast and mobile nav (BUG-025, 050), stub pages, SEO.
5. **P2, engineering base.** Rebaseline migrations (BUG-027), working Jest and CI, `.env.example`, regenerate `types_db.ts`, remove template leftovers.
6. **P3, design system.** Roll out `DESIGN.md` page by page.

---

## Appendix A — Route inventory

**Public:** `/`, `/about-us`, `/about-us/mission`, `/about-us/vision`, `/about-us/bylaws`, `/contact-us`, `/donate`, `/funeral-burials`, `/funeral-burial` (stub), `/what-we-do`, `/get-help`, `/get-involved`, `/youth-programs`, `/resources`, `/privacy`, `/terms` (stubs or near-stubs), `/test-voting-config`, `/test-election-types` (debug).

**Sign-in:** `/signin/[id]`, `/auth/callback`, `/auth/reset_password`.

**Login required:** `/register`, `/account`, `/members`, `/members/[id]`, `/members/[id]/pending`, `/membership-fee`, `/contribute`, `/community-funds`, `/donate/confirmation/*`, `/fundraisers`, `/fundraisers/[id]`, `/fundraisers/[id]/donate`, `/fundraisers/[id]/donations/[donationId]/confirmation`, `/elections`, `/elections/[id]` + `/nominate`, `/candidate`, `/candidate/[candidateId]`, `/vote`, `/vote/candidates`, `/vote/initiatives` (+ confirmations), `/results`, `/resources/immigration`, `/resources/immigration/[slug]`.

**Admin:** `/admin/members`, `/fundraisers/admin/new`, `/fundraisers/admin/[id]/edit`.

**API:** `/api/webhooks` (Stripe), `/api/send-email` (+ `/welcome`, `/new-member-joined`, `/payment-failed`), `/api/signup-funeral`, `/api/fundraisers`, `/api/fundraisers/[id]` (+ `/donations`, `/updates`), `/api/elections/[id]/vote` (+ `/candidates`, `/initiatives`), `/api/elections/[id]/results`, `/api/elections/[id]/candidate-results`, `/api/elections/security`, `/account/[memberId]/contributions/pdf`, `/donate/confirmation/[donationId]/pdf`.

## Appendix B — Existing docs

| Doc | Status |
|---|---|
| `DESIGN.md` | Current design direction; not yet implemented |
| `FEATURE_FLAGS.md`, `FEATURE_FLAGS_USAGE.md` | Mostly accurate; the override section is wrong |
| `VOTING_SECURITY.md` | Describes intended security; several claims don't hold (see §6) |
| `CANDIDATE_VOTING_IMPLEMENTATION.md`, `ELECTION_TYPE_ENHANCEMENTS.md`, `RESULTS_PAGE_UPDATES.md`, `UX_IMPROVEMENTS.md` | Implementation history for elections |
| `FUNDRAISER.md` | Original plan; the schema and API have since diverged |
| `DONATION_CAMPAIGNS.md` | Plan only; not built |
| `scope.md`, `scope2.md` | Original voting scope; the status claims are out of date |
