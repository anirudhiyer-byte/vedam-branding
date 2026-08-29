# Vedam School of Technology

Two applications in one Next.js 16 project:

1. **The marketing site** (`/`) — a single scrolling page for Vedam School of
   Technology, the engineering school offering B.Tech in Computer Science &
   Artificial Intelligence. Public.
2. **Content Studio** (`/studio`) — an internal, AI-assisted tool that plans the
   monthly social calendar and tracks each post through Shoot → Edit → Posted.
   Password-protected, spends money, and is not linked from the public site.

---

## Getting started

```bash
pnpm install
cp .env.example .env.local     # then fill it in — see below
pnpm run check:env             # tells you what is missing and whether it matters
pnpm dev
```

**pnpm is the package manager.** There was previously both a `package-lock.json`
and a `pnpm-lock.yaml` in the repo; the npm one has been removed. CI installs
with `--frozen-lockfile`, so `pnpm-lock.yaml` and `package.json` must agree.

The marketing site works with no configuration at all. The Studio needs
`STUDIO_PASSWORD` and `STUDIO_SESSION_SECRET` before anyone can sign in, and
`ANTHROPIC_API_KEY` before it can plan anything.

### Checks

```bash
pnpm run check           # typecheck + lint + tests. No network, no keys, no DB.
pnpm test                # 120 tests
pnpm run check:env       # configuration pre-flight — run before a deploy
pnpm run check:content   # which content sections are still hidden, and why
```

Two checks cost money and need credentials, so they are deliberately outside
`pnpm run check` and outside CI:

```bash
pnpm run check:keys      # verifies ANTHROPIC_API_KEY and YOUTUBE_API_KEY work
pnpm run check:models    # verifies each model tier accepts our request shape,
                         # and that prompt caching is actually happening
```

`check:models` is worth understanding: it issues each stage's call twice and
reads `cache_read_input_tokens` back. Prompt caching is the kind of optimisation
that fails silently — no error, no visible difference, just a larger invoice —
so it is verified against the live API rather than assumed.

There is also a browser smoke test, run against a built app rather than in CI:

```bash
pnpm build && pnpm start &
SMOKE_STUDIO_PASSWORD=... pnpm run smoke
```

It exists because two real bugs here were invisible to types, lint, tests, and
the build, since all three concern *computed* CSS that only a browser resolves:
`@theme inline` silently defeated the Studio's scoped font override, and a
`className` colour override on a CTA lost to its variant on stylesheet order,
rendering the button nearly invisible against the band behind it. It also walks
the whole sign-in flow.

---

## Project structure

```
app/
  page.tsx                 marketing homepage
  build/[slug]/            a page per student/studio project
  studio/                  the internal tool
    login/                 password sign-in
    actions.ts             every write, each one authenticated
  robots.ts, sitemap.ts, opengraph-image.tsx
  error.tsx, not-found.tsx

proxy.ts                   route guard for /studio (Next 16 renamed
                           middleware.ts to proxy.ts)

components/
  ui/button.tsx            the one CTA/button style
  sections/                marketing page sections
  studio/                  dashboard components
    icons.tsx              the single stroke-SVG icon set

lib/
  config/env.ts            every environment variable, validated once
  observability/logger.ts  structured logs with secret redaction
  auth/                    sessions, the per-action guard, rate limiting
  ai/                      models, pricing, caching, budget, retries
  content/                 all site copy
    pending.ts             content only Vedam can supply (see below)
  social/
    strategy/              the standing brief the strategist reads
    agent/                 the planning pipeline
    insights/              channel + competitor research
    storage/               Postgres and JSON adapters

tests/                     120 tests, all offline
```

---

## Content: why sections are missing

`lib/content/pending.ts` holds everything that depends on real-world facts —
student projects, testimonials, statistics, social profile URLs, partners. **All
of it is empty, and every section that reads it renders nothing while empty.**

