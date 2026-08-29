import { admissions, site } from "@/lib/content";
import { Container } from "@/components/container";
import { CtaLink } from "@/components/ui/button";

export function AdmissionsCta() {
  return (
    <section id="admissions" className="brand-night scroll-mt-20 py-20 md:py-28">
      <Container>
        <p className="eyebrow text-on-dark-muted">{admissions.eyebrow}</p>
        <h2 className="mt-4 max-w-2xl font-display text-4xl leading-tight tracking-tight text-balance text-on-dark md:text-5xl">
          {admissions.headline}
        </h2>
        <p className="mt-6 max-w-xl leading-relaxed text-on-dark-muted">
          {admissions.body}
        </p>

        {/* Orange, not violet: on Cetacean Blue orange is 7.25:1 and Electric
            Violet is 3.33:1. The interactive colour flips on dark surfaces. */}
        <div className="mt-10">
          <CtaLink
            href={`mailto:${site.email}`}
            external
            className="bg-orange text-night hover:bg-orange/90"
            size="lg"
          >
            {admissions.cta}
          </CtaLink>
        </div>
        <p className="mt-4 text-sm text-on-dark-muted">{site.email}</p>
      </Container>
    </section>
  );
}
