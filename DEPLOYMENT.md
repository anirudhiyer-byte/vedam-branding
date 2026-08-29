# Deploying to Vercel

The marketing site works on Vercel with one environment variable. The Content
Studio needs four more **and a Postgres database** — without one it cannot save
anything, because Vercel's filesystem is read-only.

---

## 1. Environment variables

Set these in **Vercel → your project → Settings → Environment Variables**, for
Production (and Preview, if you want the Studio working there too).

Never put these in the repository. `.env*` is gitignored apart from
`.env.example`, and secrets committed to git stay in the history even after the
repo is made private or the file is deleted.

| Variable | Value | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://vedam-branding.vercel.app` | Yes |
| `STUDIO_PASSWORD` | 12+ characters — see note below | Yes, for the Studio |
| `STUDIO_SESSION_SECRET` | 32+ characters, random | Yes, for the Studio |
| `ANTHROPIC_API_KEY` | your key | To plan calendars |
| `DATABASE_URL` | Postgres connection string | Yes, for the Studio |
| `YOUTUBE_API_KEY` | your key | Optional — enables YouTube research |
| `AI_MONTHLY_BUDGET_USD` | e.g. `25` | Strongly recommended |

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### The password minimum is 12 characters

`STUDIO_PASSWORD` must be at least 12 characters, and the app refuses to start
in production with anything shorter. This is not arbitrary strictness: the
Studio sits on a public URL, and its generate actions spend real money against
your Anthropic key. A short password on a public endpoint that bills a card is
the same finding as having no password, with extra steps.

### Rotate any key that has been pasted into a chat, ticket, or email

Making the repository private does not un-share a key that has already been sent
somewhere else. Rotate it once the deployment works:

- Anthropic — https://console.anthropic.com/settings/keys
- YouTube — Google Cloud console → Credentials

Rotating is two clicks and one paste into Vercel, and it removes the only copy
you cannot account for.

---

## 2. Attach a Postgres database

**This is required for the Studio.** Vercel runs the app on a read-only
filesystem, so the JSON storage adapter physically cannot write there.

Without `DATABASE_URL`, the marketing site is unaffected and the Studio still
signs you in — but the moment you press "Plan this month" it checks that storage
is writable, fails that check, and stops **before making any model calls**. You
get a message naming the fix and a bill of zero, instead of paying for five
calls and losing the result on save.

`pnpm run check:env` reports the same problem as fatal when it detects Vercel,
so a deploy pipeline can catch it earlier.

Fastest route:

1. Vercel dashboard → **Storage** → **Create Database** → **Neon** (Postgres).
2. Connect it to this project. Vercel injects `DATABASE_URL` automatically.
3. Redeploy.

Any Postgres works — Neon, Supabase, Railway, RDS. The app applies its own
schema on first use, so there is no migration step. To apply it deliberately:

```bash
DATABASE_URL=... pnpm run db:migrate
```

The marketing site does **not** need a database. If you only want the public
site live, set `NEXT_PUBLIC_SITE_URL` and leave the rest unset — the Studio will
simply refuse to sign anyone in.

---

## 3. Verify

```bash
pnpm run check:env    # locally, against .env.local
```

After deploying, check in this order:

1. `https://vedam-branding.vercel.app/` — the marketing site loads.
2. `https://vedam-branding.vercel.app/studio` — redirects to `/studio/login`.
   If it does not, stop: the guard is not running.
3. Sign in. If the page says "not configured", `STUDIO_PASSWORD` or
   `STUDIO_SESSION_SECRET` is missing.
4. Plan a month. The panel reports what the run cost, how much of the prompt was
   served from cache, and how that compares to running every call uncached on
   the top tier.

Before the first real run, confirm the keys and the model tiers work — this
costs a few cents and is much cheaper than a failed month:

```bash
pnpm run check:keys      # both API keys
pnpm run check:models    # each tier's request shape, and that caching is live
```

---

## 4. What a month costs

Five model calls: one theme (Opus 5), three platform plans (Sonnet 5), one
Shorts rewrite (Haiku 4.5). Re-planning one platform is one call.

`AI_MONTHLY_BUDGET_USD` is a hard ceiling, checked before a run starts and
between calls inside it. Set it. It is the difference between a bad afternoon
and a bad invoice.

The budget ledger is per-instance by default, so on Vercel — where each
deployment may run several instances — treat it as a strong guard rather than an
exact global cap. `lib/ai/budget.ts` documents the `BudgetStore` interface to
implement against the database if you want it exact.
