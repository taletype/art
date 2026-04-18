"use client";

import Link from "next/link";
import { getFeaturedArtwork, platformStats } from "@/lib/site-data";

export default function HeroSection() {
  const featuredArtwork = getFeaturedArtwork();

  return (
    <section className="relative overflow-hidden px-6 pb-16 pt-32 lg:pb-24 lg:pt-40">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.16),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.18),transparent_24%)]" />

      <div className="section-shell relative z-10 grid items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div className="space-y-8">
          <div className="space-y-5">
            <span className="status-pill">Curated marketplace • Solana-native provenance</span>
            <div className="space-y-4">
              <p className="eyebrow">Human-made digital art, without dead-end trust cues</p>
              <h1 className="max-w-4xl text-5xl leading-[0.96] text-white sm:text-6xl lg:text-7xl">
                Discover collector-ready digital originals with proof built into the experience.
              </h1>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-white/68 sm:text-xl">
              HUMAN_ Arts connects submission, review, listing, and checkout in one surface so creators can publish with evidence and collectors can buy with confidence.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link href="/#featured" className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black transition hover:bg-[#f3ead8]">
              Explore featured works
            </Link>
            <Link href="/submit" className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">
              Submit your art packet
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {platformStats.map((stat) => (
              <div key={stat.label} className="glass rounded-3xl p-5">
                <p className="text-2xl font-semibold text-white">{stat.value}</p>
                <p className="mt-2 text-sm uppercase tracking-[0.18em] text-white/45">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mesh-panel glass overflow-hidden rounded-[2rem] border border-white/10">
          <div className="relative min-h-[520px] p-6 sm:p-8" style={{ backgroundImage: featuredArtwork.background }}>
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/70" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-full border border-white/15 bg-black/30 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/75">
                  Featured drop
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white">
                  {featuredArtwork.availability}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-white/65">{featuredArtwork.category}</p>
                  <h2 className="mt-3 text-4xl text-white sm:text-5xl">{featuredArtwork.title}</h2>
                  <p className="mt-3 text-base text-white/72">
                    By {featuredArtwork.artistName} · {featuredArtwork.edition}
                  </p>
                </div>

                <p className="max-w-xl text-base leading-7 text-white/78">{featuredArtwork.description}</p>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Price</p>
                    <p className="mt-2 text-lg font-semibold text-white">{featuredArtwork.priceSol} SOL</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Medium</p>
                    <p className="mt-2 text-sm text-white/80">{featuredArtwork.medium}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Evidence</p>
                    <p className="mt-2 text-sm text-white/80">{featuredArtwork.evidenceLabels.length} linked records</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link href={`/art/${featuredArtwork.id}`} className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#f3ead8]">
                    View artwork detail
                  </Link>
                  <Link href={`/creator/${featuredArtwork.artistWallet}`} className="inline-flex items-center justify-center rounded-full border border-white/15 bg-black/25 px-6 py-3 text-sm font-semibold text-white transition hover:bg-black/35">
                    Meet the creator
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
