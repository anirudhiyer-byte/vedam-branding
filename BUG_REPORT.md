# Vedam Branding — Comprehensive Bug & Audit Report

**Scope:** full repository audit — placeholder code, sample/mock data, feature
stubs, and UI/UX/design-system inconsistencies, layout-shift risk, and broken web
flows. Written for a coding agent to work through directly.

**How to read this report:** every finding lists a **Severity**, the exact
**file(s)** (with line numbers where feasible), what's wrong, why it matters to a
real user/visitor, and a recommended fix. Findings marked **[Already tracked]**
are ones the codebase or README already flags via a TODO/comment/checklist — they're
included here so nothing is missed, but the fix is generally "do what the existing
comment says." Findings marked **[New]** were not previously called out anywhere in
the repo.

---

## 0. What this repo is

Two applications live in one Next.js 16 (App Router) project:

1. **Marketing site** (`/`) — a single scrolling homepage for "Vedam School of
   Technology," composed in `app/page.tsx` from sections in `components/sections/`,
   with all copy centralized in `lib/content.ts`. Styled with Tailwind CSS v4 via
   design tokens in `app/globals.css`.
2. **Content Studio** (`/studio`) — an internal, AI-powered social-media
   content-calendar planning tool (`app/studio/*`, `lib/social/*`), backed by
   flat JSON files in `data/calendars/` and the Anthropic API.

The project is explicitly **pre-launch**. The README carries two open checklists —
"Before launch" (marketing site) and "Before anyone else uses this" (Studio) — and
git history is only 3 commits, consistent with an early-stage scaffold. This report
supersedes neither checklist; it organizes them alongside newly-found issues into one
prioritized list.

---

## 1. Critical — Security

### 1.1 `/studio` Server Actions have no authentication **[Already tracked, but critical]**
- **File:** `app/studio/actions.ts:9-13` (comment), all 4 exported actions:
  `toggleProduction` (15-25), `saveLiveLink` (27-34), and the generation actions
  further down the file.
- **What's wrong:** The file's own comment states: *"these Server Actions are
  reachable by direct POST and currently have no authentication."* Every action is
  callable by anyone who can reach the deployment, with zero auth check.
- **Why it matters:** `generateMonth`/`replanPlatform` trigger real, billed Anthropic
  API calls; `toggleProduction`/`saveLiveLink` mutate the calendar data store. An
  unauthenticated visitor (or a bot) can run up API costs or corrupt calendar state.
  This is the single most severe issue in the repo.
- **Recommended fix:** Add an auth check (session/shared-secret/IP-allowlist — pick
  based on how `/studio` will actually be hosted) at the top of every exported action
  in this file before any deployment reachable from the public internet. Do this
  before addressing anything else in this report.

---

## 2. Placeholder Code, Sample Data & Feature Stubs

