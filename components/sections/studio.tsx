import { studio } from "@/lib/content";
import { Container } from "@/components/container";

/**
 * The Vedam Studio sub-brand.
 *
 * This section exists because `#studio` previously resolved to the testimonial
 * block — so "Studio" in the header, the mobile menu, and the footer all
 * scrolled a visitor to a customer quote. There is now real studio content
 * behind the anchor.
 *
 * It deliberately does not link to `/studio`, the internal content-planning
 * tool. That is a staff application behind a password and has no business in
 * public marketing navigation.
 */
export function Studio() {
  return (
    <section
      id="studio"
      className="scroll-mt-20 border-b border-rule py-20 md:py-28"
    >
      <Container>
        <div className="md:flex md:items-end md:justify-between md:gap-12">
          <div>
            <p className="eyebrow">{studio.eyebrow}</p>
            <h2 className="mt-4 max-w-2xl font-display text-4xl leading-tight tracking-tight text-balance md:text-5xl">
              {studio.headline}
            </h2>
          </div>
          <p className="mt-6 max-w-sm text-ink-muted md:mt-0">
            {studio.description}
          </p>
        </div>

        <ul className="mt-14 grid gap-x-12 gap-y-10 sm:grid-cols-2">
          {studio.disciplines.map((discipline) => (
            <li key={discipline.title} className="border-t border-rule pt-5">
              <h3 className="font-display text-xl tracking-tight">
                {discipline.title}
              </h3>
              <p className="mt-2 leading-relaxed text-ink-muted">
                {discipline.description}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
