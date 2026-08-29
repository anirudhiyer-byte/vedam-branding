import { env } from "@/lib/config/env";

/**
 * Site-level identity and navigation.
 *
 * Vedam is one organisation with two faces, and the site says so explicitly:
 *
 *   - **Vedam School of Technology** — the school. B.Tech in Computer Science
 *     & Artificial Intelligence. This is the site's primary subject, what the
 *     hero sells, and what the meta description describes.
 *   - **Vedam Studio** — the in-house design and brand practice that builds
 *     the school's identity, its digital product, and its content. A named
 *     sub-brand with its own section, not a second personality bolted onto the
 *     homepage.
 *
 * The previous version had these two fighting: the hero sold a branding agency
 * ("We build brands people remember") with fabricated clients, while the page
 * metadata, the brandbook, and the entire Studio content strategy described an
 * engineering school. A visitor arriving from a search result saw one and
 * landed on the other.
 */
export const site = {
  name: "Vedam",
  unit: "School of Technology",
  fullName: "Vedam School of Technology",
  /** Brandbook tagline. */
  tagline: "Learn tech by building it",
  description:
    "Vedam School of Technology is an engineering school offering B.Tech in Computer Science & Artificial Intelligence — where you learn tech by building it.",
  email: "connect@vedam.org",
  location: "Bengaluru, India",
} as const;

/** The in-house practice, presented as a sub-brand of the school. */
export const studio = {
  name: "Vedam Studio",
  eyebrow: "The studio",
  headline: "The team that builds how Vedam looks and sounds.",
  description:
    "Vedam Studio is our in-house design practice. It builds the school's identity, its website, and the systems the rest of the team works inside — and it is staffed alongside students, so the work is also the teaching.",
  disciplines: [
    {
      title: "Brand strategy",
      description:
        "Positioning and messaging for the school: what Vedam says it is, and why that holds up.",
    },
    {
      title: "Visual identity",
      description:
        "The wordmark, type system, colour, and the guidelines that keep them intact as the team grows.",
    },
    {
      title: "Digital product",
      description:
        "This site, the admissions flow, and the internal tools the school runs on — designed and built in-house.",
    },
    {
      title: "Design systems",
      description:
        "Tokens, components, and documentation, so a one-off redesign becomes something a team can ship against.",
    },
  ],
} as const;

/**
 * Primary navigation.
 *
 * Ordered to match the page's actual scroll order — Programme, Build, Studio —
 * because a single-page anchor nav that does not mirror the DOM leaves the
 * highlighted item lagging behind where the reader actually is.
 *
 * "Studio" points at the real studio section. It previously pointed at the
 * testimonial, so every visitor clicking it in the header, the mobile menu, or
 * the footer landed on a customer quote. It deliberately does not link to
 * `/studio`, the internal content tool, which is staff-only.
 */
export const nav = [
  { label: "Programme", href: "#programme" },
  { label: "Build", href: "#build" },
  { label: "Studio", href: "#studio" },
  { label: "Admissions", href: "#admissions" },
] as const;

/** The site's canonical origin, used for metadata, robots, and the sitemap. */
export function siteUrl(): string {
  // Falls back to localhost so `next build` works without a configured domain;
  // `auditEnv()` makes an unset NEXT_PUBLIC_SITE_URL fatal in production, so
  // this fallback can never reach a real deployment.
  return env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
