import Link from "next/link";
import { nav, site } from "@/lib/content";
import { Container } from "@/components/container";
import { Wordmark } from "@/components/wordmark";

const social = [
  { label: "Instagram", href: "https://instagram.com" },
  { label: "LinkedIn", href: "https://linkedin.com" },
  { label: "Are.na", href: "https://are.na" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-rule py-14">
      <Container>
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div className="md:col-span-2">
            <Wordmark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
              {site.tagline} in {site.location}. Working with clients
              everywhere else.
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
              {social.map((item) => (
                <li key={item.label}>
                  {/* TODO: replace with the studio's real profiles. */}
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
                  Email
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-rule pt-6 text-xs text-ink-faint sm:flex-row sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <p>{site.location}</p>
        </div>
      </Container>
    </footer>
  );
}
