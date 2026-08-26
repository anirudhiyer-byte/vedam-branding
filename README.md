# Vedam — brand & design studio

Marketing site for Vedam, built with Next.js 16 (App Router), TypeScript, and
Tailwind CSS v4.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script          | Purpose                                |
| --------------- | -------------------------------------- |
| `npm run dev`   | Dev server (Turbopack)                 |
| `npm run build` | Production build                       |
| `npm start`     | Serve the production build             |
| `npm run lint`  | ESLint                                 |

## Project structure

```
app/
  layout.tsx        Root layout — fonts + site metadata
  page.tsx          Landing page, composes the sections below
  globals.css       Tailwind import + design tokens
components/
  container.tsx     Shared page gutter
  wordmark.tsx      Text logo
  site-header.tsx   Sticky nav (client component — mobile menu state)
  site-footer.tsx
  sections/         Hero, marquee, services, work, process, testimonial, CTA
lib/
  content.ts        All site copy and project data
```

## Editing content

Copy is deliberately kept out of the components. Almost every text change —
nav links, services, case studies, testimonial, contact email — is made in
[`lib/content.ts`](lib/content.ts).

## Brand theme

The palette and type come from the **Vedam Brandbook Capsule**. Tokens live in
[app/globals.css](app/globals.css) and are used as ordinary Tailwind utilities
(`bg-paper`, `text-ink-muted`, `bg-violet`, `text-orange`).

| Role | Token | Value |
| --- | --- | --- |
| Primary | `orange` | `#F97D03` Vedams Orange |
| | `eviolet` / `accent` | `#8A18FF` Electric Violet |
| | `violet` | `#2B135C` Vedams Violet |
| Secondary | `night` | `#0C0931` Cetacean Blue |
| | `space` | `#1D1856` Space Cadet |
| | `redpurple` | `#E80074` |
| | `mulberry` | `#C200DB` |
| | `turquoise` | `#00CFE5` |
| Neutrals | `paper` | `#F9F9F9` Vedams White |
| | `paper-alt` | `#F8F3EA` Vedams Light Orange |
| | `ink` | `#1E1E1E` Vedams Solid Black |
| | `grey` | `#A7A7A7` Vedams Light Grey |

Type is **Inter** throughout, self-hosted via `next/font/google`. The `mono`
slot maps to Inter with tabular figures rather than pulling in a second family,
so calendar dates and counts still align in columns.

> **Deviation from the brandbook:** the capsule specifies Outfit for
> communications and Nunito Sans for documents. Inter is a deliberate override
> for the Studio UI, chosen for legibility at small sizes in a dense table. The
> brand colours and logo are unchanged.

### The one rule worth knowing: violet on light, orange on dark

Two brand colours fail WCAG AA as text and this is easy to get wrong:

- **Vedams Orange is 2.50:1 on Vedams White.** It cannot be body text or a
  button fill on a light surface. It is a *graphic* colour — the logo mark,
  gradients, fills — and it is excellent as an accent **on dark** (7.25:1 on
  Cetacean Blue).
- **Vedams Light Grey is 2.29:1 on white** — borders and decoration only. The
  readable greys (`ink-muted`, `ink-faint`) are derived from it.
- Inversely, **Electric Violet is only 3.33:1 on Cetacean Blue**, so it is the
  interactive colour on light surfaces and never the accent on dark.

So: light surfaces get violet accents, dark surfaces (`.brand-night`, the CTA
band, the active platform tab) get orange. `npm run check:contrast` asserts all
of this against the real values parsed out of `globals.css`, including negative
assertions that keep orange and light grey out of body text.

### Dashboard shell

The Studio is laid out as a soft-card dashboard: a lavender canvas
(`--color-canvas`, a violet-tinted white derived from Electric Violet) with
white cards floating on it via `.card` and the `shadow-card` / `shadow-tile`
tokens. No hard borders on containers.

- **Sidebar** ([components/studio/sidebar.tsx](components/studio/sidebar.tsx)) —
  one entry per platform with a live post count and an electric-violet pill for
  the active one, plus a gradient "Open Vedam on …" button pinned to the bottom.
  Below `lg` it collapses into `MobilePlatformNav`, a scrollable pill row.
