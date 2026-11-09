# E2E BDD suite: audit report

- **Date:** 2026-11-08, `develop` @ `410377a` plus the suite (uncommitted at the time of writing)
- **Suite:** Playwright 1.65 + Cucumber 13.3 + TypeScript, in [`e2e/`](../e2e/README.md)
- **Update 2026-11-08 (after `621d3f3`):** BUG-073 fixed. Its scenario now gates (86 gating / 46 known-bug) and the `last` profile is gone. Results below are as first measured.
- **Run against:** production's schema (schema-only dump of `tljjvmdmahkrvklyrdqq`), develop's unreleased fundraiser tables, a production build of the app, and Stripe **test mode**.

## 1. Codebase analysis summary

| Area | Finding that shaped the suite |
|---|---|
| Stack | Next.js 15 App Router (server actions + route handlers), Supabase (Postgres/RLS, auth, storage), Stripe hosted Checkout + webhook, Resend/Gmail/Twilio/Notion integrations. |
| Existing tests | 3 Jest files for voting that can't run (BUG-068; placeholder keys, non-UUID ids, unused helpers). No E2E, no CI. Nothing was reusable. |
| Test database | `supabase db reset` can't replay the repo's migrations (duplicate `20250807000000`, BUG-027), and `seed.sql` would also fail (BUG-076). The suite runs its own Supabase project from a **production schema dump**. That made security findings verifiable against what is actually deployed. |
| Production vs develop | Production has **no fundraiser, campaign or profile tables**, although the migration history marks them applied (BUG-071). The suite adds develop's fundraiser schema in `e2e/supabase/migrations/00000000000001_develop_unreleased.sql` (since squashed into `supabase/migrations/20261108000100_develop_fundraisers.sql`). |
| Roles | Visitor; signed-in user; applicant (`isApproved=false`); approved member (`isApproved`, `status='active'`); admin (`users.is_admin`, plus `user_metadata.role` on two fundraiser pages, BUG-004). |
| UI conventions | No `data-testid`; labels are wired, so role/label locators work. Results are shown through `?status=`/`?error=` redirects rendered by a Radix toaster; Sonner toasts never render (BUG-022). |
| Environment hazards | `.env` holds real Resend/Gmail credentials and the Stripe client prefers `*_LIVE` keys. The e2e env blanks the integrations, and a guard script refuses to run the app with live keys, real mail credentials or a non-local database. `next dev` enables a membership bypass flag, so tests run a production build. |

## 2. Feature coverage matrix

Gating scenarios must pass in every run. Bug scenarios assert the *intended* behaviour of a documented defect and fail until it is fixed.

| Feature file | Gating | Known-bug | P0 / P1 / P2 | What it covers |
|---|---:|---:|---|---|
| `auth/sign-in` | 5 | 1 | 3 / 3 / 0 | Valid/invalid sign-in, return to requested page, sign-out, open redirect |
| `auth/sign-up-and-password` | 3 | 1 | 1 / 3 / 0 | Sign-up → registration, duplicate email, reset email (Mailpit), password confirmation |
| `access/route-protection` | 11 | 2 | 13 / 0 / 0 | 8 protected routes, admin gate, own statement PDF, others' PDF and details |
| `access/data-security` (API) | 1 | 8 | 8 / 1 / 0 | RLS on users/members/donors/donations/votes, open email endpoint, security report |
| `membership/registration` | 9 | 1 | 2 / 7 / 1 | Registration (existing and brand-new account), 5 required fields, terms, family type, resubmission |
| `membership/status` | 3 | 2 | 0 / 4 / 1 | Directory, pending, inactive, new applicant, no member row |
| `admin/member-approval` | 3 | 3 | 1 / 4 / 1 | Approve, cancel, reactivate, reject, deactivate, email column |
| `elections/voting` | 4 | 5 | 5 / 4 / 0 | Open election, candidate ballot + confirmation code, double vote, initiative vote, eligibility, status badges, position bypass, URL flag override |
| `elections/nomination-and-results` | 3 | 3 | 0 / 6 / 0 | Nominate, already nominated, nomination window, results page, API percentages, member tallies |
| `donations/general-donation` | 5 | 5 | 3 / 7 / 0 | Card one-time and monthly to Stripe, webhook completion → receipt + PDF, validation, cents, Zelle, guest receipt, unpaid receipt, guest donation |
| `fundraisers/browse-and-donate` | 6 | 4 | 4 / 5 / 1 | List + progress, donate → Stripe metadata, webhook → total, donor wall, amount bounds, replayed webhook, guest browsing, no end date, in-app navigation |
| `fundraisers/admin` | 5 | 3 | 2 / 6 / 0 | Create (+ DB + listing), 2 validation messages, goal minimum, non-admin, admin button, landing page, edit |
| `payments/webhooks` (API) | 2 | 1 | 2 / 1 / 0 | Unsigned and forged events rejected, unhandled event type |
| `account/account` | 6 | 0 | 0 / 6 / 0 | Account page, change name, contribution plans, membership fee, community funds (real Stripe test balance), applicant gate |
| `public/site` | 12 | 3 | 0 / 12 / 3 | 8 public pages, About menu, contact form + validation, funeral fund sign-up, program links |
| `quality/responsive-and-accessible` | 7 | 5 | 0 / 0 / 12 | Phone width (375px), axe critical scan ×4, contrast, single h1, keyboard-only sign-in, empty states |
| **Total** | **85** | **47** | **44 / 69 / 19** | 132 scenarios, 788 steps, 16 feature files |

