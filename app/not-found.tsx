import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Container } from "@/components/container";
import { CtaLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center py-24">
        <Container>
          <p className="eyebrow">404</p>
          <h1 className="mt-4 max-w-2xl font-display text-4xl leading-tight tracking-tight text-balance md:text-6xl">
            That page isn&rsquo;t here.
          </h1>
          <p className="mt-6 max-w-md leading-relaxed text-ink-muted">
            The link may be old, or the page may have moved.
          </p>
          <div className="mt-10">
            <CtaLink href="/">Back to the homepage</CtaLink>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
