import BidForm from "@/components/BidForm";
import { getOffchainAuctionById } from "@/lib/offchainAuctions";

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
  const auction = await getOffchainAuctionById(id);

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
              <p className="mt-2 text-sm font-semibold text-white">{formatStatus(auction.startsAt)}</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-white/45">Ends</p>
              <p className="mt-2 text-sm font-semibold text-white">{formatStatus(auction.endsAt)}</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-white/45">Opening bid</p>
              <p className="mt-2 text-sm font-semibold text-white">{auction.startPriceSol.toFixed(2)} SOL</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-white/45">Minimum increment</p>
              <p className="mt-2 text-sm font-semibold text-white">{auction.minIncrementSol.toFixed(2)} SOL</p>
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
                  {auction.highestBidSol ? `${auction.highestBidSol.toFixed(2)} SOL` : "No bids yet"}
                </p>
              </div>
            </div>
          </div>

          <BidForm auction={auction} />

          <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">Settlement</p>
              <span className="status-pill">{auction.status === "settled" ? "paid" : auction.status}</span>
            </div>
            <p className="mt-3 text-sm leading-7 text-white/62">
              This page follows the active off-chain auction path, so the auction state is the settlement signal until a dedicated settlement record is added back to this flow.
            </p>
            <dl className="mt-4 space-y-2 text-sm text-white/75">
              <div className="flex justify-between gap-4">
                <dt>Winning bid</dt>
                <dd>{auction.highestBidSol ? `${auction.highestBidSol.toFixed(2)} SOL` : "No winning bid yet"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Winning bid id</dt>
                <dd className="break-all text-right text-xs text-white/78">{auction.winnerBidId ?? "Pending close"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">Bid ladder</p>
            <div className="mt-4 space-y-3">
              {auction.bids.length ? (
                auction.bids.slice(0, 8).map((bid) => (
                  <div key={bid.id} className="flex items-center justify-between rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {`${bid.bidderWallet.slice(0, 4)}...${bid.bidderWallet.slice(-4)}`}
                      </p>
                      <p className="text-xs text-white/45">{formatStatus(bid.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">{bid.amountSol.toFixed(2)} SOL</p>
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