Plan items deliberately covered differently than first sketched:

- **BUG-028:** not covered as a bug. Production still has the working `handle_new_user`, so the "brand-new account registers" scenario is a passing regression check instead.
- **BUG-043** (the $0.50 Stripe minimum): no scenario. The intended error text isn't specified anywhere, and the browser's own `min` check makes the case ambiguous.

## 3. Implemented BDD scenarios

All scenarios live in [`e2e/features/`](../e2e/features), written in user language.

- **Personas:** "an approved member", "a pending applicant", "an admin", and so on. Each is created per scenario through the service-role API, then signed in through the real form.
- **Payments:** steps verify the Stripe Checkout session through the test API (amount, mode, metadata). They then play Stripe's part with a correctly signed webhook event.
- **API-level scenarios** (`@api`): these call Supabase and HTTP endpoints exactly as an attacker could, using the public key and their own login.

## 4. Test framework architecture

```
features (Gherkin) ─► steps (TS, one file per area) ─► support/
                                                      ├─ world.ts   per-scenario state + cleanup stack
                                                      ├─ hooks.ts   browser/worker, context+trace/scenario,
                                                      │             failure attachments, @serial scheduling
                                                      ├─ db.ts      service-role factories + FK-aware teardown
                                                      ├─ stripe.ts  test-mode Checkout lookup, signed webhooks,
                                                      │             paid-contribution fixture
                                                      ├─ auth.ts    UI sign-in, toast/URL settling
                                                      └─ env.ts     local/test-only guard
e2e/supabase/   own Supabase project (ports 573xx): prod schema dump + develop overlay + reference seed
e2e/scripts/    write-env (blanks integrations), next.mjs (guarded build/serve), summary.mjs
```

- **Isolation and parallelism.** Each scenario runs in a fresh browser context and creates its own data. Display names carry random suffixes, because shared admin and list pages show every row. Teardown runs last-in-first-out and respects foreign keys. **After a full gating run plus the bug ledger, every table checked is empty.** The 4 workers run in parallel; `@serial` scenarios run alone.
- **No page objects.** Interactions are short helper functions inside each step file. No flow was repeated enough across files to justify classes.
- **Diagnostics.** A failed scenario gets a full-page screenshot, its URL, browser console errors, failed and 5xx requests, and a Playwright trace, all in `e2e/reports/`.
- **Reports.** The HTML report shows passed, failed and skipped scenarios with durations; JSON and JUnit outputs are for CI.
- **CI.** `.github/workflows/e2e.yml`:
  - Pull requests: `@smoke` on Chromium.
  - Nightly and manual: full regression on Chromium, Firefox and WebKit, plus the non-gating bug ledger.
  - Artifacts are kept for 14 days.
  - It needs two repository secrets: `STRIPE_TEST_SECRET_KEY` and `STRIPE_TEST_PUBLISHABLE_KEY`.

## 5. Execution results (local, macOS, 4 workers)

| Check | Result |
|---|---|
| `cucumber-js --dry-run --strict` | 132 scenarios / 788 steps, 0 undefined, 0 ambiguous |
| `tsc -p e2e` | clean |
| Gating regression, Chromium | **85/85 passed**, final 3 consecutive runs; ~26 s |
| Gating regression, Firefox | **85/85 passed**, 3 consecutive runs after the hydration fix below |
| Gating regression, WebKit | **85/85 passed**, 3 consecutive runs after the URL-settling fix below; ~32 s |
| `@critical` repeated | 31/31 passed in 5 consecutive runs (~10 s each) |
| Known-bug ledger (`bugs`) | 46/46 fail, each at its intended assertion |
| Server-poisoning bug (`last`) | 1/1 fails as intended (BUG-073), on a fresh server |
| Safety guard | Refuses to run with `sk_live_…` or real mail credentials (verified) |
| CI workflow | Written and YAML-validated; **not yet run on GitHub** |

Flakiness found and fixed in the tests (no app changes):

- **WebKit:** the toaster's `router.replace()` interrupted the next `page.goto()`. Steps now wait for the URL to settle.
- **Firefox under load:** a click on the terms checkbox could land before React hydrated it. The step now retries until the checkbox is checked.
- **Nomination:** the step didn't wait for the form to finish loading. Fixed.

