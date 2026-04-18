"use client";

import Link from "next/link";
import { getCreators, getArtworkById } from "@/lib/site-data";

export default function CreatorSpotlight() {
  const creators = getCreators();

  return (
    <section id="creators" className="border-y border-white/10 px-6 py-24">
      <div className="section-shell grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
        <div className="space-y-6">
          <div className="section-heading">
            <p className="eyebrow">Creator spotlight</p>
            <h2 className="text-3xl text-white text-balance sm:text-5xl">Meet the artists building evidence-backed releases.</h2>
            <p className="section-kicker">
              Profiles tie biography, practice, and published works together so discovery feels connected from the first visit through the final collector decision.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              {
                title: "Direct support",
                detail: "Collectors can move from discovery to creator context without leaving the UI story.",
              },
              {
                title: "Process visibility",
                detail: "Evidence and review state travel with the artwork rather than hiding behind a separate admin flow.",
              },
              {
                title: "Career continuity",
                detail: "Profiles now group artworks together so returning collectors can browse a creator’s body of work.",
              },
            ].map((item) => (
              <div key={item.title} className="border-l border-white/10 pl-5">
                <p className="text-lg font-semibold text-white">{item.title}</p>
                <p className="mt-3 text-sm leading-7 text-white/58">{item.detail}</p>
              </div>
            ))}
          </div>

          <Link href="/submit" className="button-primary">
            Become a Featured Creator
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {creators.map((creator) => {
            const leadArtwork = getArtworkById(creator.artworkIds[0]);
            return (
              <article key={creator.wallet} className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03]">
                <div className="h-48" style={{ backgroundImage: leadArtwork.background }} />
                <div className="space-y-5 p-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">{creator.location}</p>
                    <h3 className="mt-3 text-2xl text-white">{creator.name}</h3>
                    <p className="mt-2 text-sm text-[#f3d27a]">{creator.handle}</p>
                  </div>
                  <p className="text-sm leading-7 text-white/60">{creator.bio}</p>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Lead work</p>
                    <p className="mt-2 text-sm font-medium text-white">{leadArtwork.title}</p>
                    <p className="mt-1 text-sm text-white/55">{creator.discipline}</p>
                  </div>
                  <Link href={`/creator/${creator.wallet}`} className="inline-flex items-center text-sm font-semibold text-[#f5d06f] transition hover:text-[#ffe39a]">
                    Open Creator Profile →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
