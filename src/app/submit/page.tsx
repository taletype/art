"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useActiveAccount } from "thirdweb/react";
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
  const router = useRouter();
  const activeAccount = useActiveAccount();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sellerWallet, setSellerWallet] = useState("");
  const [medium, setMedium] = useState("digital painting");
  const [priceLamports, setPriceLamports] = useState(1_000_000_000);
  const [provenance, setProvenance] = useState<Provenance>(defaultProvenance);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const categoryOptions: ArtCategory[] = ["visual", "audio", "video", "writing", "mixed_media"];

  useEffect(() => {
    if (activeAccount?.address) {
      setSellerWallet(activeAccount.address);
      setProvenance((prev) => ({
        ...prev,
        attestation: {
          ...prev.attestation,
          signerWallet: activeAccount.address,
        },
      }));
    }
  }, [activeAccount?.address]);

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

  async function createArtworkDraft() {
    if (!title || !description || !imageUrl || !sellerWallet) {
      setMessage("Please fill in all required fields");
      return;
    }

    setPending(true);
    setMessage(null);
    try {
      const result = await fetch("/api/mint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          imageUrl,
          medium,
          category: sanitizedProvenance.category,
          provenanceText: JSON.stringify({ ...sanitizedProvenance, medium }),
          reservePriceLamports: priceLamports,
        }),
      });

      if (!result.ok) {
        const payload = await result.json();
        throw new Error(payload.message || "Failed to create artwork draft");
      }

      setMessage("Artwork draft created. Opening Seller Hub so you can prepare it with thirdweb.");
      setTimeout(() => router.push("/seller"), 900);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create artwork draft");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="pb-20 pt-28">
      <section className="section-shell">
        <div className="mb-10 space-y-4">
          <p className="eyebrow">Consign artwork</p>
          <h1 className="text-4xl text-white sm:text-5xl">List artwork for auction</h1>
          <p className="max-w-2xl text-lg leading-8 text-white/68">
            Create the artwork record first. Then move into Seller Hub to prepare it with thirdweb and launch the auction.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <div className="space-y-5">
              <div className="sm:col-span-2">
                <label htmlFor="title" className="field-label">Title *</label>
                <input
                  id="title"
                  className="field-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Artwork title"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="description" className="field-label">Description *</label>
                <textarea
                  id="description"
                  className="field-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your artwork"
                  required
                />
              </div>

              <div>
                <label htmlFor="image-url" className="field-label">Image URL *</label>
                <input
                  id="image-url"
                  className="field-input"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/art.png"
                  required
                />
              </div>

              <div>
                <label htmlFor="wallet" className="field-label">Seller Wallet *</label>
                <input
                  id="wallet"
                  className="field-input"
                  value={sellerWallet}
                  onChange={(e) => setSellerWallet(e.target.value)}
                  placeholder="Connect wallet from navigation"
                  spellCheck={false}
                  readOnly={Boolean(activeAccount?.address)}
                />
                {activeAccount?.address && (
                  <p className="mt-2 text-xs text-white/45">Using wallet connected via thirdweb</p>
                )}
              </div>

              <div>
                <label htmlFor="medium" className="field-label">Medium</label>
                <input
                  id="medium"
                  className="field-input"
                  value={medium}
                  onChange={(e) => setMedium(e.target.value)}
                  placeholder="digital painting"
                />
              </div>

              <div>
                <label htmlFor="category" className="field-label">Category</label>
                <select
                  id="category"
                  className="field-select"
                  value={provenance.category}
                  onChange={(e) => setProvenance((prev) => ({ ...prev, category: e.target.value as ArtCategory }))}
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>{category.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="reserve" className="field-label">Reserve (lamports) *</label>
                <input
                  id="reserve"
                  type="number"
                  className="field-input"
                  value={priceLamports}
                  onChange={(e) => setPriceLamports(Number(e.target.value))}
                  placeholder="1000000000"
                  required
                />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={createArtworkDraft} disabled={pending} className="button-primary disabled:cursor-wait disabled:opacity-70">
                {pending ? "Saving..." : "Create artwork draft"}
              </button>
            </div>

            {message && (
              <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${message.includes("success") ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-red-500/30 bg-red-500/10 text-red-400"}`}>
                {message}
              </div>
            )}
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
      </section>
    </main>
  );
}
