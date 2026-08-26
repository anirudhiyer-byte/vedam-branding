import { testimonial } from "@/lib/content";
import { Container } from "@/components/container";

export function Testimonial() {
  return (
    <section
      id="studio"
      className="scroll-mt-20 border-b border-rule bg-paper-alt py-20 md:py-28"
    >
      <Container>
        <figure className="mx-auto max-w-3xl text-center">
          <span aria-hidden="true" className="font-display text-5xl text-accent">
            &ldquo;
          </span>
          <blockquote className="mt-2 font-display text-2xl leading-snug tracking-tight text-balance md:text-4xl">
            {testimonial.quote}
          </blockquote>
          <figcaption className="mt-8 text-sm text-ink-muted">
            <span className="font-medium text-ink">{testimonial.name}</span>
            <span className="mx-2 text-ink-faint">/</span>
            {testimonial.role}
          </figcaption>
        </figure>
      </Container>
    </section>
  );
}
