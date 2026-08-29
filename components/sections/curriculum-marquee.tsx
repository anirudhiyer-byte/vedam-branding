import { curriculumAreas } from "@/lib/content";

/**
 * A scrolling strip of what the programme covers.
 *
 * This replaces a client-logo marquee that listed eight fictional companies.
 * Subject areas are descriptive of the degree rather than a claim about anyone
 * else, so this can render honestly today.
 */
export function CurriculumMarquee() {
  return (
    <section
      aria-label="What the programme covers"
      className="overflow-hidden border-b border-rule py-8"
    >
      {/* Duplicated once so the -50% keyframe loops seamlessly. The copy is
          hidden from assistive tech to avoid reading every item twice. */}
      <div className="animate-marquee flex w-max gap-12 pr-12">
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            aria-hidden={copy === 1 ? "true" : undefined}
            className="flex shrink-0 items-center gap-12"
          >
            {curriculumAreas.map((area) => (
              <li
                key={area}
                className="font-display text-lg whitespace-nowrap text-ink-faint"
              >
                {area}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
