"use client";

import Link from "next/link";
import { getAuctionSales, getFeaturedArtworks, getSaleForLot } from "@/lib/site-data";

export default function FeaturedArtworks() {
  const artworks = getFeaturedArtworks();
  const sales = getAuctionSales();

  return (
    <section id="featured" className="px-6 py-24">
      <div className="section-shell">
        <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="section-heading">
            <p className="eyebrow">Featured auction lots</p>
            <h2 className="text-3xl text-white text-balance sm:text-5xl">Selective human-made sales with estimates, reserves, and provenance before bidding.</h2>
            <p className="section-kicker">
              Each lot leads into a formal catalog entry with condition notes, artist statements, no-AI authorship review, buyer-premium disclosure, and bid preparation.
            </p>
          </div>
          <Link href="/submit" className="button-secondary">
            Request Consignment
          </Link>
        </div>

        <div className="mb-10 grid gap-4 md:grid-cols-2">
          {sales.map((sale) => (
            <Link
              key={sale.id}
              href={`/sales/${sale.id}`}
              className="group rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#d4af37]/35 hover:bg-white/[0.05]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#f7d774]/75">{sale.status} sale</p>
                  <h3 className="mt-2 text-2xl text-white">{sale.title}</h3>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/58">{sale.lotIds.length} lots</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-white/58">{sale.subtitle}</p>
              <p className="mt-4 text-sm font-semibold text-[#f5d06f] transition group-hover:text-[#ffe39a]">Open catalog →</p>
            </Link>
          ))}
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {artworks.map((artwork) => (
            <article key={artwork.id} className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] transition duration-300 hover:-translate-y-1 hover:border-white/20">
              <div className="relative h-72 overflow-hidden" style={{ backgroundImage: artwork.background }}>
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/10 to-black/70" />
                <div className="absolute left-5 top-5 rounded-full border border-white/12 bg-black/25 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/72">
                  Lot {artwork.lotNumber}
                </div>
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/55">{getSaleForLot(artwork.id)?.title ?? artwork.edition}</p>
                    <h3 className="mt-2 text-3xl text-white">{artwork.title}</h3>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-black">{artwork.minimumNextBidSol} SOL</span>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <Link href={`/creator/${artwork.artistWallet}`} className="text-sm font-medium text-white/70 transition hover:text-white">
                    {artwork.artistName}
                  </Link>
                  <p className="mt-3 text-sm leading-7 text-white/58">{artwork.description}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                    <p className="uppercase tracking-[0.16em] text-white/38">Estimate</p>
                    <p className="mt-1 font-semibold text-white">{artwork.estimateLowSol}-{artwork.estimateHighSol}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                    <p className="uppercase tracking-[0.16em] text-white/38">Bids</p>
                    <p className="mt-1 font-semibold text-white">{artwork.bidCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                    <p className="uppercase tracking-[0.16em] text-white/38">Watchers</p>
                    <p className="mt-1 font-semibold text-white">{artwork.watchCount}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {artwork.evidenceLabels.map((label) => (
                    <span key={label} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/65">
                      {label}
                    </span>
                  ))}
                </div>

                <Link href={`/art/${artwork.id}`} className="inline-flex items-center text-sm font-semibold text-[#f5d06f] transition hover:text-[#ffe39a]">
                  View Lot Detail →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
