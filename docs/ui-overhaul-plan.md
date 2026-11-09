# UI overhaul plan (Phase 0)

Restyle the BCS Seattle site to the Figma mocks without changing how anything works.

**Sources read for this plan**

- Mocks `3Bn4blk2PjqfEEULNVGCue`: the Mocks, Mobile app and BCS parts pages, including every screen note.
- Art Gallery library `5bthU3bcIj93tjdz5OQjZs`:
  - Foundations: Color 18:2, Type 18:490, Spacing 18:629.
  - Component pages: Actions & Forms, Navigation, Status, Transactions, Containers, Overlays, Data & States.
- Current-UI baseline `N7bAk3uF4nyuFl5rcea6BB`: Foundations 3:2.

All token values below come from `get_variable_defs`, not from screenshots.

**Status: waiting for your go-ahead.** No code has changed; this branch (`ui-overhaul/plan`) holds only this file.

## Corrections to the brief

I found these while reading the code. They change the plan slightly.

| Brief says | Code today |
|---|---|
| Header nav "just wraps on mobile" | BUG-050 (e8a1da0) added a phone menu below `lg`, built on a native `<details>` element ([Navlinks.tsx:192](../components/ui/Navbar/Navlinks.tsx)). An `@mobile` e2e scenario covers it. Decision 3 replaces it. |
| `text-zinc-700` on Mission | Also on Vision ([vision.tsx:3](../components/vision.tsx)) and Bylaws ([bylaws/page.tsx:3](../app/about-us/bylaws/page.tsx)). All three get fixed. |
| Invalid `text-md` on InfoBlock | Also in [Hero.tsx:10](../components/Hero.tsx) and [account/page.tsx:101](../app/account/page.tsx). All three get fixed. |
| `bg-blue-50` on InfoBlock | Used in about 15 more places, mostly the election pages. Those become Info Banners when their pages are restyled (Phases 3–4). |
| Checkboxes are circles because of `rounded-sm` | `rounded-sm` is `calc(var(--radius) - 4px)`, which is 8px on a 16px box. The new `--radius` (8px) makes `sm` 4px, so the token change alone fixes it. |
| Breadcrumbs show raw slugs | Partly true. BUG-048 already shows "Details" for IDs. Slugs still read as words, e.g. "Password signin". See the Phase 1 fix below. |
| Ballot routes are split | A combined route `/elections/[id]/vote` and its API (`submitCombinedVotes`) already exist. The detail page only links to them when an election has no candidates and no initiatives. See Decision 1. |

---

## 1. Token mapping

**Format.** `styles/main.css` keeps `H S% L%` triplets read through `hsl(var(--x))`. That keeps Tailwind opacity modifiers working; the code uses `border-primary/30`, `from-muted/50` and others. Each hex value below was converted exactly.

**Contrast.** Each text token was checked on both `card` (white) and `background`; all pass AA.

**Dark mode.** Only Light-mode values are mapped. The library defines Dark values too, but the app has no dark theme: Tailwind uses `darkMode: class` and nothing ever sets the class. Dark mode is out of scope.

### shadcn variables (names kept; values re-pointed)

