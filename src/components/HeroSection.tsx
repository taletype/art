"use client";

import Link from "next/link";
import { getFeaturedArtwork, platformStats } from "@/lib/site-data";

export default function HeroSection() {
  const featuredArtwork = getFeaturedArtwork();

  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-28 lg:pb-28 lg:pt-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.14),transparent_24%)]" />

      <div className="section-shell relative z-10">
        <div className="grid min-h-[calc(100svh-9rem)] items-end gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(340px,1.1fr)]">
          <div className="space-y-8 pb-4 lg:pb-10">
            <div className="space-y-5">
              <span className="status-pill">Curated Marketplace • Solana-Native Provenance</span>
              <p className="eyebrow">Digital originals with visible authorship, review, and collector confidence</p>
              <h1 className="max-w-4xl text-5xl leading-[0.94] text-white text-balance sm:text-6xl lg:text-7xl">
                HUMAN_ Arts makes trust part of the artwork, not a footnote after checkout.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-white/68 sm:text-xl">
                Discover verified editions, trace how each piece was made, and move from curation to purchase without leaving the story behind.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/#featured" className="button-primary px-7 py-3.5">
                Explore Featured Works
              </Link>
              <Link href="/submit" className="button-secondary px-7 py-3.5">
                Submit Your Evidence Packet
              </Link>
            </div>

            <dl className="grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-3">
              {platformStats.map((stat) => (
                <div key={stat.label} className="min-w-0">
                  <dt className="text-sm uppercase tracking-[0.18em] text-white/42">{stat.label}</dt>
                  <dd className="mt-2 text-2xl font-semibold text-white">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative isolate min-h-[540px] overflow-hidden rounded-[2.5rem] border border-white/10">
            <div className="absolute inset-0" style={{ backgroundImage: featuredArtwork.background }} />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(5,5,8,0.2),rgba(5,5,8,0.18)_35%,rgba(5,5,8,0.82)_100%)]" />
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/35 to-transparent" />
            <div className="relative flex h-full flex-col justify-between p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-full border border-white/15 bg-black/25 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/78">
                  Featured Drop
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white">
                  {featuredArtwork.availability}
                </div>
              </div>

              <div className="max-w-xl space-y-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-white/62">{featuredArtwork.category}</p>
                  <h2 className="mt-3 text-4xl text-white sm:text-5xl">{featuredArtwork.title}</h2>
                  <p className="mt-3 text-base text-white/72">
                    By {featuredArtwork.artistName} · {featuredArtwork.edition}
                  </p>
                </div>

                <p className="max-w-lg text-base leading-7 text-white/78">{featuredArtwork.description}</p>

                <div className="grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Price</p>
                    <p className="mt-2 text-lg font-semibold text-white">{featuredArtwork.priceSol} SOL</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Medium</p>
                    <p className="mt-2 text-sm text-white/80">{featuredArtwork.medium}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Evidence</p>
                    <p className="mt-2 text-sm text-white/80">{featuredArtwork.evidenceLabels.length} linked records</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link href={`/art/${featuredArtwork.id}`} className="button-primary">
                    View Artwork Detail
                  </Link>
                  <Link href={`/creator/${featuredArtwork.artistWallet}`} className="button-secondary border-white/15 bg-black/25 hover:bg-black/35">
                    Meet the Creator
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
