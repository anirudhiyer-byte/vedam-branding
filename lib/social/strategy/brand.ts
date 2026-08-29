/**
 * Who Vedam is, in the words the strategist reads.
 *
 * This is the standing brief. Editing this file changes how every future
 * calendar gets planned — which is the point: the alternative is re-explaining
 * the brand in a prompt every month and getting a slightly different brand
 * each time.
 *
 * It is also the cached half of every model request, so it must stay
 * byte-stable between calls. Nothing derived from the current date, the run,
 * or the month belongs here.
 */
export const BRAND = {
  name: "Vedam School of Technology",
  shortName: "Vedam",
  what: "An engineering school offering B.Tech in Computer Science & Artificial Intelligence.",
  positioning:
    "Not another private engineering college. A school built by people who actually build — where you learn AI by shipping, not by memorising.",
  voice:
    "Direct, warm, a little irreverent. Talks to students like capable adults, never talks down. Confident without being boastful. Zero corporate education-speak — no 'holistic learning journey', no 'nurturing young minds'.",
  proofPoints: [
    "CS & AI curriculum built around building real projects",
    "Faculty and mentors who have shipped in industry",
    "Small cohorts, high contact time",
  ],
} as const;
