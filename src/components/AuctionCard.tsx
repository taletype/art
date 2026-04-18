import Link from "next/link";
import type { OffchainAuctionSummary } from "@/types/offchainAuction";

function formatCountdown(date: string) {
  const delta = new Date(date).getTime() - Date.now();
  if (delta <= 0) {
    return "Closed";
  }

  const hours = Math.floor(delta / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return `${days}d left`;
  }
  if (hours > 0) {
    return `${hours}h left`;
  }
  const minutes = Math.max(1, Math.floor(delta / (1000 * 60)));
  return `${minutes}m left`;
}

export default function AuctionCard({ auction }: { auction: OffchainAuctionSummary }) {
  return (
    <article className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.03]">
      <Link href={`/auctions/${auction.id}`} className="block">
        <div
          className="aspect-[4/3] w-full bg-cover bg-center"
          style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.42)), url(${auction.assetUrl})` }}
        />
      </Link>
      <div className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{auction.status}</p>
            <h3 className="text-2xl">{auction.title}</h3>
          </div>
          <span className="status-pill shrink-0">{formatCountdown(auction.endsAt)}</span>
        </div>

        <p className="line-clamp-3 text-sm leading-6 text-white/70">{auction.description}</p>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
            <dt className="text-white/45">Opening</dt>
            <dd className="mt-1 font-semibold text-white">{auction.startPriceSol.toFixed(2)} SOL</dd>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
            <dt className="text-white/45">High bid</dt>
            <dd className="mt-1 font-semibold text-white">
              {auction.highestBidSol ? `${auction.highestBidSol.toFixed(2)} SOL` : "No bids"}
            </dd>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
            <dt className="text-white/45">Min increment</dt>
            <dd className="mt-1 font-semibold text-white">{auction.minIncrementSol.toFixed(2)} SOL</dd>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
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
