import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuctionLotsBySaleId, getAuctionSaleById } from "@/lib/site-data";

interface SalePageProps {
  params: Promise<{ saleId: string }>;
}

function formatSaleDate(iso: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export default async function SalePage({ params }: SalePageProps) {
  const { saleId } = await params;
  const sale = getAuctionSaleById(saleId);

  if (!sale) {
    notFound();
  }

  const lots = getAuctionLotsBySaleId(sale.id);

  return (
    <main className="min-h-screen bg-black px-4 pb-14 pt-24 text-white sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="text-sm text-white/60">
          <Link href="/" className="hover:text-white">Home</Link> / <span>{sale.title}</span>
        </div>

        <section className="rounded-xl border border-white/10 bg-[#141414] p-6">
          <p className="text-xs uppercase tracking-widest text-white/60">{sale.status} sale</p>
          <h1 className="mt-2 text-3xl font-semibold">{sale.title}</h1>
          <p className="mt-3 max-w-3xl text-sm text-white/70">{sale.subtitle}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-white/10 p-3">
              <p className="text-xs uppercase text-white/50">Opens</p>
              <p className="mt-1 text-sm">{formatSaleDate(sale.opensAt)}</p>
            </div>
            <div className="rounded-md border border-white/10 p-3">
              <p className="text-xs uppercase text-white/50">Closes</p>
              <p className="mt-1 text-sm">{formatSaleDate(sale.closesAt)}</p>
            </div>
            <div className="rounded-md border border-white/10 p-3">
              <p className="text-xs uppercase text-white/50">Location</p>
              <p className="mt-1 text-sm">{sale.location}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lots.map((lot) => (
            <article key={lot.id} className="rounded-xl border border-white/10 bg-[#151515] p-4">
              <p className="text-xs uppercase tracking-widest text-white/55">Lot {lot.lotNumber}</p>
              <h2 className="mt-2 text-lg font-semibold">{lot.title}</h2>
              <p className="text-sm text-white/70">{lot.artistName}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border border-white/10 p-2">
                  <p className="text-white/55">Estimate</p>
                  <p>{lot.estimateLowSol}-{lot.estimateHighSol} SOL</p>
                </div>
                <div className="rounded-md border border-white/10 p-2">
                  <p className="text-white/55">Next bid</p>
                  <p>{lot.minimumNextBidSol} SOL</p>
                </div>
              </div>
              <Link href={`/art/${lot.id}`} className="mt-4 inline-flex text-sm font-medium text-white underline">
                Open lot
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
