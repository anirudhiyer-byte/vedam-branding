import type { Platform } from "./types";

/**
 * Channel + competitor research that feeds the strategist.
 *
 * Platform reality, so nobody is surprised later:
 *
 * - YouTube  — Data API v3 is free, generous, and fully supports reading both
 *              your own channel and any competitor's public videos and stats.
 *              Implemented for real below. Needs YOUTUBE_API_KEY.
 * - Instagram — the Graph API reads YOUR OWN Business/Creator account fully,
 *              but competitor access is limited to Business Discovery (basic
 *              public metrics on business accounts only, no captions history
 *              worth much). Needs a Meta app, a linked Facebook Page, and a
 *              long-lived token. Stubbed.
 * - LinkedIn — organic post analytics require an approved Marketing Developer
 *              Platform app and Page admin rights, and there is no supported
 *              way to read a competitor's organic posts at all. Scraping it
 *              violates the User Agreement. Stubbed; expect to supply this
 *              context manually.
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

const YT = "https://www.googleapis.com/youtube/v3";

async function ytJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY is not set");
  const url = new URL(`${YT}/${path}`);
  for (const [k, v] of Object.entries({ ...params, key })) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`YouTube API ${path} failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/** Words too common to be a useful signal. */
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "for", "to", "of", "in", "on", "at",
  "is", "it", "you", "your", "my", "we", "how", "what", "why", "with", "this",
  "that", "from", "be", "are", "i", "do", "can", "will", "vs", "best", "top",
]);

function extractKeywords(titles: string[], limit = 12): string[] {
  const counts = new Map<string, number>();
  for (const title of titles) {
    const words = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w));
    for (const w of new Set(words)) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

interface YtChannelsResponse {
  items?: { contentDetails: { relatedPlaylists: { uploads: string } } }[];
}
interface YtPlaylistResponse {
  items?: { contentDetails: { videoId: string } }[];
}
interface YtVideosResponse {
  items?: {
    id: string;
    snippet: { title: string; publishedAt: string };
    statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
  }[];
}

export const youtubeProvider: InsightProvider = {
  platform: "youtube",
  available: () => Boolean(process.env.YOUTUBE_API_KEY),

  async fetch(handles, isCompetitor) {
    const results: ChannelInsight[] = [];

    for (const handle of handles) {
      // Accept either a raw channel id (UC...) or an @handle.
      const params: Record<string, string> = handle.startsWith("UC")
        ? { part: "contentDetails", id: handle }
        : { part: "contentDetails", forHandle: handle.replace(/^@/, "") };

      const channel = await ytJson<YtChannelsResponse>("channels", params);
      const uploads = channel.items?.[0]?.contentDetails.relatedPlaylists.uploads;
      if (!uploads) {
        results.push({
          platform: "youtube",
          handle,
          isCompetitor,
          topPosts: [],
          recurringKeywords: [],
          note: "Channel not found.",
        });
        continue;
      }

      const playlist = await ytJson<YtPlaylistResponse>("playlistItems", {
        part: "contentDetails",
        playlistId: uploads,
        maxResults: "50",
      });
      const ids = (playlist.items ?? []).map((i) => i.contentDetails.videoId);
      if (ids.length === 0) {
        results.push({
          platform: "youtube", handle, isCompetitor,
          topPosts: [], recurringKeywords: [], note: "No uploads found.",
        });
        continue;
      }

      const videos = await ytJson<YtVideosResponse>("videos", {
        part: "snippet,statistics",
        id: ids.join(","),
      });

      const posts: PostInsight[] = (videos.items ?? [])
        .map((v) => ({
          title: v.snippet.title,
          url: `https://youtube.com/watch?v=${v.id}`,
          publishedAt: v.snippet.publishedAt,
          views: v.statistics.viewCount ? Number(v.statistics.viewCount) : undefined,
          likes: v.statistics.likeCount ? Number(v.statistics.likeCount) : undefined,
          comments: v.statistics.commentCount ? Number(v.statistics.commentCount) : undefined,
        }))
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0));

      const top = posts.slice(0, 10);
      results.push({
        platform: "youtube",
        handle,
        isCompetitor,
        topPosts: top,
        recurringKeywords: extractKeywords(top.map((p) => p.title)),
      });
    }

    return results;
  },
};