This is deliberate and load-bearing. The site previously shipped eight fictional
client names, four fabricated case studies, an invented testimonial attributed
by name and job title to a person who does not exist, and three unverifiable
statistics — all rendering as fact. Deleting that data was not enough on its
own, because the next person to fill those arrays would have faced the same
choice: leave a section empty, or invent something. So the structure enforces
the rule rather than a comment asking for it.

There is no placeholder mode and no sample data. A section appears the moment it
has real content, and not one commit before.

```bash
pnpm run check:content    # what is still hidden
```

Add a project to `projects` and both its card and its `/build/<slug>` page turn
on. Add a testimonial and that section appears. Nothing else needs touching.

---

## Brand theme

Tokens live in `app/globals.css`. The values below are the actual ones — the
previous README table had drifted and documented `paper` as `#F9F9F9` when it is
`#ffffff`, which meant a contributor trusting the docs used the wrong colours.

| Token                | Value     | Use                                       |
| -------------------- | --------- | ----------------------------------------- |
| `--color-orange`     | `#f97d03` | Vedams Orange. Graphic + text **on dark** |
| `--color-eviolet`    | `#8a18ff` | Electric Violet. Interactive **on light** |
| `--color-violet`     | `#2b135c` | Vedams Violet. Dark surfaces, buttons     |
| `--color-night`      | `#0c0931` | Cetacean Blue. Darkest surface            |
| `--color-space`      | `#1d1856` | Space Cadet                               |
| `--color-redpurple`  | `#e80074` | Red-Purple                                |
| `--color-mulberry`   | `#c200db` | Vivid Mulberry                            |
| `--color-turquoise`  | `#00cfe5` | Dark Turquoise                            |
| `--color-canvas`     | `#f4f1fb` | Page background                           |
| `--color-paper`      | `#ffffff` | Cards                                     |
| `--color-paper-alt`  | `#f6f3fe` | Inset surfaces, inputs                    |
| `--color-ink`        | `#1e1e1e` | Body text                                 |
| `--color-ink-muted`  | `#5c5c66` | Secondary text                            |
| `--color-ink-faint`  | `#6b6b75` | Tertiary text, labels                     |
| `--color-rule`       | `#e6e3ec` | Borders                                   |
| `--color-accent`     | `#8a18ff` | Interactive on light                      |
| `--color-on-dark`    | `#f9f9f9` | Text on dark surfaces                     |
| `--color-cream`      | `#f8f3ea` | **Reserved — currently unused**           |
| `--color-grey`       | `#a7a7a7` | **Reserved — decorative only, never text**|

### The one rule worth knowing: violet on light, orange on dark

Vedams Orange is **2.50:1** on white. It fails WCAG AA as text or as a button
fill on any light surface. It is a graphic colour — the logo mark, gradients,
fills — and text only on dark, where it is 7.25:1 on Cetacean Blue. Electric
Violet is the mirror image: 5.46:1 on light, and it fails at 3.33:1 on dark.

`tests/contrast.test.ts` enforces both halves, and — unlike the original check —
also scans component source for the failure mode itself. Checking only token
pairs is why `text-orange` on a white card shipped and had to be found by hand.

### Typefaces

Outfit (display) and Nunito Sans (body) render the marketing site, per the
brandbook. Inter is scoped to `/studio` via the `.studio-ui` class, where it
earns its place on dense tabular UI at small sizes.

This used to be a contradiction rather than a decision: a comment claimed Inter
was "a deliberate override for the Studio UI" while the CSS mapped every font
slot to Inter globally, so the entire marketing site silently rendered in the
wrong typeface.

---

## Content Studio (`/studio`)

An internal tool that plans the monthly social calendar and tracks each post
through Shoot → Edit → Posted.

**Each platform is its own calendar.** Instagram, LinkedIn, and YouTube are
separate tabs — there is no merged table anywhere. Every number on the page is
scoped to the platform you are looking at, because a share of a combined 45-post
total told you nothing useful about LinkedIn's 12.

