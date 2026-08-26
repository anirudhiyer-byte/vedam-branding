import { PLATFORM_LABEL, PLATFORM_URL } from "@/lib/social/strategy";
import type { Platform } from "@/lib/social/types";

/** Opens Vedam's actual profile on the platform you're looking at. */
export function PlatformLink({ platform }: { platform: Platform }) {
  const name = PLATFORM_LABEL[platform];

  return (
    <a
      href={PLATFORM_URL[platform]}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-2.5 rounded-full border border-rule bg-paper px-4 py-2 text-sm font-bold transition-all hover:-translate-y-0.5 hover:border-accent hover:text-accent hover:shadow-md"
    >
      Open Vedam on {name}
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 11 11 5" />
        <path d="M6 5h5v5" />
      </svg>
    </a>
  );
}
