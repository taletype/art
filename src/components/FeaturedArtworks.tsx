"use client";

import Link from "next/link";
import { getFeaturedArtworks } from "@/lib/site-data";

export default function FeaturedArtworks() {
  const artworks = getFeaturedArtworks();

  return (
    <section id="featured" className="px-6 py-24">
      <div className="section-shell">
        <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="section-heading">
            <p className="eyebrow">Featured artworks</p>
            <h2 className="text-3xl text-white sm:text-5xl">Curated drops that feel complete from landing page to detail view.</h2>
            <p className="text-base leading-7 text-white/62">
              Each card now leads to an artwork page with provenance, pricing, and creator context instead of a placeholder destination.
            </p>
          </div>
          <Link href="/submit" className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
            Bring your work to review
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {artworks.map((artwork) => (
            <article key={artwork.id} className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] transition hover:-translate-y-1 hover:border-white/20">
              <div className="relative h-72 overflow-hidden" style={{ backgroundImage: artwork.background }}>
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/10 to-black/70" />
                <div className="absolute left-5 top-5 rounded-full border border-white/12 bg-black/25 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/72">
                  {artwork.category}
                </div>
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/55">{artwork.edition}</p>
                    <h3 className="mt-2 text-3xl text-white">{artwork.title}</h3>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-black">{artwork.priceSol} SOL</span>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <Link href={`/creator/${artwork.artistWallet}`} className="text-sm font-medium text-white/70 transition hover:text-white">
                    {artwork.artistHandle}
                  </Link>
                  <p className="mt-3 text-sm leading-7 text-white/58">{artwork.description}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {artwork.evidenceLabels.map((label) => (
                    <span key={label} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/65">
                      {label}
                    </span>
                  ))}
                </div>

                <Link href={`/art/${artwork.id}`} className="inline-flex items-center text-sm font-semibold text-[#f5d06f] transition hover:text-[#ffe39a]">
                  View artwork detail →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
