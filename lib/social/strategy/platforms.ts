import type { Format, Platform } from "../types";

/**
 * How each platform is played.
 *
 * These are three different audiences, not one audience in three places — a
 * Class 12 student deciding where to apply, and a working engineer deciding
 * whether this school is credible, have almost nothing in common. Treating
 * them as one is what produces a feed that reads as noise to both.
 */
export interface PlatformStrategy {
  platform: Platform;
  audience: string;
  audienceState: string;
  objective: string;
  toneShift: string;
  preferredFormats: Format[];
  postsPerWeek: number;
  reachMechanic: string;
  avoid: string;
}

export const PLATFORM_STRATEGY: Record<Platform, PlatformStrategy> = {
  instagram: {
    platform: "instagram",
    audience:
      "Class 11 and 12 students actively looking at B.Tech admissions (CS & AI), plus students already inside tech/engineering programmes. Secondary: parents who lurk and influence the decision.",
    audienceState:
      "Anxious and comparison-shopping. Scrolling at night. Deciding between many colleges that all look identical in a brochure. They trust peers and vibes far more than they trust institutions.",
    objective:
      "Reach and brand recall first, admissions enquiry second. If they cannot name Vedam unprompted by month three, the content failed.",
    toneShift:
      "Peer-to-peer. Fast, visual, funny where earned. Sound-on, hook in the first second.",
    preferredFormats: ["reel", "carousel", "static", "story"],
    postsPerWeek: 5,
    reachMechanic:
      "Reels drive discovery; carousels drive saves and shares. Optimise the first 3 seconds and the cover frame. Trending audio only when it does not undercut credibility.",
    avoid:
      "Formal announcements, cropped press releases, stock photos of students pointing at laptops, motivational quote cards.",
  },
  linkedin: {
    platform: "linkedin",
    audience:
      "Tech professionals, and especially people who recently entered tech — freshers, career switchers, early-career engineers. Students are largely NOT here.",
    audienceState:
      "Building credibility, hungry for signal about what actually matters in AI/CS careers. Receptive to strong opinions from people who have built things.",
    objective:
      "Institutional credibility and employer/mentor pull. Make industry people respect the school so students inherit that respect second-hand.",
    toneShift:
      "First-person POV, opinionated, specific. Written like a practitioner, not a marketing department.",
    preferredFormats: ["static", "carousel"],
    postsPerWeek: 3,
    reachMechanic:
      "Text-led posts with a strong first line before the 'see more' fold. Documents/carousels for teaching. Comments are where the reach compounds — every post needs a question worth answering.",
    avoid:
      "Reposting Instagram reels verbatim, hashtag spam, 'thrilled to announce', engagement-bait polls.",
  },
  youtube: {
    platform: "youtube",
    audience:
      "Class 11 and 12 students researching B.Tech and CS/AI admissions — the same people as Instagram, but in active research mode rather than passive scroll mode.",
    audienceState:
      "Searching with intent: 'is CS AI worth it', 'best btech ai colleges', 'what after 12th pcm'. They will watch 12 minutes if the answer is honest.",
    objective:
      "Search capture and deep trust. YouTube is the only platform here with real long-tail SEO — a good video keeps pulling admissions traffic for years.",
    toneShift:
      "Honest, unhurried, genuinely useful even to someone who never applies to Vedam.",
    preferredFormats: ["long_form_video", "short"],
    postsPerWeek: 2,
    reachMechanic:
      "Title and thumbnail carry most of the weight. Target real search queries in the title. Shorts feed the main channel and capture the same scroll behaviour as Reels.",
    avoid:
      "Campus tour videos with drone footage and no narration, uncut seminar recordings, anything that only makes sense if you already know Vedam.",
  },
};

/**
 * What a caption actually has to be on each platform.
 *
 * These differ enough that a single "write a caption" instruction produces the
 * wrong artefact two times out of three: a YouTube description is an SEO
 * surface with chapters, an Instagram caption is two lines and a CTA.
 */
export const CAPTION_SPEC: Record<Platform, string> = {
  instagram: `TWO LINES, maximum. Line one earns the stop, line two lands the point. Then a clear CTA on its own line ("Link in bio", "Comment AI and we'll send it", "Save this for counselling season"). Total under 300 characters before hashtags. No paragraphs, no essay, no emoji spam. Write it exactly as it will be pasted.`,

  linkedin: `A LONG post, 150-300 words, formatted for the feed. Open with a single-sentence hook that lands before the "see more" fold. Then short paragraphs of one to three lines each, separated by blank lines — never a wall of text. Use a specific number, name, or concrete detail early. Close with a genuine question that a practitioner would actually want to answer in the comments. No hashtag walls: three at most, at the very end.`,

  youtube: `A YOUTUBE DESCRIPTION, not a caption. 150-250 words. The first two lines are what shows above the fold in search results, so front-load the primary keyword there naturally. Then a fuller paragraph covering what the video answers, written for someone typing that query. Then a timestamped chapter list (00:00 style) matching the outline in the copy field. Then a short line about Vedam and admissions. Keywords appear naturally throughout — this is the SEO surface for the whole channel, so it carries more weight than any caption elsewhere.`,
};
