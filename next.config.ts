import type { NextConfig } from "next";

/**
 * Response headers applied to every route.
 *
 * These are the defences a browser can enforce for us and cost nothing to
 * enable. There was previously no `headers()` config at all, so the app shipped
 * with none of them.
 */
const securityHeaders = [
  // Don't let the browser second-guess a Content-Type — the classic vector for
  // turning an uploaded file into executable script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No framing: the Studio's Server Actions are same-site POSTs, so a
  // clickjacked frame is a real path to triggering billed generation.
  { key: "X-Frame-Options", value: "DENY" },
  // Send the origin cross-site, the full path same-origin. Studio URLs carry
  // the month and platform in the query string and should not leak outward.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing here uses these, so decline them up front.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // HTTPS only, once the domain is live. Not preloaded: that is a one-way
  // commitment for the whole domain and belongs to whoever owns DNS.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  // Surface the framework's own warnings rather than only React's.
  reactStrictMode: true,
  // The version header tells an attacker which Next.js CVEs to try.
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
