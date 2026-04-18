import Link from "next/link";
import { getAuctionLotsBySaleId, getAuctionSales } from "@/lib/site-data";

export default function HomePage() {
  const sales = getAuctionSales();
  const liveSale = sales.find((sale) => sale.status === "live") ?? sales[0];
  const lots = liveSale ? getAuctionLotsBySaleId(liveSale.id) : [];

  return (
    <main className="min-h-screen bg-black px-4 pb-14 pt-24 text-white sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <section className="rounded-xl border border-white/10 bg-[#141414] p-6">
          <p className="text-xs uppercase tracking-widest text-white/60">Simple auction platform</p>
          <h1 className="mt-2 text-3xl font-semibold">Bid on curated digital art</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/70">
            Browse lots, place bids, and review each artwork details in a clean auction-first layout.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {liveSale ? (
              <Link href={`/sales/${liveSale.id}`} className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black">
                Open live sale
              </Link>
            ) : null}
            <Link href="/submit" className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium">
              List your artwork
            </Link>
          </div>
        </section>

        <section id="lots" className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-semibold">Lots</h2>
            {liveSale ? <span className="text-sm text-white/60">{liveSale.title}</span> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {lots.map((lot) => (
              <article key={lot.id} className="rounded-xl border border-white/10 bg-[#151515] p-4">
                <div className="h-40 rounded-md" style={{ backgroundImage: lot.background }} />
                <h3 className="mt-3 text-lg font-semibold">{lot.title}</h3>
                <p className="text-sm text-white/65">{lot.artistName}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md border border-white/10 p-2">
                    <p className="text-white/55">Current</p>
                    <p>{lot.currentBidSol > 0 ? `${lot.currentBidSol} SOL` : "No bids"}</p>
                  </div>
                  <div className="rounded-md border border-white/10 p-2">
                    <p className="text-white/55">Next bid</p>
                    <p>{lot.minimumNextBidSol} SOL</p>
                  </div>
                </div>
                <Link href={`/art/${lot.id}`} className="mt-4 inline-flex text-sm font-medium text-white underline">
                  View lot
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