### Authentication

The Studio spends real money and mutates the calendar, so it sits behind a
password. Two things are required in production, and the app refuses to serve
rather than falling open without them:

```
STUDIO_PASSWORD          # 12+ characters
STUDIO_SESSION_SECRET    # 32+ characters, stable across instances
```

Generate the secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Sessions are stateless: an HMAC-SHA256-signed, httpOnly cookie carrying its own
expiry, valid for 12 hours. There is no session store.

**Two layers, and both must fail for an unauthenticated request to do
anything.** `proxy.ts` bounces browsers without a session, and
`requireStudioSession()` runs at the top of every Server Action before the form
is read. The second is the real boundary: Next.js documents that Server Actions
are POSTs to the page route and that a matcher change can silently remove proxy
coverage, so the route guard is a convenience only.

This authenticates *the team*, not individual people — anyone holding the
password is indistinguishable from anyone else holding it. That is a deliberate
trade for a small internal tool. If per-person attribution or revocation is ever
needed, the move is a real identity provider, not more logic in `lib/auth`.

---

## How the agent works, and what it costs

A full month is **five model calls**:

```
1 × theme          decides what the month is about
3 × platform plan  Instagram, LinkedIn, YouTube — in parallel
1 × repurpose      Instagram reels rewritten as YouTube Shorts
```

Re-planning a single platform is **one call** (two for Instagram, which
re-derives its Shorts), because it reuses the existing month's theme.

### Model tiering

Set per stage in `lib/ai/models.ts`, because the stages are genuinely different
work:

| Stage           | Model              | Why                                        |
| --------------- | ------------------ | ------------------------------------------ |
| `theme`         | `claude-opus-5`    | One call; every other call is downstream    |
| `platformPlan`  | `claude-sonnet-5`  | Three calls, most of the output tokens      |
| `repurpose`     | `claude-haiku-4-5` | A rewrite of an already-fixed script        |

All three are overridable — `MODEL_THEME`, `MODEL_PLATFORM_PLAN`,
`MODEL_REPURPOSE` — so the tiering can be measured rather than assumed. Set them
all to the same model to see what it costs in quality.

The tiers do not accept the same request: Haiku 4.5 rejects
`output_config.effort` with a 400, and adaptive thinking is Claude 4.6+ only.
`lib/ai/models.ts` encodes those facts and `lib/ai/call.ts` gates on them, which
is what lets the pipeline stay one code path across three models.
`pnpm run check:models` verifies the encoding against the live API.

### Prompt caching

The strategist brief — brand, voice, content buckets, and the full platform
playbook — is ~2,000 tokens and byte-identical on every call. It is marked
cacheable, so after the first call it is billed at roughly a tenth of the input
price.

Two things about this are worth knowing:

- **The playbook lives in the cached prefix, not in each user prompt.** Moving
  it there was not tidying. At ~1,000 tokens the shared prefix fell *under*
  Sonnet 5's 1,024-token minimum, and a `cache_control` marker below the minimum
  is accepted and silently does nothing. The three platform calls would have
  cached nothing at all.
- **It breaks silently.** Any byte that varies between calls invalidates the
  prefix, with no error and no visible symptom. So `tests/ai.test.ts` asserts
  the prompt is byte-stable, contains nothing date- or run-derived, and stays
  above the configured models' minimums; every run logs its cache hit rate and
  warns at zero; and `check:models` verifies it end to end.

### Cost visibility and the budget ceiling

Every run reports what it spent, what the same work would have cost untiered and
uncached, and how much of the prompt came from cache. This appears in the UI
after a run and in the logs as one structured line.

`AI_MONTHLY_BUDGET_USD` is a hard ceiling on estimated spend per calendar month,
checked before a run starts *and between calls within a run*, so a single run
cannot overshoot by the size of its largest call. It is per-process by default;
implement `BudgetStore` against a shared table to make it authoritative across
instances.

