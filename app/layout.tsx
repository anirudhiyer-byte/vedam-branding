import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { site } from "@/lib/content";
import "./globals.css";

// NOTE: the brandbook specifies Outfit + Nunito Sans. Inter is a deliberate
// override for the Studio UI, requested for screen legibility at small sizes.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // TODO: point this at the real production domain before launch.
  metadataBase: new URL("https://vedam.org"),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  openGraph: {
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    url: "/",
    siteName: site.name,
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