function stub(platform: Platform, why: string): InsightProvider {
  return {
    platform,
    available: () => false,
    async fetch(handles, isCompetitor) {
      return handles.map((handle) => ({
        platform,
        handle,
        isCompetitor,
        topPosts: [],
        recurringKeywords: [],
        note: why,
      }));
    },
  };
}

export const instagramProvider = stub(
  "instagram",
  "Not connected. Needs a Meta app with a linked Facebook Page and a long-lived token. Own-account data is fully readable; competitor data is limited to Business Discovery.",
);

export const linkedinProvider = stub(
  "linkedin",
  "Not connected. Organic analytics need an approved Marketing Developer Platform app plus Page admin rights, and competitor organic posts cannot be read through any supported API — supply this context manually.",
);

export const providers: Record<Platform, InsightProvider> = {
  youtube: youtubeProvider,
  instagram: instagramProvider,
  linkedin: linkedinProvider,
};

/** Renders gathered insights into the text block the strategist reads. */
export function renderInsightsBrief(insights: ChannelInsight[]): string {
  if (insights.length === 0) return "";
  const lines: string[] = [];

  for (const c of insights) {
    lines.push(
      `## ${c.isCompetitor ? "Competitor" : "Our channel"} — ${c.platform} ${c.handle}`,
    );
    if (c.note) lines.push(`_${c.note}_`);
    if (c.topPosts.length) {
      lines.push("Top performing:");
      for (const p of c.topPosts) {
        const v = p.views != null ? ` — ${p.views.toLocaleString("en-IN")} views` : "";
        lines.push(`- "${p.title}"${v}`);
      }
    }
    if (c.recurringKeywords.length) {
      lines.push(`Recurring keywords: ${c.recurringKeywords.join(", ")}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/** What the team types into the generate form, for one platform. */
export interface PlatformResearchInput {
  platform: Platform;
  ownHandle: string;
  competitors: string[];
  /** Free-text context, for platforms whose APIs cannot be read. */
  notes: string;
}

export function parseHandles(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function renderManual(input: PlatformResearchInput): string {
  const lines: string[] = [];
  if (input.ownHandle) lines.push(`Our account: ${input.ownHandle}`);
  if (input.competitors.length) {
    lines.push(`Competitors we watch: ${input.competitors.join(", ")}`);
  }
  if (input.notes) lines.push(`Notes from the team:\n${input.notes}`);
  return lines.join("\n");
}

/**
 * Gathers research per platform: fetched automatically where the API allows it
 * (YouTube), and taken from what the team typed everywhere else. Returns one
 * brief per platform so each platform's planning call gets its own context
 * rather than a single pooled blob.
 */
export async function gatherResearch(
  inputs: PlatformResearchInput[],
): Promise<Partial<Record<Platform, string>>> {
  const out: Partial<Record<Platform, string>> = {};

  for (const input of inputs) {
    const sections: string[] = [];
    const manual = renderManual(input);
    if (manual) sections.push(manual);

    const provider = providers[input.platform];
    const handles = [
      ...(input.ownHandle ? [input.ownHandle] : []),
      ...input.competitors,
    ];

    if (provider.available() && handles.length > 0) {
      try {
        const own = input.ownHandle
          ? await provider.fetch([input.ownHandle], false)
          : [];
        const rivals = input.competitors.length
          ? await provider.fetch(input.competitors, true)
          : [];
        const fetched = renderInsightsBrief([...own, ...rivals]);
        if (fetched.trim()) sections.push(fetched);
      } catch (err) {
        // Never let a bad handle or a quota error block the month.
        console.error(`${input.platform} research failed, continuing:`, err);
      }
    }

    if (sections.length) out[input.platform] = sections.join("\n\n");
  }

  return out;
}
