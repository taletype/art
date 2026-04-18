import Link from "next/link";
import AuctionBidPanel from "@/components/AuctionBidPanel";
import { getArtworkById, getSaleForLot } from "@/lib/site-data";

interface ArtPageProps {
  params: Promise<{ assetId: string }>;
}

export default async function ArtPage({ params }: ArtPageProps) {
  const { assetId } = await params;
  const artwork = getArtworkById(assetId);
  const sale = getSaleForLot(artwork.id);

  return (
    <main className="min-h-screen bg-black px-4 pb-14 pt-24 text-white sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="text-sm text-white/60">
          <Link href="/" className="hover:text-white">Home</Link>
          {sale ? (
            <>
              {" / "}
              <Link href={`/sales/${sale.id}`} className="hover:text-white">{sale.title}</Link>
            </>
          ) : null}
          {" / "}
          <span>{artwork.title}</span>
        </div>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-xl border border-white/10 bg-[#151515] p-4">
            <div className="h-64 rounded-md sm:h-80" style={{ backgroundImage: artwork.background }} />
            <h1 className="mt-4 text-3xl font-semibold">{artwork.title}</h1>
            <p className="mt-1 text-sm text-white/70">{artwork.artistName} • {artwork.year}</p>
            <p className="mt-4 text-sm text-white/75">{artwork.description}</p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-white/10 p-3 text-sm">
                <p className="text-white/55">Medium</p>
                <p>{artwork.medium}</p>
              </div>
              <div className="rounded-md border border-white/10 p-3 text-sm">
                <p className="text-white/55">Edition</p>
                <p>{artwork.edition}</p>
              </div>
              <div className="rounded-md border border-white/10 p-3 text-sm">
                <p className="text-white/55">Estimate</p>
                <p>{artwork.estimateLowSol}-{artwork.estimateHighSol} SOL</p>
              </div>
              <div className="rounded-md border border-white/10 p-3 text-sm">
                <p className="text-white/55">Status</p>
                <p>{artwork.status}</p>
              </div>
            </div>
          </article>

          <AuctionBidPanel saleId={artwork.saleId} lot={artwork} />
        </section>

        <section className="rounded-xl border border-white/10 bg-[#141414] p-4">
          <h2 className="text-lg font-semibold">Provenance & notes</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/70">
            <li>{artwork.provenanceStatement}</li>
            <li>{artwork.conditionReport}</li>
            <li>{artwork.authenticityStatement}</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
