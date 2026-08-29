import { testimonials } from "@/lib/content";
import { Container } from "@/components/container";

/**
 * Quotes from people who agreed to be quoted.
 *
 * Renders nothing while `testimonials` is empty. It previously carried a
 * fabricated quote attributed by name and job title to a person who does not
 * exist — the most directly misleading content on the page.
 */
export function Testimonials() {
  if (testimonials.length === 0) return null;

  return (
    <section className="border-b border-rule py-20 md:py-28">
      <Container>
        <ul className="grid gap-12 md:grid-cols-2">
          {testimonials.map((item) => (
            <li key={`${item.name}-${item.role}`}>
              <figure>
                <blockquote className="max-w-2xl font-display text-2xl leading-snug tracking-tight text-balance md:text-3xl">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 text-sm text-ink-muted">
                  <span className="font-medium text-ink">{item.name}</span>
                  {" — "}
                  {item.role}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
