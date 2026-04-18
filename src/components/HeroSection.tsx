import Link from "next/link";
import { getFeaturedArtwork, getSaleForLot, platformStats } from "@/lib/site-data";

export default async function HeroSection() {
  const featuredArtwork = await getFeaturedArtwork();
  const featuredSale = await getSaleForLot(featuredArtwork.id);

  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-28 lg:pb-32 lg:pt-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,162,39,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(201,162,39,0.08),transparent_30%)]" />

      <div className="section-shell relative z-10">
        <div className="grid min-h-[calc(100svh-9rem)] items-end gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(360px,1.15fr)]">
          <div className="space-y-10 pb-4 lg:pb-12">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#c9a227]/30 bg-[#c9a227]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#e8c547]">
                <span className="h-2 w-2 rounded-full bg-[#e8c547]" />
                Human-Made Only • Curated Timed Auctions
              </span>
              <p className="eyebrow text-[#e8c547]">Digital auction house for culturally significant overlooked artists</p>
              <h1 className="max-w-4xl text-5xl leading-[0.92] text-white text-balance sm:text-6xl lg:text-8xl">
                HUMAN_ Arts auctions human-made work with collector-grade trust.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-white/65 sm:text-xl">
                Browse selective sales, inspect provenance and condition notes, register to bid, and support overlooked human artists entering serious collector markets.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/#featured" className="button-primary px-8 py-4">
                View Current Sale
              </Link>
              <Link href="/submit" className="button-secondary px-8 py-4">
                Consign Artwork
              </Link>
            </div>

            <dl className="grid gap-6 border-t border-[#c9a227]/20 pt-8 sm:grid-cols-3">
              {platformStats.map((stat) => (
                <div key={stat.label} className="min-w-0">
                  <dt className="text-xs uppercase tracking-[0.18em] text-white/45">{stat.label}</dt>
                  <dd className="mt-3 text-3xl font-semibold text-[#e8c547]">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative isolate min-h-[580px] overflow-hidden rounded-[2.5rem] border border-[#c9a227]/30 shadow-2xl shadow-[#c9a227]/10">
            <div className="absolute inset-0" style={{ backgroundImage: featuredArtwork.background }} />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(5,5,8,0.15),rgba(5,5,8,0.12)_40%,rgba(5,5,8,0.85)_100%)]" />
            <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/40 to-transparent" />
            <div className="relative flex h-full flex-col justify-between p-8 sm:p-10">
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-full border border-[#c9a227]/30 bg-[#c9a227]/15 px-5 py-2.5 text-xs uppercase tracking-[0.24em] font-semibold text-[#e8c547]">
                  Featured Lot
                </div>
                <div className="rounded-full border border-[#c9a227]/30 bg-[#c9a227]/15 px-5 py-2.5 text-sm font-medium text-white">
                  Lot {featuredArtwork.lotNumber}
                </div>
              </div>

              <div className="max-w-xl space-y-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-[#e8c547]/90">{featuredSale?.title ?? featuredArtwork.category}</p>
                  <h2 className="mt-3 text-4xl text-white sm:text-5xl font-serif">{featuredArtwork.title}</h2>
                  <p className="mt-3 text-base text-white/70">
                    By {featuredArtwork.artistName} · {featuredArtwork.edition} · Human-made verified
                  </p>
                </div>

                <p className="max-w-lg text-base leading-7 text-white/75">{featuredArtwork.description}</p>

                <div className="grid gap-4 border-t border-[#c9a227]/20 pt-6 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Estimate</p>
                    <p className="mt-2 text-lg font-semibold text-[#e8c547]">{featuredArtwork.estimateLowSol}-{featuredArtwork.estimateHighSol} SOL</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Medium</p>
                    <p className="mt-2 text-sm text-white/80">{featuredArtwork.medium}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Next bid</p>
                    <p className="mt-2 text-sm text-white/80">{featuredArtwork.minimumNextBidSol} SOL</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link href={`/art/${featuredArtwork.id}`} className="button-primary">
                    View Lot Detail
                  </Link>
                  <Link href={featuredSale ? `/sales/${featuredSale.id}` : "/#featured"} className="button-secondary">
                    Open Sale Catalog
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
