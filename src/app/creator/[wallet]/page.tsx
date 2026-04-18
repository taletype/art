import Link from "next/link";
import { notFound } from "next/navigation";
import { getCreatorArtworks, getCreatorByWallet } from "@/lib/site-data";

interface CreatorPageProps {
  params: Promise<{ wallet: string }>;
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { wallet } = await params;
  const creator = getCreatorByWallet(wallet);

  if (!creator) {
    notFound();
  }

  const artworks = getCreatorArtworks(wallet);

  return (
    <main className="min-h-screen bg-black px-6 pb-20 pt-32">
      <div className="section-shell space-y-10">
        <div className="flex flex-wrap items-center gap-3 text-sm text-white/55">
          <Link href="/" className="transition hover:text-white">Home</Link>
          <span>•</span>
          <Link href="/#creators" className="transition hover:text-white">Creators</Link>
          <span>•</span>
          <span className="text-white/85">{creator.name}</span>
        </div>

        <section className="glass overflow-hidden rounded-[2rem] border border-white/10">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <div className="min-h-[240px] border-b border-white/10 bg-gradient-to-br from-[#20191f] via-[#32253e] to-[#111727] p-8 lg:border-b-0 lg:border-r">
              <p className="eyebrow">Creator profile</p>
              <h1 className="mt-3 text-4xl text-white sm:text-5xl">{creator.name}</h1>
              <p className="mt-2 text-sm text-[#f3d27a]">{creator.handle}</p>
              <div className="mt-6 space-y-2 text-sm text-white/62">
                <p>{creator.location}</p>
                <p>{creator.discipline}</p>
              </div>
            </div>
            <div className="space-y-5 p-8">
              <p className="text-base leading-8 text-white/72">{creator.heroStatement}</p>
              <p className="text-sm leading-7 text-white/58">{creator.bio}</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/#featured" className="rounded-full border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
                  Back to marketplace
                </Link>
                <Link href="/submit" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#f3ead8]">
                  Submit new artwork
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <article className="glass rounded-[1.8rem] border border-white/10 p-6">
            <p className="eyebrow">Creator statement</p>
            <p className="mt-4 text-sm leading-7 text-white/65">
              {creator.name} builds with a documentation-first mindset: each release is paired with evidence and reviewer context so collectors can evaluate intent and authorship before collecting.
            </p>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/45">Trust + process</p>
              <p className="mt-2 text-sm leading-7 text-white/68">
                This profile links directly into verified listings and preserves process visibility across discovery, detail, and checkout surfaces.
              </p>
            </div>
          </article>

          <article className="glass rounded-[1.8rem] border border-white/10 p-6">
            <p className="eyebrow">Collector guidance</p>
            <ul className="mt-4 space-y-3 text-sm text-white/62">
              <li>• Review provenance notes on each artwork before collecting.</li>
              <li>• Compare edition/availability to understand scarcity.</li>
              <li>• Use the Solana buy flow from artwork pages for final checkout.</li>
            </ul>
          </article>
        </section>

        <section>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Published works</p>
              <h2 className="mt-2 text-3xl text-white">Artworks by {creator.name}</h2>
            </div>
            <Link href="/#featured" className="text-sm font-semibold text-[#f5d06f] transition hover:text-[#ffe39a]">View all featured works →</Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {artworks.map((artwork) => (
              <article key={artwork.id} className="glass overflow-hidden rounded-[1.7rem] border border-white/10">
                <div className="relative h-56" style={{ backgroundImage: artwork.background }}>
                  <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/20 to-black/80" />
                  <div className="absolute left-5 top-5 rounded-full border border-white/12 bg-black/35 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/70">
                    {artwork.category}
                  </div>
                  <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-white/55">{artwork.edition}</p>
                      <h3 className="mt-1 text-2xl text-white">{artwork.title}</h3>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-black">{artwork.priceSol} SOL</span>
                  </div>
                </div>
                <div className="space-y-4 p-5">
                  <p className="text-sm leading-7 text-white/60">{artwork.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {artwork.evidenceLabels.map((label) => (
                      <span key={label} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/65">
                        {label}
                      </span>
                    ))}
                  </div>
                  <Link href={`/art/${artwork.id}`} className="inline-flex items-center text-sm font-semibold text-[#f5d06f] transition hover:text-[#ffe39a]">
                    Open artwork detail →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
