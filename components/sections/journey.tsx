import { journey } from "@/lib/content";
import { Container } from "@/components/container";

/** How the four years are actually spent. */
export function Journey() {
  return (
    <section
      id="journey"
      className="scroll-mt-20 border-b border-rule py-20 md:py-28"
    >
      <Container>
        <p className="eyebrow">Four years</p>
        <h2 className="mt-4 max-w-2xl font-display text-4xl leading-tight tracking-tight text-balance md:text-5xl">
          What each year is for.
        </h2>

        <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {journey.map((year) => (
            <li key={year.step} className="border-t border-rule pt-5">
              <p className="font-mono text-xs tracking-[0.18em] text-ink-faint">
                {year.step}
              </p>
              <h3 className="mt-3 font-display text-xl tracking-tight">
                {year.title}
              </h3>
              <p className="mt-2 leading-relaxed text-ink-muted">
                {year.description}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
