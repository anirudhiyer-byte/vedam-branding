import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Content Studio",
  // Internal tool — keep it out of search results.
  robots: { index: false, follow: false },
};

export default function StudioLayout({ children }: LayoutProps<"/studio">) {
  return <main className="flex-1 p-4 md:p-6">{children}</main>;
}