## 6. Identified application defects

Full rows, with locations, are in [BUGS.md](BUGS.md).

**New, found by this suite:**

| ID | Severity | Defect | Evidence |
|---|---|---|---|
| BUG-073 | **Critical** | `getOrCreateUser` signs up guest donors on the shared service-role client, which then runs as that donor. The first guest card donation fails ("Unable to access customer record."), and every later admin query on that server instance fails RLS. | E2E, server log. **Fixed** (`auth.admin.createUser`) |
| BUG-074 | High | Opening a fundraiser by in-app navigation (list card, or the redirect after creating one) stays on the loading skeleton for over 30 s. A full load works. Suspected cause: BUG-039. | E2E ×2 scenarios |
| BUG-071 | High | Production migration history says the fundraiser, campaign and profile migrations ran, but the tables don't exist. A future `db push` would skip them. | prod dump + `migration list` |
| BUG-072 | Medium | A new applicant sees "membership is inactive… contact support" instead of "pending". | E2E |
| BUG-076 | Medium | `seed.sql` re-creates an existing trigger. | code |
| BUG-077 | Medium | On `/donate`, phone is effectively required, and a missing donor name silently blocks the final submit. | code |
| BUG-075 | Low | Contact form shows "Required" instead of field-specific messages. | E2E |

**Bugs with an executable reproduction (39 IDs, including the new ones above):**

- 001, 002, 003, 004, 005, 006, 007, 008, 009, 010
- 011, 012, 014, 015, 017, 018, 019, 020, 021, 025
- 026, 029, 032, 033, 034, 035, 036, 037, 038, 041
- 042, 047, 050, 051, 056, 072, 073, 074, 075

BUG-001, 002, 003 and 005 are **confirmed live in production's RLS**.

Corrections to BUGS.md:

- **BUG-057 is not a bug.** "Reactivate Member" renders for an approved-but-inactive member, and reactivation works (gating scenario).
- **BUG-039 doesn't reproduce as described.** The donor wall renders on a full page load. The real symptom is BUG-074.
- **BUG-018's visible symptom is different from the description.** The donor doesn't see an error: nothing happens at all, and a pending donation is left behind.
- **BUG-028 is not live in production.**
- **BUG-017 is not reached yet.** BUG-004 turns `is_admin` admins away from the edit page first, so the scenario carries both tags.

## 7. Unimplemented or blocked scenarios

| Scenario | Why |
|---|---|
| Real payment on Stripe's hosted page (4242 card, live webhook) | Descoped by decision: deterministic signed webhooks used instead |
| Recurring renewals, subscription status changes, `invoice.upcoming` SMS | Webhook branches call the Stripe API and Twilio; need `stripe listen` or Stripe test clocks |
| Contact or funeral form *failure* reporting (BUG-031) | The send is fire-and-forget; no observable signal in the UI |
| Immigration resources (`/resources/immigration/*`) | Needs a Notion token; the integration is blanked in tests |
| OTP sign-in, email change confirmation | Feasible via Mailpit; not yet written |
| Combined ballot `/vote` (BUG-052) | Unreachable from the UI (shown only when there are no candidates and no initiatives) |
| Realtime "live results" across two sessions (BUG-045) | Feasible with two browser contexts; not yet written |
| `getOrCreateUser` beyond 50 users (BUG-053), shared default password | Needs >50 seeded users; not yet written |
| Membership-fee and contribution checkout | Products in the e2e DB use placeholder Stripe ids; only rendering is tested |
| Admin election management, fundraiser updates | Features don't exist (GAP-A1, "Add Update" 404s) |

Residue: card donations by signed-in members create customers in the Stripe **test** account, through the app's own `createOrRetrieveCustomer`. The suite deletes only the customers it creates itself.

## 8. Recommended next steps

1. ~~Fix BUG-073 first.~~ Done.
2. **Repair the migration history (BUG-071) before releasing fundraisers**, then refresh the e2e baseline dump and drop the overlay migration.
3. Add the two Stripe test secrets to GitHub and let the workflow run once. Make `smoke · chromium` a required check on `main` and `develop`.
4. Close RLS bugs BUG-001–003 and 005. Their scenarios turn green when fixed; then remove `@known-bug` and keep the `@BUG-0xx` tag.
5. Add `data-testid` only where the role/label locators get awkward, such as table rows and the donor wall.
6. Extend coverage in this order:
   1. Stripe test clocks for renewals and failures
   2. OTP sign-in through Mailpit
   3. Two-context realtime results
   4. Election admin, once GAP-A1 exists
7. Retire the broken Jest voting tests, or fix BUG-068 and keep them as unit tests. The E2E suite now covers their journeys.
