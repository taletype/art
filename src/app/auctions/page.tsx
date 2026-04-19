import AuctionCard from "@/components/AuctionCard";
import WalletConnect from "@/components/WalletConnect";
import { SkeletonCard, SkeletonStats, SkeletonText } from "@/components/SkeletonLoader";
import { listMarketplaceEntries } from "@/lib/marketplace";
import { getMarketplaceChainLabel, isMarketplaceConfigured } from "@/lib/thirdweb-config";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

function AuctionsGrid({ auctions }: { auctions: Awaited<ReturnType<typeof listMarketplaceEntries>> }) {
  if (!auctions.length) {
    return (
      <div className="rounded-[1.8rem] border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
        <h3 className="text-2xl">No auctions yet</h3>
        <p className="mt-3 text-sm text-white/60">
          {isMarketplaceConfigured()
            ? "Create your first Base Sepolia listing from Seller Hub to light up the live marketplace."
            : "Add your Thirdweb marketplace contract env vars to light up the live marketplace."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {auctions.map((auction) => (
        <AuctionCard key={auction.id} auction={auction} />
      ))}
    </div>
  );
}

async function AuctionsContent() {
  const auctions = await listMarketplaceEntries(20);
  const live = auctions.filter((auction) => auction.status === "ACTIVE");
  const auctionListings = auctions.filter((auction) => auction.type === "auction");
  const directListings = auctions.filter((auction) => auction.type === "direct");

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="eyebrow">Marketplace</p>
          <h1 className="max-w-3xl text-5xl leading-tight sm:text-6xl">Thirdweb marketplace on {getMarketplaceChainLabel()}.</h1>
          <p className="max-w-2xl text-lg leading-8 text-white/68">
            Listings, bids, and buyouts come directly from the live marketplace contract. Use either a connected wallet or an app profile.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-white/45">Active listings</p>
            <p className="mt-2 text-3xl font-semibold text-white">{live.length}</p>
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-white/45">Auction listings</p>
            <p className="mt-2 text-3xl font-semibold text-white">{auctionListings.length}</p>
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-white/45">Direct listings</p>
            <p className="mt-2 text-3xl font-semibold text-white">{directListings.length}</p>
          </div>
        </div>
      </div>

      <WalletConnect />
    </>
  );
}

export default function AuctionsPage() {
  return (
    <main className="pb-20 pt-28">
      <section className="section-shell grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
        <Suspense fallback={<div className="space-y-6"><SkeletonText lines={3} /><SkeletonStats /></div>}>
          <AuctionsContent />
        </Suspense>
      </section>

      <section className="section-shell mt-12 space-y-10">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="eyebrow">Marketplace</p>
            <h2 className="text-3xl">Current auctions</h2>
          </div>
        </div>

        <Suspense fallback={<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>}>
          <AuctionsContentWrapper />
        </Suspense>
      </section>
    </main>
  );
}

async function AuctionsContentWrapper() {
  const auctions = await listMarketplaceEntries(20);
  return <AuctionsGrid auctions={auctions} />;
}
