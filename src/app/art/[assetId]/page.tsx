import Link from "next/link";
import { BuyNowButton } from "@/components/BuyNowButton";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";
import { getArtworkById } from "@/lib/site-data";
import type { Provenance } from "@/types/provenance";

interface ArtPageProps {
  params: Promise<{ assetId: string }>;
}

function buildMockProvenance(artistWallet: string, medium: string, evidenceLabels: string[]): Provenance {
  const createdAt = new Date().toISOString();
  return {
    category: "visual",
    medium,
    creationMethod: "HUMAN_ORIGINAL",
    attestation: {
      text: "I certify this artwork is human-created and follows HUMAN_ policy.",
      signerWallet: `${artistWallet}-attestation-signer-111111111111111111`,
      timestamp: createdAt,
      signatureRef: `sig-${artistWallet}-proof`,
    },
    evidence: evidenceLabels.map((label, index) => ({
      kind: index % 2 === 0 ? "source_file" : "wip_image",
      hash: `${(index + 10).toString(16)}`.repeat(64).slice(0, 64),
      label,
    })),
    evidenceHashes: evidenceLabels.map((_, index) => `${(index + 10).toString(16)}`.repeat(64).slice(0, 64)),
    verificationStatus: "VERIFIED_HUMAN",
    reviewerDecision: {
      reviewerWallet: "reviewer-wallet-human-arts-11111111111111111111111",
      decidedAt: createdAt,
      notes: "Evidence packet aligns with creator workflow and listing policy.",
    },
  };
}

function evidenceSummary(label: string) {
  if (label.toLowerCase().includes("hash")) return "Cryptographic fingerprint logged with listing packet.";
  if (label.toLowerCase().includes("review")) return "Reviewer notes and decision trail linked in provenance bundle.";
  if (label.toLowerCase().includes("wip") || label.toLowerCase().includes("capture")) return "Intermediate process capture included for collector review.";
  return "Creator-supplied process artifact included in the verification packet.";
}

export default async function ArtPage({ params }: ArtPageProps) {
  const { assetId } = await params;
  const artwork = getArtworkById(assetId);
  const provenance = buildMockProvenance(artwork.artistWallet, artwork.medium, artwork.evidenceLabels);

  return (
    <main className="min-h-screen bg-black px-6 pb-20 pt-32">
      <div className="section-shell space-y-10">
        <div className="flex flex-wrap items-center gap-3 text-sm text-white/55">
          <Link href="/" className="transition hover:text-white">Home</Link>
          <span>•</span>
          <Link href="/#featured" className="transition hover:text-white">Marketplace</Link>
          <span>•</span>
          <span className="text-white/85">{artwork.title}</span>
        </div>

        <section className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="glass overflow-hidden rounded-[2rem] border border-white/10">
            <div className="relative h-[460px]" style={{ backgroundImage: artwork.background }}>
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/80" />
              <div className="absolute left-6 top-6 inline-flex items-center rounded-full border border-white/15 bg-black/35 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/70">
                {artwork.category}
              </div>
              <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/55">{artwork.year} • {artwork.edition}</p>
                  <h1 className="mt-2 text-4xl text-white sm:text-5xl">{artwork.title}</h1>
                </div>
                <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">{artwork.priceSol} SOL</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <article className="glass rounded-[1.8rem] border border-white/10 p-6">
              <p className="eyebrow">Artwork details</p>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-white/45">Artist</p>
                  <Link href={`/creator/${artwork.artistWallet}`} className="mt-1 block font-medium text-[#f3d27a] hover:text-[#ffe4a4]">{artwork.artistName}</Link>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-white/45">Availability</p>
                  <p className="mt-1 font-medium text-white">{artwork.availability}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-white/45">Medium</p>
                  <p className="mt-1 font-medium text-white">{artwork.medium}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-white/45">Edition</p>
                  <p className="mt-1 font-medium text-white">{artwork.edition}</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-7 text-white/65">{artwork.description}</p>
            </article>

            <article className="glass rounded-[1.8rem] border border-white/10 p-6">
              <p className="eyebrow">Collector story</p>
              <p className="mt-4 text-sm leading-7 text-white/65">{artwork.story}</p>
              <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-white/70">{artwork.collectorNote}</p>
            </article>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="glass rounded-[1.8rem] border border-white/10 p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="eyebrow">Provenance + trust</p>
              <ProvenanceBadge provenance={provenance} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {artwork.evidenceLabels.map((label) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="mt-2 text-xs leading-6 text-white/55">{evidenceSummary(label)}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs uppercase tracking-[0.16em] text-white/45">
              Verification status: {provenance.verificationStatus.replace("_", " ")}
            </p>
          </article>

          <article className="glass rounded-[1.8rem] border border-white/10 p-6">
            <p className="eyebrow">Collect on Solana</p>
            <p className="mt-3 text-sm leading-7 text-white/60">
              Purchase flow preserves prepare/sign/confirm behavior with wallet balance checks and recovery-friendly status polling.
            </p>
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
              <BuyNowButton
                buyerSolAddress="9xQeWvG816bUx9EPfEV5xQDbJpCkQfQ5R5V6s7Dv7M9k"
                sellerWallet={artwork.artistWallet}
                listingId={`listing-${artwork.id}`}
                assetId={artwork.id}
                treasuryMint="So11111111111111111111111111111111111111112"
                priceInSol={artwork.priceSol}
                rpcUrl={process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com"}
              />
            </div>
            <Link href={`/creator/${artwork.artistWallet}`} className="mt-5 inline-flex items-center text-sm font-semibold text-[#f5d06f] transition hover:text-[#ffe39a]">
              View creator profile →
            </Link>
          </article>
        </section>
      </div>
    </main>
  );
}
