import { hero, site, stats } from "@/lib/content";
import { Container } from "@/components/container";
import { CtaLink } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-rule">
      {/* Soft brand wash behind the headline. Steps down on small screens so
          it reads as a glow rather than a 576px blur filling the viewport. */}
      <div
        aria-hidden="true"
        className="brand-gradient-bg pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-20 blur-3xl sm:-top-32 sm:-right-32 sm:h-96 sm:w-96 md:-top-48 md:-right-40 md:h-[36rem] md:w-[36rem]"
      />

      <Container className="relative">
        <div className="pt-20 pb-16 md:pt-32 md:pb-24">
          <p className="eyebrow">
            {hero.eyebrow} — {site.location}
          </p>

          <h1 className="mt-8 max-w-4xl font-display text-5xl leading-[0.95] font-normal tracking-tight text-balance sm:text-6xl md:text-7xl lg:text-8xl">
            {hero.headlineLead}
            <br />
            <em className="brand-gradient-text not-italic">
              {hero.headlineAccent}
            </em>
            .
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-muted md:text-xl">
            {hero.body}
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <CtaLink href="#programme" variant="primary">
              See the programme
            </CtaLink>
            <CtaLink href="#admissions" variant="secondary">
              Talk to admissions
            </CtaLink>
          </div>
        </div>

        {/* Rendered only when there are sourced numbers to show. Three
            unverifiable agency statistics used to sit here unconditionally. */}
        {stats.length > 0 && (
          <dl className="grid grid-cols-2 gap-6 border-t border-rule py-8 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block font-display text-3xl md:text-4xl">
                    {stat.value}
                  </span>
                  <span className="mt-1 block text-sm text-ink-muted">
                    {stat.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-faint">
                    {stat.source}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Container>
    </section>
  );
}
