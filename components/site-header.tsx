"use client";

import { useState } from "react";
import Link from "next/link";
import { nav, site } from "@/lib/content";
import { Container } from "@/components/container";
import { Wordmark } from "@/components/wordmark";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-paper/85 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between md:h-20">
          <Link href="/" aria-label={`${site.name}, home`}>
            <Wordmark />
          </Link>

          <nav
            aria-label="Primary"
            className="hidden items-center gap-9 md:flex"
          >
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-ink-muted transition-colors hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="#contact"
              className="rounded-full bg-violet px-5 py-2.5 text-sm font-medium text-on-dark transition-colors hover:bg-eviolet"
            >
              Start a project
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="-mr-2 p-2 md:hidden"
          >
            <span className="sr-only">
              {open ? "Close menu" : "Open menu"}
            </span>
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
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
            <Link
              href="#contact"
              onClick={() => setOpen(false)}
              className="py-4 font-display text-2xl text-accent"
            >
              Start a project
            </Link>
          </Container>
        </nav>
      )}
    </header>
  );
}
