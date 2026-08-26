import { CalendarTable } from "@/components/studio/calendar-table";
import { WeeklyProgress } from "@/components/studio/charts";
import { GeneratePanel } from "@/components/studio/generate-panel";
import { MonthPicker } from "@/components/studio/month-picker";
import { MobilePlatformNav, Sidebar } from "@/components/studio/sidebar";
import { SummaryPanel } from "@/components/studio/summary-panel";
import { ThemeBanner } from "@/components/studio/theme-banner";
import { UpNext } from "@/components/studio/up-next";
import { store } from "@/lib/social/storage";
import { itemsFor, summarisePlatform } from "@/lib/social/summary";
import { PLATFORM_LABEL, PLATFORM_STRATEGY } from "@/lib/social/strategy";
import { PLATFORMS, type Platform } from "@/lib/social/types";

// Reads the filesystem and must reflect writes immediately.
export const dynamic = "force-dynamic";

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export default async function StudioPage(props: PageProps<"/studio">) {
  const sp = await props.searchParams;
  const now = new Date();

  const pick = (v: string | string[] | undefined, fallback: number) => {
    const n = Number(Array.isArray(v) ? v[0] : v);
    return Number.isInteger(n) ? n : fallback;
  };

  const existing = await store.list(); // newest first
  const explicit = sp.y !== undefined || sp.m !== undefined;

  const currentId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  // Opening onto an empty current month is a dead end — with no month in the
  // URL, land on the most recently planned month instead.
  const openId =
    existing.length === 0 || existing.includes(currentId) ? currentId : existing[0];

  const year = explicit ? pick(sp.y, now.getFullYear()) : Number(openId.slice(0, 4));
  const month = explicit
    ? Math.min(12, Math.max(1, pick(sp.m, now.getMonth() + 1)))
    : Number(openId.slice(5, 7));

  const rawPlatform = Array.isArray(sp.p) ? sp.p[0] : sp.p;
  const platform: Platform = PLATFORMS.includes(rawPlatform as Platform)
    ? (rawPlatform as Platform)
    : "instagram";

  const id = `${year}-${String(month).padStart(2, "0")}`;
  const calendar = await store.get(id);

  const years = [
    ...new Set([
      ...existing.map((k) => Number(k.slice(0, 4))),
      now.getFullYear() - 1,
      now.getFullYear(),
      now.getFullYear() + 1,
      year,
    ]),
  ].sort((a, b) => b - a);

  const counts = Object.fromEntries(
    PLATFORMS.map((p) => [p, calendar ? itemsFor(calendar, p).length : 0]),
  ) as Record<Platform, number>;

  const items = calendar ? itemsFor(calendar, platform) : [];
  const summary = calendar ? summarisePlatform(calendar, platform) : null;

  return (
    <div className="mx-auto flex w-full max-w-[104rem] gap-6">
      <Sidebar active={platform} year={year} month={month} counts={counts} />

      <div className="min-w-0 flex-1 space-y-6">
        <MobilePlatformNav
          active={platform}
          year={year}
          month={month}
          counts={counts}
        />

        {/* Top bar */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">
              {PLATFORM_LABEL[platform]} calendar
            </h1>
            <p className="mt-1 text-sm font-semibold text-ink-muted">
              {monthLabel(year, month)}
            </p>
          </div>
          <MonthPicker year={year} month={month} years={years} platform={platform} />
        </header>

        {calendar && summary ? (
          <>
            <ThemeBanner
              calendar={calendar}
              platform={platform}
              summary={summary}
              year={year}
              month={month}
            />

            {/* The month at a glance, first — this is what the team opens for. */}
            <section className="card p-5 md:p-6">
              <SummaryPanel summary={summary} />
            </section>

            <div className="grid gap-6 xl:grid-cols-3">
              <section className="card p-5">
                <h2 className="font-display text-lg font-bold">Weekly progress</h2>
                <p className="mt-0.5 text-xs text-ink-faint">
                  How far each week has got
                </p>
                <div className="mt-4">
                  <WeeklyProgress items={items} year={year} month={month} />
                </div>
              </section>

              <div className="xl:col-span-2">
                <UpNext items={items} />
              </div>
            </div>

            {/* Then the calendar itself. */}
            <section className="card overflow-hidden">
              <div className="flex flex-wrap items-baseline justify-between gap-3 p-5 pb-4">
                <h2 className="font-display text-lg font-bold">
                  {PLATFORM_LABEL[platform]} posts
                </h2>
                <p className="text-xs text-ink-faint">
                  {PLATFORM_STRATEGY[platform].audience.split(".")[0]}.
                </p>
              </div>
              <CalendarTable monthId={calendar.id} items={items} />
            </section>

            <details className="card p-5">
              <summary className="cursor-pointer font-display text-lg font-bold">
                Re-plan {PLATFORM_LABEL[platform]}
              </summary>
              <div className="mt-4">
                {/* Context for judging whether the plan is right — which is
                    exactly the moment you would re-plan. */}
                <div className="mb-5 rounded-2xl bg-paper-alt p-4">
                  <h3 className="eyebrow">Why this theme</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                    {calendar.theme.rationale}
                  </p>
                </div>

                {/* Scoped to the open platform — the others are untouched. */}
                <GeneratePanel
                  year={year}
                  month={month}
                  monthLabel={monthLabel(year, month)}
                  platform={platform}
                  regenerate
                />
              </div>
            </details>
          </>
        ) : (
          <GeneratePanel
            year={year}
            month={month}
            monthLabel={monthLabel(year, month)}
            regenerate={false}
          />
        )}
      </div>
    </div>
  );
}
