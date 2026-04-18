import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getArtworkById, getSaleForLot } from "@/lib/site-data";

type ArtPageProps = {
  params: Promise<{ id: string }>;
};

type NormalizedArtwork = {
  id: string;
  title: string;
  artistName: string;
  artistWallet: string | null;
  description: string;
  imageUrl: string | null;
  medium: string | null;
  category: string | null;
  edition: string | null;
  year: number | null;
  story: string | null;
  collectorNote: string | null;
  provenanceText: string | null;
  status: string;
  sellerFlowStatus: string | null;
  priceSol: number | null;
  reserveSol: number | null;
  estimateLowSol: number | null;
  estimateHighSol: number | null;
  minimumNextBidSol: number | null;
  currentBidSol: number | null;
  closesAt: string | null;
  thirdwebListingId: string | null;
  thirdwebListingUrl: string | null;
  syncStatus: string | null;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-HK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatSol(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "Not set";
  }
  return `${value.toFixed(2)} SOL`;
}

function normalizeArtwork(record: Record<string, unknown>): NormalizedArtwork {
  const reservePriceLamports =
    typeof record.reserve_price_lamports === "number" ? record.reserve_price_lamports : null;
  const reserveSol =
    typeof record.reserve_sol === "number"
      ? record.reserve_sol
      : reservePriceLamports !== null
        ? reservePriceLamports / 1_000_000_000
        : null;

  return {
    id: String(record.id),
    title: typeof record.title === "string" ? record.title : "Untitled artwork",
    artistName:
      typeof record.artistName === "string"
        ? record.artistName
        : typeof record.artist_name === "string"
          ? record.artist_name
          : typeof record.seller_wallet === "string"
            ? `${record.seller_wallet.slice(0, 6)}...${record.seller_wallet.slice(-4)}`
            : "Unknown artist",
    artistWallet:
      typeof record.artistWallet === "string"
        ? record.artistWallet
        : typeof record.artist_wallet === "string"
          ? record.artist_wallet
          : typeof record.seller_wallet === "string"
            ? record.seller_wallet
            : null,
    description:
      typeof record.description === "string"
        ? record.description
        : "No description has been added yet.",
    imageUrl:
      typeof record.image_url === "string"
        ? record.image_url
        : typeof record.asset_url === "string"
          ? record.asset_url
          : null,
    medium: typeof record.medium === "string" ? record.medium : null,
    category:
      typeof record.category === "string"
        ? record.category
        : null,
    edition:
      typeof record.edition === "string"
        ? record.edition
        : null,
    year: typeof record.year === "number" ? record.year : null,
    story: typeof record.story === "string" ? record.story : null,
    collectorNote:
      typeof record.collectorNote === "string"
        ? record.collectorNote
        : typeof record.collector_note === "string"
          ? record.collector_note
          : null,
    provenanceText:
      typeof record.provenance_text === "string"
        ? record.provenance_text
        : typeof record.provenanceStatement === "string"
          ? record.provenanceStatement
          : typeof record.provenance_statement === "string"
            ? record.provenance_statement
            : null,
    status:
      typeof record.status === "string"
        ? record.status
        : "draft",
    sellerFlowStatus:
      typeof record.seller_flow_status === "string"
        ? record.seller_flow_status
        : null,
    priceSol:
      typeof record.priceSol === "number"
        ? record.priceSol
        : typeof record.price_sol === "number"
          ? record.price_sol
          : null,
    reserveSol,
    estimateLowSol:
      typeof record.estimateLowSol === "number"
        ? record.estimateLowSol
        : typeof record.estimate_low_sol === "number"
          ? record.estimate_low_sol
          : null,
    estimateHighSol:
      typeof record.estimateHighSol === "number"
        ? record.estimateHighSol
        : typeof record.estimate_high_sol === "number"
          ? record.estimate_high_sol
          : null,
    minimumNextBidSol:
      typeof record.minimumNextBidSol === "number"
        ? record.minimumNextBidSol
        : typeof record.minimum_next_bid_sol === "number"
          ? record.minimum_next_bid_sol
          : null,
    currentBidSol:
      typeof record.currentBidSol === "number"
        ? record.currentBidSol
        : typeof record.current_bid_sol === "number"
          ? record.current_bid_sol
          : null,
    closesAt:
      typeof record.closesAt === "string"
        ? record.closesAt
        : typeof record.closes_at === "string"
          ? record.closes_at
          : null,
    thirdwebListingId:
      typeof record.thirdweb_listing_id === "string"
        ? record.thirdweb_listing_id
        : null,
    thirdwebListingUrl:
      typeof record.thirdweb_listing_url === "string"
        ? record.thirdweb_listing_url
        : null,
    syncStatus:
      typeof record.sync_status === "string"
        ? record.sync_status
        : null,
  };
}

