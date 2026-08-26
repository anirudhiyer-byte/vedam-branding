import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/sections/hero";
import { ClientMarquee } from "@/components/sections/client-marquee";
import { Services } from "@/components/sections/services";
import { Work } from "@/components/sections/work";
import { Process } from "@/components/sections/process";
import { Testimonial } from "@/components/sections/testimonial";
import { ContactCta } from "@/components/sections/contact-cta";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <ClientMarquee />
        <Services />
        <Work />
        <Process />
        <Testimonial />
        <ContactCta />
      </main>
      <SiteFooter />
    </>
  );
}
