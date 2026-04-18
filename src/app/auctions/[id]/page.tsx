import BidForm from "@/components/BidForm";
import { getAuctionById, getSettlementByAuctionId } from "@/lib/auction-v1";

type AuctionDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatStatus(date: string) {
  return new Intl.DateTimeFormat("en-HK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export default async function AuctionDetailPage({ params }: AuctionDetailPageProps) {
  const { id } = await params;
  const auction = await getAuctionById(id);

  if (!auction) {
    return (
      <main className="section-shell pb-20 pt-32">
        <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-8">
          <h1 className="text-3xl">Auction not found</h1>
          <p className="mt-3 text-white/60">The requested auction either does not exist or is not visible yet.</p>
        </div>
      </main>
    );
  }

  const settlement = await getSettlementByAuctionId(id);

  return (
    <main className="pb-20 pt-28">
      <section className="section-shell grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div
            className="aspect-[4/3] rounded-[2rem] border border-white/10 bg-cover bg-center"
            style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.55)), url(${auction.assetUrl})` }}
          />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-white/45">Starts</p>
              <p className="mt-2 text-sm font-semibold text-white">{formatStatus(auction.startAt)}</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-white/45">Ends</p>
              <p className="mt-2 text-sm font-semibold text-white">{formatStatus(auction.endAt)}</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-white/45">Opening bid</p>
              <p className="mt-2 text-sm font-semibold text-white">{auction.startPrice.toFixed(2)} SOL</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-white/45">Minimum increment</p>
              <p className="mt-2 text-sm font-semibold text-white">{auction.minIncrement.toFixed(2)} SOL</p>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6">
            <p className="eyebrow">About the lot</p>
            <h1 className="mt-3 text-4xl">{auction.title}</h1>
            <p className="mt-4 text-base leading-8 text-white/68">{auction.description}</p>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6">
            <p className="eyebrow">Auction state</p>
            <div className="mt-4 grid gap-4">
              <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-white/45">Status</p>
                <p className="mt-2 text-2xl font-semibold capitalize text-white">{auction.status}</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-white/45">Current lead</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {auction.highestBid ? `${auction.highestBid.toFixed(2)} SOL` : "No bids yet"}
                </p>
              </div>
            </div>
          </div>

          <BidForm auction={auction} />

          <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">Settlement</p>
              {settlement ? <span className="status-pill">{settlement.status}</span> : null}
            </div>
            <p className="mt-3 text-sm leading-7 text-white/62">
              When the seller closes the auction, the winner pays in SOL. The backend then verifies the submitted transaction hash before switching the auction to settled.
            </p>
            {settlement ? (
              <dl className="mt-4 space-y-2 text-sm text-white/75">
                <div className="flex justify-between gap-4">
                  <dt>Final amount</dt>
                  <dd>{settlement.finalAmount.toFixed(2)} SOL</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-white/45">Payment tx</dt>
                  <dd className="break-all text-xs text-white/78">{settlement.paymentTxHash}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-white/45">No settlement recorded yet.</p>
            )}
          </div>

          <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">Bid ladder</p>
            <div className="mt-4 space-y-3">
              {auction.bids.length ? (
                auction.bids.slice(0, 8).map((bid) => (
                  <div key={bid.id} className="flex items-center justify-between rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {bid.bidderWalletAddress ? `${bid.bidderWalletAddress.slice(0, 4)}...${bid.bidderWalletAddress.slice(-4)}` : "Bidder"}
                      </p>
                      <p className="text-xs text-white/45">{formatStatus(bid.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">{bid.amount.toFixed(2)} SOL</p>
                      <p className="text-xs text-white/45">{bid.isWinning ? "Winning" : "Outbid"}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/45">No bids on the board yet.</p>
              )}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
