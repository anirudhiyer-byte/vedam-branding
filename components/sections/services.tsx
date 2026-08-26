import { services } from "@/lib/content";
import { Container } from "@/components/container";

export function Services() {
  return (
    <section id="services" className="scroll-mt-20 border-b border-rule py-20 md:py-28">
      <Container>
        <div className="md:flex md:items-end md:justify-between md:gap-12">
          <div>
            <p className="eyebrow">What we do</p>
            <h2 className="mt-4 max-w-2xl font-display text-4xl leading-tight tracking-tight text-balance md:text-5xl">
              Four things, done properly.
            </h2>
          </div>
          <p className="mt-6 max-w-sm text-ink-muted md:mt-0">
            Most projects use two or three together. We scope them as one
            engagement so nothing falls between the gaps.
          </p>
        </div>

        <ul className="mt-14 border-t border-rule">
          {services.map((service) => (
            <li
              key={service.number}
              className="group grid gap-4 border-b border-rule py-10 md:grid-cols-12 md:gap-8"
            >
              <span className="eyebrow md:col-span-1 md:pt-2">
                {service.number}
              </span>

              <h3 className="font-display text-2xl tracking-tight transition-colors group-hover:text-accent md:col-span-4 md:text-3xl">
                {service.title}
              </h3>

              <div className="md:col-span-7">
                <p className="max-w-xl leading-relaxed text-ink-muted">
                  {service.description}
                </p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {service.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full border border-rule px-3 py-1 font-mono text-xs text-ink-faint"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
