import Link from "next/link";
import { site, stats } from "@/lib/content";
import { Container } from "@/components/container";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-rule">
      {/* Soft warm wash behind the headline. */}
      <div
        aria-hidden="true"
        className="brand-gradient-bg pointer-events-none absolute -top-48 -right-40 h-[36rem] w-[36rem] rounded-full opacity-20 blur-3xl"
      />

      <Container className="relative">
        <div className="pt-20 pb-16 md:pt-32 md:pb-24">
          <p className="eyebrow">
            {site.tagline} — {site.location}
          </p>

          <h1 className="mt-8 max-w-4xl font-display text-5xl leading-[0.95] font-normal tracking-tight text-balance sm:text-6xl md:text-7xl lg:text-8xl">
            We build brands
            <br />
            people <em className="brand-gradient-text not-italic">remember</em>.
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-muted md:text-xl">
            {site.description}
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="#work"
              className="inline-flex h-12 items-center justify-center rounded-full bg-violet px-7 text-sm font-medium text-on-dark transition-colors hover:bg-eviolet"
            >
              See selected work
            </Link>
            <Link
              href="#contact"
              className="inline-flex h-12 items-center justify-center rounded-full border border-ink/20 px-7 text-sm font-medium transition-colors hover:border-ink hover:bg-paper-alt"
            >
              Start a project
            </Link>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-6 border-t border-rule py-8">
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
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