### 2.1 Entire marketing site content is placeholder **[Already tracked]**
- **File:** `lib/content.ts:1-5` (file header: *"Everything below is placeholder
  content — swap in real client names, projects, and contact details before
  launch"*).
- **Specific placeholder data in that file:**
  - `clients` (lines 25-34): 8 fictional company names (`Northwind`, `Aperture
    Labs`, `Kalyani Foods`, `Meridian Health`, `Studio Ora`, `Halcyon`, `Terra
    Ventures`, `Bluebird Coffee`) rendered live in the client marquee.
  - `work` (lines 67-100): 4 fabricated case studies (fake client, fake project
    description, fake year) rendered as the "Work" section.
  - `testimonial` (lines 129-134): a fabricated quote attributed to a fictional
    person ("Priya Raghunathan, CEO, Northwind") rendered as a real testimonial.
  - `stats` (lines 136-140): unverifiable agency stats ("40+ Brands shipped," "9
    Years in practice," "6 People in the studio") rendered in the hero.
- **Why it matters:** All of this renders as real content on the live homepage today
  — a visitor has no way to know it's fake.
- **Recommended fix:** Replace with real client names, real case studies (or remove
  the section until real ones exist), a real testimonial, and real/verifiable stats.

### 2.2 Placeholder disclaimer is visible on the live page **[New]**
- **File:** `components/sections/work.tsx:17-18`.
- **What's wrong:** The text *"Case studies are placeholders — replace the panels
  with real project imagery and link each card to its own page"* is rendered as
  actual on-page copy, not just a code comment.
- **Why it matters:** This is a real content bug distinct from 2.1 — even after the
  case-study data is replaced, this literal disclaimer sentence must also be deleted,
  or the finished site will visibly tell visitors its own content isn't real.
- **Recommended fix:** Remove this string once real case-study content and imagery
  are in place; don't just replace the data in 2.1 and forget this line.

### 2.3 No real project imagery anywhere **[Already tracked]**
- **Files:** `components/sections/work.tsx:26-39` (CSS gradient panels standing in
  for photos, per the inline comment *"swap for `<Image>` when art is ready"`);
  confirmed zero usage of `next/image` or `<img>` anywhere in `app/` or `components/`.
- **Why it matters:** Every "case study" card shows a colored gradient with a single
  initial letter instead of a photo — reinforces that the Work section is not
  launch-ready content.
- **Recommended fix:** Once real imagery exists, swap the gradient `div` for
  `next/image` (see §6.1 for the layout-shift guard-rail to keep in mind when doing
  this).

### 2.4 Work cards are dead-end links **[New]**
- **File:** `components/sections/work.tsx:25`.
- **What's wrong:** All 4 case-study cards use `href="#work"` — i.e., every card
  links back to the section it's already inside of. There are no per-case-study
  routes anywhere under `app/`.
- **Why it matters:** These render as clickable cards (cursor, hover states) but
  clicking one does nothing useful — a functionally broken interaction, not just
  missing content.
- **Recommended fix:** Either give each case study its own route (e.g.
  `app/work/[slug]/page.tsx`) and link cards there, per the README's own "Before
  launch" checklist, or remove the link/cursor affordance until real case-study pages
  exist.

### 2.5 Footer social links are generic, not Vedam's real profiles **[Already tracked]**
- **File:** `components/site-footer.tsx:6-10` (data), with a `// TODO: replace with
  the studio's real profiles` comment at line 46.
- **What's wrong:** Links point to bare root domains (`https://instagram.com`,
  `https://linkedin.com`, `https://are.na`), not Vedam's actual profile pages.
- **Why it matters:** Visitors clicking these land on generic platform homepages
  instead of Vedam's social presence.
- **Recommended fix:** Replace with real profile URLs before launch.

### 2.6 Studio "Open on platform" links are unverified guesses **[Already tracked]**
- **File:** `lib/social/strategy.ts:306` (`PLATFORM_URL`), with `// TODO: replace
  with Vedam's real profile URLs before the team uses this` directly above.
- **What's wrong:** URLs like `instagram.com/vedamschooloftechnology` look real but
  are explicitly unverified guesses.
- **Recommended fix:** Confirm and replace with Vedam's actual handles before the
  Studio dashboard is used by the team.

### 2.7 `metadataBase` hardcoded to an unconfirmed domain **[Already tracked]**
- **File:** `app/layout.tsx:14` — `new URL("https://vedam.org")`, with `// TODO:
  point this at the real production domain before launch` directly above.
- **Why it matters:** This value is used to resolve all relative OpenGraph/Twitter
  image URLs; if the real production domain differs, social previews will be broken
  in production.
- **Recommended fix:** Confirm the real domain and update, or drive it from an env
  var so staging/production don't collide.

### 2.8 Studio calendar data is 100% seeded sample content **[Already tracked, note new]**
- **Files:** `scripts/seed-sample.ts` (generator); `data/calendars/2026-08.json` and
  `data/calendars/2026-09.json` (committed output) — every theme/caption is prefixed
  `[SAMPLE]`.
- **New observation:** Given the stated current date (2026-08-29), `2026-08.json`
  represents a month that has already elapsed while still being entirely fake
  placeholder content — i.e., there is currently no real published content for the
  current month in the system this tool is meant to drive.
- **Recommended fix:** Generate and commit real content for the current/upcoming
  months (or clear the seeded data) before the Studio is treated as source-of-truth
  for actual publishing.

### 2.9 Instagram/LinkedIn research providers are stubs **[Already tracked]**
- **File:** `lib/social/insights.ts:173-198` — a `stub()` factory returns empty data
  with an explanatory `note` for Instagram and LinkedIn; only `youtubeProvider`
  (lines 102-171) is actually implemented.
- **Why it matters:** Only one of three platforms gets automated research; the other
  two require fully manual entry. The UI does label this correctly (Manual vs.
  Auto-fetched), so this is a functional gap rather than a hidden bug — flagged here
  for completeness since it directly affects what "generate a month" can do.
- **Recommended fix:** Either implement real Instagram/LinkedIn providers or leave as
  designed manual-entry — no action strictly required, but worth a product decision.

### 2.10 Filesystem-based calendar storage is serverless-incompatible **[Already tracked]**
- **File:** `lib/social/storage.ts:5-12` (doc comment), `:69-73` (acknowledged
  read-modify-write race condition).
- **What's wrong:** The only `CalendarStore` implementation (`JsonCalendarStore`)
  writes JSON to the local filesystem via Node `fs`. This does not work on Vercel or
  any read-only-filesystem serverless host, and concurrent writes from two users can
  silently drop an update.
- **Recommended fix:** Implement a `CalendarStore` backed by a real database (e.g.
  Postgres, per the README's own suggestion) before deploying anywhere serverless or
  before more than one person edits concurrently.

### 2.11 Two package-manager lockfiles committed simultaneously **[New]**
- **Files:** `package-lock.json` (npm) and `pnpm-lock.yaml` + `pnpm-workspace.yaml`
  (pnpm), both present at the repo root.
- **Why it matters:** Whichever lockfile isn't actively used by CI/contributors will
  drift out of sync with `package.json` over time, and it's ambiguous which package
  manager is canonical for this project.
- **Recommended fix:** Pick one package manager, delete the other lockfile (and any
  related config), and document the choice in the README.

### 2.12 Unused default Next.js/Vercel starter assets **[Already tracked]**
- **Files:** `public/file.svg`, `public/globe.svg`, `public/next.svg`,
  `public/vercel.svg`, `public/window.svg` — confirmed unreferenced by any component.
- **Recommended fix:** Delete these before launch, per the README's own checklist.

---

## 3. UI/UX & Design-System Inconsistencies

### 3.1 Brand-identity mismatch between hero copy and site metadata **[New — headline finding]**
- **Files:** `lib/content.ts:7-16` (`site.tagline`, `site.description`),
  `components/sections/hero.tsx` (visible hero copy), `lib/social/strategy.ts:10-15`
  (`BRAND.what`), `app/layout.tsx` (consumes `site.description` for `<meta
  description>`, OpenGraph, and Twitter card).
- **What's wrong:** The visible homepage — hero headline "We build brands people
  remember," the `services` list (Brand strategy, Visual identity, Digital product,
  Design systems), and the `work` case studies — presents Vedam as a **branding/design
  agency**. But `site.description` (used verbatim in the page `<meta description>`,
  OpenGraph tags, and Twitter card) and the entire Studio content-strategy brief in
  `lib/social/strategy.ts` describe Vedam as **"an engineering school offering
  B.Tech in Computer Science & Artificial Intelligence"** targeting prospective
  12th-grade students. `site.tagline` ("Learn Tech by building It") appears as the
  small eyebrow line directly above the "brands people remember" H1
  (`hero.tsx:16-18`), so both messages sit on the very first screen without any
  bridge between them.
- **Why it matters:** A visitor who arrives via a search result or shared link (which
  will show the "engineering school... B.Tech in CS & AI" meta description) lands on
  a page that reads entirely as a creative agency's portfolio, with fictional client
  logos and case studies. This is a structural content bug, not a cosmetic one, and
  it is **not** on the existing "Before launch" checklist — nothing currently flags
  it.
- **Recommended fix:** Decide which identity is correct (branding studio vs.
  engineering school — likely the site is meant to be the school's site, with
  "Vedam" the studio/brand behind its social content strategy) and rewrite
  `site.description`/`hero`/`services`/`work` copy to be internally consistent. This
  should probably happen before or alongside replacing the placeholder client/case
  study content in §2.1, since the correct replacement content depends on resolving
  this mismatch first.

### 3.2 Nav "Studio" link resolves to the testimonial section, not studio content **[New]**
- **Files:** `lib/content.ts:18-23` (`nav` array, `{ label: "Studio", href:
  "#studio" }`), `components/sections/testimonial.tsx` (renders `id="studio"`).
  Shared verbatim by `components/site-header.tsx` (desktop + mobile) and
  `components/site-footer.tsx`.
- **What's wrong:** The `#studio` anchor was assigned to the Testimonial section,
  which shows a single client quote — not any content about the studio/team, and not
  a link to the actual `/studio` internal tool.
- **Why it matters:** Every visitor clicking "Studio" in the header, mobile menu, or
  footer nav — three separate places, all sharing this same wrong link — gets scrolled
  to a customer quote instead of what the label promises.
- **Recommended fix:** Either rename the section `id`/nav label to accurately
  describe the testimonial content, or add a real "Studio/About" section and point
  `#studio` at it. Do not use this anchor to link to the internal `/studio` route —
  that tool is unauthenticated (§1.1) and should not be linked from public marketing
  navigation until it has auth.

### 3.3 Nav order doesn't match the page's actual scroll order **[New]**
- **Files:** `lib/content.ts:18-23` (nav: Work → Services → Process → Studio) vs.
  `app/page.tsx:16-22` (actual render order: Hero → ClientMarquee → Services → Work
  → Process → Testimonial → ContactCta).
- **Why it matters:** "Work" is listed first in the nav but appears after "Services"
  in the actual page. Users who expect the nav to mirror scroll position (a common
  mental model for single-page anchor nav) get a mismatched order.
- **Recommended fix:** Reorder the `nav` array to `Services, Work, Process` to match
  the DOM (combine with resolving §3.2 for the fourth item).

### 3.4 Same CTA rendered three inconsistent ways **[New]**
- **Files:**
  - `components/site-header.tsx:33-38` — filled pill: `rounded-full bg-violet px-5
    py-2.5 text-sm font-medium text-on-dark`.
  - `components/sections/hero.tsx:37-42` — outlined pill, different padding/height:
    `inline-flex h-12 items-center justify-center rounded-full border
    border-ink/20 px-7 text-sm font-medium`.
  - `components/site-header.tsx:93-99` (mobile menu) — bare text link, no
    background/border: `py-4 font-display text-2xl text-accent`.
- **Why it matters:** The same label, "Start a project," has three unrelated visual
  treatments (filled / outlined / plain text) depending on where it appears. Users
  can't build a consistent mental model of what the site's primary action looks
  like.
- **Recommended fix:** Define one canonical primary-CTA style (likely the filled
  pill) and reuse it — as a shared `Button`/`CtaLink` component — everywhere the same
  action is offered, keeping only deliberate, intentional variation (e.g. size) if
  needed for context.

### 3.5 README color-token table is stale vs. actual `globals.css` values **[New]**
- **Files:** `README.md:51-64` (documented table) vs. `app/globals.css:30-33`
  (actual tokens).
- **What's wrong:** README states `paper = #F9F9F9` and `paper-alt = #F8F3EA`.
  Actual code: `--color-paper: #ffffff`, `--color-paper-alt: #f6f3fe`. `#F9F9F9` is
  actually `--color-on-dark` (`globals.css:53`); `#F8F3EA` is actually the separate,
  currently-unused `--color-cream` token (`globals.css:33`).
- **Why it matters:** A developer (or coding agent) trusting the README's documented
  hex values instead of reading `globals.css` directly will use the wrong colors.
- **Recommended fix:** Update the README table to match `globals.css` exactly, or
  regenerate it from the CSS to prevent future drift.

### 3.6 Dead/unused design tokens **[New]**
- **File:** `app/globals.css:33,35` — `--color-cream` and `--color-grey` are defined
  and documented in the README palette table but have zero usages in any component.
- **Why it matters:** These look like tokens that are "already in use" to a
  contributor scanning the design system, when in fact nothing renders with them —
  risk of confusion or of someone assuming brand colors are wired up when they
  aren't.
- **Recommended fix:** Either use them somewhere intentional or mark them clearly as
  reserved/unused in a comment.

### 3.7 Font-family comment contradicts what the code actually does **[New]**
- **Files:** `app/layout.tsx:6-7` (comment: *"Inter is a deliberate override for the
  Studio UI"*) vs. `app/globals.css:78-84` (`@theme inline` maps `--font-display`,
  `--font-sans`, and `--font-mono` all to Inter **globally**, applied via `body {
  font-family: var(--font-inter) }` at `globals.css:87-92`).
- **Why it matters:** The comment implies the marketing homepage still uses the
  brandbook fonts (Outfit + Nunito Sans) and only `/studio` deviates. In reality the
  entire site — hero, headings, CTA buttons — renders in Inter. A future contributor
  reading only the comment would misunderstand the actual font scope.
- **Recommended fix:** Either scope the Inter override to `/studio` only (restoring
  Outfit/Nunito Sans on the marketing site) or fix the comment to say the override is
  site-wide and explain why. Resolve this as a deliberate decision, not by leaving
  the contradiction in place.

### 3.8 Hardcoded hex values duplicate existing color tokens **[New]**
- **File:** `lib/content.ts:73,81,89,97` — `work[].accent` fields like `"from-[#0c0931]
  to-[#2b135c]"`, `"from-[#f97d03] to-[#c200db]"`, etc. (consumed in
  `components/sections/work.tsx:28` as `bg-linear-to-br ${item.accent}`).
- **Why it matters:** Every hex pair here already exists as a named token in
  `globals.css` (e.g. `#0c0931` = `--color-night`, `#2b135c` = `--color-violet`).
  Writing raw hex Tailwind arbitrary values instead of the token names means these
  four gradients will silently go out of sync if the brand palette is ever retuned
  centrally in `globals.css`.
- **Recommended fix:** Replace with token-based classes, e.g. `from-night to-violet`.

### 3.9 Border-radius scale inconsistent across Studio controls **[New]**
- **Files:** `components/studio/calendar-table.tsx:65` (`CopyButton`: `rounded`
  ≈4px) vs. `components/studio/live-link-cell.tsx:46` (`rounded-lg`),
  `components/studio/generate-panel.tsx:42,161` (`rounded-xl`), and every pill-shaped
  CTA elsewhere (`rounded-full`).
- **Why it matters:** `CopyButton` looks visually "square" sitting next to other
  pill-shaped interactive elements (`StatusToggle`, `BucketChip`) in the same table
  row — no evident system governs which radius applies where.
- **Recommended fix:** Normalize to a small set of radius steps tied to component
  type (e.g. pills = `rounded-full`, inputs = `rounded-xl`, small inline buttons =
  one consistent value, not `rounded`).

### 3.10 Mixed icon language: stroke SVGs vs. raw emoji **[New]**
- **Files:** `components/studio/sidebar.tsx` (proper stroke-based `Icon` component,
  `viewBox="0 0 24 24"`) vs. `components/studio/status-toggle.tsx:14-18,92` and
  `components/studio/charts.tsx` (raw emoji: 🎥 ✂️ 🚀, unicode ✓/–).
- **Why it matters:** Emoji rendering varies by OS/browser (weight, color, baseline),
  so status iconography looks inconsistent with the hand-drawn icons used elsewhere
  in the same dashboard.
- **Recommended fix:** Replace the emoji/unicode glyphs with the same stroke-SVG icon
  system used in `sidebar.tsx`.

---

## 4. Accessibility Issues

### 4.1 Orange text on a light card violates the project's own documented rule **[New]**
- **Files:** `components/studio/charts.tsx:94` (`text-orange` on the "Week
  complete" label) rendered inside a `.card` (`app/studio/page.tsx:113`, which is a
  white surface: `--color-paper: #ffffff`).
- **What's wrong:** `app/globals.css:7-13` explicitly documents — and
  `scripts/check-contrast.ts` explicitly asserts as a must-fail case — that Vedams
  Orange (`#F97D03`) is only 2.50:1 contrast on white/paper and must never be used as
  text on a light surface. This exact violation exists in `charts.tsx:94`.
- **Why it matters:** This is a real, measured WCAG-AA failure (2.50:1, needs
  4.5:1 for normal text / 3:1 for large text) shipping in the Studio dashboard,
  despite the project having explicit tooling meant to prevent exactly this. The
  contrast script checks color-token pairs, not actual component usage, so this
  instance slipped through undetected.
- **Recommended fix:** Change `text-orange` to `text-accent` (Electric Violet, the
  documented interactive color for light surfaces) at that line. Consider extending
  `scripts/check-contrast.ts` (or adding a lint rule) to catch `text-orange` used
  outside `.brand-night`/dark contexts, so this class of bug doesn't recur.

### 4.2 Mobile menu toggle below recommended touch-target size **[New]**
- **File:** `components/site-header.tsx:41-46` — `className="-mr-2 p-2 md:hidden"`
  around a 22×22px SVG icon (`width="22" height="22"` at line 53). Total hit area ≈
  38×38px.
- **Why it matters:** Below the WCAG 2.5.5 / common mobile-platform recommendation of
  a 44×44px minimum touch target — makes the primary mobile-nav trigger harder to
  tap accurately, especially for users with motor impairments.
- **Recommended fix:** Increase padding (e.g. `p-3`) or the icon's bounding box so
  the tappable area reaches at least 44×44px.

### 4.3 `MonthPicker` overrides the global focus style with a narrower one **[New]**
- **Files:** `components/studio/month-picker.tsx:27-28` (`focus:outline-accent` —
  `:focus`, outline-color only) vs. the site-wide rule at `app/globals.css:109-112`
  (`:focus-visible { outline: 2px solid var(--color-eviolet); outline-offset: 3px;
  }`).
- **Why it matters:** This is the one place in the app that diverges from the global
  focus treatment — it fires on any `:focus` (including mouse clicks, not just
  keyboard) and doesn't set outline width/offset, so keyboard users get a visibly
  different (likely thinner/less consistent) focus indicator here than everywhere
  else.
- **Recommended fix:** Remove the local override and let the global `:focus-visible`
  rule apply, or explicitly match its outline width/offset/style if a local override
  is genuinely needed.

---

## 5. Layout-Shift & Responsive Risk Notes

These are lower-severity watch-items, not currently-active bugs — flagged so they
aren't reintroduced when related placeholder work (§2.1–2.3) is completed.

### 5.1 No CLS guard-rail for the planned image swap **[New — watch item]**
- **File:** `components/sections/work.tsx:26` (comment: *"CSS-only project panel;
  swap for `<Image>` when art is ready"*).
- **What's wrong:** There is currently no layout-shift risk because no images are
  used anywhere in the app (confirmed: zero `next/image`/`<img>` usage repo-wide).
  However, nothing today enforces that a future `<Image>` swap will include explicit
  `width`/`height` (or `fill` within an `aspect-ratio`-controlled parent).
- **Recommended fix:** When implementing §2.3 (real imagery), use `next/image` with
  explicit dimensions or `fill` inside the existing `aspect-4/3` wrapper class, so
  the swap doesn't introduce CLS.

### 5.2 Hero decorative blob has no responsive size step-down **[New — minor]**
- **File:** `components/sections/hero.tsx:9-12` — fixed `h-[36rem] w-[36rem]`
  (576×576px) decorative gradient blob, contained by `overflow-hidden` on the parent
  so it doesn't cause horizontal scroll, but doesn't scale down on small viewports.
- **Recommended fix:** Add a smaller size at `sm:`/`md:` breakpoints if the design
  intent is for it to feel proportional on mobile rather than a large fixed blur.

### 5.3 `MonthPicker` selects lack a wrap/shrink fallback **[New — minor]**
- **File:** `components/studio/month-picker.tsx:27,31` — year/month `<select>`
  elements sit in a `flex flex-wrap` row with no `min-w-0`/`w-full` fallback.
- **Recommended fix:** Low risk today (month names are short), but add a shrink
  fallback if the `MONTHS` list content ever changes to something longer/localized.

---

## 6. Priority Triage Table

| # | Severity | Area | File(s) | Issue | Recommended action |
|---|---|---|---|---|---|
| 1 | **Critical** | Security | `app/studio/actions.ts:9-13` | `/studio` Server Actions have zero authentication, reachable by direct POST | Add auth check to all 4 actions before any public deployment |
| 2 | High | Content | `lib/content.ts:7-16`, `hero.tsx`, `strategy.ts:10-15` | Brand-identity mismatch: hero sells a design agency, meta/social-strategy describe an engineering school | Resolve which identity is correct; rewrite copy consistently |
| 3 | High | Navigation | `lib/content.ts:18-23`, `testimonial.tsx` | Nav "Studio" link scrolls to a testimonial, not studio content | Rename/retarget the anchor or add real studio/about content |
| 4 | High | Content | `lib/content.ts` (clients/work/testimonial/stats) | Entire marketing content is fabricated placeholder | Replace with real content before launch |
| 5 | High | Content | `components/sections/work.tsx:17-18` | Placeholder disclaimer rendered as live on-page copy | Remove once real content/imagery lands |
| 6 | Medium | Flow | `components/sections/work.tsx:25` | All work cards link to `#work` (self-referential, dead-end) | Add real case-study routes or remove link affordance |
| 7 | Medium | Accessibility | `components/studio/charts.tsx:94` | Orange text on white card fails WCAG AA (2.50:1), violates project's own contrast rule | Change to `text-accent`; consider extending contrast script to catch usage, not just tokens |
| 8 | Medium | Design system | `components/site-header.tsx`, `hero.tsx` | Same "Start a project" CTA styled 3 different ways | Consolidate into one shared CTA component/style |
| 9 | Medium | Content | `components/site-footer.tsx:6-10` | Footer social links are generic root domains, not real profiles | Replace with real URLs |
| 10 | Medium | Content | `lib/social/strategy.ts:306` | Studio "Open on platform" URLs are unverified guesses | Confirm and replace with real handles |
| 11 | Medium | SEO | `app/layout.tsx:14` | `metadataBase` hardcoded to unconfirmed domain | Confirm real production domain |
| 12 | Medium | Infra | `lib/social/storage.ts:5-12,69-73` | Filesystem JSON storage incompatible with serverless; race condition on concurrent writes | Implement DB-backed `CalendarStore` before serverless deploy or multi-user use |
| 13 | Low | Data | `data/calendars/2026-08.json`, `2026-09.json` | Calendar data is 100% `[SAMPLE]` placeholder, including an already-elapsed month | Generate/replace with real content |
| 14 | Low | Docs | `README.md:51-64` vs `app/globals.css:30-33` | README color-token table is stale/incorrect | Update README to match actual token values |
| 15 | Low | Design system | `app/layout.tsx:6-7` vs `globals.css:78-84` | Comment says Inter is Studio-only; it's applied site-wide | Fix comment or scope the font correctly |
| 16 | Low | Design system | `lib/content.ts:73,81,89,97` | Hardcoded hex values duplicate existing color tokens | Replace with token-based Tailwind classes |
| 17 | Low | Design system | `app/globals.css:33,35` | `--color-cream`/`--color-grey` tokens defined but unused | Use them or mark as reserved |
| 18 | Low | Design system | `components/studio/calendar-table.tsx:65` | `CopyButton` radius inconsistent with other pill controls | Normalize border-radius scale |
| 19 | Low | Design system | `components/studio/sidebar.tsx` vs `status-toggle.tsx`/`charts.tsx` | Mixed stroke-SVG vs. emoji icon language | Standardize on the stroke-SVG icon system |
| 20 | Low | Accessibility | `components/site-header.tsx:41-46` | Mobile hamburger touch target ≈38px, below 44px recommendation | Increase tap-target padding |
| 21 | Low | Accessibility | `components/studio/month-picker.tsx:27-28` | Focus style diverges from global `:focus-visible` rule | Remove local override or match it |
| 22 | Low | Navigation | `lib/content.ts:18-23` vs `app/page.tsx:16-22` | Nav order doesn't match actual page scroll order | Reorder nav to `Services, Work, Process, ...` |
| 23 | Low | Housekeeping | `package-lock.json` + `pnpm-lock.yaml`/`pnpm-workspace.yaml` | Two package-manager lockfiles committed simultaneously | Pick one, delete the other |
| 24 | Low | Housekeeping | `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` | Unused default Next.js/Vercel starter assets | Delete |
| 25 | Low | Functional gap | `lib/social/insights.ts:173-198` | Instagram/LinkedIn research providers are stubs (only YouTube implemented) | Implement or confirm manual-entry is by design |
| 26 | Watch item | Layout shift | `components/sections/work.tsx:26` | No CLS guard-rail for planned `<Image>` swap | Use explicit dimensions/`fill` + existing `aspect-4/3` wrapper when implementing |
| 27 | Watch item | Responsive | `components/sections/hero.tsx:9-12` | Hero decorative blob has no responsive size step-down | Add smaller size at `sm:`/`md:` if desired |
| 28 | Watch item | Responsive | `components/studio/month-picker.tsx:27,31` | Selects lack a wrap/shrink fallback | Add `min-w-0` fallback if content ever lengthens |
