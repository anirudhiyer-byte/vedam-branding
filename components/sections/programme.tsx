import { pillars } from "@/lib/content";
import { Container } from "@/components/container";

export function Programme() {
  return (
    <section
      id="programme"
      className="scroll-mt-20 border-b border-rule py-20 md:py-28"
    >
      <Container>
        <p className="eyebrow">The programme</p>
        <h2 className="mt-4 max-w-2xl font-display text-4xl leading-tight tracking-tight text-balance md:text-5xl">
          Four years of computer science and AI, taught by building.
        </h2>

        <ul className="mt-14 grid gap-x-12 gap-y-12 md:grid-cols-2">
          {pillars.map((pillar) => (
            <li key={pillar.number} className="border-t border-rule pt-6">
              <p className="font-mono text-xs tracking-[0.18em] text-ink-faint">
                {pillar.number}
              </p>
              <h3 className="mt-4 font-display text-2xl tracking-tight">
                {pillar.title}
              </h3>
              <p className="mt-3 leading-relaxed text-ink-muted">
                {pillar.description}
              </p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {pillar.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-rule px-3 py-1 text-xs text-ink-muted"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
