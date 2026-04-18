import Link from "next/link";
import { listOffchainAuctionSummaries } from "@/lib/offchainAuctions";
import { listArtworks } from "@/lib/supabase-db";
import { Suspense } from "react";
import { SkeletonCard } from "@/components/SkeletonLoader";
import AuctionCountdown from "@/components/AuctionCountdown";

async function FeaturedAuctionsContent() {
  const auctions = await listOffchainAuctionSummaries(undefined, 6);
  const live = auctions.filter((auction) => auction.status === "live");
  const upcoming = auctions.filter((auction) => auction.status === "draft");
  const artworks = await listArtworks(6);

  return (
    <>
      {live.length > 0 && (
        <div className="mb-10 grid gap-4 md:grid-cols-2">
          {live.slice(0, 2).map((auction) => (
            <Link
              key={auction.id}
              href={`/auctions/${auction.id}`}
              className="auction-card group overflow-hidden p-6 transition animate-pulse-gold"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e8c547]/40 bg-[#e8c547]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#e8c547]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#e8c547] animate-pulse" />
                    Live auction
                  </span>
                  <h3 className="mt-3 text-2xl font-serif text-white">{auction.title}</h3>
                </div>
                <AuctionCountdown endsAt={auction.endsAt} />
              </div>
              <p className="mt-3 text-sm leading-7 text-white/65">{auction.description}</p>
              <div className="mt-4 flex items-center gap-4 text-sm">
                <span className="text-[#e8c547]">{auction.startPriceSol.toFixed(2)} SOL</span>
                <span className="text-white/45">•</span>
                <span className="text-white/60">{auction.bidCount} bids</span>
              </div>
              <p className="mt-4 text-sm font-semibold text-[#e8c547] transition group-hover:text-[#f5d76a]">View auction →</p>
            </Link>
          ))}
        </div>
      )}

      {artworks.length > 0 && (
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {artworks.map((artwork) => (
            <article key={artwork.id} className="auction-card overflow-hidden rounded-[2rem] border border-[#c9a227]/20 bg-white/[0.02]">
              <div className="relative h-72 overflow-hidden" style={{ backgroundImage: artwork.background }}>
                <div className="absolute inset-0 bg-gradient-to-br from-[#c9a227]/20 to-transparent" />
                <div className="absolute inset-x-0 top-5 left-5 right-5 flex items-start justify-between">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${artwork.status === 'live' ? 'border-[#e8c547]/40 bg-[#e8c547]/12 text-[#e8c547]' : 'border-white/10 bg-white/5 text-white/60'}`}>
                    {artwork.status === 'live' && <span className="h-1.5 w-1.5 rounded-full bg-[#e8c547] animate-pulse" />}
                    {artwork.status}
                  </span>
                  {artwork.closes_at && artwork.status === 'live' && (
                    <AuctionCountdown endsAt={artwork.closes_at} className="text-xs" />
                  )}
                </div>
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                  <div>
                    <h3 className="text-3xl font-serif text-white">{artwork.title}</h3>
                  </div>
                  <span className="rounded-full bg-[#c9a227] px-3 py-1.5 text-sm font-semibold text-black">{artwork.price_sol} SOL</span>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <p className="text-sm leading-7 text-white/65">{artwork.description}</p>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-2xl border border-[#c9a227]/15 bg-black/20 p-3">
                    <p className="uppercase tracking-[0.16em] text-white/38">Price</p>
                    <p className="mt-1 font-semibold text-[#e8c547]">{artwork.price_sol} SOL</p>
                  </div>
                  <div className="rounded-2xl border border-[#c9a227]/15 bg-black/20 p-3">
                    <p className="uppercase tracking-[0.16em] text-white/38">Bids</p>
                    <p className="mt-1 font-semibold text-white">{artwork.bid_count}</p>
                  </div>
                  <div className="rounded-2xl border border-[#c9a227]/15 bg-black/20 p-3">
                    <p className="uppercase tracking-[0.16em] text-white/38">Status</p>
                    <p className="mt-1 font-semibold text-white">{artwork.status}</p>
                  </div>
                </div>

                <Link href={`/art/${artwork.id}`} className="inline-flex items-center text-sm font-semibold text-[#e8c547] transition hover:text-[#f5d76a]">
                  View artwork →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {auctions.length === 0 && artworks.length === 0 && (
        <div className="rounded-[1.8rem] border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
          <h3 className="text-2xl">No auctions or artworks yet</h3>
          <p className="mt-3 text-sm text-white/60">
            Create your first auction or artwork to see it featured here.
          </p>
        </div>
      )}
    </>
  );
}

export default function FeaturedArtworks() {
  return (
    <section id="featured" className="px-6 py-24">
      <div className="section-shell">
        <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="section-heading">
            <p className="eyebrow">Featured auctions</p>
            <h2 className="text-3xl text-white text-balance sm:text-5xl">Off-chain auctions with Solana settlement.</h2>
            <p className="section-kicker">
              Browse live and upcoming auctions, place bids, and track real-time bidding activity.
            </p>
          </div>
          <Link href="/auctions" className="button-secondary">
            View All Auctions
          </Link>
        </div>

        <Suspense fallback={<div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>}>
          <FeaturedAuctionsContent />
        </Suspense>
      </div>
    </section>
  );
}
