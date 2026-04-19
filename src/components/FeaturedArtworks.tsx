import Link from "next/link";
import { listMarketplaceEntries } from "@/lib/marketplace";
import { listArtworks } from "@/lib/supabase-db";
import AuctionCountdown from "@/components/AuctionCountdown";

export default async function FeaturedArtworks() {
  const [liveAuctions, sales] = await Promise.all([
    listMarketplaceEntries(8),
    listArtworks(),
  ]);

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white">Human-made artworks</h1>
          <p className="mt-2 text-base text-white/70">Curated digital art from verified creators</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {liveAuctions.map((auction) => (
            <Link key={auction.id} href={`/auctions/${auction.id}`} className="group block">
              <article className="overflow-hidden rounded-2xl border border-[#d4af37]/20 bg-white/[0.03] transition-all duration-300 hover:border-[#d4af37]/40 hover:shadow-xl hover:shadow-[#d4af37]/10 backdrop-blur-xl">
                <div className="aspect-square bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${auction.assetUrl})` }} />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f0d46e]/50 bg-[#f0d46e]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#f0d46e]">
                      <span className="h-1 w-1 rounded-full bg-[#f0d46e] animate-pulse" />
                      Live
                    </span>
                    <AuctionCountdown endsAt={auction.endsAt} className="text-xs text-white/70" />
                  </div>
                  <h3 className="text-sm font-medium text-white line-clamp-1">{auction.title}</h3>
                  <p className="mt-1 text-xs text-white/65 line-clamp-1">{auction.sellerWallet.slice(0, 6)}...{auction.sellerWallet.slice(-4)}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-white/60 font-medium">{(auction.buyoutPriceEth ?? auction.startPriceEth ?? 0).toFixed(4)} ETH</span>
                    <span className="text-white/60 capitalize">{auction.type.replace("-", " ")}</span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
          {sales.map((artwork) => (
            <Link key={artwork.id} href={`/art/${artwork.id}`} className="group block">
              <article className="overflow-hidden rounded-2xl border border-[#d4af37]/20 bg-white/[0.03] transition-all duration-300 hover:border-[#d4af37]/40 hover:shadow-xl hover:shadow-[#d4af37]/10 backdrop-blur-xl">
                <div className="aspect-square bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: artwork.background }} />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${artwork.status === 'live' ? 'border-[#f0d46e]/50 bg-[#f0d46e]/15 text-[#f0d46e]' : 'border-white/12 bg-white/5 text-white/60'}`}>
                      {artwork.status === 'live' && <span className="h-1 w-1 rounded-full bg-[#f0d46e] animate-pulse" />}
                      {artwork.status}
                    </span>
                    {artwork.closes_at && artwork.status === 'live' && (
                      <AuctionCountdown endsAt={artwork.closes_at} className="text-xs text-white/70" />
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-white line-clamp-1">{artwork.title}</h3>
                  <p className="mt-1 text-xs text-white/65 line-clamp-1">{artwork.artistName}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-white/60">{artwork.category}</span>
                    <span className="text-white/60 font-medium">{artwork.priceSol} SOL</span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
