import Link from "next/link";
import { listMarketplaceEntries } from "@/lib/marketplace";
import { isMarketplaceConfigured } from "@/lib/thirdweb-config";
import AuctionCountdown from "@/components/AuctionCountdown";

export default async function FeaturedArtworks() {
  const liveAuctions = await listMarketplaceEntries(8);
  const marketplaceConfigured = isMarketplaceConfigured();

  return (
    <div className="min-h-screen px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-white">Human-made artworks</h1>
          <p className="mt-2 text-sm sm:text-base text-white/70">Curated digital art from verified creators</p>
        </div>

        {liveAuctions.length === 0 ? (
          <div className="rounded-[1.8rem] border border-dashed border-white/15 bg-white/[0.02] p-6 text-center sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f0d46e]">
              {marketplaceConfigured ? "Awaiting live listings" : "Marketplace setup needed"}
            </p>
            <h2 className="mx-auto mt-3 max-w-2xl text-2xl font-semibold text-white sm:text-3xl">
              {marketplaceConfigured ? "No live artworks are listed right now." : "Connect the marketplace contract to feature live artworks."}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
              {marketplaceConfigured
                ? "Create a seller listing to populate the featured auction grid with verified human-made work."
                : "Add the Thirdweb marketplace environment variables, then publish a listing from Seller Hub."}
            </p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/seller" className="button-primary px-5 py-2.5 text-sm">
                Open Seller Hub
              </Link>
              <Link href="/auctions" className="button-secondary px-5 py-2.5 text-sm">
                View marketplace
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {liveAuctions.map((auction) => (
              <Link key={auction.id} href={`/auctions/${auction.id}`} className="group block">
                <article className="overflow-hidden rounded-2xl border border-[#d4af37]/20 bg-white/[0.03] transition-all duration-300 hover:border-[#d4af37]/40 hover:shadow-xl hover:shadow-[#d4af37]/10 backdrop-blur-xl active:scale-[0.98]">
                  <div className="aspect-square bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${auction.assetUrl})` }} />
                  <div className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f0d46e]/50 bg-[#f0d46e]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#f0d46e]">
                        <span className="h-1 w-1 rounded-full bg-[#f0d46e] animate-pulse" />
                        Live
                      </span>
                      <AuctionCountdown endsAt={auction.endsAt} className="text-[10px] sm:text-xs text-white/70" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-medium text-white line-clamp-1">{auction.title}</h3>
                    <p className="mt-1 text-[10px] sm:text-xs text-white/65 line-clamp-1">{auction.sellerWallet.slice(0, 6)}...{auction.sellerWallet.slice(-4)}</p>
                    <div className="mt-2 sm:mt-3 flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-white/60 font-medium">{(auction.buyoutPriceEth ?? auction.startPriceEth ?? 0).toFixed(4)} ETH</span>
                      <span className="text-white/60 capitalize">{auction.type.replace("-", " ")}</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
