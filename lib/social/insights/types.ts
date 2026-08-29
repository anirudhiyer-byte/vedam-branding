import type { Platform } from "../types";

/**
 * Channel and competitor research that feeds the strategist.
 *
 * Platform reality, stated up front so nobody is surprised later:
 *
 * - YouTube   — Data API v3 is free, generous, and fully supports reading both
 *               your own channel and any competitor's public videos and stats.
 *               Implemented for real. Needs YOUTUBE_API_KEY.
 * - Instagram — the Graph API reads YOUR OWN Business/Creator account fully,
 *               but competitor access is limited to Business Discovery. Needs a
 *               Meta app, a linked Facebook Page, and a long-lived token.
 *               Manual entry by design until that exists.
 * - LinkedIn  — organic post analytics require an approved Marketing Developer
 *               Platform app and Page admin rights, and there is no supported
 *               way to read a competitor's organic posts at all. Scraping it
 *               violates the User Agreement, so this stays manual.
 *
 * The UI labels each platform Auto-fetched or Manual to match, so the gap is
 * visible to the team rather than being a silent no-op.
 */

export interface PostInsight {
  title: string;
  url: string;
  publishedAt: string;
  views?: number;
  likes?: number;
  comments?: number;
}

export interface ChannelInsight {
  platform: Platform;
  handle: string;
  isCompetitor: boolean;
  topPosts: PostInsight[];
  /** Terms that recur in the best-performing posts. */
  recurringKeywords: string[];
  note?: string;
}

export interface InsightProvider {
  platform: Platform;
  available(): boolean;
  fetch(handles: string[], isCompetitor: boolean): Promise<ChannelInsight[]>;
}

/** What the team types into the generate form, for one platform. */
export interface PlatformResearchInput {
  platform: Platform;
  ownHandle: string;
  competitors: string[];
  /** Free-text context, for platforms whose APIs cannot be read. */
  notes: string;
}
