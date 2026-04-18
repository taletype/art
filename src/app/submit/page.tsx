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
    <main>
      <h1>Submit HUMAN_ Art</h1>

      <label>
        Title
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        Description
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label>
        Preview URL
        <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
      </label>
      <label>
        Seller Wallet
        <input value={sellerWallet} onChange={(event) => setSellerWallet(event.target.value)} />
      </label>
      <label>
        Category
        <select
          value={provenance.category}
          onChange={(event) =>
            setProvenance((prev) => ({ ...prev, category: event.target.value as ArtCategory }))
          }
        >
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label>
        Medium
        <input
          value={provenance.medium}
          onChange={(event) => setProvenance((prev) => ({ ...prev, medium: event.target.value }))}
        />
      </label>
      <label>
        Price (lamports)
        <input
          type="number"
          value={priceLamports}
          onChange={(event) => setPriceLamports(Number(event.target.value))}
        />
      </label>

      <EvidenceUploader value={provenance.evidence} onChange={handleEvidenceChange} />
      <ReviewPanel
        provenance={sanitizedProvenance}
        reviewerWallet={process.env.NEXT_PUBLIC_ADMIN_REVIEWER_WALLET ?? "mock-admin-wallet"}
        enabled={process.env.NEXT_PUBLIC_ENABLE_MOCK_REVIEW === "true"}
        onUpdate={setProvenance}
      />

      <ProvenanceBadge provenance={sanitizedProvenance} />

      <div>
        <button type="button" onClick={submitMint}>
          Prepare Mint
        </button>
        <button type="button" onClick={prepareListing}>
          Prepare Listing
        </button>
      </div>

      <pre>{responseText}</pre>
    </main>
  );
}
