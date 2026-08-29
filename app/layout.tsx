import type { Metadata, Viewport } from "next";
import { Inter, Nunito_Sans, Outfit } from "next/font/google";
import { site, siteUrl } from "@/lib/content";
import "./globals.css";

/**
 * Fonts, scoped deliberately.
 *
 * The brandbook specifies Outfit for display and Nunito Sans for body. The
 * previous setup mapped every font slot to Inter globally while a comment
 * claimed Inter was "a deliberate override for the Studio UI" — so the comment
 * described a scope the code did not have, and the marketing site silently
 * rendered in the wrong typeface.
 *
 * Resolved as a decision rather than by editing the comment: the brandbook
 * fonts render the public site, and Inter is confined to `/studio`, where it
 * earns its place on dense tabular UI at small sizes. All three are loaded as
 * CSS variables here; `globals.css` maps the slots, and the `.studio-ui` class
 * on the Studio layout is what swaps them.
 */
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // Driven by NEXT_PUBLIC_SITE_URL rather than a hardcoded domain, so staging
  // and production resolve their own OpenGraph and canonical URLs instead of
  // both claiming the same one.
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${site.fullName} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${site.fullName} — ${site.tagline}`,
    description: site.description,
    url: "/",
    siteName: site.fullName,
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.fullName} — ${site.tagline}`,
    description: site.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0931",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${nunitoSans.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Keyboard users should not have to tab through the whole nav on
            every page to reach the content. */}
        <a
          href="#main"
          className="sr-only rounded-full bg-violet px-4 py-2 text-on-dark focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100]"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
