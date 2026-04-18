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
    <main className="min-h-screen bg-black px-4 pb-14 pt-24 text-white sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="text-sm text-white/60">
          <Link href="/" className="hover:text-white">Home</Link> / <span>{creator.name}</span>
        </div>

        <section className="rounded-xl border border-white/10 bg-[#141414] p-6">
          <h1 className="text-3xl font-semibold">{creator.name}</h1>
          <p className="mt-1 text-sm text-white/60">{creator.handle} • {creator.location}</p>
          <p className="mt-4 text-sm text-white/75">{creator.bio}</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">Lots by this artist</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {artworks.map((artwork) => (
              <article key={artwork.id} className="rounded-xl border border-white/10 bg-[#151515] p-4">
                <h3 className="text-lg font-semibold">{artwork.title}</h3>
                <p className="text-sm text-white/65">{artwork.year} • {artwork.edition}</p>
                <p className="mt-2 text-sm text-white/70">{artwork.description}</p>
                <Link href={`/art/${artwork.id}`} className="mt-4 inline-flex text-sm font-medium underline">
                  View lot
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
