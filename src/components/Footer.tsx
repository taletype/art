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
            <Link href="/" className="inline-flex items-center gap-3 rounded-full focus-visible:ring-4 focus-visible:ring-white/10">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold tracking-[0.24em] text-[#f8deb0]">
                H_
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white">HUMAN_ Arts</p>
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Solana auction house</p>
              </div>
            </Link>
            <p className="max-w-sm text-sm leading-7 text-white/55">
              A premium digital auction house where curated artworks carry evidence-backed provenance and a Solana-native bid path.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/submit" className="button-primary px-5 py-2.5">
                Request Consignment
              </Link>
              <Link href="/#featured" className="button-secondary px-5 py-2.5">
                Explore Auctions
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">Auctions</h4>
            <ul className="space-y-2 text-sm text-white/58">
              <li><Link href="/#featured" className="transition hover:text-white">Featured Lots</Link></li>
              <li><Link href="/sales/contemporary-digital-asia" className="transition hover:text-white">Contemporary Digital Asia</Link></li>
              <li><Link href="/#creators" className="transition hover:text-white">Artist Spotlight</Link></li>
              <li><Link href="/#how-it-works" className="transition hover:text-white">How It Works</Link></li>
              {artworks.map((artwork) => (
                <li key={artwork.id}>
                  <Link href={`/art/${artwork.id}`} className="transition hover:text-white">{artwork.title}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">Artists</h4>
            <ul className="space-y-2 text-sm text-white/58">
              {creators.map((creator) => (
                <li key={creator.wallet}>
                  <Link href={`/creator/${creator.wallet}`} className="transition hover:text-white">
                    {creator.name} <span className="text-white/40">{creator.handle}</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/submit" className="transition hover:text-white">Apply for Consignment</Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">Platform</h4>
            <ul className="space-y-2 text-sm text-white/58">
              <li><Link href="/submit" className="transition hover:text-white">Consignment Pipeline</Link></li>
              <li><Link href="/submit" className="transition hover:text-white">Evidence Requirements</Link></li>
              <li><Link href="/submit" className="transition hover:text-white">Curatorial Queue</Link></li>
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
