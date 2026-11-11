# Election management plan

Status: **Phases 1–5 built** (plan approved 10 Nov 2026). Notifications wait for your approval (P10 in `docs/mobile-app-gaps.md`). Every question was answered on 10 Nov 2026 (§10), and the plan below includes those answers.

This plan covers the full election lifecycle under **Admin › Elections**: create, nominate, review, lock the ballot, vote, certify, publish, and archive or cancel. Today most of these steps need SQL.

Branch: `elections/phase-0-plan`, from `develop` (`8a1e841`). Mobile phases 0–4 are merged into `develop`. Phase 5 (`mobile/phase-5-store`) isn't merged yet, but it doesn't touch any election code, so nothing here depends on it.

---

## 1. What exists today (checked against the code)

The brief's picture is mostly right. Corrections and additions are in **bold**.

| Area | What the code does |
|---|---|
| Admin pages | `admin/elections/page.tsx` is a read-only table with View and Results links. Its status comes from dates only (Upcoming, Open, Closed). **`admin/voting-config` and `admin/election-types` are test pages that display things ("Voting Configuration Test", `TestElectionTypesPage`). They don't configure anything.** |
| `utils/election-admin.ts` | **Only `getElectionVotingStatus` is used (by voting-config).** `closeCandidateVoting`, `reopenCandidateVoting`, `updateCandidateVotingConfig` and `configureElectionByType` have no callers. They write through the user's client without an admin check, so only RLS protects them. Delete them in Phase 2. |
| Root `*.sql` | Elections were set up by hand with these scripts. **A row that never sets `status` stays `draft`**, which is the column default. |
| `elections.status` | Nothing in the app writes it. **The setup SQL did, though: the one production election has `voting_open`.** **Three places read it.** The push cron skips `draft` and `cancelled`. The results API returns 404 to members for `draft`, `cancelled` or `is_active = false` (BUG-037). The candidate page shows the raw value (W18). |
| `election_positions` | Keyed by `election_type` **text**, with no write policy (service role only). **The website's nominate form lists every row, whatever the type. The app lists only the election type's rows (W8).** |
| `position_enum` | **No column, function or code uses it.** It only appears in `types_db.ts`. |
| `candidates` | **No foreign key from `election_id` to `elections`.** There's a unique `(user_id, election_id)`, so a member holds one candidacy per election. Candidates can edit or withdraw until `start_date`, **which isn't the candidate window when separate periods are on.** |
| `nominations` | Unused, as the brief says. **Its RLS is wide open.** Any signed-in user can insert any row (`WITH CHECK (true)`), and anyone, even signed out, can read every row. `election_id` has no foreign key. |
| Self-nomination | `nominateCandidate` inserts straight into `candidates` with the service role. **It never checks membership.** The app's API lets any signed-in user nominate. The website's page only requires that a `members` row exists, not that the member is approved and active. Photo uploads fail because the bucket has no storage policies (W1). **`nominateCandidateWithRollback` is an unused near-copy.** |
| Elections RLS | Admins manage. **Every signed-in user reads every election, drafts included (W2 / D5).** Signed-out visitors read rows with `is_active = true`. |
| Vote checks | The handlers check membership, the window, one vote per position and duplicates, then insert with the service role (BUG-005). **The `vote_sessions` insert policy (`user_can_vote_in_session`) checks only `start_date`/`end_date`. It ignores status and the candidate window.** |
| Results | Members get tallies whenever candidate voting isn't open. **There's no certification step: results are effectively published the moment voting closes.** The winner is rank 1 with more than 0 votes. **A tie gets whichever candidate sorts first.** |
| Phase logic | `votingWindows` is shared. The nomination window and phase words are duplicated: the website uses exclusive edges (W15), and the app has its own `electionPhase`. |
| Notifications | **A daily Vercel cron (`/api/cron/election-reminders`, 17:00 UTC) already pushes** "nominations open", "voting open" and "last day to vote" through `utils/push.ts`. It skips drafts and cancelled elections. **Email works too** (Resend and nodemailer; Mailpit in e2e). |
| Audit | **An `audit_logs` table exists (`user_id`, `action`, `meta`, timestamp without time zone), but nothing writes it.** |
| Time | `formatDeadline` already prints "1 Dec 2026, 23:59 PST" in America/Los_Angeles. |
| Mobile app | `apps/mobile` reads `elections`, `candidates`, `initiatives`, `election_positions` and the member's own vote rows directly under RLS. It uses `votingWindows`, `electedUnopposed`, `positionOrder` and `ballotOffer` from `rules.ts`. Nominating and results go through `/api/app/...` and `/api/elections/...`. **It isn't in the stores yet**, so no installed copies can break. Once it ships, older versions will stay out there, so schema changes after launch must be additive. |

### Production data (read-only dump of the election tables, 10 Nov 2026; `votes` not read)

- **One election: "BCS Seattle Annual Elections - 2025".** It's a `leadership` election with status `voting_open` and `is_active` set.
  - Nominations ran 17–21 Jun 2025. Voting ran 21 Jun – 29 Jul 2025 (Pacific). The candidate window was only 3 hours, with separate periods on.
  - It has 6 candidates, one per position, all linked to users, and 3 initiatives.
