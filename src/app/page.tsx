import FeaturedArtworks from "@/components/FeaturedArtworks";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black">
      <section className="section-shell pt-28">
        <div className="rounded-[2rem] border border-[#c9a227]/20 bg-gradient-to-br from-[#0d0d10] to-[#17171c] p-8 sm:p-10">
          <p className="eyebrow">Seller flow</p>
          <h1 className="max-w-4xl text-5xl leading-tight sm:text-6xl">Create the account, connect a Solana wallet, list the artwork, launch the auction.</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-white/68">
            This marketplace now supports a direct self-serve seller path powered by Supabase identity and Solana devnet wallet-linked auction metadata.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/seller" className="button-primary">Open seller hub</Link>
            <Link href="/auctions" className="button-secondary">Browse auctions</Link>
          </div>
        </div>
      </section>
      <FeaturedArtworks />
    </main>
  );
}
