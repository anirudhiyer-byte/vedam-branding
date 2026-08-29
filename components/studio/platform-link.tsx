import { PLATFORM_LABEL, platformUrl } from "@/lib/social/strategy";
import type { Platform } from "@/lib/social/types";
import { Icon } from "./icons";

/**
 * Opens Vedam's actual profile on the platform you're looking at.
 *
 * Renders nothing when the URL is not configured. The previous version shipped
 * plausible-looking guesses at the handles, which meant the button always
 * worked and sometimes went somewhere that is not ours. An absent button is
 * the honest state until the real handle is set — see lib/social/strategy/links.
 */
export function PlatformLink({ platform }: { platform: Platform }) {
  const href = platformUrl(platform);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex min-h-11 items-center gap-2.5 rounded-full border border-rule bg-paper px-4 py-2 text-sm font-bold transition-all hover:-translate-y-0.5 hover:border-accent hover:text-accent hover:shadow-md"
    >
      Open Vedam on {PLATFORM_LABEL[platform]}
      <Icon
        name="external"
        className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        strokeWidth={2}
      />
    </a>
  );
}