- **Theme banner** ([theme-banner.tsx](components/studio/theme-banner.tsx)) —
  the month's theme in the Vedams Gradient, answering three questions in order:
  *what is the month about* (title + through-line), *what does that mean here*
  (the platform's own angle, the one part that differs per tab), and *where do
  we stand* (planned / shot / edited / live / still to go). The eyebrow carries
  a time cue — "6 days left in August", "September starts in 6 days", or
  "July is closed" — from `monthStatus` in
  [lib/social/schedule.ts](lib/social/schedule.ts).

  The theme *rationale* deliberately is not here. It explains why the theme was
  chosen, which is reference material you read when deciding whether the plan is
  right — so it sits under **Why this theme** inside the re-plan disclosure.
- **Summary panel** sits directly under it — the month at a glance, since that
  is what the team opens the tool for. Then the calendar, then re-planning.
- **Weekly progress** ([charts.tsx](components/studio/charts.tsx)) — a
  segmented bar per week showing how far it has got through shoot → edit →
  live, with part-weeks labelled by their real length.

  This replaced a posts-per-week chart. The scheduler spreads posts evenly by
  construction, so that chart was flat every month and carried no information;
  production progress is what actually varies and what the team needs to see.
- **Up next** ([up-next.tsx](components/studio/up-next.tsx)) — the next six posts
  that still need work, labelled *To shoot / To edit / Ready to post*.

The page background is a flat lavender canvas. An earlier version had decorative
swirls behind the content; they were removed for being distracting behind a
data-dense table.

### Colour-coded buckets

Every content bucket owns a hue from the brand palette
(`BUCKET_COLOR` in [lib/social/strategy.ts](lib/social/strategy.ts)). That
colour appears as the row's left stripe, its chip, its dot in the summary, and
its bar — so a month reads as a pattern rather than a wall of text, and a bucket
running hot is visible without reading a single row.

Chips and status pills tint their hue against the page with `color-mix` and put
ink on top, which keeps them readable at any saturation.
`npm run check:contrast` verifies every chip and pill, not just the base tokens.

Formats and platforms carry emoji shorthand (`FORMAT_EMOJI`, `PLATFORM_EMOJI`)
because that is how the team already talks about them.

### Gradients

`.brand-gradient-bg` and `.brand-gradient-text` render the Vedams Gradient
(orange → mulberry → electric violet). `.brand-night` is the dark brand surface
used for the hero wash and the CTA band.

## Before launch

- [ ] Replace placeholder copy, client names, and case studies in `lib/content.ts`
- [ ] Swap the CSS gradient panels in `components/sections/work.tsx` for real
      project imagery (`next/image`)
- [ ] Give each case study its own route and link the cards to it
- [ ] Set the real domain in `metadataBase` in `app/layout.tsx`
- [ ] Add real social URLs in `components/site-footer.tsx`
- [ ] Add an OG image (`app/opengraph-image.tsx`) and `favicon.ico`
- [ ] Remove the unused Next.js/Vercel SVGs in `public/`

---

# Content Studio (`/studio`)

An internal tool that plans the monthly social calendar and tracks each post
through Shoot → Edit → Posted.

**Each platform is its own calendar.** Instagram, LinkedIn, and YouTube are
separate tabs — there is no merged table anywhere. Every number on the page
(post counts, content-type split, bucket split, production progress) is scoped
to the platform you are looking at, because a share of a combined 45-post total
told you nothing useful about LinkedIn's 12.

## Setup

```bash
cp .env.example .env.local   # add ANTHROPIC_API_KEY (and YOUTUBE_API_KEY)
npm run check:keys           # verifies both keys before you spend a run
pnpm dev                     # then open http://localhost:3000/studio
```

`check:keys` makes one tiny Anthropic call and one YouTube lookup, and tells you
specifically what is wrong — key rejected, key fine but Data API v3 not enabled
on the Google Cloud project, and so on. `.env.local` is gitignored.

**To get a fully real month, plan a month that has no calendar yet** (pick one
from the month dropdown). *Re-plan* reuses the existing month's theme, so
re-planning a seeded `[SAMPLE]` month keeps the sample theme.

A sample month is already seeded at `data/calendars/2026-09.json` so the
dashboard renders before you have an API key. Re-seed any month with
`npm run seed:sample -- 2026 10`.

## How the agent works

Generation is two stages, deliberately:

1. **Theme** — one call decides what the month is *about*, given where it sits in
   the Indian admissions calendar, plus a through-line every post ties back to.
2. **Per platform** — three calls run in parallel, each planning that platform's
   full month against its own audience and reach mechanics.

The table columns mirror the team's sheet: Week, Day, Date, Bucket, Format,
Topic, **Caption**, Shoot, Edit, Posted, Live Link. The caption cell is clamped
to three lines so one long caption cannot blow out the row, with a **copy**
button that puts the caption *and* its hashtags on the clipboard ready to paste.
Clicking a topic expands the row for the full caption, the beat-by-beat script,
the hook, the CTA, and the target keywords.

**Re-planning is per platform.** Open the Instagram tab and you get *Re-plan
Instagram* — one call, against the month's existing theme, showing only
Instagram's research fields. LinkedIn and YouTube keep their content, their live
links, and their ticked boxes. The re-planned platform's own rows are new
content, so its Shoot / Edit / Posted marks reset. Planning a month from scratch
still does all three at once, because that pass also decides the shared theme.

**Dates are computed in code, not by the model** ([lib/social/schedule.ts](lib/social/schedule.ts)).
The model gets a fixed list of slots to fill, which guarantees valid in-month
dates, exact post counts, and a cadence the team can staff against.

| Platform | Volume | Notes |
| --- | --- | --- |
| Instagram | 30 / month | Roughly daily |
| LinkedIn | 30 / month | Roughly daily |
| YouTube | 7 long-form + 20 shorts | 87 posts a month in total |

**The 20 YouTube shorts are the Instagram reels, reposted.** The team shoots
once. `repurposeReelsToShorts` in [lib/social/agent.ts](lib/social/agent.ts)
takes that month's reels, keeps the video and the script verbatim, and rewrites
only the title and description — because YouTube is a search surface and
Instagram is a scroll surface. Shorts land on the same date as their source reel
and are labelled *"Repost of the Instagram reel — no extra shoot"* in the table.

That creates a dependency the re-plan respects: re-planning **Instagram** also
re-derives its shorts, while re-planning **YouTube** touches only the 7
long-form videos and leaves the shorts alone (`ownedBy` in
[lib/social/merge.ts](lib/social/merge.ts), covered by `npm run check:merge`).

### Captions are a different artefact on each platform

`CAPTION_SPEC` in [lib/social/strategy.ts](lib/social/strategy.ts) tells the
strategist what a caption actually *is* per platform, because one generic
instruction produces the wrong thing twice out of three times:

- **Instagram** — two lines and a CTA, under 300 characters
- **LinkedIn** — 150-300 words, hook before the fold, short paragraphs, a real question at the end
- **YouTube** — a full description with the keyword front-loaded, a timestamped chapter list, and the channel's SEO surface in mind

Each platform is planned against **its own bucket mix**, not a shared one — the
same bucket carries very different weight for a Class 12 student and a working
engineer. The mixes live in `PLATFORM_BUCKET_MIX` and each sums to 100%:

| Bucket | Instagram | LinkedIn | YouTube |
| --- | --- | --- | --- |
| Student Life | 20% | — | 12% |
| Learn Tech | 18% | 10% | 22% |
| Trend & Culture | 16% | — | — |
| Proof & Outcomes | 12% | 16% | 11% |
| Admissions & Program | 10% | — | 22% |
| Community & UGC | 8% | — | — |
| Faculty & Mentors | 6% | 16% | 8% |
| Industry & Career | 6% | 24% | 25% |
| Behind the Build | 4% | 10% | — |
| Founder POV | — | 24% | — |

A dash means that bucket is deliberately not planned on that platform, and the
generator is told to use only that platform's buckets. If posts ever land in an
unplanned bucket, the dashboard flags them **off-plan** rather than hiding them.

Model: `claude-opus-5` with adaptive thinking and Zod-validated structured
output, so a malformed plan fails loudly instead of writing garbage rows.

**All generation calls stream.** The SDK estimates
`60min × max_tokens / 128000` and refuses any *non-streaming* request projected
to run over 10 minutes — anything above **21,333 max_tokens**. The platform
calls use 32,000 (30 LinkedIn posts at 150-300 words each need the room), so
they use `messages.stream(...)` + `await stream.finalMessage()`, which still
returns `parsed_output` from the Zod schema. `npm run check:agent` asserts this
statically, because the failure only surfaces at runtime on a real generation —
an expensive place to find it. `npm run check:stream` proves the pattern
end-to-end against the API for a fraction of a cent.

### What a run costs

Every generation prints a token breakdown to the server log, so the cost is
measured rather than guessed:

```
[studio] 2026-10 — 5 call(s)
  theme             1,240 in    2,980 out
  instagram         2,110 in   12,400 out
  linkedin          2,050 in   21,800 out
  youtube           1,980 in    6,400 out
  yt shorts         3,400 in    7,900 out
  TOTAL            10,780 in   51,480 out  ≈ $1.34
```

One full month is **five calls covering all three platforms** — not five per
platform. Re-planning a single platform is one call (two for Instagram, which
also re-derives its shorts). LinkedIn is the most expensive platform because its
captions are 150-300 words each.

The dollar figure uses Claude Opus 5 list pricing and is an estimate for your
own tracking; the Anthropic console is the source of truth.

## The files you will actually edit

| File | What it controls |
| --- | --- |
| [lib/social/strategy.ts](lib/social/strategy.ts) | Brand voice, per-platform audience and objectives, the 10 content buckets, and `PLATFORM_BUCKET_MIX` — each platform's own target bucket split. **Edit this to change how every future month is planned** — it is the standing brief, not a per-run prompt. |
| [lib/social/schedule.ts](lib/social/schedule.ts) | Posting cadence and which weekdays each platform posts on. |
| [lib/social/agent.ts](lib/social/agent.ts) | The strategist system prompt and the two-stage generation flow. |

## Channel + competitor research

The generate form has a **research block per platform** — our handle, competitor
handles, and a free-text "what's working" note. Each platform's research is fed
into *that platform's* planning call only; a digest of all three informs the
month theme. Everything is optional and never blocks generation.

Where the research comes from differs by platform, because the APIs differ:

| Platform | Marked | How research is gathered |
| --- | --- | --- |
| YouTube | **Auto-fetched** | Data API v3 pulls recent videos, view counts, and recurring title keywords for you *and* each competitor. Free and generous. Needs `YOUTUBE_API_KEY`; skipped silently if unset. |
| Instagram | **Manual** | The Graph API reads your own Business/Creator account but competitor access is limited to Business Discovery, and it needs a Meta app with a linked Facebook Page. Your typed notes are the input. |
| LinkedIn | **Manual** | Organic analytics need an approved Marketing Developer Platform app plus Page admin rights, and there is **no supported API for reading a competitor's organic posts** — scraping breaks the User Agreement. Your typed notes are the only signal. |

The form labels each platform Auto-fetched or Manual so nobody expects data that
cannot be fetched. To wire up Instagram or LinkedIn later, implement
`InsightProvider` in [lib/social/insights.ts](lib/social/insights.ts) — the
stubs already sit behind that interface and the form already collects handles
for them.

## Data and its limits

Calendars are JSON files in `data/calendars/`, git-tracked so you get history and
review for free. Two consequences:

- It works in `next dev` and on any Node host (Railway, Render, a VPS, Docker).
  It does **not** work on Vercel or other read-only serverless filesystems.
- Status updates are read-modify-write, so two people ticking boxes on the same
  month in the same instant can drop one update.

Both go away by implementing `CalendarStore` in
[lib/social/storage.ts](lib/social/storage.ts) against Postgres and swapping the
export at the bottom of that file. Nothing else in the app changes.

## Before anyone else uses this

- [ ] **`/studio` has no authentication.** The Server Actions in
      `app/studio/actions.ts` are reachable by direct POST. Add an auth check to
      each one before deploying anywhere public.
- [ ] Replace the seeded `[SAMPLE]` month with real generated output
- [ ] Move to Postgres if more than one person edits at a time

## Checks

```bash
npm run check          # scheduler + storage + platform merge + contrast
npm run check:slots
npm run check:storage
npm run check:merge     # re-planning one platform must not touch the others
npm run check:contrast  # brand palette stays readable
npm run check:keys      # ANTHROPIC_API_KEY / YOUTUBE_API_KEY actually work
npm run check:agent     # generation calls stream (no 10-minute timeout)
npm run check:stream    # streaming + structured output against the real API
```
