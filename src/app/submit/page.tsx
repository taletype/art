"use client";

import { useMemo, useState } from "react";
import { EvidenceUploader } from "../../components/EvidenceUploader";
import { ProvenanceBadge } from "../../components/ProvenanceBadge";
import { ReviewPanel } from "../../components/ReviewPanel";
import { validateProvenance } from "../../lib/provenance";
import type { Provenance, ArtCategory, EvidenceItem } from "../../types/provenance";

function defaultProvenance(): Provenance {
  return {
    category: "visual",
    medium: "digital painting",
    creationMethod: "HUMAN_ORIGINAL",
    attestation: {
      text: "I certify this artwork is human-created and follows HUMAN_ policy.",
      signerWallet: "ArtistWallet1111111111111111111111111111111",
      timestamp: new Date().toISOString(),
      signatureRef: "sig-ref-dev",
    },
    evidence: [
      { kind: "source_file", hash: "a".repeat(64), label: "Source file draft" },
      { kind: "wip_image", hash: "b".repeat(64), label: "WIP screenshot" },
    ],
    evidenceHashes: ["a".repeat(64), "b".repeat(64)],
    verificationStatus: "PENDING_REVIEW",
  };
}

export default function SubmitPage() {
  const [title, setTitle] = useState("Untitled HUMAN_ work");
  const [description, setDescription] = useState("A human-created piece submitted for review.");
  const [imageUrl, setImageUrl] = useState("https://example.com/art.png");
  const [sellerWallet, setSellerWallet] = useState(
    "SellerWallet1111111111111111111111111111111",
  );
  const [priceLamports, setPriceLamports] = useState(1_000_000_000);
  const [provenance, setProvenance] = useState<Provenance>(defaultProvenance);
  const [responseText, setResponseText] = useState("idle");

  const categoryOptions: ArtCategory[] = ["visual", "audio", "video", "writing", "mixed_media"];

  const sanitizedProvenance = useMemo(() => {
    const evidenceHashes = provenance.evidence.map((item) => item.hash);
    return validateProvenance({ ...provenance, evidenceHashes });
  }, [provenance]);

  const responseSummary =
    responseText === "idle" ? "No action sent yet." : responseText;

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
    <main className="min-h-screen bg-black px-6 pb-20 pt-32">
      <div className="section-shell space-y-10">
        <section className="grid gap-8 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.65fr)]">
          <div className="space-y-6">
            <p className="eyebrow">Creator Submission</p>
            <h1 className="max-w-4xl text-4xl text-white text-balance sm:text-6xl">
              Prepare a review-ready artwork packet with provenance built into the workflow.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-white/65">
              Fill out the release details, attach process evidence, and test the moderation states before minting or listing.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="status-pill">Submission Draft</span>
              <ProvenanceBadge provenance={sanitizedProvenance} />
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
            <p className="eyebrow">Checklist</p>
            <div className="mt-5 space-y-5">
              <div className="border-l border-white/10 pl-4">
                <p className="text-sm font-semibold text-white">1. Describe the release</p>
                <p className="mt-2 text-sm leading-7 text-white/58">Title, preview URL, creator wallet, and pricing should be complete before review.</p>
              </div>
              <div className="border-l border-white/10 pl-4">
                <p className="text-sm font-semibold text-white">2. Attach evidence</p>
                <p className="mt-2 text-sm leading-7 text-white/58">Include source artifacts or captures that help a reviewer verify human authorship.</p>
              </div>
              <div className="border-l border-white/10 pl-4">
                <p className="text-sm font-semibold text-white">3. Test the pipeline</p>
                <p className="mt-2 text-sm leading-7 text-white/58">Use the mock review panel, then prepare minting or listing once the packet feels complete.</p>
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <div className="space-y-8">
            <article className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
              <div className="section-heading">
                <p className="eyebrow">Artwork Details</p>
                <h2 className="text-3xl text-white sm:text-4xl">Define what reviewers and collectors will see first.</h2>
                <p className="section-kicker">
                  Keep this concise and specific. The metadata here feeds the downstream minting and listing steps.
                </p>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label htmlFor="art-title" className="field-label">Artwork Title</label>
                  <input
                    id="art-title"
                    name="title"
                    className="field-input"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Name the artwork…"
                    autoComplete="off"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="art-description" className="field-label">Description</label>
                  <textarea
                    id="art-description"
                    name="description"
                    className="field-textarea"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Describe the piece, medium, and what makes the release distinctive…"
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label htmlFor="preview-url" className="field-label">Preview URL</label>
                  <input
                    id="preview-url"
                    name="imageUrl"
                    type="url"
                    inputMode="url"
                    className="field-input"
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    placeholder="https://example.com/artwork-preview.png…"
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label htmlFor="seller-wallet" className="field-label">Seller Wallet</label>
                  <input
                    id="seller-wallet"
                    name="sellerWallet"
                    className="field-input"
                    value={sellerWallet}
                    onChange={(event) => setSellerWallet(event.target.value)}
                    placeholder="Wallet address…"
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label htmlFor="art-category" className="field-label">Category</label>
                  <select
                    id="art-category"
                    name="category"
                    className="field-select"
                    value={provenance.category}
                    onChange={(event) =>
                      setProvenance((prev) => ({ ...prev, category: event.target.value as ArtCategory }))
                    }
                  >
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="art-medium" className="field-label">Medium</label>
                  <input
                    id="art-medium"
                    name="medium"
                    className="field-input"
                    value={provenance.medium}
                    onChange={(event) => setProvenance((prev) => ({ ...prev, medium: event.target.value }))}
                    placeholder="Procreate, Blender, code-based system…"
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label htmlFor="price-lamports" className="field-label">Price (Lamports)</label>
                  <input
                    id="price-lamports"
                    name="priceLamports"
                    type="number"
                    inputMode="numeric"
                    className="field-input"
                    value={priceLamports}
                    onChange={(event) => setPriceLamports(Number(event.target.value))}
                    placeholder="1000000000…"
                    autoComplete="off"
                  />
                </div>
              </div>
            </article>

            <EvidenceUploader value={provenance.evidence} onChange={handleEvidenceChange} />

            <ReviewPanel
              provenance={sanitizedProvenance}
              reviewerWallet={process.env.NEXT_PUBLIC_ADMIN_REVIEWER_WALLET ?? "mock-admin-wallet"}
              enabled={process.env.NEXT_PUBLIC_ENABLE_MOCK_REVIEW === "true"}
              onUpdate={setProvenance}
            />
          </div>

          <div className="space-y-6">
            <article className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
              <p className="eyebrow">Release Preview</p>
              <div className="mt-4 space-y-4">
                <h2 className="text-3xl text-white">{title}</h2>
                <p className="text-sm leading-7 text-white/62">{description}</p>
                <div className="grid gap-4 border-t border-white/10 pt-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/45">Category</p>
                    <p className="mt-2 text-sm text-white">{sanitizedProvenance.category.replace(/_/g, " ")}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/45">Medium</p>
                    <p className="mt-2 text-sm text-white">{sanitizedProvenance.medium}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/45">Evidence Count</p>
                    <p className="mt-2 text-sm text-white">{sanitizedProvenance.evidence.length}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/45">Price</p>
                    <p className="mt-2 text-sm text-white">{priceLamports.toLocaleString()} lamports</p>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
              <p className="eyebrow">Pipeline Actions</p>
              <p className="mt-3 text-sm leading-7 text-white/60">
                Prepare the mint payload first, then generate the listing payload once the packet is review-ready.
              </p>
              <div className="mt-5 grid gap-3">
                <button type="button" onClick={submitMint} className="button-primary w-full">
                  Prepare Mint
                </button>
                <button type="button" onClick={prepareListing} className="button-secondary w-full">
                  Prepare Listing
                </button>
              </div>
            </article>

            <article className="rounded-[2rem] border border-white/10 bg-black/30 p-6">
              <div className="flex items-center justify-between gap-4">
                <p className="eyebrow">Response</p>
                <span className="text-xs uppercase tracking-[0.16em] text-white/45">API Output</span>
              </div>
              <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-black/40 p-4 text-sm leading-7 text-white/68">
                {responseSummary}
              </pre>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
