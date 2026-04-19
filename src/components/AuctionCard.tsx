import Link from "next/link";
import type { MarketplaceEntry } from "@/lib/marketplace";
import AuctionCountdown from "@/components/AuctionCountdown";

export default function AuctionCard({ auction }: { auction: MarketplaceEntry }) {
  return (
    <article className={`auction-card overflow-hidden rounded-[2rem] border border-[#d4af37]/25 bg-white/[0.03] backdrop-blur-xl ${auction.status === "ACTIVE" ? "animate-pulse-gold" : ""}`}>
      <Link href={`/auctions/${auction.id}`} className="block">
        <div
          className="aspect-[4/3] w-full bg-cover bg-center transition-transform duration-500 hover:scale-105"
          style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.4)), url(${auction.assetUrl})` }}
        />
      </Link>
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] ${auction.status === "ACTIVE" ? "border-[#f0d46e]/50 bg-[#f0d46e]/15 text-[#f0d46e]" : "border-white/12 bg-white/5 text-white/60"}`}>
              {auction.status === "ACTIVE" && <span className="h-1.5 w-1.5 rounded-full bg-[#f0d46e] animate-pulse" />}
              {auction.type === "auction" ? "Auction" : "Direct"}
            </span>
            <h3 className="text-xl sm:text-2xl font-serif text-white line-clamp-2">{auction.title}</h3>
          </div>
          <AuctionCountdown endsAt={auction.endsAt} />
        </div>

        <p className="line-clamp-2 sm:line-clamp-3 text-xs sm:text-sm leading-5 sm:leading-6 text-white/70">{auction.description}</p>

        <dl className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
          <div className="rounded-2xl border border-[#d4af37]/20 bg-black/30 p-2.5 sm:p-3 backdrop-blur-sm">
            <dt className="text-white/50 text-[10px] sm:text-xs">{auction.type === "auction" ? "Opening" : "Price"}</dt>
            <dd className="mt-1 font-semibold text-[#f0d46e] text-sm sm:text-base">{(auction.startPriceEth ?? auction.buyoutPriceEth ?? 0).toFixed(4)} ETH</dd>
          </div>
          <div className="rounded-2xl border border-[#d4af37]/20 bg-black/30 p-2.5 sm:p-3 backdrop-blur-sm">
            <dt className="text-white/50 text-[10px] sm:text-xs">{auction.type === "auction" ? "Buyout" : "Settlement"}</dt>
            <dd className="mt-1 font-semibold text-[#f0d46e] text-sm sm:text-base">
              {auction.buyoutPriceEth ? `${auction.buyoutPriceEth.toFixed(4)} ETH` : "Wallet checkout"}
            </dd>
          </div>
          <div className="rounded-2xl border border-[#d4af37]/20 bg-black/30 p-2.5 sm:p-3 backdrop-blur-sm">
            <dt className="text-white/50 text-[10px] sm:text-xs">{auction.type === "auction" ? "Minimum bid" : "Chain"}</dt>
            <dd className="mt-1 font-semibold text-white text-sm sm:text-base">{auction.type === "auction" ? `${(auction.minimumBidEth ?? 0).toFixed(4)} ETH` : auction.chainLabel}</dd>
          </div>
          <div className="rounded-2xl border border-[#d4af37]/20 bg-black/30 p-2.5 sm:p-3 backdrop-blur-sm">
            <dt className="text-white/50 text-[10px] sm:text-xs">Contract</dt>
            <dd className="mt-1 truncate font-semibold text-white text-sm sm:text-base">{auction.marketplaceAddress ? `${auction.marketplaceAddress.slice(0, 6)}...${auction.marketplaceAddress.slice(-4)}` : "Configure env"}</dd>
          </div>
        </dl>

        <Link href={`/auctions/${auction.id}`} className="button-secondary w-full text-sm sm:text-base py-3 sm:py-3 active:scale-[0.98]">
          View auction
        </Link>
      </div>
    </article>
  );
}
