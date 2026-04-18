import Link from "next/link";
import type { OffchainAuctionSummary } from "@/types/offchainAuction";
import AuctionCountdown from "@/components/AuctionCountdown";

export default function AuctionCard({ auction }: { auction: OffchainAuctionSummary }) {
  return (
    <article className={`auction-card overflow-hidden rounded-[1.8rem] border border-[#c9a227]/20 bg-white/[0.02] ${auction.status === 'live' ? 'animate-pulse-gold' : ''}`}>
      <Link href={`/auctions/${auction.id}`} className="block">
        <div
          className="aspect-[4/3] w-full bg-cover bg-center"
          style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.35)), url(${auction.assetUrl})` }}
        />
      </Link>
      <div className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${auction.status === 'live' ? 'border-[#e8c547]/40 bg-[#e8c547]/12 text-[#e8c547]' : 'border-white/10 bg-white/5 text-white/60'}`}>
              {auction.status === 'live' && <span className="h-1.5 w-1.5 rounded-full bg-[#e8c547] animate-pulse" />}
              {auction.status}
            </span>
            <h3 className="text-2xl font-serif text-white">{auction.title}</h3>
          </div>
          <AuctionCountdown endsAt={auction.endsAt} />
        </div>

        <p className="line-clamp-3 text-sm leading-6 text-white/65">{auction.description}</p>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl border border-[#c9a227]/15 bg-black/20 p-3">
            <dt className="text-white/45">Opening</dt>
            <dd className="mt-1 font-semibold text-[#e8c547]">{auction.startPriceSol.toFixed(2)} SOL</dd>
          </div>
          <div className="rounded-2xl border border-[#c9a227]/15 bg-black/20 p-3">
            <dt className="text-white/45">High bid</dt>
            <dd className="mt-1 font-semibold text-[#e8c547]">
              {auction.highestBidSol ? `${auction.highestBidSol.toFixed(2)} SOL` : "No bids"}
            </dd>
          </div>
          <div className="rounded-2xl border border-[#c9a227]/15 bg-black/20 p-3">
            <dt className="text-white/45">Min increment</dt>
            <dd className="mt-1 font-semibold text-white">{auction.minIncrementSol.toFixed(2)} SOL</dd>
          </div>
          <div className="rounded-2xl border border-[#c9a227]/15 bg-black/20 p-3">
            <dt className="text-white/45">Bid count</dt>
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
