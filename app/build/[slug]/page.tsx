import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Container } from "@/components/container";
import { ProjectPanel } from "@/components/sections/build";
import { CtaLink } from "@/components/ui/button";
import { projects, site } from "@/lib/content";

/**
 * A page per project.
 *
 * This route is what makes the Build cards real links. They previously all
 * pointed at `#build` — the section they were already inside — so they rendered
 * with hover states and a pointer cursor and did nothing when clicked.
 *
 * `projects` is empty today, so `generateStaticParams` returns nothing and this
 * route builds to zero pages. Adding a project turns on its card and its page
 * in the same commit.
 */

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

function findProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}

export async function generateMetadata(
  props: PageProps<"/build/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const project = findProject(slug);
  if (!project) return { title: "Not found" };

  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: `/build/${project.slug}` },
    openGraph: {
      title: `${project.title} — ${site.name}`,
      description: project.summary,
      url: `/build/${project.slug}`,
      type: "article",
    },
  };
}

export default async function ProjectPage(props: PageProps<"/build/[slug]">) {
  const { slug } = await props.params;
  const project = findProject(slug);
  if (!project) notFound();

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 py-16 md:py-24">
        <Container>
          <Link
            href="/#build"
            className="text-sm text-ink-muted transition-colors hover:text-ink"
          >
            ← All work
          </Link>

          <p className="eyebrow mt-8">{project.discipline}</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight tracking-tight text-balance md:text-6xl">
            {project.title}
          </h1>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-y border-rule py-5 text-sm">
            <div>
              <dt className="eyebrow">Built by</dt>
              <dd className="mt-1">{project.builders}</dd>
            </div>
            <div>
              <dt className="eyebrow">Year</dt>
              <dd className="mt-1 font-mono">{project.year}</dd>
            </div>
          </dl>

          <div className="mt-12 max-w-4xl">
            <ProjectPanel project={project} />
          </div>

          <p className="mt-10 max-w-2xl text-lg leading-relaxed text-ink-muted">
            {project.summary}
          </p>

          <div className="mt-12">
            <CtaLink href="/#admissions">Talk to admissions</CtaLink>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
