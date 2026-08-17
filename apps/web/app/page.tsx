import {
  GlobalNavigation,
  HeroCinematic,
  AboutSection,
  FeaturedVideoSection,
  PhilosophySection,
  ServicesSection,
  Footer,
} from "@/features/landing";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div id="landing-scroll" className="relative h-full overflow-y-auto overflow-x-hidden bg-black text-white selection:bg-white/20 pb-[100px] md:pb-0">
      {/* Unified AIIC Global Navigation */}
      <GlobalNavigation />

      <main>
        {/* Section 1: Cinematic Video Hero */}
        <HeroCinematic />

        {/* Section 2: About Section with InView Motion */}
        <AboutSection />

        {/* Section 3: Featured Video Section with Liquid Glass Card */}
        <FeaturedVideoSection />

        {/* Section 4: Philosophy / Innovation x Vision */}
        <PhilosophySection />

        {/* Section 5: Services / What We Do */}
        <ServicesSection />
      </main>

      <Footer />
    </div>
  );
}
