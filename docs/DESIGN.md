# BCS Seattle Design System

Design direction for the Baloch Community Services of Seattle website. Read this before building or restyling a page.

## Who this is for

**Subject.** A volunteer-run nonprofit for Baloch families in the Greater Seattle area. It handles membership dues, a funeral and burial fund, fundraisers (including zakat and medical appeals), board elections, youth programs, and help with immigration and citizenship.

**Audience.** Multi-generational and mostly on phones. Many readers have English as a second or third language, and some are elders reading with poor eyesight. Some arrive at hard moments: after a death, during an asylum case, or in a medical emergency.

**Primary job.** Get a family to the thing they came for (paying dues, enrolling in the burial fund, donating, voting, or asking for help) with no confusion and no wasted taps. Celebrating Baloch culture is the second job, and it should never get in the way of the first.

## Direction: Doch and Sound

Two real sources, and nothing invented beyond them:

- **Sound** is the teal of the BCS seal: Puget Sound water under Mount Rainier and the Space Needle. It carries everything functional, including links, buttons, focus and progress.
- **Doch** is Balochi hand embroidery: checkered diamonds and stepped arrowheads worked in red, maroon, blue, green, white and black wool on undyed cotton. The reference is a real piece from the community (see [The stitched band](#the-stitched-band)). It appears only as the stitched band, and only where the community is celebrating.

The page is otherwise quiet: white paper, teal-ink text, generous type, and left-aligned reading. All of the boldness goes into the stitched band, so it stays special.

### Principles

1. **Tasks before mood.** The first screen offers actions (become a member, join the burial fund, donate, get help) before it offers prose about the mission.
2. **One stitched band, used sparingly.** The doch band appears at most twice per page and never on condolence, ballot, form or error screens. See [The stitched band](#the-stitched-band).
3. **Match the register to the moment.** Every page is in one of three registers (everyday, celebration or condolence), and the register decides colour and ornament. See [Registers](#registers).
4. **Readable by an elder on a phone in a parking lot.** 18px body text, 44px touch targets, high contrast and short sentences.
5. **Balochi where it helps people, not as decoration.** Balochi script sits beside English for page names and key actions, written by a native speaker and never machine-translated.

## Colour

| Token | Hex | HSL (for `main.css`) | Role |
|---|---|---|---|
| `sound` | `#0A7FA3` | `194.1 88.4% 33.9%` | Brand teal from the seal. Large type, icons, progress fills, stitched-band thread |
| `sound-deep` | `#075F7A` | `194.1 89.1% 25.3%` | Buttons, links and focus rings. White text on it measures 7.2:1 |
| `ink` | `#14343F` | `195.3 51.8% 16.3%` | All body text and headings. 13.2:1 on white |
| `slate` | `#4D6670` | `197.1 18.5% 37.1%` | Secondary text, captions and meta. 6.1:1 on white |
| `mist` | `#EAF3F6` | `195 40% 94.1%` | Alternate section background and table header rows |
| `paper` | `#FFFFFF` | `0 0% 100%` | Page background |
| `error` | `#B42318` | `4.2 76.5% 40%` | Errors and destructive actions. Always paired with an icon and words |

Rules:

- **Text** uses `ink`, `slate` or `sound-deep`. `sound` is legal for text only at 24px and above, because it measures 4.6:1 on white and 4.1:1 on mist.
- **Thread colours stay in the band.** The doch colours in [The stitched band](#the-stitched-band) never become UI colours. Doch red is not a warning colour: errors use `error` and always carry a message, so the embroidery reads as festive rather than alarming.
- **Do not use raw Tailwind palette classes** (`text-blue-800`, `bg-green-50`, `text-gray-600` and so on) in new code. The current code mixes more than 20 of them. Map each to a token when you touch the file.
- **Success states** use `sound-deep` with a check icon. There is no separate green: a completed donation or vote reads as "done", not as "go".

## Typography

| Role | Family | Weights | Why |
|---|---|---|---|
| English: all text | **Atkinson Hyperlegible** | 400, 700 | Built by the Braille Institute for low-vision readers. Its letters are hard to confuse (Il1, 0O), which serves elders and second-language readers |
| Balochi script | **Noto Naskh Arabic** | 400, 700 | Naskh reads well at small sizes on phones. It covers the Urdu-derived letters Balochi uses (ٹ ڈ ڑ ے). Confirm rendering with a native reader before launch |

Both fonts load through `next/font/google`, which already supports them in Next 15.1. Atkinson Hyperlegible ships only 400 and 700, and that restriction is deliberate. Hierarchy comes from size and space rather than a ladder of weights. When Next is upgraded, *Atkinson Hyperlegible Next* adds intermediate weights, but do not reach for them by default.

### Scale

The scale is the traditional typographic scale from *The Elements of Typographic Style*, starting from an 18px body size.

| Step | Size / line height | Use |
|---|---|---|
| `display` | 48 / 54, 700 | The organisation name in the home hero only. Drops to 36 below 640px |
| `h1` | 36 / 42, 700 | Page title, one per page |
| `h2` | 24 / 32, 700 | Section heading |
| `h3` | 21 / 28, 700 | Sub-section and card title |
| `body` | 18 / 28, 400 | All reading text and form inputs |
| `small` | 16 / 24, 400 | Captions, meta and helper text. Nothing smaller |

- **Measure.** Body text is capped at `65ch`. Never run reading text across the full container.
- **Case.** Use sentence case everywhere: headings, buttons and navigation. Do not use all caps, including for labels or badges.
- **Emphasis.** Use bold for emphasis in body text. Do not colour, italicise or highlight a single word in a heading.
- **Numbers.** Show amounts with tabular figures (`font-variant-numeric: tabular-nums`) in tables, donation totals and progress, so columns line up.
- **Balochi script.** Set it 1.15× the size of the English beside it, because Naskh has a smaller x-height. Use `lang="bal"` and `dir="rtl"`, with line height 1.8.

### Bilingual headings

A page title can carry its Balochi name. English comes first and is the `h1`. The Balochi sits directly below it in `slate`, right-aligned within the same column, so readers of either script find their line where they expect it.

```
Funeral and burial fund                          ← h1, left, ink
                           [Balochi title]    ← Balochi, right, slate (written by a native speaker)
```

Only page titles and the four home-page actions are bilingual. Body copy stays in one language per page until full translations exist.

## The stitched band

The stitched band is the only ornament in the system.

### The reference

The band is drawn from a photograph of a real doch piece shared by the community. The photo shows three panels side by side:

- **Diamond column.** A vertical run of checkered diamonds, each filled with a grid of satin-stitch dots. The fills cycle through maroon, white, blue, green and black on red. Every diamond is flanked by stepped arrowheads (a stepped triangle with a spine), and the column is edged by red rails carrying a fine black-and-white running stitch.
- **Cord stripe.** Tightly couched wool cords in colour blocks (red, green, maroon, black, white, blue), with a line of small silver beads along one edge.
- **Open field.** A large zigzag of stepped diamonds, with small detached crosses scattered on the undyed ground and tacked in place with a dashed black stitch.

Before launch, ask the owner of the piece for permission to use it, and credit them (and the maker, if known) on `/about-us`.

### Thread colours

These are sampled from the photo and lifted slightly for screens. They are decorative and appear only inside the band, which is marked `aria-hidden`.

| Token | Hex | HSL | In the piece |
|---|---|---|---|
| `doch-ground` | `#CBBAB0` | `22.2 20.6% 74.3%` | Undyed cotton ground |
| `doch-red` | `#A42A37` | `353.6 59.2% 40.4%` | Dominant thread: diamond outlines, rails and arrowheads |
| `doch-maroon` | `#6A2229` | `354.2 51.4% 27.5%` | Diamond fills and cord blocks |
| `doch-blue` | `#2F3581` | `235.6 46.6% 34.5%` | Diamond fills and cord blocks |
| `doch-green` | `#1A5A36` | `146.2 55.2% 22.7%` | Diamond fills, cord blocks and the inner rail |
| `doch-white` | `#F7EEEC` | `10.9 40.7% 94.7%` | Diamond fills and running stitch |
| `doch-black` | `#151715` | `120 4.5% 8.6%` | Diamond fills and running stitch |

### Two widths, one band

The band is a horizontal strip of `doch-ground` with its own stitches, like a hem sewn onto the page. It comes in two widths, both taken from the reference:

**Diamond band (32px tall, 24px below 640px).** The diamond column turned on its side:

```
═ ─ ═ ─ ═ ─ ═ ─ ═ ─ ═ ─ ═ ─ ═ ─ ═ ─ ═ ─ ═ ─ ═ ─   ← red rail with black/white running stitch
   ◣◆◢     ◣◆◢     ◣◆◢     ◣◆◢     ◣◆◢           ← checkered diamond flanked by stepped arrowheads
═ ─ ═ ─ ═ ─ ═ ─ ═ ─ ═ ─ ═ ─ ═ ─ ═ ─ ═ ─ ═ ─ ═ ─
```

- Each diamond is a 5×5 grid of square stitches set on its point, outlined in `doch-red`.
- The fills follow the piece's order: maroon, white, blue, green, black, then repeat. That keeps the sequence the maker chose, so do not randomise or reorder it.
- Arrowheads are `doch-red` and point outward from each diamond.
- Draw it as one SVG `<pattern>` tile of five diamonds, repeated along x and snapped to whole stitches. Use `shape-rendering="crispEdges"` so the stitches stay square.

**Cord band (8px tall).** The couched-cord stripe turned on its side: equal blocks of `doch-red`, `doch-green`, `doch-maroon`, `doch-black`, `doch-white` and `doch-blue` in that order, each 24px wide. A row of 2px `#B8BCC0` bead dots runs along the bottom edge every 8px. It is simple enough to build as a CSS `repeating-linear-gradient`.

The scattered crosses and the zigzag field are left out on purpose. They need open space, and the band works because it is narrow.

### Where it goes

| Allowed | Not allowed |
|---|---|
| Diamond band: top edge of the home hero | Funeral, burial and condolence pages |
| Cord band: top edge of the footer | Election ballots and results |
| Diamond band: top of an event or Eid announcement | Forms, checkout and confirmation pages |
| Cord band: above the total of a fundraiser that has reached its goal | Error, empty and 404 pages |

At most two bands may appear on one page. The band has no animation and no hover effect. Give it `aria-hidden="true"`.

## Registers

| | Everyday | Celebration | Condolence |
|---|---|---|---|
| Pages | Membership, account, programs, get help, contact, admin | Home, events, Eid, youth programs, fundraiser reached goal | Funeral and burial, a death notice, funeral fundraisers |
| Background | `paper`, with `mist` for alternate sections | `paper` | `paper` only |
| Stitched band | No | Yes, at most twice | Never |
| Imagery | Real photos of people and places | Real event photos | None, or one still landscape |
| Tone | Plain and direct | Warm | Brief and gentle. State facts and next steps |

Funeral fundraisers use the condolence register even though they live under `/fundraisers`. Set the register from the fundraiser category: `funeral` maps to condolence.

## Layout

- **Container.** Max 1120px, 24px side gutters on mobile and 48px from 768px up.
- **Alignment.** Left-align everything, including the hero. Centred text is allowed only for a single line under 40 characters, such as an empty-state message.
- **Grid.** One column on mobile, and 12 columns from 1024px with reading text spanning 7 columns. Side content (donate box, progress, contact card) takes 4 columns on the right, with a 1-column gap.
- **Vertical rhythm.** Space in multiples of 8px, with 64px between page sections on desktop and 40px on mobile. Separate sections with space, not divider lines.

### Home

The home page opens with the actions people come for. The mission statement comes after them, not before.

```
┌──────────────────────────────────────────────────────────────┐
│ ▓▒▓▒▓▒▓▒▓▒▓▒▓▒▓▒▓▒▓▒▓▒▓▒▓▒▓▒▓▒▓▒▓▒▓▒▓▒  ← stitched band      │
│                                                              │
│ (seal)  Baloch Community Services of Seattle     ← display   │
│         Serving Baloch families in the Greater Seattle       │
│         area since 20XX.                         ← body      │
│                                                              │
│ ┌───────────────────┐ ┌───────────────────┐                  │
│ │ Become a member   │ │ Join the burial   │   ← 2×2 action   │
│ │ [Balochi]         │ │ fund              │     tiles, each  │
│ └───────────────────┘ └───────────────────┘     with Balochi │
│ ┌───────────────────┐ ┌───────────────────┐     label below  │
│ │ Donate            │ │ Get help          │                  │
│ └───────────────────┘ └───────────────────┘                  │
├──────────────────────────────────────────────────────────────┤
│ Active fundraisers  (list, max 3, progress inline)           │
│ Upcoming election   (only when one is open)                  │
│ What we do          (programs as a list, not cards)          │
│ Our mission         (65ch paragraph)                         │
│ Contact             (form + address)                         │
└──────────────────────────────────────────────────────────────┘
```

The action tiles are the only cards on the home page. They are equal in size because the four tasks are equal in importance.

### Fundraiser detail

```
┌──────────────────────────────────────────────────────────────┐
│ Medical support for the Y family        ← h1                 │
│                                                              │
│ ┌ 7 columns ─────────────────────┐  ┌ 4 columns ──────────┐  │
│ │ Photo (if the family agrees)   │  │ $8,240 raised       │  │
│ │                                │  │ of $12,000          │  │
│ │ Story, 65ch                    │  │ ▓▓▓▓▓▓▓▓░░░░        │  │
│ │                                │  │ 41 donors · 9 days  │  │
│ │ Updates (newest first)         │  │ [ Donate ]          │  │
│ │ Donors (names only if they     │  └─────────────────────┘  │
│ │ chose to show them)            │   (sticky on desktop,     │
│ └────────────────────────────────┘    bottom bar on mobile)  │
└──────────────────────────────────────────────────────────────┘
```

### Ballot

The ballot is a single column at 640px max width, with one position per screen section. The radio rows are the full width of the column and 56px tall. Show no imagery or band, and keep the review step before the vote is cast.

## Components

These map onto the existing shadcn components in `components/ui`. Change the tokens, not the component APIs.

**Buttons**
- `default` uses a `sound-deep` background with white text and 48px height. Use one per view, for the main action.
- `outline` uses a 2px `sound-deep` border with `sound-deep` text, for secondary actions.
- `destructive` uses `error`, and only for actions that delete or cancel something.
- Radius is 8px on buttons and inputs. Action tiles and panels use 12px, and the full-pill radius is used only for status badges. Radius follows size, so it is not the same on everything.
- Button labels name the result: "Pay $25 dues", "Join the burial fund", "Cast my vote". Do not use "Submit", "Learn more" or a trailing arrow.

**Links**
- Links are `sound-deep` and underlined, with the underline 2px below the text. Navigation links have no underline until hover or focus.

**Focus**
- Focus is a 3px `sound-deep` outline with a 2px offset on every interactive element. Never remove it.

**Forms**
- Put the label above the field in 16px bold `ink`. Fields are 48px tall with 18px text and a 1px `slate` border that becomes 2px `sound-deep` on focus.
- Show helper text below the field in `small` and `slate`. Show errors in the same place in `error` with an icon, replacing the helper text.
- Put one question per row. Do not use side-by-side fields on mobile.

**Cards**
- Use a card only when the item is a self-contained object a person acts on, such as a home action tile or a fundraiser in a list.
- Program and service listings are a plain list: an `h3`, one sentence and a link. Do not show them as a grid of identical cards.
- Cards have a 1px `mist`-darkened border (`#D3E3E9`) and no shadow. Elevation is reserved for menus and dialogs.

**Progress (fundraisers)**
- The track is 8px tall in `mist` and the fill is `sound`. When a fundraiser reaches its goal, the cord band appears above the total, unless it is a funeral fundraiser.
- Show amounts as text, not only as a bar: "$8,240 raised of $12,000".

**Tables (members, expenses, results)**
- The header row has a `mist` background with 16px bold `ink` text. Body rows have 1px `#D3E3E9` dividers.
- Right-align numbers with tabular figures.
- Below 640px, each row becomes a stacked block of label and value pairs. Do not scroll tables sideways.

**Alerts and toasts**
- Use a left 4px bar in the state colour (`sound-deep` for info and success, `error` for errors), with an icon, a title and one sentence that says what to do next.

**Navigation**
- The seal appears at 40px beside "BCS Seattle". The four top-level items are What we do, Get involved, Get help and Contact us, followed by Fundraisers. Account and sign-in sit on the right.
- On mobile, a full-screen menu shows items at 21px with 56px rows.

## Imagery

- Use real photos of community events, members (with consent) and Seattle places. Do not use stock photos of strangers.
- Never use fundraiser beneficiary photos without written consent from the family. The default is no photo.
- The seal is the only illustration. Do not add decorative blobs, gradients or abstract shapes.

## Motion

- No motion plays on page load.
- Motion only responds to what a person does. A menu opens in 150ms, an accordion expands in 200ms, and a completed donation or vote shows a 300ms check animation on its confirmation page.
- Under `prefers-reduced-motion: reduce`, every transition is instant.

## Writing

- **Plain words.** Write "Pay your dues" rather than "Remit membership contribution". Use the words families use, such as "burial fund", "dues" and "zakat".
- **Short sentences.** Aim for under 20 words, for readers who are working in their second language.
- **Name actions by their result,** and keep that name through the whole flow. The button says "Join the burial fund", the confirmation page says "You've joined the burial fund", and the email says the same thing.
- **Errors say what happened and what to do.** For example: "Your card was declined. Try another card or pay by Zelle." Errors do not apologise.
- **Empty states invite the next action.** For example: "No fundraisers are open right now. Start one by contacting the board."
- **Condolence copy states facts, then next steps.** Do not use exclamation marks or upbeat phrasing on those pages.
- **Balochi text is written by a person,** not a machine. Record who wrote or approved each string.

## Accessibility floor

These requirements apply to every page:

- Text meets WCAG 2.2 AA contrast. The palette above is already checked against it.
- Touch targets are at least 44×44px, and 48px for primary actions.
- Every interactive element has a visible focus style.
- The page works at 320px width and at 200% zoom with no sideways scrolling.
- Content inside `dir="rtl"` blocks mirrors correctly. Test every bilingual heading.
- Fields have labels and errors are linked with `aria-describedby`. The skip link to `#skip` is kept.

## Implementation

### Tokens in `styles/main.css`

Replace the current `:root` block. The orange `--primary` goes away, because the brand is the seal's teal.

```css
@layer base {
  :root {
    --background: 0 0% 100%;          /* paper */
    --foreground: 195.3 51.8% 16.3%;  /* ink */
    --card: 0 0% 100%;
    --card-foreground: 195.3 51.8% 16.3%;
    --popover: 0 0% 100%;
    --popover-foreground: 195.3 51.8% 16.3%;
    --primary: 194.1 89.1% 25.3%;     /* sound-deep */
    --primary-foreground: 0 0% 100%;
    --secondary: 194.1 88.4% 33.9%;   /* sound */
    --secondary-foreground: 0 0% 100%;
    --muted: 195 40% 94.1%;           /* mist */
    --muted-foreground: 197.1 18.5% 37.1%; /* slate */
    --accent: 195 40% 94.1%;
    --accent-foreground: 195.3 51.8% 16.3%;
    --destructive: 4.2 76.5% 40%;     /* error */
    --destructive-foreground: 0 0% 100%;
    --border: 196 33% 87%;            /* #D3E3E9 */
    --input: 197.1 18.5% 37.1%;
    --ring: 194.1 89.1% 25.3%;
    --radius: 0.75rem;

    /* Stitched band only */
    --doch-ground: 22.2 20.6% 74.3%;
    --doch-red: 353.6 59.2% 40.4%;
    --doch-maroon: 354.2 51.4% 27.5%;
    --doch-blue: 235.6 46.6% 34.5%;
    --doch-green: 146.2 55.2% 22.7%;
    --doch-white: 10.9 40.7% 94.7%;
    --doch-black: 120 4.5% 8.6%;
  }
}

html { font-size: 112.5%; } /* 18px base */
```

### Fonts in `app/layout.tsx`

Replace `Inter`:

```tsx
import { Atkinson_Hyperlegible, Noto_Naskh_Arabic } from 'next/font/google';

const fontSans = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-sans'
});

const fontBalochi = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-balochi'
});
```

In `tailwind.config.js`, add `fontFamily: { sans: ['var(--font-sans)'], balochi: ['var(--font-balochi)'] }` and a `doch` colour group for the seven thread tokens.

### What changes in existing pages

| Where | Now | Change to |
|---|---|---|
| `components/Hero.tsx` | Centred name and a "Learn more" button | Left-aligned seal and name, stitched band, four action tiles |
| `components/programs-and-services.tsx` | Three identical cards that each say "Learn more" | A plain list with one sentence per program |
| `app/layout.tsx` `<main>` | `p-2 sm:p-12` with no max width | The container and gutters from [Layout](#layout) |
| Fundraiser and election components | Raw `blue`, `green`, `gray` and `yellow` utilities | Tokens from [Colour](#colour) |
| `components/mission.tsx` | `text-zinc-700` and an `h1` | `ink` text and an `h2`, because the page already has an `h1` |

## Open questions for the board

1. Who owns the doch piece used as the reference, do they agree to its use, and how should they and the maker be credited?
2. Who will write and approve the Balochi strings?
3. What year was BCS Seattle founded, for the hero line?
