import { site } from "@/lib/content";
import { Container } from "@/components/container";

export function ContactCta() {
  return (
    <section
      id="contact"
      className="brand-night scroll-mt-20 py-24 text-on-dark md:py-32"
    >
      <Container>
        <p className="eyebrow text-on-dark-muted">Start a project</p>

        <h2 className="mt-5 max-w-3xl font-display text-4xl leading-[1.05] tracking-tight text-balance md:text-6xl">
          Tell us what you&rsquo;re building.
        </h2>

        <p className="mt-6 max-w-lg leading-relaxed text-on-dark-muted">
          We take on a handful of projects each quarter. Send a note about the
          work, the timeline, and roughly what you have to spend — we&rsquo;ll
          reply within two working days.
        </p>

        <a
          href={`mailto:${site.email}`}
          className="mt-10 inline-block font-display text-2xl underline decoration-orange decoration-2 underline-offset-8 transition-colors hover:text-orange md:text-4xl"
        >
          {site.email}
        </a>
      </Container>
    </section>
  );
}
