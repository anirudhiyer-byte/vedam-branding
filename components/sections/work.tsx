import Link from "next/link";
import { work } from "@/lib/content";
import { Container } from "@/components/container";

export function Work() {
  return (
    <section id="work" className="scroll-mt-20 border-b border-rule py-20 md:py-28">
      <Container>
        <div className="md:flex md:items-end md:justify-between md:gap-12">
          <div>
            <p className="eyebrow">Selected work</p>
            <h2 className="mt-4 max-w-2xl font-display text-4xl leading-tight tracking-tight text-balance md:text-5xl">
              A few we can talk about.
            </h2>
          </div>
          <p className="mt-6 max-w-sm text-ink-muted md:mt-0">
            Case studies are placeholders — replace the panels with real
            project imagery and link each card to its own page.
          </p>
        </div>

        <ul className="mt-14 grid gap-10 sm:grid-cols-2">
          {work.map((item) => (
            <li key={item.client}>
              <Link href="#work" className="group block">
                {/* CSS-only project panel; swap for <Image> when art is ready. */}
                <div
                  className={`relative flex aspect-4/3 items-center justify-center overflow-hidden rounded-lg bg-linear-to-br ${item.accent}`}
                >
                  <span
                    aria-hidden="true"
                    className="font-display text-[10rem] leading-none text-on-dark/15 transition-transform duration-500 group-hover:scale-110"
                  >
                    {item.initial}
                  </span>
                  <span className="absolute bottom-4 left-4 rounded-full bg-night/70 px-2.5 py-1 font-mono text-[0.6875rem] tracking-[0.18em] text-on-dark uppercase">
                    {item.category}
                  </span>
                </div>

                <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-rule pt-4">
                  <h3 className="font-display text-xl tracking-tight transition-colors group-hover:text-accent">
                    {item.client}
                  </h3>
                  <span className="font-mono text-xs text-ink-faint">
                    {item.year}
                  </span>
                </div>
                <p className="mt-1 text-ink-muted">{item.project}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