export default async function ArtDetailPage({ params }: ArtPageProps) {
  const { id } = await params;
  const artworkRecord = await getArtworkById(id);

  if (!artworkRecord) {
    notFound();
  }

  const artwork = normalizeArtwork(artworkRecord as Record<string, unknown>);
  const sale = await getSaleForLot(id);
  const supabase = createSupabaseAdminClient();
  const { data: linkedAuction } = await supabase
    .from("offchain_auctions")
    .select("id,status")
    .eq("artwork_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-black px-4 pb-14 pt-24 text-white sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="text-sm text-white/60">
          <Link href="/" className="hover:text-white">Home</Link> / <span>{artwork.title}</span>
        </div>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div
              className="aspect-[4/3] rounded-[1.8rem] border border-white/10 bg-[#141414] bg-cover bg-center"
              style={
                artwork.imageUrl
                  ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.48)), url(${artwork.imageUrl})` }
                  : undefined
              }
            />

            <section className="rounded-[1.8rem] border border-white/10 bg-[#141414] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">Artwork</p>
                  <h1 className="mt-2 text-4xl font-semibold">{artwork.title}</h1>
                  <p className="mt-3 text-sm text-white/60">
                    {artwork.artistName}
                    {artwork.year ? ` • ${artwork.year}` : ""}
                    {artwork.edition ? ` • ${artwork.edition}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="status-pill">{artwork.status}</span>
                  {artwork.sellerFlowStatus ? <span className="status-pill">{artwork.sellerFlowStatus}</span> : null}
                </div>
              </div>

              <p className="mt-5 text-base leading-8 text-white/72">{artwork.description}</p>

              {artwork.story ? (
                <div className="mt-6 rounded-[1.2rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">Artist story</p>
                  <p className="mt-3 text-sm leading-7 text-white/72">{artwork.story}</p>
                </div>
              ) : null}
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[1.8rem] border border-white/10 bg-[#141414] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">Lot details</p>
              <dl className="mt-4 space-y-3 text-sm text-white/75">
                <div className="flex justify-between gap-4">
                  <dt>Category</dt>
                  <dd>{artwork.category ?? "Not set"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Medium</dt>
                  <dd className="text-right">{artwork.medium ?? "Not set"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Reserve</dt>
                  <dd>{formatSol(artwork.reserveSol)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Estimate</dt>
                  <dd>
                    {artwork.estimateLowSol !== null && artwork.estimateHighSol !== null
                      ? `${artwork.estimateLowSol.toFixed(2)}-${artwork.estimateHighSol.toFixed(2)} SOL`
                      : "Not set"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Current bid</dt>
                  <dd>{formatSol(artwork.currentBidSol)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Minimum next bid</dt>
                  <dd>{formatSol(artwork.minimumNextBidSol)}</dd>
                </div>
                {artwork.closesAt ? (
                  <div className="flex justify-between gap-4">
                    <dt>Closes</dt>
                    <dd className="text-right">{formatDateTime(artwork.closesAt)}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className="rounded-[1.8rem] border border-white/10 bg-[#141414] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">Auction path</p>
              <div className="mt-4 space-y-3 text-sm text-white/72">
                {linkedAuction ? (
                  <>
                    <p>This artwork already has a mirrored auction record in the marketplace.</p>
                    <Link href={`/auctions/${linkedAuction.id}`} className="button-primary w-full text-center">
                      View auction
                    </Link>
                  </>
                ) : (
                  <p>No linked auction is live yet. Open Seller Hub to prepare the artwork with thirdweb and launch it.</p>
                )}
                {artwork.thirdwebListingUrl ? (
                  <a href={artwork.thirdwebListingUrl} target="_blank" rel="noreferrer" className="button-secondary block w-full text-center">
                    Open thirdweb reference
                  </a>
                ) : null}
                {artwork.syncStatus ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/55">
                    Sync status: {artwork.syncStatus}
                  </div>
                ) : null}
              </div>
            </section>

            {(artwork.collectorNote || artwork.provenanceText || sale) ? (
              <section className="rounded-[1.8rem] border border-white/10 bg-[#141414] p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">Catalog context</p>
                <div className="mt-4 space-y-4 text-sm leading-7 text-white/72">
                  {sale ? (
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">Sale</p>
                      <Link href={`/sales/${sale.id}`} className="mt-2 inline-flex text-white underline underline-offset-4">
                        {sale.title}
                      </Link>
                    </div>
                  ) : null}
                  {artwork.collectorNote ? (
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">Collector note</p>
                      <p className="mt-2">{artwork.collectorNote}</p>
                    </div>
                  ) : null}
                  {artwork.provenanceText ? (
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">Provenance</p>
                      <p className="mt-2 break-words">{artwork.provenanceText}</p>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {artwork.artistWallet ? (
              <Link href={`/creator/${artwork.artistWallet}`} className="button-secondary block w-full text-center">
                View artist profile
              </Link>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}
