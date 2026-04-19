import FeaturedArtworks from "@/components/FeaturedArtworks";
import Link from "next/link";
import { getMarketplaceChainLabel } from "@/lib/thirdweb-config";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black">
      <section className="section-shell pt-28">
        <div className="rounded-[2rem] border border-[#c9a227]/20 bg-gradient-to-br from-[#0d0d10] to-[#17171c] p-8 sm:p-10">
          <p className="eyebrow">Seller flow</p>
          <h1 className="max-w-4xl text-5xl leading-tight sm:text-6xl">Create the account, connect a wallet, mint the artwork, and list it on {getMarketplaceChainLabel()}.</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-white/68">
            This marketplace now uses Thirdweb for live listings, auction bids, and buyouts while Supabase keeps the editorial artwork catalog and seller records in sync.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/seller" className="button-primary">Open seller hub</Link>
            <Link href="/auctions" className="button-secondary">Browse auctions</Link>
            <Link href="/admin" className="button-secondary">Admin deploy</Link>
          </div>
        </div>
      </section>
      <FeaturedArtworks />
    </main>
  );
}