- **No orphan candidates or initiatives,** so the new foreign keys are safe. **`nominations` has 0 rows.**
- **`election_positions` has 7 `leadership` rows:** President, four named Vice Presidents (Community Outreach and Engagement; Programs and Operations; Finance and Development; Youth and Education Initiatives), Secretary and Treasurer. "Vice President of Programs and Operations" had no candidate in 2025.

### Bylaws findings that change the plan

- **Art. VI §1–2: the officers (President, Vice President(s), Secretary, Treasurer) are elected by the Board of Directors, not by the members.** The Board does this each year at its first meeting after the annual meeting. **Decided (B1): members elect the officers, as they do today.** The tool follows that decision. Making the bylaws match is the board's call.
- **Art. IV §1: Directors are elected at the annual meeting**, and members get notice at least 30 days ahead by mail and electronically. **Art. V §2:** the Board has 3 to 9 Directors, each serving a 2-year term. So board elections fill several seats at once, and seats per position is a real requirement.
- **Art. III §3:** "each member in good standing" may vote and, if elected, serve on the board. **Art. III §5:** membership can be ended after 3 consecutive months of unpaid dues.
- **Art. VI §4:** the Board fills an officer vacancy for the rest of the term.
- **Art. IV §5–6:** a quorum is a majority of members, and decisions need a majority of those present. Both are written for meetings. **Art. XII:** amending the bylaws needs a 2/3 vote of members present at a meeting with quorum.
- The bylaws say nothing about nominations, candidate eligibility, ballot method, ties, too few nominees, unopposed candidates, electronic voting or certification. These are all listed in §10.
- Two problems on the bylaws page itself: Art. III §1 ends with "Membership eligibility includes:" and nothing after it, and Art. III has two Section 1s.

---

## 2. Decisions (recommendations)

### D1. Who nominates

**Recommendation:** a member can nominate themselves or another eligible member.

- A nomination of someone else waits until the nominee accepts it, and the nominee writes their own statement and adds their photo when they accept.
- A self-nomination counts as accepted straight away.
- A person can be *nominated* for several positions but can *accept* only one per election. Accepting one turns the others into "declined". This keeps the existing `candidates (user_id, election_id)` unique constraint, and nobody can win two seats.

**Decided (B2, B3):**
- Nominations are open to self or others, and a person can accept only one position per election.
- Any approved, active member can be nominated, with no minimum length of membership.

### D2. Where status lives

**Recommendation: one function decides the phase, `electionPhase(election, now)` in `utils/elections/rules.ts`. It reads two inputs:**

1. **`elections.status`, which stores only what an admin decides:** `draft`, `scheduled`, `ballot_locked`, `certified`, `completed` (results published), `archived`, `cancelled`.
2. **The dates, which decide the time-based phases when the row is read:** nominations open, nominations closed, voting open, voting closed.

There's no scheduled job for phase changes. A cron can be late or fail, and a computed phase can't drift. When an admin opens or closes something early, or extends it, the action changes the date and writes a log entry. The status column never holds a time-based state.

- Website, app, handlers and the cron all call the same function. A SQL twin, `public.election_phase()`, enforces the same rule in RLS. A parity test runs both over the same cases.
- The enum values `nominations_open`, `nominations_closed`, `voting_open` and `voting_closed` are backfilled away. A CHECK constraint then stops anything from writing them again. Postgres can't drop enum values without rebuilding the type, so they stay in the enum, unused.
- **This fixes W15–W18:**
  - **W15:** both platforms use the same inclusive nomination window.
  - **W16:** the candidate-window step shows only when separate voting periods are on.
  - **W17:** results words come from the certified outcome: Elected, Elected unopposed, Tie, Supported, Opposed, No votes.
  - **W18:** the candidate page shows the shared phase.
  - **W8 and W2 get fixed too.** See §3.

### D3. Positions per election

**Recommendation: yes. Add a `ballot_positions` table** with `election_id`, `title`, `description`, `seats` (1–9) and `display_order`.

- A new election starts with its type's rows from `election_positions`, or the defaults in `rules.ts`. Admins can then edit the list for that election.
- `election_positions` stays as the per-type template, and the admin can't edit it in this project.
- `candidates.position` stays as text, because the vote handlers and the app read it. A new nullable `candidates.ballot_position_id` is added and backfilled, and the server keeps the two in step when it approves a candidate.
- **Drop `position_enum`.** Nothing uses it.

### D4. Existing data

- **Existing `candidates` rows count as approved.** Each row with a `user_id` gets a matching `nominations` row with `status = 'approved'`, the nominator set to the nominee, and a `candidate_id` link, so it shows under "My nominations". Rows without a user (added by SQL) stay as candidates added manually.
- **The unused `nominations` table is extended, not replaced.** It already has the right shape and unique key. I expect it to have no rows. Any rows that do exist become `status = 'submitted'`, with the nominator set to the nominee. Checking that needs a production read: see question O1.
- **Existing elections:** see the status backfill in §3.

### D5. Ballot edge cases

The bylaws say nothing on any of these. **Decided:** B4 (plurality), B5 (run-off), B6 (no quorum), B7 (more Yes than No), B8 (optional two-thirds) and B10 (extend or vacant). The details:

