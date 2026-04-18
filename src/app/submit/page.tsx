"use client";

import { useMemo, useState } from "react";
import { EvidenceUploader } from "@/components/EvidenceUploader";
import { ReviewPanel } from "@/components/ReviewPanel";
import { validateProvenance } from "@/lib/provenance";
import type { ArtCategory, EvidenceItem, Provenance } from "@/types/provenance";

function defaultProvenance(): Provenance {
  return {
    category: "visual",
    medium: "digital painting",
    creationMethod: "HUMAN_ORIGINAL",
    attestation: {
      text: "I certify this artwork is human-created, not AI-generated or AI-assisted.",
      signerWallet: "ArtistWallet1111111111111111111111111111111",
      timestamp: new Date().toISOString(),
      signatureRef: "sig-ref-dev",
    },
    evidence: [
      { kind: "source_file", hash: "a".repeat(64), label: "Source file" },
      { kind: "wip_image", hash: "b".repeat(64), label: "WIP screenshot" },
    ],
    evidenceHashes: ["a".repeat(64), "b".repeat(64)],
    verificationStatus: "PENDING_REVIEW",
  };
}

export default function SubmitPage() {
  const [title, setTitle] = useState("Untitled work");
  const [description, setDescription] = useState("A human-made piece submitted for auction listing.");
  const [imageUrl, setImageUrl] = useState("https://example.com/art.png");
  const [sellerWallet, setSellerWallet] = useState("SellerWallet1111111111111111111111111111111");
  const [priceLamports, setPriceLamports] = useState(1_000_000_000);
  const [provenance, setProvenance] = useState<Provenance>(defaultProvenance);
  const [responseText, setResponseText] = useState("No action yet.");

  const categoryOptions: ArtCategory[] = ["visual", "audio", "video", "writing", "mixed_media"];

  const sanitizedProvenance = useMemo(() => {
    const evidenceHashes = provenance.evidence.map((item) => item.hash);
    return validateProvenance({ ...provenance, evidenceHashes });
  }, [provenance]);

  function handleEvidenceChange(items: EvidenceItem[]) {
    setProvenance((prev) => ({
      ...prev,
      evidence: items,
      evidenceHashes: items.map((item) => item.hash),
    }));
  }

  async function submitMint() {
    const result = await fetch("/api/mint", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        imageUrl,
        sellerWallet,
        attributes: [],
        provenance: sanitizedProvenance,
      }),
    });

    setResponseText(await result.text());
  }

  async function prepareListing() {
    const result = await fetch("/api/list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        listing: {
          sellerWallet,
          assetId: "draft-asset-local",
          treasuryMint: "So11111111111111111111111111111111111111112",
          priceLamports,
          provenanceStatus: sanitizedProvenance.verificationStatus,
        },
        provenance: sanitizedProvenance,
      }),
    });

    setResponseText(await result.text());
  }

  return (
    <main className="min-h-screen bg-black px-4 pb-14 pt-24 text-white sm:px-6">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-xl border border-white/10 bg-[#141414] p-5 sm:p-6">
          <h1 className="text-2xl font-semibold">List artwork for auction</h1>
          <p className="mt-2 text-sm text-white/70">Simple consignment form with proof of human authorship.</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-white/75">Title</span>
              <input className="w-full rounded-md border border-white/20 bg-[#101010] px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>

            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-white/75">Description</span>
              <textarea className="min-h-28 w-full rounded-md border border-white/20 bg-[#101010] px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-white/75">Image URL</span>
              <input className="w-full rounded-md border border-white/20 bg-[#101010] px-3 py-2" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-white/75">Wallet</span>
              <input className="w-full rounded-md border border-white/20 bg-[#101010] px-3 py-2" value={sellerWallet} onChange={(e) => setSellerWallet(e.target.value)} />
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-white/75">Category</span>
              <select
                className="w-full rounded-md border border-white/20 bg-[#101010] px-3 py-2"
                value={provenance.category}
                onChange={(e) => setProvenance((prev) => ({ ...prev, category: e.target.value as ArtCategory }))}
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>{category.replace(/_/g, " ")}</option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-white/75">Reserve (lamports)</span>
              <input
                type="number"
                className="w-full rounded-md border border-white/20 bg-[#101010] px-3 py-2"
                value={priceLamports}
                onChange={(e) => setPriceLamports(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={submitMint} className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black">Mint draft</button>
            <button onClick={prepareListing} className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium">Prepare listing</button>
          </div>

          <pre className="mt-4 overflow-x-auto rounded-md border border-white/10 bg-[#101010] p-3 text-xs text-white/80">{responseText}</pre>
        </section>

        <section className="space-y-6">
          <EvidenceUploader value={provenance.evidence} onChange={handleEvidenceChange} />
          <ReviewPanel
            provenance={sanitizedProvenance}
            reviewerWallet={process.env.NEXT_PUBLIC_ADMIN_REVIEWER_WALLET ?? "mock-admin-wallet"}
            enabled={process.env.NEXT_PUBLIC_ENABLE_MOCK_REVIEW === "true"}
            onUpdate={setProvenance}
          />
        </section>
      </div>
    </main>
  );
}
