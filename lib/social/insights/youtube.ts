import { env } from "@/lib/config/env";
import { extractKeywords } from "./keywords";
import type { ChannelInsight, InsightProvider, PostInsight } from "./types";

/**
 * YouTube Data API v3 research. The one platform with a usable public API for
 * both our own channel and competitors'.
 */

const YT = "https://www.googleapis.com/youtube/v3";

/** How many recent uploads to consider, and how many to hand the strategist. */
const UPLOADS_TO_SCAN = 50;
const TOP_POSTS = 10;

class YouTubeApiError extends Error {
  constructor(path: string, status: number, body: string) {
    // Truncated: a quota error body can be several kilobytes of HTML.
    super(`YouTube API ${path} failed: ${status} ${body.slice(0, 200)}`);
    this.name = "YouTubeApiError";
  }
}

async function ytJson<T>(
  path: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<T> {
  const key = env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY is not set");

  const url = new URL(`${YT}/${path}`);
  // Sorted so the request URL — and therefore the fetch cache key — is stable.
  for (const [k, v] of Object.entries({ ...params, key }).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url, { signal, next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new YouTubeApiError(path, res.status, await res.text());
  }
  return (await res.json()) as T;
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

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function empty(
  handle: string,
  isCompetitor: boolean,
  note: string,
): ChannelInsight {
  return {
    platform: "youtube",
    handle,
    isCompetitor,
    topPosts: [],
    recurringKeywords: [],
    note,
  };
}

async function fetchChannel(
  handle: string,
  isCompetitor: boolean,
  signal?: AbortSignal,
): Promise<ChannelInsight> {
  // Accept either a raw channel id (UC...) or an @handle.
  const params: Record<string, string> = handle.startsWith("UC")
    ? { part: "contentDetails", id: handle }
    : { part: "contentDetails", forHandle: handle.replace(/^@/, "") };

  const channel = await ytJson<YtChannelsResponse>("channels", params, signal);
  const uploads = channel.items?.[0]?.contentDetails.relatedPlaylists.uploads;
  if (!uploads) return empty(handle, isCompetitor, "Channel not found.");

  const playlist = await ytJson<YtPlaylistResponse>(
    "playlistItems",
    {
      part: "contentDetails",
      playlistId: uploads,
      maxResults: String(UPLOADS_TO_SCAN),
    },
    signal,
  );

  const ids = (playlist.items ?? []).map((i) => i.contentDetails.videoId);
  if (ids.length === 0) return empty(handle, isCompetitor, "No uploads found.");

  const videos = await ytJson<YtVideosResponse>(
    "videos",
    { part: "snippet,statistics", id: ids.join(",") },
    signal,
  );

  const posts: PostInsight[] = (videos.items ?? [])
    .map((v) => ({
      title: v.snippet.title,
      url: `https://youtube.com/watch?v=${v.id}`,
      publishedAt: v.snippet.publishedAt,
      views: toNumber(v.statistics.viewCount),
      likes: toNumber(v.statistics.likeCount),
      comments: toNumber(v.statistics.commentCount),
    }))
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0));

  const top = posts.slice(0, TOP_POSTS);
  return {
    platform: "youtube",
    handle,
    isCompetitor,
    topPosts: top,
    recurringKeywords: extractKeywords(top.map((p) => p.title)),
  };
}

export const youtubeProvider: InsightProvider = {
  platform: "youtube",
  available: () => Boolean(env.YOUTUBE_API_KEY),

  async fetch(handles, isCompetitor) {
    // Channels are independent, so fetch them together rather than in series —
    // three handles used to mean nine sequential round trips.
    const settled = await Promise.allSettled(
      handles.map((handle) => fetchChannel(handle, isCompetitor)),
    );

    return settled.map((result, i) =>
      result.status === "fulfilled"
        ? result.value
        : // One bad handle must not lose the research for the others.
          empty(
            handles[i],
            isCompetitor,
            `Could not be read: ${
              result.reason instanceof Error
                ? result.reason.message
                : "unknown error"
            }`,
          ),
    );
  },
};
