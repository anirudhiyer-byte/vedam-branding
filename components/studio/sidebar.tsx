import Link from "next/link";
import { PLATFORM_LABEL, PLATFORM_URL } from "@/lib/social/strategy";
import { PLATFORMS, type Platform } from "@/lib/social/types";
import { Wordmark } from "@/components/wordmark";

function Icon({ name }: { name: Platform | "home" | "out" }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (name === "instagram")
    return (
      <svg viewBox="0 0 24 24" className="size-5" {...common}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  if (name === "linkedin")
    return (
      <svg viewBox="0 0 24 24" className="size-5" {...common}>
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="M8 10.5V17M8 7.5v.01M12 17v-3.6a2.4 2.4 0 0 1 4.8 0V17" />
      </svg>
    );
  if (name === "youtube")
    return (
      <svg viewBox="0 0 24 24" className="size-5" {...common}>
        <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
        <path d="M10.5 9.5 15 12l-4.5 2.5z" />
      </svg>
    );
  if (name === "out")
    return (
      <svg viewBox="0 0 24 24" className="size-5" {...common}>
        <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
        <path d="M10 17 5 12l5-5M5 12h11" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className="size-5" {...common}>
      <path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 21v-7h6v7" />
    </svg>
  );
}

export function Sidebar({
  active,
  year,
  month,
  counts,
}: {
  active: Platform;
  year: number;
  month: number;
  counts: Record<Platform, number>;
}) {
  return (
    <aside className="card sticky top-4 hidden h-[calc(100dvh-2rem)] w-64 shrink-0 flex-col p-5 lg:flex">
      <Link href="/" className="px-2 text-ink">
        <Wordmark className="h-8" />
      </Link>

      <p className="eyebrow mt-8 px-3">Calendars</p>
      <nav aria-label="Platform" className="mt-2 flex flex-col gap-1.5">
        {PLATFORMS.map((p) => {
          const isActive = p === active;
          return (
            <Link
              key={p}
              href={`/studio?y=${year}&m=${month}&p=${p}`}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-bold transition-all ${
                isActive
                  ? "bg-eviolet text-on-dark shadow-tile"
                  : "text-ink-muted hover:bg-paper-alt hover:text-ink"
              }`}
            >
              <Icon name={p} />
              <span className="flex-1">{PLATFORM_LABEL[p]}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[0.6875rem] tabular-nums ${
                  isActive ? "bg-white/20" : "bg-paper-alt text-ink-faint"
                }`}
              >
                {counts[p]}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <a
          href={PLATFORM_URL[active]}
          target="_blank"
          rel="noopener noreferrer"
          className="brand-gradient-bg flex items-center gap-3 rounded-2xl p-4 text-on-dark shadow-tile transition-transform hover:-translate-y-0.5"
        >
          <Icon name="out" />
          <span className="text-sm leading-tight font-bold">
            Open Vedam
            <span className="block text-xs font-medium opacity-85">
              on {PLATFORM_LABEL[active]}
            </span>
          </span>
        </a>
      </div>
    </aside>
  );
}

/** Sidebar is desktop-only, so small screens get the same nav as a pill row. */
export function MobilePlatformNav({
  active,
  year,
  month,
  counts,
}: {
  active: Platform;
  year: number;
  month: number;
  counts: Record<Platform, number>;
}) {
  return (
    <nav
      aria-label="Platform"
      className="card flex items-center gap-2 overflow-x-auto p-2 lg:hidden"
    >
      {PLATFORMS.map((p) => {
        const isActive = p === active;
        return (
          <Link
            key={p}
            href={`/studio?y=${year}&m=${month}&p=${p}`}
            aria-current={isActive ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-bold transition-colors ${
              isActive
                ? "bg-eviolet text-on-dark"
                : "text-ink-muted hover:bg-paper-alt hover:text-ink"
            }`}
          >
            <Icon name={p} />
            {PLATFORM_LABEL[p]}
            <span
              className={`rounded-full px-1.5 text-[0.6875rem] tabular-nums ${
                isActive ? "bg-white/20" : "bg-paper-alt text-ink-faint"
              }`}
            >
              {counts[p]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
