import Link from "next/link";
import { nav, site, socialProfiles } from "@/lib/content";
import { Container } from "@/components/container";
import { Wordmark } from "@/components/wordmark";

export function SiteFooter() {
  return (
    <footer className="border-t border-rule py-14">
      <Container>
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div className="md:col-span-2">
            <Wordmark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
              {site.fullName}. {site.tagline}, in {site.location}.
            </p>
          </div>

          <nav aria-label="Footer">
            <h2 className="eyebrow">Site</h2>
            <ul className="mt-4 space-y-2">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-ink-muted transition-colors hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="eyebrow">Elsewhere</h2>
            <ul className="mt-4 space-y-2">
              {/* Only real, confirmed profiles appear here. The previous links
                  pointed at instagram.com, linkedin.com and are.na — the
                  platforms' own homepages, not Vedam's pages. */}
              {socialProfiles.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-ink-muted transition-colors hover:text-ink"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={`mailto:${site.email}`}
                  className="text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  {site.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-rule pt-6 text-xs text-ink-faint sm:flex-row sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {site.fullName}. All rights
            reserved.
          </p>
          <p>{site.location}</p>
        </div>
      </Container>
    </footer>
  );
}
