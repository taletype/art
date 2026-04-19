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
      <div className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${auction.status === "ACTIVE" ? "border-[#f0d46e]/50 bg-[#f0d46e]/15 text-[#f0d46e]" : "border-white/12 bg-white/5 text-white/60"}`}>
              {auction.status === "ACTIVE" && <span className="h-1.5 w-1.5 rounded-full bg-[#f0d46e] animate-pulse" />}
              {auction.type === "auction" ? "Auction" : "Direct"}
            </span>
            <h3 className="text-2xl font-serif text-white">{auction.title}</h3>
          </div>
          <AuctionCountdown endsAt={auction.endsAt} />
        </div>

        <p className="line-clamp-3 text-sm leading-6 text-white/70">{auction.description}</p>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl border border-[#d4af37]/20 bg-black/30 p-3 backdrop-blur-sm">
            <dt className="text-white/50">{auction.type === "auction" ? "Opening" : "Price"}</dt>
            <dd className="mt-1 font-semibold text-[#f0d46e]">{(auction.startPriceEth ?? auction.buyoutPriceEth ?? 0).toFixed(4)} ETH</dd>
          </div>
          <div className="rounded-2xl border border-[#d4af37]/20 bg-black/30 p-3 backdrop-blur-sm">
            <dt className="text-white/50">{auction.type === "auction" ? "Buyout" : "Settlement"}</dt>
            <dd className="mt-1 font-semibold text-[#f0d46e]">
              {auction.buyoutPriceEth ? `${auction.buyoutPriceEth.toFixed(4)} ETH` : "Wallet checkout"}
            </dd>
          </div>
          <div className="rounded-2xl border border-[#d4af37]/20 bg-black/30 p-3 backdrop-blur-sm">
            <dt className="text-white/50">{auction.type === "auction" ? "Minimum bid" : "Chain"}</dt>
            <dd className="mt-1 font-semibold text-white">{auction.type === "auction" ? `${(auction.minimumBidEth ?? 0).toFixed(4)} ETH` : auction.chainLabel}</dd>
          </div>
          <div className="rounded-2xl border border-[#d4af37]/20 bg-black/30 p-3 backdrop-blur-sm">
            <dt className="text-white/50">Contract</dt>
            <dd className="mt-1 truncate font-semibold text-white">{auction.marketplaceAddress ? `${auction.marketplaceAddress.slice(0, 6)}...${auction.marketplaceAddress.slice(-4)}` : "Configure env"}</dd>
          </div>
        </dl>

        <Link href={`/auctions/${auction.id}`} className="button-secondary w-full">
          View auction
        </Link>
      </div>
    </article>
  );
}
