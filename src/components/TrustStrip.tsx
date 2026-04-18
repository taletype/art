"use client";

import { trustSignals } from "@/lib/site-data";

export default function TrustStrip() {
  return (
    <section className="border-y border-white/10 px-6 py-20">
      <div className="section-shell grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
        <div className="section-heading">
          <p className="eyebrow">Why collectors trust the sale</p>
          <h2 className="text-3xl text-white text-balance sm:text-4xl">Auction confidence begins with human authorship.</h2>
          <p className="section-kicker">
            HUMAN_ reviews every lot before placement, rejects AI-generated or AI-assisted artwork, and keeps artist evidence, catalog notes, estimates, reserves, buyer premium, and bid preparation in one collector path.
          </p>
        </div>

        <div className="grid gap-8 border-t border-white/10 pt-6 md:grid-cols-3 md:border-t-0 md:pt-0">
          {trustSignals.map((item) => (
            <div key={item.label} className="border-l border-white/10 pl-5 text-left">
              <p className="text-lg font-semibold text-white">{item.label}</p>
              <p className="mt-3 text-sm leading-7 text-white/58">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
