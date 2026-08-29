"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { nav, site } from "@/lib/content";
import { Container } from "@/components/container";
import { Wordmark } from "@/components/wordmark";
import { CtaLink } from "@/components/ui/button";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  // An open menu that survives a resize to desktop leaves an orphaned panel
  // over the page, and Escape is the expected way out of any overlay.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const media = window.matchMedia("(min-width: 768px)");
    const onChange = () => media.matches && setOpen(false);

    document.addEventListener("keydown", onKeyDown);
    media.addEventListener("change", onChange);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      media.removeEventListener("change", onChange);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-paper/85 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between md:h-20">
          <Link href="/" aria-label={`${site.fullName}, home`}>
            <Wordmark />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-9 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-ink-muted transition-colors hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
            {/* One canonical CTA style, shared with the hero and mobile menu. */}
            <CtaLink href="#admissions" size="sm">
              Apply
            </CtaLink>
          </nav>

          {/* p-3 around a 22px icon clears the 44×44px minimum touch target
              (WCAG 2.5.5); the previous p-2 gave a ~38px box. */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="-mr-3 p-3 md:hidden"
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {open ? (
                <>
                  <path d="M5 5l12 12" />
                  <path d="M17 5L5 17" />
                </>
              ) : (
                <>
                  <path d="M3 7h16" />
                  <path d="M3 15h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </Container>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Primary mobile"
          className="border-t border-rule md:hidden"
        >
          <Container className="flex flex-col py-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-rule py-4 font-display text-2xl"
              >
                {item.label}
              </Link>
            ))}
            <div className="py-4">
              <CtaLink
                href="#admissions"
                onClick={() => setOpen(false)}
                className="w-full"
              >
                Apply
              </CtaLink>
            </div>
          </Container>
        </nav>
      )}
    </header>
  );
}
