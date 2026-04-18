"use client";

import { trustSignals } from "@/lib/site-data";

export default function TrustStrip() {
  return (
    <section className="border-y border-white/10 px-6 py-16">
      <div className="section-shell grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
        <div className="section-heading">
          <p className="eyebrow">Why collectors trust the surface</p>
          <h2 className="text-3xl text-white sm:text-4xl">The UI now tells the same story as the underlying workflow.</h2>
          <p className="text-base leading-7 text-white/62">
            Trust cues are only useful when they connect to real submission, review, and purchase behavior. HUMAN_ makes those steps visible instead of decorative.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {trustSignals.map((item) => (
            <div key={item.label} className="glass rounded-3xl p-6 text-left">
              <p className="text-lg font-semibold text-white">{item.label}</p>
              <p className="mt-3 text-sm leading-7 text-white/58">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
