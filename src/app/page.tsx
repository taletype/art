import Link from "next/link";
import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import FeaturedArtworks from "@/components/FeaturedArtworks";
import CreatorSpotlight from "@/components/CreatorSpotlight";
import HowItWorks from "@/components/HowItWorks";

export default function HomePage() {
  return (
    <main className="bg-black">
      <HeroSection />
      <section className="section-shell pt-10">
        <div className="flex flex-col gap-4 rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="eyebrow">Fastest launch lane</p>
            <h2 className="text-3xl">Need the lean V1? The off-chain auction board is live here too.</h2>
            <p className="max-w-3xl text-sm leading-7 text-white/65">
              Supabase holds the auction book, route handlers enforce bidding rules, and settlement flips only after a verified Solana payment hash.
            </p>
          </div>
          <Link href="/auctions" className="button-primary">
            Open auction V1
          </Link>
        </div>
      </section>
      <TrustStrip />
      <FeaturedArtworks />
      <CreatorSpotlight />
      <HowItWorks />
    </main>
  );
}
