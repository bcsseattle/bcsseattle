# End-to-end tests (Playwright + Cucumber)

Behaviour-driven tests that drive the real app in a real browser against a real
(local) Supabase and Stripe **test mode**. Feature files describe what the site
does for members, admins and visitors; known bugs are written as the behaviour we
*want* and tagged with their ID from [`docs/BUGS.md`](../docs/BUGS.md).

Results and coverage: [`docs/E2E_REPORT.md`](../docs/E2E_REPORT.md).

## What runs where

| Piece | Where | Notes |
|---|---|---|
| Database + auth | Supabase stack from `e2e/supabase/`, ports **573xx** | Production schema (dump) + develop's unreleased fundraiser tables + reference data. Never touches the app's own `supabase/` stack or production. |
| App | `next build` + `next start` on **http://localhost:3100** | Production build: `next dev` turns on a feature flag that skips the membership check. |
| Stripe | Your Stripe **test** account | The suite stops at hosted Checkout, then posts a *signed* `checkout.session.completed` to `/api/webhooks`. |
| Email, SMS, Notion | Off | `e2e/scripts/write-env.mjs` blanks them; Resend gets a dummy key that can't send. |

`e2e/scripts/next.mjs` refuses to build or start the app if the effective env
(including anything Next would load from `.env*`) points at a non-local Supabase,
holds a live Stripe key, or has real mail/SMS credentials.

## First run

Needs Docker and Stripe **test** keys (`sk_test_…`, `pk_test_…`).

```bash
pnpm install
pnpm e2e:db:start          # e2e Supabase stack (first start applies schema + seed)
pnpm e2e:env               # writes e2e/.env.e2e (gitignored)
pnpm e2e:build             # next build against the e2e stack
pnpm e2e:serve &           # http://localhost:3100
pnpm e2e:smoke             # quick check
```

`e2e:env` takes Stripe keys from `STRIPE_TEST_SECRET_KEY` /
`STRIPE_TEST_PUBLISHABLE_KEY`, or from `.env.local` when those are test keys.

Rebuild (`pnpm e2e:build`) after changing app code or `e2e/.env.e2e`. Note that
it writes `.next/`, so run `pnpm dev` or `pnpm build` again afterwards for normal work.

## Commands

| Goal | Command |
|---|---|
| Gating regression (everything except known bugs) | `pnpm e2e` |
| Smoke (fast P0 subset, runs on every PR) | `pnpm e2e:smoke` |
| Critical journeys | `pnpm e2e:critical` |
| Known-bug ledger (expected to fail) | `pnpm e2e:bugs` |
| Every scenario | `pnpm e2e --profile all` |
| One feature | `pnpm e2e e2e/features/elections/voting.feature` |
| One scenario (line) | `pnpm e2e e2e/features/elections/voting.feature:17` |
| By name | `pnpm e2e --name "votes for a candidate"` |
| By tag | `pnpm e2e --tags "@fundraisers and @P0"` |
| One bug | `pnpm e2e --profile all --tags @BUG-012` |
| Other browser | `BROWSER=firefox pnpm e2e` / `BROWSER=webkit pnpm e2e` |
| Headed | `pnpm e2e:headed` |
| Step-through debugging (Playwright Inspector) | `pnpm e2e:debug e2e/features/…feature:LINE` |
| Fewer/more workers | `E2E_PARALLEL=1 pnpm e2e` |
| Validate steps + types (no browser) | `pnpm e2e:check` |
| One-line-per-scenario summary of the last run | `node e2e/scripts/summary.mjs` |

## Reports and failures

Every run writes `e2e/reports/`:

- `cucumber.html`: readable report with passed, failed and skipped scenarios and durations. A failed
  scenario has its full-page screenshot, the URL at failure, browser console errors
  and failed/5xx requests attached.
- `traces/<scenario>.zip`: Playwright trace of each failed scenario. Open with
  `pnpm exec playwright show-trace <file>`.
- `cucumber.json`, `junit.xml`: for CI and tooling.

## Tags

| Tag | Meaning |
|---|---|
| `@P0` `@P1` `@P2` | Priority: critical journeys, functional regression, extended coverage |
| `@smoke` | Fast P0 subset run on every pull request |
| `@critical` | Business-critical journeys |
| `@known-bug` + `@BUG-0xx` | Asserts intended behaviour of a documented bug; excluded from gating runs |
| `@api` | Calls Supabase or HTTP endpoints directly (no page interaction) |
| `@security` `@payments` `@a11y` `@mobile` | Concern-based tags; `@mobile` uses a 375×812 viewport |
| `@serial` | Asserts on global state (empty lists); never runs alongside another scenario |

When a bug is fixed, its scenario turns green in `pnpm e2e:bugs`: remove
`@known-bug` (keep the `@BUG-0xx` tag for traceability) so it joins the gating run,
and update the bug's status in `docs/BUGS.md`.

## Layout

```
e2e/
  cucumber.mjs          profiles (default, smoke, critical, bugs, all)
  features/<area>/      Gherkin, written from the user's point of view
  steps/                step definitions, one file per area
  support/
    env.ts              loads e2e/.env.e2e; refuses non-local / non-test settings
    world.ts            per-scenario state (page, personas, created records, cleanup)
    hooks.ts            browser per worker, context + trace per scenario, failure
                        attachments, LIFO cleanup, @serial scheduling
    db.ts               service-role factories: users, members, elections, votes,
                        fundraisers, donations; cleanup that respects FKs
    stripe.ts           test-mode helpers: donation product, Checkout session
                        lookup, signed webhook events, paid contribution fixture
    auth.ts             sign in through the real form; toast + URL settling
    expect.ts           Playwright expect with the suite's timeout
  supabase/             e2e-only Supabase project (config, migrations, seed)
  scripts/              env writer, guarded Next runner, report summary
```

## Writing scenarios

- **Isolation.** Each scenario creates its own people and records through
  `support/db.ts`, and the `After` hook deletes them. Never depend on another
  scenario's data. Persona display names get a random suffix because admin and
  list pages show everyone's data, and scenarios run in parallel.
- **Locators.** The app has no `data-testid`s. Use `getByRole` and `getByLabel`. Radix
  selects and menus must be opened before their options exist.
- **Messages.** Server actions redirect with `?status=`/`?error=`, and the toaster
  shows them, then strips the params. After an action, `messageSettled(page)`
  waits for that cleanup; otherwise the next `goto` races it (WebKit).
  Sonner toasts are never rendered (BUG-022), so don't assert on them.
- **Waiting.** No sleeps. Use web-first assertions or `expect.poll` for database state.
- **Payments.** Stop at `checkout.stripe.com` and verify the session through the
  Stripe test API, then use `postWebhook(checkoutCompleted(...))`.

## Schema maintenance

`supabase/migrations/00000000000000_baseline.sql` is a schema-only dump of
production taken on 2026-11-08 (project `tljjvmdmahkrvklyrdqq`). Refresh it when
production's schema changes:

```bash
pnpm exec supabase db dump --linked -f e2e/supabase/migrations/00000000000000_baseline.sql
pnpm e2e:db:reset
```

The repo's `.env.local` currently has a line the CLI can't parse; until it's fixed,
run the dump from a directory that holds only `supabase/config.toml` and
`supabase/.temp/`.

`00000000000001_develop_unreleased.sql` adds what `develop` has and production
doesn't (fundraisers). Fold it into the baseline once those tables are deployed.
