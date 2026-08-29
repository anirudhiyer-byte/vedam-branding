import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/sections/hero";
import { CurriculumMarquee } from "@/components/sections/curriculum-marquee";
import { Programme } from "@/components/sections/programme";
import { Journey } from "@/components/sections/journey";
import { Build } from "@/components/sections/build";
import { Studio } from "@/components/sections/studio";
import { Testimonials } from "@/components/sections/testimonial";
import { AdmissionsCta } from "@/components/sections/admissions-cta";

/**
 * Section order matches the nav in lib/content/site.ts — Programme, Build,
 * Studio, Admissions — so anchor navigation moves a reader forward through the
 * page rather than bouncing them backwards.
 *
 * `Build` and `Testimonials` render nothing until they have real content, so
 * the page is shorter today than it will be, and honest at every stage.
 */
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <Hero />
        <CurriculumMarquee />
        <Programme />
        <Journey />
        <Build />
        <Studio />
        <Testimonials />
        <AdmissionsCta />
      </main>
      <SiteFooter />
    </>
  );
}
