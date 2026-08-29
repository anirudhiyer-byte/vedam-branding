import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Content Studio",
  // Internal tool — keep it out of search results. The route guard in proxy.ts
  // also sets an X-Robots-Tag header, since a crawler that somehow reaches a
  // Studio URL should be told twice.
  robots: { index: false, follow: false },
};

/**
 * `studio-ui` is what scopes Inter to this subtree. See the note in
 * globals.css: the brandbook fonts render the public site, and Inter is a
 * deliberate exception here for dense tabular UI at small sizes.
 */
export default function StudioLayout({ children }: LayoutProps<"/studio">) {
  return <main className="studio-ui flex-1 p-4 md:p-6">{children}</main>;
}
