import Image from "next/image";
import Link from "next/link";
import { projects, type StudentProject } from "@/lib/content";
import { Container } from "@/components/container";

/**
 * Work that came out of the school — student projects and studio work.
 *
 * Three things the previous "Selected work" section got wrong are fixed here:
 *
 * 1. It rendered four fabricated case studies for clients that do not exist.
 *    This section renders nothing at all until `projects` has real entries.
 * 2. It printed its own disclaimer — "Case studies are placeholders" — as live
 *    on-page copy, so the finished site told visitors its content was fake.
 * 3. Every card linked to `#build`, the section it was already inside. Cards
 *    now link to a real page per project.
 */

/** Gradient from brand token names, so a palette change in globals.css lands. */
function gradientStyle(gradient: StudentProject["gradient"]) {
  const [from, to] = gradient;
  return {
    backgroundImage: `linear-gradient(to bottom right, var(--color-${from}), var(--color-${to}))`,
  };
}

export function ProjectPanel({ project }: { project: StudentProject }) {
  // `fill` inside the aspect-ratio wrapper reserves the box before the image
  // loads, so adding real photography cannot introduce layout shift.
  return (
    <div
      style={project.image ? undefined : gradientStyle(project.gradient)}
      className="relative flex aspect-4/3 items-center justify-center overflow-hidden rounded-lg"
    >
      {project.image ? (
        <Image
          src={project.image.src}
          alt={project.image.alt}
          fill
          sizes="(min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <span
          aria-hidden="true"
          className="font-display text-[10rem] leading-none text-on-dark/15 transition-transform duration-500 group-hover:scale-110"
        >
          {project.title.charAt(0)}
        </span>
      )}
      <span className="absolute bottom-4 left-4 rounded-full bg-night/70 px-2.5 py-1 font-mono text-[0.6875rem] tracking-[0.18em] text-on-dark uppercase">
        {project.discipline}
      </span>
    </div>
  );
}

export function Build() {
  // No real projects yet, so no section. Better an honest gap than a
  // convincing invention.
  if (projects.length === 0) return null;

  return (
    <section
      id="build"
      className="scroll-mt-20 border-b border-rule py-20 md:py-28"
    >
      <Container>
        <div className="md:flex md:items-end md:justify-between md:gap-12">
          <div>
            <p className="eyebrow">What gets built here</p>
            <h2 className="mt-4 max-w-2xl font-display text-4xl leading-tight tracking-tight text-balance md:text-5xl">
              Work from the people learning it.
            </h2>
          </div>
          <p className="mt-6 max-w-sm text-ink-muted md:mt-0">
            Student projects and studio work, with the thinking behind each one.
          </p>
        </div>

        <ul className="mt-14 grid gap-10 sm:grid-cols-2">
          {projects.map((project) => (
            <li key={project.slug}>
              <Link href={`/build/${project.slug}`} className="group block">
                <ProjectPanel project={project} />

                <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-rule pt-4">
                  <h3 className="font-display text-xl tracking-tight transition-colors group-hover:text-accent">
                    {project.title}
                  </h3>
                  <span className="font-mono text-xs text-ink-faint">
                    {project.year}
                  </span>
                </div>
                <p className="mt-1 text-ink-muted">{project.summary}</p>
                <p className="mt-1 text-sm text-ink-faint">
                  {project.builders}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
