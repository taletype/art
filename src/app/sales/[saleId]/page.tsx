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
  const heroLot = lots.find((lot) => lot.id === sale.heroLotId) ?? lots[0];

  return (
    <main className="min-h-screen bg-black px-6 pb-20 pt-32">
      <div className="section-shell space-y-10">
        <div className="flex flex-wrap items-center gap-3 text-sm text-white/55">
          <Link href="/" className="transition hover:text-white">Home</Link>
          <span>•</span>
          <Link href="/#featured" className="transition hover:text-white">Auctions</Link>
          <span>•</span>
          <span className="text-white/85">{sale.title}</span>
        </div>

        <section className="overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#11100d]">
          <div className="grid min-h-[560px] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-8 p-8 sm:p-10 lg:p-12">
              <div>
                <p className="eyebrow">{sale.status} human-made timed auction</p>
                <h1 className="mt-4 text-5xl leading-[0.95] text-white sm:text-6xl">{sale.title}</h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-white/68">{sale.subtitle}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/45">Opens</p>
                  <p className="mt-2 text-sm text-white">{formatSaleDate(sale.opensAt)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/45">Closes</p>
                  <p className="mt-2 text-sm text-white">{formatSaleDate(sale.closesAt)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/45">Format</p>
                  <p className="mt-2 text-sm text-white">{sale.location}</p>
                </div>
              </div>

              <article className="rounded-[1.6rem] border border-[#d4af37]/20 bg-[#d4af37]/8 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-[#f7d774]/70">Curator note</p>
                <p className="mt-3 text-sm leading-7 text-white/68">{sale.curatorNote}</p>
                <p className="mt-4 text-sm font-semibold text-white">{sale.curatorName}</p>
              </article>
            </div>

            <div className="relative min-h-[420px]" style={{ backgroundImage: heroLot?.background }}>
              <div className="absolute inset-0 bg-gradient-to-br from-black/5 via-black/25 to-black/85" />
              {heroLot ? (
                <div className="absolute bottom-8 left-8 right-8">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/55">Featured lot {heroLot.lotNumber}</p>
                  <h2 className="mt-2 text-4xl text-white">{heroLot.title}</h2>
                  <p className="mt-3 text-white/68">Estimate {heroLot.estimateLowSol}-{heroLot.estimateHighSol} SOL</p>
                  <p className="mt-2 text-sm text-white/62">Human-made verified / no-AI review cleared</p>
                  <Link href={`/art/${heroLot.id}`} className="button-primary mt-5">
                    View Featured Lot
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Sale catalog</p>
              <h2 className="mt-2 text-3xl text-white">{lots.length} curated human-made lots</h2>
            </div>
            <Link href="/submit" className="button-secondary">Request Consignment</Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {lots.map((lot) => (
              <article key={lot.id} className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/[0.03]">
                <div className="relative h-64" style={{ backgroundImage: lot.background }}>
                  <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/20 to-black/80" />
                  <span className="absolute left-5 top-5 rounded-full border border-white/12 bg-black/35 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/70">
                    Lot {lot.lotNumber}
                  </span>
                  <div className="absolute bottom-5 left-5 right-5">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/55">{lot.artistName}</p>
                    <h3 className="mt-1 text-3xl text-white">{lot.title}</h3>
                  </div>
                </div>
                <div className="space-y-5 p-5">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                      <p className="text-white/42">Estimate</p>
                      <p className="mt-1 font-semibold text-white">{lot.estimateLowSol}-{lot.estimateHighSol} SOL</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                      <p className="text-white/42">Next bid</p>
                      <p className="mt-1 font-semibold text-white">{lot.minimumNextBidSol} SOL</p>
                    </div>
                  </div>
                  <p className="text-xs uppercase tracking-[0.16em] text-emerald-100/70">Human-made verified</p>
                  <p className="text-sm leading-7 text-white/58">{lot.description}</p>
                  <Link href={`/art/${lot.id}`} className="inline-flex items-center text-sm font-semibold text-[#f5d06f] transition hover:text-[#ffe39a]">
                    View lot and bid →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
