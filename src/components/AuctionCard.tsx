import Link from "next/link";
import type { OffchainAuctionSummary } from "@/types/offchainAuction";
import AuctionCountdown from "@/components/AuctionCountdown";

export default function AuctionCard({ auction }: { auction: OffchainAuctionSummary }) {
  return (
    <article className={`auction-card overflow-hidden rounded-[2rem] border border-[#d4af37]/25 bg-white/[0.03] backdrop-blur-xl ${auction.status === 'live' ? 'animate-pulse-gold' : ''}`}>
      <Link href={`/auctions/${auction.id}`} className="block">
        <div
          className="aspect-[4/3] w-full bg-cover bg-center transition-transform duration-500 hover:scale-105"
          style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.4)), url(${auction.assetUrl})` }}
        />
      </Link>
      <div className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${auction.status === 'live' ? 'border-[#f0d46e]/50 bg-[#f0d46e]/15 text-[#f0d46e]' : 'border-white/12 bg-white/5 text-white/60'}`}>
              {auction.status === 'live' && <span className="h-1.5 w-1.5 rounded-full bg-[#f0d46e] animate-pulse" />}
              {auction.status}
            </span>
            <h3 className="text-2xl font-serif text-white">{auction.title}</h3>
          </div>
          <AuctionCountdown endsAt={auction.endsAt} />
        </div>

        <p className="line-clamp-3 text-sm leading-6 text-white/70">{auction.description}</p>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl border border-[#d4af37]/20 bg-black/30 p-3 backdrop-blur-sm">
            <dt className="text-white/50">Opening</dt>
            <dd className="mt-1 font-semibold text-[#f0d46e]">{auction.startPriceSol.toFixed(2)} SOL</dd>
          </div>
          <div className="rounded-2xl border border-[#d4af37]/20 bg-black/30 p-3 backdrop-blur-sm">
            <dt className="text-white/50">High bid</dt>
            <dd className="mt-1 font-semibold text-[#f0d46e]">
              {auction.highestBidSol ? `${auction.highestBidSol.toFixed(2)} SOL` : "No bids"}
            </dd>
          </div>
          <div className="rounded-2xl border border-[#d4af37]/20 bg-black/30 p-3 backdrop-blur-sm">
            <dt className="text-white/50">Min increment</dt>
            <dd className="mt-1 font-semibold text-white">{auction.minIncrementSol.toFixed(2)} SOL</dd>
          </div>
          <div className="rounded-2xl border border-[#d4af37]/20 bg-black/30 p-3 backdrop-blur-sm">
            <dt className="text-white/50">Bid count</dt>
            <dd className="mt-1 font-semibold text-white">{auction.bidCount}</dd>
          </div>
        </dl>

        <Link href={`/auctions/${auction.id}`} className="button-secondary w-full">
          View auction
        </Link>
      </div>
    </article>
  );
}
