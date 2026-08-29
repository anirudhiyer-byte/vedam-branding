/** Words too common to be a useful signal. */
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "for", "to", "of", "in", "on", "at",
  "is", "it", "you", "your", "my", "we", "how", "what", "why", "with", "this",
  "that", "from", "be", "are", "i", "do", "can", "will", "vs", "best", "top",
]);

/**
 * Terms that recur across a channel's best-performing titles.
 *
 * Counted once per title rather than once per occurrence, so a word repeated
 * three times in one clickbait title does not outrank a word that genuinely
 * appears across five videos.
 */
export function extractKeywords(titles: string[], limit = 12): string[] {
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
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([w]) => w);
}
