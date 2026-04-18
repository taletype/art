"use client";

import Link from "next/link";
import { getCreators, getFeaturedArtworks } from "@/lib/site-data";

export default function Footer() {
  const creators = getCreators().slice(0, 3);
  const artworks = getFeaturedArtworks().slice(0, 3);

  return (
    <footer className="border-t border-white/10 bg-black/60">
      <div className="section-shell py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))]">
          <div className="space-y-5">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold tracking-[0.24em] text-[#f8deb0]">
                H_
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white">HUMAN_ Arts</p>
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Verified digital originals</p>
              </div>
            </Link>
            <p className="max-w-sm text-sm leading-7 text-white/55">
              A premium collector marketplace where human-made digital artworks carry evidence-backed provenance and a Solana-native purchase path.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/submit" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#f3ead8]">
                Submit artwork
              </Link>
              <Link href="/#featured" className="rounded-full border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
                Explore market
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">Marketplace</h4>
            <ul className="space-y-2 text-sm text-white/58">
              <li><Link href="/#featured" className="transition hover:text-white">Featured artworks</Link></li>
              <li><Link href="/#creators" className="transition hover:text-white">Creator spotlight</Link></li>
              <li><Link href="/#how-it-works" className="transition hover:text-white">How it works</Link></li>
              {artworks.map((artwork) => (
                <li key={artwork.id}>
                  <Link href={`/art/${artwork.id}`} className="transition hover:text-white">{artwork.title}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">Creators</h4>
            <ul className="space-y-2 text-sm text-white/58">
              {creators.map((creator) => (
                <li key={creator.wallet}>
                  <Link href={`/creator/${creator.wallet}`} className="transition hover:text-white">
                    {creator.name} <span className="text-white/40">{creator.handle}</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/submit" className="transition hover:text-white">Apply for verification</Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">Platform</h4>
            <ul className="space-y-2 text-sm text-white/58">
              <li><Link href="/submit" className="transition hover:text-white">Mint & list pipeline</Link></li>
              <li><Link href="/submit" className="transition hover:text-white">Evidence requirements</Link></li>
              <li><Link href="/submit" className="transition hover:text-white">Verification queue</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-white/45 md:flex-row md:items-center md:justify-between">
          <p>© 2026 HUMAN_ Arts / RealArtWorks. Human-made. Evidence-backed.</p>
          <div className="flex gap-5">
            <Link href="/submit" className="transition hover:text-white">Privacy</Link>
            <Link href="/submit" className="transition hover:text-white">Terms</Link>
            <Link href="/submit" className="transition hover:text-white">Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
