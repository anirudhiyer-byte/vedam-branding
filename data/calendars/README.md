# Calendar data

Where the JSON storage adapter writes planned months, one file per month
(`2026-09.json`).

**Nothing here is committed.** `.gitignore` excludes `*.json` in this
directory. Planned months are operational data that changes constantly, and
committing them is how two months of `[SAMPLE]` placeholder content — including
one for a month that had already elapsed — came to sit in the repo rendering as
if it were the team's real plan.

There is no seed script and no sample month. An unplanned month shows the
"Plan this month" panel, which is the correct empty state and the actual entry
point to the tool.

For anything beyond a single Node process, set `DATABASE_URL` and use the
Postgres adapter instead — this directory is not used at all then. See the
Storage section of the root README.
