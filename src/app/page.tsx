import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import FeaturedArtworks from "@/components/FeaturedArtworks";
import CreatorSpotlight from "@/components/CreatorSpotlight";
import HowItWorks from "@/components/HowItWorks";

export default function HomePage() {
  return (
    <main className="bg-black">
      <HeroSection />
      <TrustStrip />
      <FeaturedArtworks />
      <CreatorSpotlight />
      <HowItWorks />
    </main>
  );
}