- **Method:** plurality. In a position with N seats, each voter picks up to N candidates and the top N win. The vote handler's "one per position" check becomes "at most `seats` per position". `votes` already allows one row per candidate.
- **Unopposed:** decided per position, when candidates ≤ seats. Today it's all or nothing for the whole election.
  - The admin chooses one of two options at lock: mark the position elected unopposed (it doesn't appear on the ballot), or keep it on the ballot.
  - The default comes from `show_unopposed_status` and the type.
- **Too few nominees:** a position with 0 nominees, or fewer than its seats, gets a warning at review. The admin chooses: extend the nominations window (which moves the dates, is logged, and notifies members), or leave the position vacant.
  - The certified result then says "No candidate, seat vacant".
  - For officers, Art. VI §4 already says the Board fills vacancies.
- **Ties are settled by a run-off.** The tally marks a tie when there are more candidates at the last winning vote count than seats left. The results tab shows "Tie, run-off needed".
  - "Start run-off" creates a new election linked to the original by `elections.runoff_of`. It's a draft with the one tied position, only the tied candidates, the seats still to fill, and the original's voter roll. There's no nominations window.
  - The admin sets its voting window and runs it through the normal steps.
  - The original can't be certified until its run-offs are certified. Certifying the original then fills those seats from the run-off results, and both results pages link to each other.
- **Withdrawn after lock** (B13): an admin can mark a candidate withdrawn, and it's logged. They stay on the ballot labelled "Withdrawn" and can't win. Votes already cast for them aren't moved.
- **Initiatives:** each one has a `pass_threshold`:
  - **`majority` (the default):** passes when Yes is more than No. Abstentions don't count, and a tie or no votes means it doesn't pass.
  - **`two_thirds`** (B8, for bylaw amendments): passes when Yes is at least ⅔ of Yes + No.
  - There's no quorum (B6). Turnout is printed on the results.

### D6. Notifications

**Recommendation:** use both channels, chosen by event. Every send is recorded in `election_notifications (election_id, kind, user_id null, sent_at)`, so a retry or a second cron run never sends twice. Nothing real is sent until you approve it.

| Event | Who | Email | Push | Sent by |
|---|---|---|---|---|
| Election published (upcoming) | Eligible members | ✓ | | Publish action |
| Nominations open | Eligible members | ✓ | ✓ (exists) | Daily cron |
| Nominations close in 24 h | Eligible members | | ✓ | Daily cron |
| You were nominated: accept or decline | Nominee | ✓ | ✓ | Nominate action |
| Nomination approved / rejected (with the reason) | Nominee, and the nominator if it's someone else | ✓ | ✓ | Review action |
| Nominations extended | Eligible members | ✓ | | Extend action |
| Voting open | Voter roll | ✓ | ✓ (exists) | Daily cron |
| Last day to vote | Roll members who haven't voted | | ✓ (exists) | Daily cron |
| Voting extended / election cancelled | Eligible members | ✓ | ✓ | Admin action |
| A published election's dates edited (added 12 Nov 2026) | Eligible members | ✓ | | Edit (timeline step) |
| Results published | Eligible members | ✓ | ✓ | Publish action |

- Email goes to people who may not have the app, and it carries detail such as a rejection reason. Push is for reminders.
- A daily cron means "opens" can arrive up to 24 hours late. That's acceptable for nominations and reminders. Admin actions send immediately.
- **Decided (B9):** publishing warns, without blocking, when voting opens less than 30 days later (Art. IV §1). Mailing paper notices stays a manual job.

### D7. Who runs elections

**Recommendation:** any admin (`users.is_admin`), with one rule. **An admin who is a nominee or candidate in an election can't review, lock, certify, publish, resolve ties, cancel or extend that election.** They can still see it.

- The rule is checked on the server and inside the database functions.
- **Changed 12 Nov 2026:** an admin who is standing may review the election's nominations, their own included. Each decision is logged with who made it. The other actions still need an admin who isn't standing.
- If every admin is a candidate, the board needs to make someone else an admin (B10).
- A separate election-officer role isn't worth building until the board asks for one. It would be a new flag on `users`, plus the same checks.

### D8. Certification

**Recommendation:**

- **Closing and certifying are separate steps.** Voting closes at its end time, and admins can extend it before then.
- **Certify** is open to any admin who isn't a candidate in the election. It needs every voting window closed and every tie resolved.
  - It freezes the tally into `election_results`, which holds aggregates only.
  - From then on, members and exports read that table, never `votes`.
- **Undo** ("Reopen certification", with a required reason) works until results are published. It deletes the frozen rows and puts the status back to `ballot_locked`.
- **After publishing there's no undo in the app.** A correction is a board decision, carried out as a logged manual fix.
- **Decided (B15, B16):**
  - One admin certifies.
  - Admins see the totals once every voting window has ended, before they certify. Nobody sees totals while voting is open.

---

## 3. Schema changes

Migrations are listed in order. All of them are additive or backfilled, and none touches `votes`.

**M1 `…_election_status_values.sql`**
- `ALTER TYPE election_status ADD VALUE 'scheduled'`, `'ballot_locked'`, `'certified'`, `'archived'`.
- This has to be its own migration, because Postgres can't use a new enum value in the same transaction that adds it.

**M2 `…_election_lifecycle.sql`**

*Elections*
- New columns:
  - `results_date timestamptz`: when results are expected, shown to members.
  - `eligibility_cutoff timestamptz`: membership must have started by this date.
  - `results_published_at timestamptz`.
  - `runoff_of uuid REFERENCES elections`.
- New columns elsewhere:
  - `initiatives.pass_threshold text CHECK IN ('majority','two_thirds') DEFAULT 'majority'`.
  - `candidates.withdrawn_at timestamptz` (B13).
- Add the missing foreign keys: `candidates.election_id` and `nominations.election_id` → `elections(id) ON DELETE CASCADE`. Production has no orphan rows (checked 10 Nov), so they're added as fully validated.
- **Timeline checks are added `NOT VALID`.** They apply to new writes and leave old rows alone:
  - `nomination_end <= start_date`
  - the candidate window inside `[nomination_end, …)`
  - `start < end` for each window
  - `results_date >= greatest(end_date, candidate_voting_end)`
- **Status backfill** for existing rows. The general rule is below. **In production it touches one row: the 2025 election (`voting_open`, active, ended 29 Jul 2025) becomes `completed`.** Members see its results today, so nothing changes for them.

  | Current row | Becomes |
  |---|---|
  | `cancelled` | `cancelled` |
  | `draft` and `is_active = false` | `draft` (it was only visible through W2) |
  | Voting has ended, not draft, active | `completed` (members see results today, so nothing changes) |
  | Voting has ended, `draft` but active | `certified` (results stay hidden, as they are today, until an admin publishes them) |
  | Voting has ended, inactive | `archived` |
  | Not ended, nomination window over or absent | `ballot_locked` |
  | Not ended, nominations still to come or open | `scheduled` |

- Then add `CHECK (status NOT IN ('nominations_open','nominations_closed','voting_open','voting_closed'))`.
- **`is_active` is kept in step by a trigger** (true for anything that isn't `draft`, `cancelled` or `archived`), so the old readers keep working. New code reads `status` only.

*Positions*
- **`ballot_positions`:**
  - Columns: `id`, `election_id` (FK, cascade), `title`, `description`, `seats int CHECK 1..9`, `display_order`, `unopposed_decision text CHECK IN ('elect','keep_on_ballot') NULL`, `vacant boolean`.
  - Unique `(election_id, title)`.
  - Backfill: for each election, the same list `positionOrder()` builds today (the type's rows, else the defaults, plus any candidate positions not in that list), with 1 seat each.
- **`candidates.ballot_position_id`** (FK, nullable), backfilled by matching on title.
- **Drop `position_enum`.**

*Nominations*
- New columns on `nominations`:
  - `nominated_by uuid`, `ballot_position_id`
  - `status text CHECK IN ('awaiting_acceptance','submitted','approved','rejected','declined','withdrawn')`
  - `full_name`, `bio`, `manifesto`, `photo_url`: the nominee's own words, copied to the candidate on approval
  - `rejection_reason`, `decided_by`, `decided_at`, `candidate_id` (FK), `updated_at`
- Change the unique key to `(election_id, nominee_user_id, ballot_position_id)`. Backfill as in D4.

*Audit and results*
- **`election_events`**, the audit log:
  - Columns: `id`, `election_id`, `actor_id`, `action`, `reason`, `before jsonb`, `after jsonb`, `created_at timestamptz`.
  - **Append-only.** No update or delete policy exists, and rows are written only by `SECURITY DEFINER` functions and triggers.
  - Triggers on `elections`, `ballot_positions`, `initiatives`, `candidates` and `nominations` record who changed what, with the before and after values, so even a SQL fix is logged.
  - I prefer this to `audit_logs`, which has no `election_id`, no time zone, and nothing writing to it.
- **`election_voters`**, the voter roll: `(election_id, user_id)`, filled when the ballot is locked. It's what makes "eligible as of a cutoff" and the turnout denominator possible, because `members` keeps no history.
- **`election_results`**, the frozen tally, holding aggregates only:
  - Columns: `election_id`, `ballot_position_id` or `initiative_id`, `candidate_id`, `votes`, `yes`, `no`, `abstain`, `rank`.
  - `outcome` is one of: elected, elected unopposed, not elected, tie resolved, vacant, passed, not passed.
  - `tie_note`, `certified_by`, `certified_at`.
- **`election_notifications`**: see D6.

*Functions.* Each one checks `current_user_is_admin()` and the candidate rule, applies the guard, updates the row and writes an event, all in one transaction. The server actions call them through the admin's own session, never the service role, so a database check backs up every server check.

| Function | What it does |
|---|---|
| `election_phase(elections, now)` | Returns the phase (the SQL twin of D2) |
| `election_publish(id)` | Publishes a draft |
| `election_extend(id, field, new_time, reason)` | Extends a window |
| `election_lock_ballot(id, decisions jsonb)` | Locks the ballot, records the unopposed and vacancy decisions, and snapshots the voter roll |
| `election_cancel(id, reason)` | Cancels the election |
| `election_certify(id, tie_resolutions jsonb)` | Tallies with the service-definer's rights and writes `election_results`. Never returns individual votes |
| `election_reopen_certification(id, reason)` | Undoes certification before publishing |
| `election_publish_results(id)` | Publishes the results |
| `election_archive(id)` | Archives the election |
| `election_turnout(id)` | Returns `{ eligible, voted_candidates, voted_initiatives }`, counts only |
| `nomination_create`, `nomination_respond`, `nomination_withdraw`, `nomination_decide` | Nomination steps. Members can call the first three; only admins can call `nomination_decide` |

*RLS*

| Table | Policy |
|---|---|
| `elections` | Signed-in users: `status <> 'draft' OR current_user_is_admin()`. Signed-out users: `status NOT IN ('draft','cancelled')`. **Fixes W2/D5 in RLS.** |
| `ballot_positions`, `initiatives`, `candidates` | Read follows the election. Admins write only while the ballot isn't locked. Once the status is `ballot_locked` or later, a trigger rejects every ballot change, for everyone, including the service role. **Two exceptions, both logged:** an admin can fix a candidate's `full_name`, `bio`, `manifesto` and `photo_url` (B14), and can set `withdrawn_at` (B13). |
| `candidates` | A candidate can edit their own statement and photo until the ballot is locked (it was `start_date`). Withdrawing goes through `nomination_withdraw`. |
| `nominations` | Drop the open insert and public-read policies. Nominee and nominator read their own; active members read approved ones; admins read all. All writes go through the functions above. |
| `election_events`, `election_voters`, `election_notifications` | Admins read; nobody writes directly. A member can read only their own roll row. |
| `election_results` | Admins read once certified; members once `completed`. |
| `vote_sessions` insert | `user_can_vote_in_session` adds four checks: `status = 'ballot_locked'`, the correct window for the session type (it ignores the candidate window today), being on the roll, and the session type being on the ballot. |
| `votes` | **No change.** Users read only their own votes. No admin policy, no new function, no route returns rows. |

**M3 `…_candidate_photo_storage.sql`** (W1, an access-rule change, approved 10 Nov 2026)
- Members upload to `candidate-photos/<their uid>/…`. Admins upload anywhere in the bucket. Reads are public.
- The upload path changes to `<uid>/<ts>.<ext>`.

**Types:** run `pnpm supabase:generate-types` after M1–M3.

**Behaviour change with the flag off:** elections made by SQL must now set `status` (`ballot_locked` to vote). A row left on the `draft` default stays hidden and can't be voted in. I'll update the root SQL scripts' comments to match.

---

## 4. State machine

### Stored statuses and transitions

| From | To | Triggered by | Guards |
|---|---|---|---|
| — | `draft` | Admin creates | Admin |
| `draft` | *(deleted)* | Admin "Delete draft" | Never published. Logged |
| `draft` | `scheduled` | Admin **Publish** | Title set. At least 1 position with ≥1 seat, or at least 1 initiative. Timeline valid (below). Voting start in the future |
| `scheduled` | `scheduled` | Admin **Extend nominations** | Before lock. New end is after the old end and before voting start (otherwise the voting dates move too). Reason required |
| `scheduled` | `ballot_locked` | Admin **Lock ballot** | Nominations window over (or none). No nominations left in `awaiting_acceptance` or `submitted`. Each position has candidates ≥ 1, is marked vacant, or has an unopposed decision. The admin isn't a candidate. The voter roll is snapshotted |
| `ballot_locked` | `ballot_locked` | Admin **Extend voting** | A voting window hasn't ended yet. New end > old end. Reason required |
| `ballot_locked` | `ballot_locked` | Admin **Start run-off** | Every voting window has ended. A tie exists on a position. Creates a linked draft run-off election |
| `ballot_locked` | `certified` | Admin **Certify** | Every voting window has ended. Every tie has a certified run-off. The admin isn't a candidate |
| `certified` | `ballot_locked` | Admin **Reopen certification** | Results not published. Reason required. Frozen results deleted |
| `certified` | `completed` | Admin **Publish results** | — |
| `completed` | `archived` | Admin **Archive** | — |
| `scheduled`, `ballot_locked` | `cancelled` | Admin **Cancel** | Not certified. Reason required. Votes are kept but never tallied |

### Phases computed from status and time

Windows include their edges. Times are stored in UTC.

| Status | Time | Phase (member wording) |
|---|---|---|
| `draft` | any | Draft (admins only) |
| `scheduled` | before `nomination_start` | Upcoming |
| `scheduled` | inside the nominations window | Nominations open |
| `scheduled` | after it, or no window | Nominations closed: under review |
| `ballot_locked` | before the first voting start | Ballot ready: "Voting opens …" |
| `ballot_locked` | inside either window | Voting open (the candidate and initiative windows are tracked separately) |
| `ballot_locked` | after both windows end | Voting closed: counting |
| `certified` | any | Voting closed: counting (members), Certified (admins) |
| `completed` | any | Results |
| `archived` / `cancelled` | any | Archived / Cancelled (with the reason) |

If voting start passes while the ballot is still unlocked, members see "Voting will open soon" and admins see an error banner: "Voting start has passed. Lock the ballot or move the voting dates."

### Timeline rule (validated in the form, in `election_publish`, and by NOT VALID checks)

`nomination_start < nomination_end ≤ voting start < voting end ≤ results_date`

With separate periods, each of the two windows follows that rule on its own. The candidate window must start on or after `nomination_end`. An initiative-only election has no nominations window.

Admins enter local Seattle times, and the server converts them with `dayjs.tz('America/Los_Angeles')`:
- A time that doesn't exist (the spring-forward gap) is rejected with a message.
- An ambiguous time (fall-back) is shown with its zone and stored as the first occurrence (PDT).

---

## 5. Pages and actions

**Changed 12 Nov 2026: editing after publishing.**

| Status | What admins can still change |
|---|---|
| Published, before the lock | Everything: basics, positions and initiatives, the nominations window, the voting dates and times, and the settings. A position that already has nominations or candidates can be renamed but not removed. Renaming a position renames it on its candidates and nominations too. |
| After the lock | The title, the description, and the voting dates and times, either way. |
| Once voting is over, or cancelled | The title and description. |

Every change is recorded with its before and after values. Extend (with a reason) still exists.

All of this is behind the `enableElectionManagement` flag (§7). The admin layout already turns away non-admins. Every action also calls `isCurrentUserAdmin()` and then the database function, which checks again.

### Admin

| Route | Phase | Contents | Actions |
|---|---|---|---|
| `/admin/elections` | all | PageHeader, a "New election" button, and tabs with counts: **Drafts · Upcoming · Nominations · Voting · Closed · Archived** (Archived includes cancelled). Each row shows title, type, phase Badge, the next key date ("Nominations close 1 Dec 2026, 23:59 PST") and a next-action button. Below 640px, rows stack | — |
| `/admin/elections/new`, `/[id]/edit` | draft (later phases allow only the timeline extend fields) | TransactionSteps: **Basics → Positions & initiatives → Timeline → Eligibility & settings → Review**. Each step saves when you continue, and Review shows the publish checklist | `createElection`, `saveElectionStep(step, data)`, `deleteDraft` |
| `/admin/elections/[id]` | all | **Overview:** the phase timeline (TransactionSteps), key dates, one primary next action, and checklist Banners | Next action per phase, below |
| `…/[id]?tab=nominations` | scheduled | Nominations grouped by position, with counts per status. Approve, or Reject with a sheet that requires a reason. Edit the name, statement and photo. **Add candidate manually** (a member, or a name only) | `decideNomination`, `updateNominee`, `addCandidate` |
| `…?tab=ballot` | scheduled → locked | The ballot as members will see it (the real ballot components in preview mode). Per-position warnings and decisions: vacant / extend / unopposed. Initiatives can be edited until lock | `extendNominations`, `lockBallot` |
| `…?tab=voting` | locked | StatTiles: eligible, voted (candidates), voted (initiatives), turnout %. **Counts only.** Window times | `extendVoting`, `cancelElection` |
| `…?tab=results` | voting closed and later | Results from `election_results` after certification, or a live tally shown only to admins once every window has ended. Tie resolution. CSV export, and a print view (print CSS, no PDF library) | `certify`, `reopenCertification`, `publishResults`, `archive` |
| `…?tab=activity` | all | `election_events`, newest first: who, what, when, reason, and the before/after values for changed fields | — |
| `…?tab=settings` | draft (later read-only) | Settings, and Cancel in a danger zone | `cancelElection` |
| `/admin/elections/[id]/preview` | draft+ | The member election page rendered with this row, with a "Preview" Banner | — |
| `/api/admin/elections/[id]/results.csv` | certified+ | Aggregates only | — |

**Next action per phase:**

| Phase | Next action |
|---|---|
| Draft | "Finish setup" (when the checklist fails) or **"Publish"** |
| Upcoming | "Preview" |
| Nominations open | "Review 6 nominations" (when any are submitted) |
| Under review | **"Review N nominations"**, then **"Lock ballot"** |
| Ballot ready | "Preview ballot" |
| Voting | "View turnout" |
| Voting closed | **"Resolve tie"** or **"Certify results"** |
| Certified | **"Publish results"** |
| Completed | "Archive" |

**Confirm sheets** (ConfirmSheet; `tone="destructive"` for cancel) say exactly what will happen. For example:

> **Lock the ballot?** 3 positions and 2 initiatives will be on the ballot. Treasurer will be marked elected unopposed. 214 members are on the voter roll. You can't change the ballot after this. Voting opens 1 Dec 2026, 09:00 PST.

There are similar sheets for Publish, Cancel (with the reason field), Certify (with the outcome summary) and Publish results.

### Member side

| Route | Change |
|---|---|
| `/elections` | Hides drafts (RLS). Phase badges come from `electionPhase` |
| `/elections/[id]` | Reads the new phase. Positions come from `ballot_positions`. Shows "Results expected …", certified outcomes and the cancel reason. Fixes W15–W18 |
| `/elections/[id]/nominate` | Positions for this election only (fixes W8). Choose "Myself" or "Another member" (searches active members by name; they can already see the directory). Statement, platform and an optional photo. Requires an approved, active member on both ends |
| `/elections/[id]/nominations/[nominationId]` | The nominee's page: who nominated them, their message, then **Accept** (statement and photo) or **Decline** |
| `/account/nominations` | "My nominations": each nomination made by me or for me, with its status and reason. Edit or withdraw until the ballot is locked |
| Ballot pages and handlers | The status guard, the roll check, and up to `seats` choices per position. Unopposed and vacant positions are left out |
| Results pages and APIs | Members read `election_results` once `completed`. Before that, they get "Results will be published after certification" |

**Member actions** (`utils/elections/handlers.ts`): `nominate` (self or another), `respondToNomination`, `updateMyNomination`, `withdrawNomination`. `nominateCandidate` becomes `nominate`. `nominateCandidateWithRollback` is deleted.

### App (`apps/mobile`)

The app changes in the same PRs as the matching website pages:
- the phase from `rules.ts`
- positions from `ballot_positions`
- multi-seat choices on the ballot
- nominating someone else, accept/decline and My nominations (Phase 3)
- results from `election_results`

Push deep links get two new routes: nomination respond, and My nominations.

---

## 6. Shared rules (`utils/elections/rules.ts`)

All of these are pure and client-safe, and each gets unit tests.

- **New:**
  - `electionPhase(e, now)`: returns `{ phase, nominationsOpen, windows, nextDate }`. It replaces the app's own `electionPhase` and the website's inline logic.
  - `allowedActions(e, ctx)`: the state machine in §4. Returns the actions an admin may take, with the reason each one is blocked.
  - `validateTimeline(e)`: field errors in plain words.
  - `nominationRules`: who can nominate whom, and acceptance.
  - `tally(positions, counts)`: winners per seat, ties, unopposed and vacant. Tested here and mirrored in `election_certify`.
  - `parseLocalDateTime(value)`: the gap and overlap handling from §4.
- **Changed:**
  - `positionOrder` reads `ballot_positions` (the old fallback stays for any election without rows).
  - `electedUnopposed` becomes per position.
  - `ballotOffer` and `ballotQuestions` handle seats and leave out unopposed and vacant positions.
  - `votingWindows` is unchanged.

**What breaks in the app if it isn't updated alongside:**
- It would show the type's default positions instead of the election's.
- It would limit multi-seat positions to one choice. The server would still accept fewer votes, so no wrong vote is recorded, but members couldn't use all their choices.
- A new self-nomination would show nothing, because the nomination is pending and not yet a candidate.

That's why each phase updates `apps/` in the same PR.

---

## 7. Feature flag

Add `enableElectionManagement` to `utils/feature-flags.ts`, with the env var `FF_ENABLE_ELECTION_MANAGEMENT` and a `feature_flags` row. It defaults to off.

- **With the flag off:** the admin list stays as it is today, without the new tabs, form or detail pages. The member nominate flow stays self-nomination straight into `candidates`.
- **The migrations, RLS and shared phase logic apply either way.** They keep existing data working, and a flag inside RLS would be fragile.
- **The app has no flag.** Its new screens appear only when the API says the election uses the new flow (`ballot_positions` present, plus a `features` field on `/api/app/me`).

---

## 8. Test plan

**Unit tests (Jest, `__tests__/`)**
- Every transition in §4: each guard passing and failing, including the "admin is a candidate" block.
- Window edges:
  - exactly at start and exactly at end (inclusive)
  - 1 ms before start and 1 ms after end
- A window crossing the DST change:
  - fall back, 1 Nov 2026 01:00–02:00 PDT/PST
  - spring forward, 14 Mar 2027 02:00
  - including a nonexistent local time and an ambiguous one
- Separate candidate and initiative windows: one open and one closed, both phases, and the "voting closed" phase only after both have ended.
- `tally`:
  - candidates: single seat; multi-seat; a tie on the last seat; unopposed; vacant; zero votes; a withdrawn candidate who would have won
  - initiatives: majority (yes > no, tie, no votes) and two-thirds (exactly ⅔, just under)
  - filling seats from a run-off
- The `electionPhase` parity between the TS function and `public.election_phase`. A test runs the shared cases against the local DB.

**Access tests (e2e, local Supabase)**
- A non-admin, both through the server action and directly against RLS or the RPC with their own token, can't do any of these:
  - create, edit, publish, lock, extend, cancel, certify or publish an election
  - read `election_events`, the roll or unpublished results
- Nobody can nominate, accept or edit a nomination outside the window or after lock.
- Nobody can change the ballot after lock, including an admin through SQL as `authenticated`.
- Every admin page and API is checked for vote secrecy:
  - their responses are scanned for `votes` row fields or a `user_id` next to a `candidate_id`
  - `election_turnout` returns counts only
- Signed-in members can't see drafts.

**End-to-end Cucumber** (`e2e/features/elections/lifecycle.feature`, with seeded members)

> Admin creates → publishes → member A nominates B → B accepts → C self-nominates → nominations close (clock moved by test helper) → admin approves B, rejects one with reason → locks ballot → members vote → voting closes → admin certifies → publishes → members see results → admin archives.

Plus two more scenarios: cancel with reason, and a tie settled by a run-off before certifying.

**Accessibility:** axe on every new page, extending the existing quality profile.

**Every phase runs** `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm build`, `pnpm e2e:smoke`, `pnpm e2e:bugs`. Phase 1 fixes W6 first: it adds `.eslintrc.json` and fixes what that reports, so `pnpm lint` can run.

---

## 9. Phases and PRs

Each phase is one PR into `develop`, branched from the previous phase. Following the stacked-PR note, I'll target `develop` or retarget the PRs myself.

1. **Data model and rules:** the ESLint config (W6), M1–M3, RLS, backfill, regenerated types, the `rules.ts` functions and unit tests, the database functions, access tests. Also the app's switch to the shared phase. *As built, it differs from the plan in three ways:*
   - `election_certify` moves to Phase 5, with the tally it freezes.
   - The `/admin/election-types` test page was deleted here, because it failed lint.
   - Self-nomination, still the old flow until Phase 3, now requires an approved, active member. Before, anyone signed in could nominate themselves.
2. **Create and edit:** the flag; the list, the step-by-step form, the overview, Activity and preview; delete the dead `election-admin.ts` helpers and the test pages. *As built, it differs from the plan in five ways:*
   - The overview has only the Overview, Activity and Settings tabs. Nominations, Ballot, Voting and Results come with their phases.
   - The preview is the member page itself, with a Preview banner on a draft (RLS lets admins read drafts), not a separate route.
   - Positions and initiatives are edited only in a draft. Edits up to the lock come with the Ballot tab in Phase 4.
   - `elections.cancel_reason` is added, so members can see why an election was cancelled. The activity log is admin-only.
   - A new draft starts from a default timeline 45 days out, because the voting dates are required columns.
3. **Nominations:** the member nominate, accept, decline and withdraw flow, plus My nominations (website and app); admin review and manual add. *As built, it differs from the plan in two ways:*
   - The app nominates yourself only, and accepts, declines and withdraws. Nominating someone else, editing details and a full My nominations list are on the website.
   - Being on the ballot already (a candidate row from older elections, or one an admin added) counts as an accepted nomination, so nobody can stand twice.
4. **Ballot and voting:** lock and preview; seats on the ballot (handlers, website, app); turnout; extend and cancel; member pages reading the new state. *As built, it differs from the plan in three ways:*
   - Initiatives can still be edited only in a draft, not up to the lock.
   - The older `/vote` and `/vote/candidates` pages take one choice per position, so multi-seat elections send members to the election page’s ballot.
   - Marking a candidate withdrawn after the lock is a database function, `election_withdraw_candidate`, so it records a reason.
5. **Results and notifications:** tally, run-offs, certify, publish, CSV and print; notifications, built and tested against Mailpit and the push stubs. Nothing real is sent before you approve it. *As built, it differs from the plan in three ways:*
   - The tally lives only in SQL (`election_outcomes`). The Results tab shows it and certification freezes it, so the two can’t disagree. The e2e scenarios test it against the database, rather than a TypeScript copy.
   - Notifications are switched on by `ELECTION_NOTIFICATIONS=send`, not the feature flag. They’re tested with unit tests; e2e runs them dry.
   - “PDF” is the browser’s print dialog on the Results tab, with the portal chrome hidden. No PDF library is added.

**Things only you can do:**
- push migrations to production
- turn the flag on
- approve notifications
- approve M3 (storage policy)

---

## 10. Decisions (answered 10 Nov 2026)

### Bylaws (silent or conflicting)

| # | Question | Answer |
|---|---|---|
| B1 | Who elects the officers? | **Members**, as today. This conflicts with Art. VI as written; aligning the bylaws is the board's call |
| B2 | Who may nominate? | **The member themselves or another member.** The nominee must accept |
| — | More than one position? | **One accepted position per election** |
| B3 | Candidate eligibility | **An approved, active member.** No minimum membership time |
| B4 | Ballot method | **Plurality:** pick up to N, and the top N win |
| B5 | Ties | **A run-off,** run as a linked follow-up election |
| B6 | Quorum | **None.** Turnout is shown |
| B7 | When an initiative passes | **More Yes than No.** Abstentions aren't counted |
| B8 | Bylaw amendments by initiative | **Allowed,** with an optional ⅔ threshold per initiative |
| B9 | 30-day notice | **A warning, not a block.** Paper notices stay manual |
| B10 | Too few nominees | **Extend the nominations window, or leave the seat vacant,** chosen per position |
| B11 | Voter eligibility | **A roll fixed at lock** (joined by the cutoff date, approved and active), **and still active when voting.** One vote per account, Family memberships included |
| B12 | Terms | **Not recorded for now** |

### Product

| # | Question | Answer |
|---|---|---|
| B13 | Withdrawal after lock | **An admin marks the candidate withdrawn.** They stay on the ballot as "Withdrawn" and can't win. Votes aren't moved |
| B14 | Fixes after lock | **Name, statement and photo can be fixed,** and each change is logged |
| B15 | Two-person certification | **No.** One admin certifies |
| B16 | Admin tally before certifying | **Yes,** once every voting window has ended |
| D2 | Status | **Dates plus admin gates.** One shared phase rule, no scheduled job |
| D3 | Positions | **Per election,** with seats. `position_enum` is dropped |
| D6 | Notifications | **Email and push, chosen per event** (§2 D6). Sends need separate approval |
| D7 | Who runs elections | **Any admin,** except in an election where they're a candidate. **Changed 12 Nov:** a standing admin may still review nominations, their own included (logged) |
| D8 | Undoing certification | **Allowed until results are published** |

### Operational

| # | Question | Answer |
|---|---|---|
| O1 | Production read | **Done.** See "Production data" in §1. The dump didn't include `votes`, and it was deleted after reading |
| O2 | Photo storage policy (W1) | **Approved:** M3 |
| O3 | `pnpm lint` (W6) | **Fixed in Phase 1** |