| shadcn variable | Today | Art Gallery variable | Value | HSL triplet | Notes |
|---|---|---|---|---|---|
| `--background` | white | `background` | #F5F6F7 | `210 11.1% 96.5%` | Pages sit on light grey; cards are white. |
| `--foreground` | slate-950 | `ink` | #15181B | `210 12.5% 9.4%` | 17.8:1 on white |
| `--card` | white | `card` | #FFFFFF | `0 0% 100%` | |
| `--card-foreground` | slate-950 | `ink` | #15181B | `210 12.5% 9.4%` | |
| `--popover` | white | `popover` | #FFFFFF | `0 0% 100%` | |
| `--popover-foreground` | slate-950 | `ink` | #15181B | `210 12.5% 9.4%` | |
| `--primary` | copper `24.6 76% 40%` (BUG-025) | `ink-fill` | #15181B | `210 12.5% 9.4%` | The primary button becomes ink black. White on ink is 17.8:1, so the BUG-025 contrast goal is met and its comment is updated. |
| `--primary-foreground` | slate-50 | `on-ink-fill` | #FFFFFF | `0 0% 100%` | |
| `--secondary` | teal `194.3 89.8% 33%` | `surface-muted` | #EEF0F2 | `210 13.3% 94.1%` | The shadcn `secondary` fill becomes a neutral surface. Six files use `text-secondary`, mainly the site name and Notion code; they are restyled where they're used. |
| `--secondary-foreground` | white | `ink` | #15181B | `210 12.5% 9.4%` | |
| `--tertiary` | navy, unused | — | — | — | **Removed.** Nothing references it, and the library has no equivalent. |
| `--muted` | slate-100 | `surface-muted` | #EEF0F2 | `210 13.3% 94.1%` | |
| `--muted-foreground` | slate-500 | `text-muted` | #596068 | `212 7.8% 37.8%` | 6.4:1 on white, 5.9:1 on `background` |
| `--accent` | slate-100 (hover fill) | `accent` | #1F5577 | `203.2 58.7% 29.4%` | **Changes meaning to match the library**: accent is now the prussian blue used for interaction. The four `components/ui` files that use `bg-accent` as a hover fill switch to `bg-accent-100` in the same Phase 1 commit, so no hover turns dark blue. |
| `--accent-foreground` | slate-900 | `on-accent` | #FFFFFF | `0 0% 100%` | |
| `--destructive` | red-500 | `danger` | #A3211B | `2.6 71.6% 37.3%` | 7.5:1. Today's red-500 is 3.8:1, which fails AA for text. |
| `--destructive-foreground` | slate-50 | `on-danger` | #FFFFFF | `0 0% 100%` | |
| `--border` | slate-200 | `border` | #E2E5E8 | `210 11.5% 89.8%` | Dividers and card edges |
| `--input` | slate-200 | `border-strong` | #7D848C | `212 6.1% 52%` | Field borders need 3:1 against their background (WCAG 1.4.11). `border` is only 1.26:1; `border-strong` is 3.78:1. |
| `--ring` | blue-500 | `accent` | #1F5577 | `203.2 58.7% 29.4%` | The Focus/Ring effect is a 2px card-coloured gap plus a 2px accent band, which is shadcn's existing `ring-2 ring-offset-2`. |
| `--radius` | 0.75rem | `radius-lg` | 8px | `0.5rem` | `lg` = 8, `md` = 6, `sm` = 4. These match `radius-lg`, `radius-md` and `radius-sm` exactly. |

### New variables (no shadcn equivalent)

Each is added to `:root` and to `tailwind.config.js` colors.

| New variable | Art Gallery variable | Value | Used for |
|---|---|---|---|
| `--accent-100` | `accent-100` | #E7EFF5 | Selected OptionCard fill, current NavRow, menu and select hover, Info banner fill |
| `--accent-200` | `accent-200` | #B8CEE0 | Info banner border |
| `--mat` | `mat` | #E8EAEC | Progress track, image placeholder |
| `--border-strong` | `border-strong` | #7D848C | Secondary button border, unselected radio and checkbox (also `--input`) |
| `--badge-{green,orange,blue,purple,red,neutral}-{bg,border,text}` | same names | see library Color 18:2 | Badge tones. The banner tones reuse green, orange and red. All text/bg pairs pass AA; the lowest is orange at 4.84:1. |
| `--money-negative-{bg,border,text}` | same names | #FBEEE7 / #F0D2BC / #9C4221 | Badge tone "Money" and negative amounts (expenses, fees) |
| `--paper`, `--paper-ink`, `--paper-muted`, `--paper-rule` | same names | #FFFFFF / #15181B / #5B6168 / #D9DCDF | Receipts and invoices (library TearSheet) |

Not added: `red-dot`. The library reserves it for the art "sold" sticker, which this site doesn't have.

### Old hardcoded colours to new tokens (baseline file, "Color · Semantic")

