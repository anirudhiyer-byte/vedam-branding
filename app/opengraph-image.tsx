import { ImageResponse } from "next/og";
import { site } from "@/lib/content";

/**
 * The social share card.
 *
 * Rendered rather than shipped as a static asset so it cannot drift from the
 * tagline in lib/content. Deliberately typeface-agnostic: loading Outfit here
 * would mean fetching a font file at image-generation time, and a share card
 * that fails to render is worse than one in a system sans.
 */
export const alt = `${site.fullName} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          // Cetacean Blue to Vedams Violet, matching the .brand-night surface.
          backgroundImage: "linear-gradient(160deg, #0c0931 0%, #2b135c 100%)",
          padding: 80,
          color: "#f9f9f9",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, letterSpacing: -0.5 }}>
          {site.name}
          <span style={{ color: "#a7a7a7", marginLeft: 12 }}>{site.unit}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, lineHeight: 1.05, letterSpacing: -3 }}>
            Learn tech by
          </div>
          <div style={{ fontSize: 92, lineHeight: 1.05, letterSpacing: -3, color: "#f97d03" }}>
            building it.
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 28, color: "#a7a7a7" }}>
          B.Tech · Computer Science &amp; Artificial Intelligence
        </div>
      </div>
    ),
    size,
  );
}
