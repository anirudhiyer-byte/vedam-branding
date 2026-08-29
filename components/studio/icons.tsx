import type { ProductionStage } from "@/lib/social/types";

/**
 * One stroke-SVG icon system for the whole dashboard.
 *
 * The Studio previously mixed a proper 24×24 stroke icon set in the sidebar
 * with raw emoji (🎥 ✂️ 🚀 🎉) and unicode glyphs (✓ –) in the table. Emoji
 * render at different weights, colours, and baselines on every OS, so the same
 * row looked different on a Mac and a Windows laptop and never matched the
 * hand-drawn icons a few pixels away.
 *
 * Every icon here inherits `currentColor` and the same 1.75 stroke weight, so
 * they sit on one optical grid wherever they are used.
 */

export type IconName =
  | "camera"
  | "scissors"
  | "rocket"
  | "check"
  | "dash"
  | "sparkle"
  | "instagram"
  | "linkedin"
  | "youtube"
  | "external"
  | "chevron-down"
  | "chevron-up";

const PATHS: Record<IconName, React.ReactNode> = {
  camera: (
    <>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h8A1.5 1.5 0 0 1 14 8.5v7A1.5 1.5 0 0 1 12.5 17h-8A1.5 1.5 0 0 1 3 15.5z" />
      <path d="m14 11 5-3v8l-5-3z" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <path d="M8.1 7.6 20 18M20 6 8.1 16.4" />
    </>
  ),
  rocket: (
    <>
      <path d="M12 3c3 2 4.5 5 4.5 8.5L12 16l-4.5-4.5C7.5 8 9 5 12 3Z" />
      <path d="M9 15l-2 4 4-2M15 15l2 4-4-2" />
      <circle cx="12" cy="9.5" r="1.5" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  dash: <path d="M6 12h12" />,
  sparkle: (
    <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.3l-1.8-5.7L4.5 10.8 10.2 9z" />
  ),
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M8 10.5V17M8 7.5v.01M12 17v-3.75a2.25 2.25 0 0 1 4.5 0V17" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="m10 9.5 5 2.5-5 2.5z" />
    </>
  ),
  external: (
    <>
      <path d="M8 16 16 8" />
      <path d="M9 8h7v7" />
    </>
  ),
  "chevron-down": <path d="m6 9.5 6 6 6-6" />,
  "chevron-up": <path d="m6 14.5 6-6 6 6" />,
};

export function Icon({
  name,
  className = "size-4",
  strokeWidth = 1.75,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  );
}

/** The icon for each production stage, replacing the previous emoji. */
export const STAGE_ICON: Record<ProductionStage, IconName> = {
  shoot: "camera",
  edit: "scissors",
  posted: "rocket",
};