Prices in `lib/ai/models.ts` are list rates for operator visibility only, never
used to bill anyone. `PRICING_VERIFIED_AT` records when they were last checked.

---

## Channel and competitor research

Optional context fed into planning, per platform:

- **YouTube** — auto-fetched when `YOUTUBE_API_KEY` is set: recent videos, view
  counts, and recurring title keywords for your channel and each competitor.
- **Instagram** — manual. The Graph API reads your own Business account, but
  competitor access is limited to Business Discovery and needs a Meta app with a
  linked Facebook Page.
- **LinkedIn** — manual. Organic analytics need an approved Marketing Developer
  Platform app, and there is no supported way to read a competitor's organic
  posts at all. Scraping violates the User Agreement.

The UI labels each platform Auto-fetched or Manual to match, so the gap is
visible rather than a silent no-op. Research never blocks a run: a bad handle or
a quota error is logged and planning continues.

---

## Storage

Two adapters behind one `CalendarStore` interface. `DATABASE_URL` picks between
them.

**Postgres** (`DATABASE_URL` set) — what to run anywhere real. Items live in
their own table, so ticking a production checkbox is a single-row `UPDATE`. That
is the point: it removes the lost-update race entirely, and it is a prerequisite
for more than one person editing at once or for any serverless host.

```bash
pnpm run db:migrate      # applies lib/social/storage/schema.sql
```

The app also applies the schema lazily on first use; every statement is
idempotent.

**JSON files** (`DATABASE_URL` unset) — zero setup, for local development and a
single Node process. Two real defects were fixed rather than left in place:
writes go through an atomic temp-file rename (no torn files if the process
dies), and a per-month lock serialises read-modify-write cycles (no lost
updates). Both are covered by tests, including 20 concurrent writes.

Its limits are process-local, and stated plainly: it does not work on a
read-only filesystem, and the lock protects one Node server and nothing more.

Planned months are **not committed to the repo** — `data/calendars/*.json` is
gitignored. Committing them is how two months of `[SAMPLE]` placeholder content,
including one for a month that had already elapsed, came to sit in the repo
rendering as if it were the team's real plan. There is no seed script: an
unplanned month shows the "Plan this month" panel, which is the correct empty
state and the actual entry point to the tool.

---

## Deploying

```bash
pnpm run check           # typecheck, lint, tests
pnpm run check:env       # fails if the configuration is not safe to serve
pnpm run build
```

`check:env` is fatal in production on: a missing or short `STUDIO_PASSWORD` or
`STUDIO_SESSION_SECRET`, and a missing `NEXT_PUBLIC_SITE_URL`. It warns on a
missing `DATABASE_URL` (falls back to a filesystem the host may not let you
write to), a missing `ANTHROPIC_API_KEY` (calendars display but cannot be
planned), and a missing budget ceiling.

Security headers — `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`,
`Permissions-Policy`, HSTS — are set in `next.config.ts`. HSTS is not preloaded:
that is a one-way commitment for the whole domain and belongs to whoever owns
DNS.

---

## Still to do before launch

Everything below is content or credentials only Vedam can supply. None of it is
code, and none of it renders as a placeholder in the meantime.

- [ ] Real student/studio projects in `lib/content/pending.ts` → turns on the
      Build section and its `/build/<slug>` pages
- [ ] A real testimonial, from someone who agreed to be quoted
- [ ] Sourced statistics for the hero strip (each one requires a stated source)
- [ ] Vedam's actual social profile URLs → footer links
- [ ] `VEDAM_INSTAGRAM_URL` / `VEDAM_LINKEDIN_URL` / `VEDAM_YOUTUBE_URL` → the
      Studio's "open our channel" links, which stay hidden until then
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the real production domain
- [ ] Project imagery — `ProjectPanel` already handles `next/image` with `fill`
      inside the `aspect-4/3` wrapper, so adding photos introduces no layout shift
- [ ] Plan a real month in the Studio (there is no seeded sample month)
