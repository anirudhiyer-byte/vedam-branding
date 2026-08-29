import Link from "next/link";
import { PLATFORM_LABEL, platformUrl } from "@/lib/social/strategy";
import { PLATFORMS, type Platform } from "@/lib/social/types";
import { Wordmark } from "@/components/wordmark";
import { SignOutButton } from "./sign-out-button";
import { Icon, type IconName } from "./icons";

/** Platform tabs use the shared stroke-SVG set, not a second local copy. */
const PLATFORM_ICON: Record<Platform, IconName> = {
  instagram: "instagram",
  linkedin: "linkedin",
  youtube: "youtube",
};

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
  const activeUrl = platformUrl(active);

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
              <Icon name={PLATFORM_ICON[p]} className="size-5" />
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

      <div className="mt-auto space-y-2">
        {/* Rendered only once the real profile URL is configured — see
            lib/social/strategy/links.ts for why there is no default. */}
        {activeUrl && (
          <a
            href={activeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="brand-gradient-bg flex items-center gap-3 rounded-2xl p-4 text-on-dark shadow-tile transition-transform hover:-translate-y-0.5"
          >
            <Icon name="external" className="size-5" />
            <span className="text-sm leading-tight font-bold">
              Open Vedam
              <span className="block text-xs font-medium opacity-85">
                on {PLATFORM_LABEL[active]}
              </span>
            </span>
          </a>
        )}
        <SignOutButton />
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
            <Icon name={PLATFORM_ICON[p]} className="size-5" />
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
