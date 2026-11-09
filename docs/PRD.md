# BCS Seattle Website — Product Requirements & Status

The single source of truth for what the bcsseattle.org website does today, what is broken, and what is missing. When this document and an older doc in `docs/` disagree, this one wins; the older docs are kept as implementation history (see [Appendix B](#appendix-b--existing-docs)).

- **Last audited:** 2026-10-02, against `develop` @ `e76f16e`
- **Method:** static read of the code, migrations and docs. Nothing was run against the live Supabase project or Stripe account.
- **Big caveat:** database security findings (RLS policies) come from `supabase/migrations/`. Several "remote_schema" migrations show policies were edited in the Supabase dashboard, so **confirm every RLS item against production before acting on it** (see [Open decisions](#7-open-decisions)).

**How to keep this current:** when you ship a fix, change the bug's status in [BUGS.md](BUGS.md) rather than deleting the row, and update "Last audited". New features get a row in [Features](#3-features).

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

All 70 bugs (BUG-001–070) are tracked in [BUGS.md](BUGS.md), grouped as Critical, High, Medium and Low. IDs are stable; reference them in commits and PRs.

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
- **Tests.** A Playwright + Cucumber BDD suite now lives in `e2e/` (132 scenarios: 85 gating, 47 known-bug reproductions) and runs in GitHub Actions; see [E2E_REPORT.md](E2E_REPORT.md). The three Jest files for voting still don't run (BUG-068).
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

1. **What is live in Supabase?** ~~Which RLS policies are deployed, and which of the three `20250807000000` migrations ran?~~ **Answered 2026-11-08** from a schema-only dump of production: BUG-001–003 and 005 are live; none of the `20250807*` fundraiser/profile/campaign tables exist even though the migration history marks them applied (BUG-071); BUG-028 is not live.
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
