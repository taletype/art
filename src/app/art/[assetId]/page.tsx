import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuctionLotById, getSaleForLot } from "@/lib/site-data";

type ArtDetailPageProps = {
  params: Promise<{ assetId: string }>;
};

type CatalogRecord = Record<string, unknown>;

function readString(record: CatalogRecord, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return fallback;
}

function readNumber(record: CatalogRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function formatDate(value: string) {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function formatSol(value: number | null) {
  if (value === null) {
    return "Not set";
  }

  return `${value.toLocaleString("en-US", { maximumFractionDigits: 4 })} SOL`;
}

function formatBps(value: number | null) {
  if (value === null) {
    return "Not set";
  }

  return `${(value / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}

function formatStatus(value: string) {
  return value.replace(/[_-]/g, " ");
}

function shortWallet(value: string) {
  if (!value || value.length < 12) {
    return value || "Unknown wallet";
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default async function ArtDetailPage({ params }: ArtDetailPageProps) {
  const { assetId } = await params;
  const lot = await getAuctionLotById(assetId);

  if (!lot) {
    notFound();
  }

  const sale = await getSaleForLot(assetId);
  const lotRecord = lot as unknown as CatalogRecord;
  const saleRecord = (sale ?? {}) as unknown as CatalogRecord;

  const title = readString(lotRecord, ["title"], "Untitled lot");
  const artistName = readString(lotRecord, ["artistName", "artist_name"], "Unknown artist");
  const artistWallet = readString(lotRecord, ["artistWallet", "artist_wallet", "seller_wallet"]);
  const description = readString(lotRecord, ["description", "story", "collectorNote", "collector_note"], "Catalog notes are being prepared for this lot.");
  const conditionReport = readString(lotRecord, ["conditionReport", "condition_report"], "No condition report has been published yet.");
  const provenanceStatement = readString(lotRecord, ["provenanceStatement", "provenance_statement", "provenance_text"], "No provenance statement has been published yet.");
  const authenticityStatement = readString(lotRecord, ["authenticityStatement", "authenticity_statement"], "Human-authorship review is pending catalog publication.");
  const status = readString(lotRecord, ["status", "availability"], "cataloged");
  const saleId = readString(lotRecord, ["saleId", "sale_id"]);
  const saleTitle = readString(saleRecord, ["title"], "Sale catalog");
  const lotNumber = readNumber(lotRecord, ["lotNumber", "lot_number"]);
  const estimateLow = readNumber(lotRecord, ["estimateLowSol", "estimate_low_sol"]);
  const estimateHigh = readNumber(lotRecord, ["estimateHighSol", "estimate_high_sol"]);
  const reserve = readNumber(lotRecord, ["reserveSol", "reserve_sol"]);
  const currentBid = readNumber(lotRecord, ["currentBidSol", "current_bid_sol", "priceSol", "price_sol"]);
  const minimumNextBid = readNumber(lotRecord, ["minimumNextBidSol", "minimum_next_bid_sol"]);
  const bidCount = readNumber(lotRecord, ["bidCount", "bid_count"]);
  const watchCount = readNumber(lotRecord, ["watchCount", "watch_count"]);
  const buyerPremiumBps = readNumber(lotRecord, ["buyerPremiumBps", "buyer_premium_bps"]);
  const closesAt = readString(lotRecord, ["closesAt", "closes_at"]);

  return (
    <main className="min-h-screen bg-black px-4 pb-16 pt-24 text-white sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-white/60">
          <Link href="/" className="hover:text-white">
            Home
          </Link>
          <span>/</span>
          {saleId ? (
            <Link href={`/sales/${saleId}`} className="hover:text-white">
              {saleTitle}
            </Link>
          ) : (
            <span>{saleTitle}</span>
          )}
          <span>/</span>
          <span className="text-white/80">{title}</span>
        </nav>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <article className="rounded-xl border border-white/10 bg-[#141414] p-6">
            <p className="text-xs uppercase tracking-widest text-white/55">
              {lotNumber === null ? "Catalog lot" : `Lot ${lotNumber}`}
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">{title}</h1>
            <p className="mt-3 text-lg text-white/72">{artistName}</p>
            {artistWallet ? <p className="mt-1 text-sm text-white/45">{shortWallet(artistWallet)}</p> : null}
            <p className="mt-6 max-w-3xl text-base leading-8 text-white/70">{description}</p>

            <dl className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-white/10 p-3">
                <dt className="text-xs uppercase text-white/50">Estimate</dt>
                <dd className="mt-1 text-sm">
                  {estimateLow === null && estimateHigh === null
                    ? "Not set"
                    : `${formatSol(estimateLow)} - ${formatSol(estimateHigh)}`}
                </dd>
              </div>
              <div className="rounded-md border border-white/10 p-3">
                <dt className="text-xs uppercase text-white/50">Status</dt>
                <dd className="mt-1 text-sm capitalize">{formatStatus(status)}</dd>
              </div>
              <div className="rounded-md border border-white/10 p-3">
                <dt className="text-xs uppercase text-white/50">Current bid</dt>
                <dd className="mt-1 text-sm">{formatSol(currentBid)}</dd>
              </div>
              <div className="rounded-md border border-white/10 p-3">
                <dt className="text-xs uppercase text-white/50">Closes</dt>
                <dd className="mt-1 text-sm">{formatDate(closesAt)}</dd>
              </div>
            </dl>
          </article>

          <aside className="space-y-4">
            <section className="rounded-xl border border-white/10 bg-[#151515] p-5">
              <p className="text-xs uppercase tracking-widest text-white/55">Bidding</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-white/55">Next bid</dt>
                  <dd>{formatSol(minimumNextBid)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/55">Reserve</dt>
                  <dd>{formatSol(reserve)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/55">Bids</dt>
                  <dd>{bidCount ?? 0}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/55">Watchers</dt>
                  <dd>{watchCount ?? 0}</dd>
                </div>
              </dl>
              <Link href="/auctions" className="mt-5 inline-flex text-sm font-medium text-white underline">
                View live marketplace
              </Link>
            </section>

            <section className="rounded-xl border border-white/10 bg-[#151515] p-5">
              <p className="text-xs uppercase tracking-widest text-white/55">Catalog notes</p>
              <div className="mt-4 space-y-4 text-sm leading-6 text-white/68">
                <div>
                  <h2 className="text-base font-semibold text-white">Condition</h2>
                  <p className="mt-1">{conditionReport}</p>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Provenance</h2>
                  <p className="mt-1">{provenanceStatement}</p>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Authenticity</h2>
                  <p className="mt-1">{authenticityStatement}</p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-[#151515] p-5">
              <p className="text-xs uppercase tracking-widest text-white/55">Buyer premium</p>
              <p className="mt-3 text-2xl font-semibold">{formatBps(buyerPremiumBps)}</p>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Premium and settlement details are shown here so catalog buyers can review costs before moving to the live marketplace.
              </p>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
