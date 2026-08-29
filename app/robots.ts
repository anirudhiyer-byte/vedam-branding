import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/content";

/**
 * Generated rather than a static file so the sitemap URL follows
 * NEXT_PUBLIC_SITE_URL, and a staging deployment does not advertise a sitemap
 * on the production domain.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The Studio is an internal tool. It is already password-protected and
        // sends noindex headers; this stops crawlers requesting it at all.
        disallow: ["/studio", "/studio/"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