| Baseline token | Where | Becomes |
|---|---|---|
| `content/prose` zinc-700 | Mission, Vision, Bylaws | `text-foreground`, with `text-muted-foreground` for secondary prose |
| `link/emphasis` orange-900 | Auth form links (4 files) | Button `variant="link"` (accent #1F5577) |
| `info/background` blue-50 | InfoBlock, election pages | Banner `tone="info"` (`accent-100` / `accent-200`) |
| footer `border-gray-900/25` | [Footer.tsx](../components/Footer.tsx) | `border-border` |
| footer `hover:text-zinc-500` | Footer links | `hover:underline` in `text-foreground`. Colour alone doesn't mark the hover. |

### Typography

| Item | Today | New |
|---|---|---|
| UI font | Inter is loaded as `--font-sans` but never mapped, so production renders the system font | `fontFamily.sans: ['var(--font-sans)', ...defaults]` |
| Serif | none | `Source_Serif_4` from `next/font/google` as `--font-serif`, mapped to `fontFamily.serif`. No new dependency. Used only for the editorial and display styles below. |

Text styles are added as Tailwind `fontSize` entries, each with its line-height, weight and tracking:

| Tailwind class | Library text style | Values |
|---|---|---|
| `text-display` | Title/Display | 30/36, 600 |
| `text-screen` | Title/Screen | 22/28, 600 |
| `text-panel` | Title/Panel | 20/26, 500 |
| `text-section` | Title/Section | 17/24, 600 |
| `text-item` | Title/Item | 15/20, 600 |
| `text-body` | Body/* | 14/20 |
| `text-table` | Table/* | 13/18 |
| `text-caption` | Caption/* | 12/16 |
| `text-micro` | Micro/* | 11/14 |
| `text-overline` | Label/Overline | 11/14, 600, uppercase, tracking 0.06em |
| `text-figure` | Figure/Price | 20/24, 500 |
| `font-serif text-doc-title` | Document/Title | Source Serif 4, 28/32 |
| `font-serif text-doc-lead` | Document/Artwork Title Roman | Source Serif 4, 18/24 |
| `font-serif text-hero` | Proposed Display/Hero (Home note) | Source Serif 4, 56/62 |

Figma reports letter spacing as 6 for Overline and −1 for Display. I'm reading those as percentages (0.06em and −0.01em) and will confirm with `get_design_context` in Phase 1.

### Spacing, sizes, shadows

| Item | Library | Tailwind | Change |
|---|---|---|---|
| Spacing | `space-N` = N × 4px (0.5 through 12) | Default scale | None; it already matches. |
| Control heights | `control-sm` 28, `control-md` 36, `control-lg` 44 | `h-7`, `h-9`, `h-11` | None |
| Row and topbar | `row` 52, `topbar` 52 | — | Add `spacing.13: '3.25rem'` |
| Shadow/Card SM | `0 0 2px #08131E0A, 0 2px 8px #08131E05` | `shadow-sm` | Override |
| Shadow/Card LG | `0 1px 4px #08131E0D, 0 10px 22px #08131E1A` | `shadow-md`, `shadow-lg` | Override both. Menus, selects and the dialog use them. |
| Shadow/Panel | `-8px 0 24px -12px #08131E26` | `shadow-panel` | New; for the Sheet |
| Focus/Ring | — | `ring-2 ring-ring ring-offset-2` | None; the `--ring` value above does it. |

---

## 2. Component mapping

### Art Gallery library to `components/ui`

| Library component (node) | Code | Notes |
|---|---|---|
| Button 5:155: Primary, Secondary, Ghost, Destructive, Link × Small 28 / Medium 36 / Large 44; Default, Focus, Disabled | [button.tsx](../components/ui/button.tsx) | Variants map as `default`→Primary, `outline`→Secondary, `ghost`, `destructive`, `link`; sizes `sm`, `default`, `lg`. The shadcn `secondary` variant becomes an alias of `outline` so call sites keep working. The "one primary per view" rule is enforced page by page in Phases 3–4. |
| IconButton 5:199 (Ghost, Outline) | button.tsx `size="icon"` | The Scrim style is for artwork overlays; not used. |
| Checkbox 5:207 (with Mixed) | [checkbox.tsx](../components/ui/checkbox.tsx) | 4px radius; accent fill when checked |
| Segmented control 5:213 and item 5:212 | **new** `components/ui/segmented-control.tsx` | Built on the installed `@radix-ui/react-radio-group`, since frequency is a single choice. Avoids adding toggle-group. |
| Field 5:250 (Default, Focus, Invalid, Read-only) | [input.tsx](../components/ui/input.tsx), [textarea.tsx](../components/ui/textarea.tsx), [label.tsx](../components/ui/label.tsx), [form.tsx](../components/ui/form.tsx) | Label, control, then hint or error. Invalid shows an icon and text, not only colour. |
| PriceField 5:278 | input.tsx `prefix="USD"` | Donate "Other amount", expense amount, fundraiser goal |
| Radio 62:81 | [radio-group.tsx](../components/ui/radio-group.tsx) | |
| OptionCard 62:100 | **new** `components/ui/option-card.tsx` | A RadioGroup item rendered as a card with label and detail. Used for donate amounts, payment methods, ballot candidates and initiative choices. |
| SearchBar 6:23 | **new** `components/ui/search-bar.tsx` | Admin › Members toolbar; an Input with a leading icon |
| Tabs 6:356 and Record tabs 6:357 | [tabs.tsx](../components/ui/tabs.tsx) | Underlined, with an optional `count` |
| Breadcrumbs and Back link 82:208 | [breadcrumb.tsx](../components/ui/breadcrumb.tsx) and new `BackLink` export | |
| NavRow 6:87, Workspace button 6:88, AppSidebar 6:204 | composed inside `PortalSidebar` (below) | There is only one organisation, so the workspace block is static, without a switcher. |
| Badge 7:157: Green, Orange, Blue, Purple, Red, Neutral, Money × Round/Square | [badge.tsx](../components/ui/badge.tsx) | `tone` and `shape` props. The text label is always required (status never shown by colour alone). |
| PrivateValue 7:209 | inside `ExpenseRow` | Lock icon plus the word "Private" |
| Card 17:20 (Default, Muted) | [card.tsx](../components/ui/card.tsx) | `variant="muted"` for the Home "Get involved" cards |
| StatTile 17:105 | **new** `components/ui/stat-tile.tsx` | Community funds totals, ballot "3 of 5 answered" |
| Banner 17:192: Attention, Info, Error, Success | [alert.tsx](../components/ui/alert.tsx) renamed to `components/ui/banner.tsx`; imports updated | `tone` prop; icon plus title. Replaces [info-block.tsx](../components/ui/info-block.tsx). |
| TearSheet 17:243 | [invoice.tsx](../components/donations/invoice.tsx), [receipts/](../components/ui/receipts) | Paper tokens on the web receipt. The PDF follows the same type and colours. |
| SummaryLine 65:478 | inside `GiftSummary` | |
| Table rows and headers (StatementTable 13:256) | [table.tsx](../components/ui/table.tsx) | 36px header, 52px rows, Table/Regular 13/18 |
| TransactionStep (ballot phases 11:1197) | **new** `components/ui/transaction-step.tsx` | Done, current and upcoming, each with an icon and words |
| Dialog 36:85 (Standard, Destructive) | [alert-dialog.tsx](../components/ui/alert-dialog.tsx) | |
| Menu and MenuItem 36:119 | [dropdown-menu.tsx](../components/ui/dropdown-menu.tsx) | |
| Combobox and Option 37:172 | [select.tsx](../components/ui/select.tsx) | Radix Select restyled. No combobox is needed. |
| DateField 37:201 | input.tsx with `type="date"` | Native date input. A picker library would be a new dependency. |
| Toast 36:208 (Neutral, Success, Error) | sonner `toastOptions.classNames` in [layout.tsx](../app/layout.tsx), plus [Toasts/](../components/ui/Toasts) | Both toast systems stay (BUG-022). |
| Avatar 33:69 (Person, Organisation × S/M/L) | [avatar.tsx](../components/ui/avatar.tsx) | Neutral fallback; drops today's blue gradient |
| PersonRow 33:70 | **new** `components/ui/person-row.tsx` | Avatar, name and secondary text |
| StatePanel 33:134 (Empty, No results, Error, No access) | **new** `components/ui/state-panel.tsx` | Fundraisers empty state, empty tables |
| SkeletonRow 33:156 | [skeleton.tsx](../components/ui/skeleton.tsx) | |
| Pagination 34:191 | [pagination.tsx](../components/ui/pagination.tsx) | |
| Progress (BCS/Progress 3:289) | [progress.tsx](../components/ui/progress.tsx) | 6px, ink bar on a `mat` track. Never accent or green. |
| Result header (BCS 23:2005, Success and Pending) | **new** `components/ui/result-header.tsx` | |
| Action bar (BCS 13:2105) | **new** `components/ui/action-bar.tsx` | Sticky bottom bar with a status line and the one primary button; small screens only |
| Confirm sheet (BCS 23:2006) | **new** `components/ui/confirm-sheet.tsx` | Bottom Sheet below `md`, AlertDialog from `md` up; one API (Decision 4) |
| Sheet (header and portal menus) | **added by CLI:** `pnpm dlx shadcn@latest add sheet` | See Decision 4 for the dependency it brings. |

**Not used.** These library components have no matching feature on this site:

- FilterChip, DimensionField, Red dot, AvailabilityChip, TrustMark, LinkBadge, StatusBadge.
- ConsignmentCard, EventTimeline, ProposalCompare, DraftField, CaptureReview, SuggestionRow, PayablesTable.
- WallLabel, Tooltip, ChecklistItem, Upload, SortHeader, ColumnsMenu, PreviewAsBar, TaskRow.

### BCS parts to React components

| BCS part (node) | File | Replaces |
|---|---|---|
| Logo 2:200 | [LogoSvg.tsx](../components/icons/LogoSvg.tsx) (existing vector) | The PNG in [Logo.tsx](../components/icons/Logo.tsx); Logo.tsx is deleted |
| Program summary 2:201 | **new** `components/site/program-summary.tsx` | The program blurbs in [programs-and-services.tsx](../components/programs-and-services.tsx) |
| Site header 2:205 | **new** `components/site/site-header.tsx`, a server component that does the same member/admin reads as today's Navbar | [Navbar/](../components/ui/Navbar), [top-navigation.tsx](../components/top-navigation.tsx) |
| Site footer 2:244 | **new** `components/site/site-footer.tsx` | [Footer.tsx](../components/Footer.tsx) |
| Fundraiser card 3:290 | [fundraiser-card.tsx](../components/fundraisers/fundraiser-card.tsx) (restyle) | |
| Progress 3:289 | [fundraiser-progress.tsx](../components/fundraisers/fundraiser-progress.tsx) uses `ui/progress` | |
| Gift summary 3:315 | **new** `components/donations/gift-summary.tsx` | The donate summary column; the mobile summary with an Edit link |
| Member row 3:412 (Pending, Active, Inactive) | **new** `components/portal/member-row.tsx` | Rows in [admin/members](../app/admin/members/page.tsx). Rejected uses the Red tone, following the same pattern. |
| Portal sidebar 9:1314 (8 "current" states) | **new** `components/portal/portal-sidebar.tsx` | Membership group shows for approved members; Admin group for admins only |
| Election card 9:1403 (Voting open, Nominations open, Upcoming) | **new** `components/elections/election-card.tsx` | Cards in [elections/page.tsx](../app/elections/page.tsx). Closed and Results use Neutral, following the same pattern. |
| Money row 9:1427 and compact 13:2119 | **new** `components/portal/money-row.tsx` (`compact` prop) | [recent-donations.tsx](../components/recent-donations.tsx), [recent-funds.tsx](../components/recent-funds.tsx) |
| Expense row 9:1426 (Private false/true) | **new** `components/portal/expense-row.tsx` | Rows in [expenses.tsx](../components/expenses.tsx) |
| Ballot position 10:1163 | **new** `components/elections/ballot-position.tsx` | Position blocks in the three voting forms |
| Initiative card 10:1192 and mobile 13:2135 | **new** `components/elections/initiative-card.tsx` | Responsive; three OptionCards in a row from `md`, stacked below |
| Review row 23:1979 | **new** `components/elections/review-row.tsx` | |
| List row 13:2112 | **new** `components/portal/list-row.tsx` | Account rows, receipt rows, ballot-submitted rows |
| Mobile status bar, App header, Tab bar, tab icons | not built | Native-app chrome (Phase 4 rule). Tab bar: see Decision 3. |

---

## 3. Page mapping

"Restyle" means: no mock, so the page gets new tokens and shared components only, with no new layout or copy.

### Public site (site header and footer)

| Route | Mock(s) |
|---|---|
| `/` | Home 4:58. Home · Mobile 14:1723 is a members' app home (open election, your contribution), so it serves only as the single-column reference. |
| `/donate` | Step 1: Donate 5:252 and Give · Mobile 14:1906. Step 2: Your information 24:2596. Step 3: Payment 24:2699. The wizard logic and the BUG-077 step validation stay as they are. |
| `/donate/confirmation` | No change (it redirects to `/donate`) |
| `/donate/confirmation/[donationId]` | `completed`: Gift complete 24:2778. `pending`: Gift pending 24:2843. `failed`: same layout and text, restyled. The BUG-042 branch and its 5-second refresh stay. |
| `/fundraisers` | Fundraisers 6:301, empty state 6:534, mobile 14:2052 |
| `/fundraisers/[id]`, `/fundraisers/[id]/donate` | Restyle |
| `/fundraisers/[id]/donations/[donationId]/confirmation` | Restyle, reusing ResultHeader and receipt rows |
| `/about-us`, `/about-us/mission`, `/about-us/vision`, `/about-us/bylaws` | Restyle |
| `/get-help`, `/get-involved`, `/contact-us` | Restyle |
| `/what-we-do`, `/youth-programs`, `/funeral-burial`, `/funeral-burials` | Restyle |
| `/resources`, `/resources/immigration`, `/resources/immigration/[slug]` | Restyle |
| `/privacy`, `/terms` | Restyle (Notion CSS classes in main.css re-pointed to tokens) |
| `/signin`, `/signin/[id]`, `/register` | Restyle |
| `/members/[id]/pending` | Restyle |

### Member portal (portal layout with sidebar; Decision 5)

| Route | Mock(s) |
|---|---|
| `/account` | Account · Mobile 19:2559, the only reference. On desktop the same grouped rows sit in the portal content column. |
| `/elections` | Elections 11:860, mobile 17:2110 |
| `/elections/[id]` | Election ballot 11:1114 and Ballot · Mobile 17:2284 while voting is open, then Review votes 25:2792, Submit ballot 25:2931 and Ballot submitted 25:3075. Other phases: restyle. See Decision 1. |
| `/elections/[id]/vote`, `/vote/candidates`, `/vote/initiatives` and their three `confirmation` pages | Restyle with BallotPosition, InitiativeCard and ResultHeader (Decision 1) |
| `/elections/[id]/results`, `/nominate`, `/candidate`, `/candidate/[candidateId]` | Restyle |
| `/community-funds` | Community funds 12:1281, Funds · Mobile 19:2389 |
| `/contribute`, `/membership-fee` | Restyle |
| `/members`, `/members/[id]` | Restyle |
| `/admin/members` | Admin › Members 7:572 |
| `/admin/expenses` | Admin › Expenses 12:1631 |
| `/admin/elections`, `/admin/election-types`, `/admin/voting-config` | Restyle |
| `/fundraisers/admin/new`, `/fundraisers/admin/[id]/edit` | Restyle |

### Left out of the mocks: the app doesn't have the data

These go in the PR descriptions.

| Mock shows | Why it's left out | What renders instead |
|---|---|---|
| Ballot: "Member since 2024 · Youth programs volunteer" under candidates | `candidates` has `bio` and no member-since data | The bio |
| Ballot: "Your ballot is saved as you go" | There are no saved drafts | Sentence dropped |
| Ballot phases: "Results · Published 2 Dec 2026" | There is no results date | "After voting closes" |
| Sidebar: pending-member count next to Members ("3") | It would need a new query in the layout | No count |
| Footer and donate receipt note: EIN 99-2495973 | Sample value | The EIN is shown only where the page already reads `organization` (the receipt) |
| Home hero "Community photo" | Placeholder; no photo asset exists | Image column omitted; copy spans the width |

---

## 4. Decisions

### Decision 1: Ballot shape

**Recommendation:** one ballot on `/elections/[id]`, submitted through the two existing per-part endpoints. No backend change.

**Why not the existing combined route.** A combined path already exists: the `/elections/[id]/vote` page posts to `POST /api/elections/[id]/vote` (`submitCombinedVotes`). It looks like the obvious fit, but two gaps stop me recommending it without changing the backend:

1. **It skips the candidate voting window.** `submitCombinedVotes` checks only `start_date`/`end_date`. The candidate endpoint also checks `isCandidateVotingOpen`, which honours `candidate_voting_start/end` when `enable_separate_voting_periods` is on (BUG-015, BUG-060). Using it for every ballot would accept candidate votes outside their window.
2. **It records no `vote_sessions` rows.** The election page decides "already voted" from `vote_sessions` (session types `candidates` and `initiatives`). After a combined vote it would show the Vote buttons again. The server would still refuse a second vote (BUG-016), but the page would be wrong.

Fixing either means changing a handler or a query, which the constraints rule out.

**How the recommended flow works.** It follows the mocks: one ballot, then Review votes, then a confirm step, then Ballot submitted.

1. **One ballot.** `/elections/[id]` renders the ballot mock while voting is open. The breadcrumb ("Elections / 2026 General Election"), the back link and the phase timeline in the mock all belong to the election page.
   - Positions use BallotPosition, including the "Skip this position" option today's form already has.
   - Unopposed positions show as a Success banner, using the existing `shouldShowUnopposedStatus`.
   - Initiatives use InitiativeCard. The labels become Support, Oppose and Abstain; the values stay `yes`, `no` and `abstain` (BUG-052).
   - When separate voting periods are on and only one window is open, only that section is offered. The other shows when it opens.
   - Each part disappears once the member has voted on it, using today's `hasCandidateVotes` and `hasInitiativeVotes` flags.
2. **Review votes, then confirm.** These are client steps on the same page, as today's forms already do with `showSummary`. Review lists every question; skipped ones are flagged with Change or Answer links that scroll back. The confirm step is a bottom Sheet on phones and an AlertDialog on desktop.
3. **Submit.** Calls `POST /api/elections/[id]/vote/candidates`, then `POST …/vote/initiatives`, sending each only if it has answers. Each endpoint keeps all its own guards: window, active member (BUG-007), already voted (BUG-016), positions from the database (BUG-011) and valid initiative options (BUG-052).
4. **Ballot submitted.** A ResultHeader plus one row per part, each linking to that part's existing confirmation page and its code.

**The page needs two more reads,** both of which already exist in the vote pages and are reused unchanged:

- the position order from `election_positions`;
- the `currentUserIsActiveMember()` check, so a ballot is only offered to active members (BUG-007).

**Trade-offs:**

- **Not atomic.** If the candidate submission succeeds and the initiative one fails, the member has a partial ballot. The Submitted screen then shows the part that went through, plus an Error banner and a "Submit initiative votes" retry for the rest. A retry is safe because each endpoint refuses a second vote on its own part. Today's split flow already allows voting on one part only, so this adds no new state.
- **An all-blank ballot can't be submitted.** Both servers refuse empty ballots today. If every question is skipped, Submit is disabled with "Answer at least one question to submit".
- **Old routes stay.** `/vote`, `/vote/candidates` and `/vote/initiatives` and their confirmation pages keep working and are restyled; e2e tests, the candidate profile page and bookmarks use them. The candidate page's "Vote" link points to `/elections/[id]#ballot`.

**Tests that change** (visible text only; no URL asserted by a scenario changes):

- In `e2e/steps/elections.steps.ts`, the steps "I vote for … as …" and "I vote … on …" click "Vote for Candidates" and "Vote on Initiatives" from the election page. They will vote through the ballot on that page instead, through "Review votes" and "Submit ballot". Each step then follows its Submitted row's link to the existing per-part confirmation page, so the URL and confirmation-code assertions stay the same.
- The combined-ballot step (BUG-052 gating) only needs new button names ("Review & Submit" becomes "Review votes"; "Submit Vote" becomes "Submit ballot"). It still posts to the combined endpoint and lands on `/vote/confirmation`.

**Alternative:** make the combined endpoint the one path. That requires a backend change to `submitCombinedVotes` (window check plus `vote_sessions` rows). It's cleaner long-term and atomic, but it's out of bounds for this overhaul. I'd suggest it as a separate ticket.

### Decision 2: Currency and date format

**Recommendation:** add shared formatters in a new `utils/format.ts` and use them everywhere money or dates are shown on screen.

**Money: `formatMoney(cents, { whole? })`**

- Built on `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', currencyDisplay: 'code' })`, which gives "USD 1,000.00".
- The space after "USD" is a non-breaking space, so an amount never wraps.
- A negative amount gets a true minus sign (U+2212), not a hyphen: "−USD 720.00".
- With `whole: true` there are no cents, following the mocks: fundraiser raised and goal ("USD 6,450") and preset amount options ("USD 100").
- Every transaction, receipt, ledger and total shows cents ("USD 100.00").

**Dates**

- `formatDate(date)` gives "14 Nov 2026" (`en-GB` day, short month and year, time zone `America/Los_Angeles`).
- `formatDeadline(date)` gives "1 Dec 2026, 23:59 PST": 24-hour time plus the zone abbreviation, PST or PDT as the date requires.

**Scope**

- Changed: all on-screen UI, the web receipt and the PDF receipt (the donor sees both side by side).
- Unchanged: `getPriceString` stays for outbound text, namely the SMS reminder in `utils/helpers.ts` and `utils/membership/handlers.ts:179`. Changing it would alter messages members already receive, which isn't a UI change.

**Tests that change**

- `e2e/features/donations/general-donation.feature:31` and `:75`: "Donation Amount: $100" and "$50" become the new receipt text.
- No other test asserts a displayed amount. The Stripe Checkout assertions ("$100.00") check Stripe's page and are unaffected.
- `__tests__/helpers.test.ts` doesn't change.
- Phase 1 adds one `__tests__/format.test.ts` covering whole and cents amounts, negatives, the non-breaking space, and dates in PST and PDT.

### Decision 3: Mobile web navigation

**Public header:** replace the BUG-050 `<details>` menu with a Sheet opened by a "Menu" button below `lg`. The Sheet holds the flat nav, then Member sign in, then Donate.

- The Sheet adds a focus trap, Escape to close, scroll lock and focus return, which `<details>` lacks.
- The cost is that the menu needs JavaScript; the `<details>` menu worked before hydration.
- The BUG-050 guarantees stay: no sideways scroll, and the `@mobile` scenario "the phone menu navigates to Fundraisers" passes because the trigger is still named "Menu".

**Member portal: collapsible sidebar menu (recommended), not the bottom tab bar.**

Below `lg`, the portal shows a 52px top bar with a Menu button, the page title and a back link. The button opens the same PortalSidebar in a left Sheet.

Why not the tab bar (Home · Give · Elections · Funds · Account):

- **The tabs don't match the portal's routes.** There is no member "Home" route, and "Give" is the public `/donate`.
- **It can't hold everything.** It has no room for My contribution or the member directory, nor for admins' four destinations. It would need a "More" tab, which means two navigation systems to maintain.
- **It's drawn as native-app chrome**, which the brief says not to add.

One PortalSidebar in two containers (rail and Sheet) is less code and keeps the portal's navigation identical at every width.

Ballot and donate wizard screens follow the mobile mocks: the sticky ActionBar replaces in-page buttons below `md`.

### Decision 4: shadcn components and dependencies (needs your OK)

| Component | CLI adds | Recommendation |
|---|---|---|
| `sheet` | `@radix-ui/react-dialog` (Radix, same family as the 16 Radix packages already installed) | **Add.** Header menu, portal menu, and the confirm sheet on phones. |
| `drawer` | `vaul` | **Don't add.** `Sheet side="bottom"` gives the same bottom sheet; we lose only swipe-to-dismiss. The Cancel and "Keep reviewing" buttons and Escape still close it. |
| `toggle-group` | `@radix-ui/react-toggle-group` | **Don't add.** SegmentedControl is built on the installed radio group. |

So the only new package is `@radix-ui/react-dialog`, through `shadcn add sheet`.

### Decision 5: Portal layout through route groups

Today `app/layout.tsx` renders the site header, footer and breadcrumbs around every page. To give portal pages a sidebar instead:

- Site pages move under `app/(site)/` and portal pages under `app/(portal)/`. URLs don't change; route groups aren't part of the path.
- `app/layout.tsx` keeps only `<html>`, fonts, analytics and toasts.

The portal layout reads the member and admin flags, the same queries the Navbar runs today:

- Approved members and admins get the sidebar shell.
- Anyone else on a portal URL (signed out, pending) gets the site shell. The page's own redirects and auth checks are untouched.

This is a large rename diff, with no logic changes. It lands in Phase 3 as its own commit.

### Decision 6: Smaller items. These are my defaults; say if you want otherwise.

1. **Member directory in the sidebar.** The mock's Membership group has My account, Elections, Community funds and My contribution, but no `/members` directory. I'll add "Member directory" as a fifth Membership row so the page stays reachable, and list it as a deviation.
2. **Header for signed-in users.** The mock shows the signed-out header ("Member sign in"). Signed-in members see "My account" (to `/account`) in that slot instead, and Sign out moves to the portal sidebar footer and the Account page (Account mobile 19:2698).
3. **Home copy.** I'll use the mock's static copy for the hero headline, section titles and "Get involved" card blurbs; it is design content, not sample data. Facts in the mock (EIN, dates, amounts) are not copied. Tell me if you'd rather keep today's Home copy.
4. **Integration branch.** Phase 1 turns the primary colour from copper to ink across the whole site before any page has its new layout. I suggest phase PRs target a `ui-overhaul` branch, which merges to `develop` after Phase 3, so `develop` never ships a half-restyled site. Otherwise each PR targets `develop` directly, as the brief says.

---

## 5. Phases, PRs and checks

| Phase | PR contents |
|---|---|
| 1 Foundations | Tokens, the `bg-accent` hover swap in `components/ui`, fonts, `--tertiary` removal, the baseline fixes, `utils/format.ts` and its test |
| 2 Components | `components/ui` restyle, the new components, `shadcn add sheet`, and the BCS parts. Pages wire up only where a component replaces another one-for-one. |
| 3 Pages with mocks | Route groups and portal layout; Home, Donate and confirmation, Fundraisers; Elections and the ballot (Decision 1); Community funds, Account, Admin › Members, Admin › Expenses |
| 4 Small screens and no-mock pages | 393px pass, the header Sheet, the portal Sheet, ActionBar, and every restyle-only page listed above |

**Baseline fixes in Phase 1:**

- Fonts mapped (`--font-sans`, `--font-serif`).
- `text-zinc-700` in three places; `orange-900` auth links in four files; InfoBlock (becomes a Banner, invalid `text-md` removed); footer divider and hover colours.
- Square checkbox, through the radius token.
- Logo becomes LogoSvg.
- Breadcrumbs: a label map for static segments (e.g. `password_signin` becomes "Sign in with password"). IDs still read "Details" (BUG-048). Portal pages pass entity names to the topbar breadcrumbs.

**Every phase:**

- `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test` and `pnpm build`.
- `pnpm e2e:smoke` and `pnpm e2e:bugs`; `pnpm e2e:critical` before the last PR.
- Screenshots of each mocked page at 1440 and 393 wide, from the local e2e stack (seeded data), compared with `get_screenshot` of its Figma node. Before and after images go in each PR.

Every BUG-### comment and its fix stays in place. Where a restyle touches one (BUG-025, -042, -048, -050, -052, -066, -077 and others), the PR names it.
