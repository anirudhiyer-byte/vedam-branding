import { env } from "@/lib/config/env";
import type { Platform } from "../types";

/**
 * Vedam's own profile URLs, for the "open our channel" links.
 *
 * Deliberately environment-driven with no defaults. The previous version
 * hardcoded plausible-looking guesses — `instagram.com/vedamschooloftechnology`
 * and friends — with a comment admitting they were unverified. A guessed URL
 * that looks right is worse than no URL: it renders as a working link and
 * sends the team, or a visitor, somewhere that may belong to someone else.
 *
 * Unset means the link is not rendered at all. Set the three env vars once the
 * real handles are confirmed and the links appear.
 */
export function platformUrl(platform: Platform): string | null {
  switch (platform) {
    case "instagram":
      return env.VEDAM_INSTAGRAM_URL ?? null;
    case "linkedin":
      return env.VEDAM_LINKEDIN_URL ?? null;
    case "youtube":
      return env.VEDAM_YOUTUBE_URL ?? null;
  }
}
