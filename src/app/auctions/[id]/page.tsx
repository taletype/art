import MarketplaceActionPanel from "@/components/MarketplaceActionPanel";
import { getMarketplaceDetail } from "@/lib/marketplace";

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
  const auction = await getMarketplaceDetail(id);

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
              <p className="text-sm text-white/45">{auction.type === "auction" ? "Opening bid" : "List price"}</p>
              <p className="mt-2 text-sm font-semibold text-white">{(auction.startPriceEth ?? auction.buyoutPriceEth ?? 0).toFixed(4)} ETH</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-white/45">{auction.type === "auction" ? "Buyout" : "Chain"}</p>
              <p className="mt-2 text-sm font-semibold text-white">{auction.type === "auction" ? `${(auction.buyoutPriceEth ?? 0).toFixed(4)} ETH` : auction.chainLabel}</p>
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
                <p className="mt-2 text-2xl font-semibold capitalize text-white">{auction.type === "auction" ? "Auction listing" : "Direct listing"}</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-white/45">{auction.type === "auction" ? "Minimum bid" : "List price"}</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {auction.type === "auction"
                    ? `${(auction.minimumBidEth ?? 0).toFixed(4)} ETH`
                    : `${(auction.buyoutPriceEth ?? 0).toFixed(4)} ETH`}
                </p>
              </div>
            </div>
          </div>

          <MarketplaceActionPanel
            listingId={auction.id}
            type={auction.type}
            minimumBidEth={auction.minimumBidEth}
            buyoutPriceEth={auction.buyoutPriceEth}
          />

          <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">Contract state</p>
              <span className="status-pill">{auction.chainLabel}</span>
            </div>
            <p className="mt-3 text-sm leading-7 text-white/62">
              This page now follows the live Thirdweb marketplace contract. Transactions settle directly onchain and the contract address is the source of truth for auction status.
            </p>
            <dl className="mt-4 space-y-2 text-sm text-white/75">
              <div className="flex justify-between gap-4">
                <dt>Asset contract</dt>
                <dd className="break-all text-right text-xs text-white/78">{auction.assetContractAddress}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Token id</dt>
                <dd className="break-all text-right text-xs text-white/78">{auction.tokenId}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </section>
    </main>
  );
}
