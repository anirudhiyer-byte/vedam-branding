import { process } from "@/lib/content";
import { Container } from "@/components/container";

export function Process() {
  return (
    <section id="process" className="scroll-mt-20 border-b border-rule py-20 md:py-28">
      <Container>
        <p className="eyebrow">How we work</p>
        <h2 className="mt-4 max-w-2xl font-display text-4xl leading-tight tracking-tight text-balance md:text-5xl">
          Eight to twelve weeks, start to handover.
        </h2>

        <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {process.map((phase) => (
            <li key={phase.step} className="border-t border-ink pt-5">
              <span className="eyebrow">{phase.step}</span>
              <h3 className="mt-3 font-display text-2xl tracking-tight">
                {phase.title}
              </h3>
              <p className="mt-3 leading-relaxed text-ink-muted">
                {phase.description}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
