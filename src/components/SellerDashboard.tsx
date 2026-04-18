"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import { EvidenceUploader } from "@/components/EvidenceUploader";
import { ReviewPanel } from "@/components/ReviewPanel";
import { isValidSolanaAddress } from "@/lib/solanaAddress";
import { executePreparedSolanaTransaction } from "@/lib/solanaWalletExecution";
import { validateProvenance } from "@/lib/provenance";
import type { ArtCategory, EvidenceItem, Provenance } from "@/types/provenance";

type SellerArtwork = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  seller_flow_status: string | null;
  sync_status: string | null;
  linked_auction_id: string | null;
  thirdweb_listing_id?: string | null;
};

type SellerDashboardProps = {
  email: string | null;
  walletAddress: string | null;
  artworks: SellerArtwork[];
};

type TxInspection = {
  operation: "mint_prepare" | "listing_prepare";
  cluster: "devnet";
  summary: string;
  explorerUrls: string[];
  accounts: Array<{ label: string; address: string }>;
};

type PreparedMintPayload = {
  ok: boolean;
  unsignedTxBase64: string | null;
  recentBlockhash: string | null;
  lastValidBlockHeight: number | null;
  blockingErrors: string[];
  txInspection: TxInspection | null;
  mintAddress: string | null;
  metadataAddress: string | null;
  tokenAccountAddress: string | null;
};

type PreparedListingPayload = {
  ok: boolean;
  unsignedTxBase64: string | null;
  recentBlockhash: string | null;
  lastValidBlockHeight: number | null;
  blockingErrors: string[];
  txInspection: TxInspection | null;
  listingAddress: string | null;
  mintAddress: string | null;
};

type ArtworkActionState = {
  pending: boolean;
  stage:
    | "idle"
    | "mint_ready_to_sign"
    | "mint_submitted"
    | "prepared"
    | "listing_ready_to_sign"
    | "listing_submitted"
    | "in_auction";
  message: string | null;
  txInspection: TxInspection | null;
  txSignature: string | null;
};

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

function solToLamports(value: string) {
  return Math.round(Number(value || "0") * 1_000_000_000);
}

function defaultArtworkActionState(): ArtworkActionState {
  return {
    pending: false,
    stage: "idle",
    message: null,
    txInspection: null,
    txSignature: null,
  };
}

function getRpcUrl() {
  return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
}

export default function SellerDashboard({ email, walletAddress, artworks }: SellerDashboardProps) {
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [medium, setMedium] = useState("digital painting");
  const [priceLamports, setPriceLamports] = useState(1_000_000_000);
  const [provenance, setProvenance] = useState<Provenance>(defaultProvenance);
  const [draftState, setDraftState] = useState<{ pending: boolean; message: string | null }>({
    pending: false,
    message: null,
  });
  const [launchState, setLaunchState] = useState<Record<string, ArtworkActionState>>({});
  const connectedWalletAddress =
    activeAccount?.address && isValidSolanaAddress(activeAccount.address) ? activeAccount.address : null;
  const actionWalletAddress = connectedWalletAddress ?? walletAddress;
  const profileWalletMatchesConnected =
    !connectedWalletAddress || !walletAddress || connectedWalletAddress === walletAddress;
  const categoryOptions: ArtCategory[] = ["visual", "audio", "video", "writing", "mixed_media"];

  const preparedCount = useMemo(
    () => artworks.filter((artwork) => artwork.seller_flow_status === "prepared").length,
    [artworks],
  );

  const sanitizedProvenance = useMemo(() => {
    const evidenceHashes = provenance.evidence.map((item) => item.hash);
    return validateProvenance({ ...provenance, evidenceHashes });
  }, [provenance]);

  useEffect(() => {
    if (!actionWalletAddress) {
      return;
    }

    setProvenance((prev) => ({
      ...prev,
      attestation: {
        ...prev.attestation,
        signerWallet: actionWalletAddress,
      },
    }));
  }, [actionWalletAddress]);

  function updateArtworkState(artworkId: string, next: Partial<ArtworkActionState>) {
    setLaunchState((current) => ({
      ...current,
      [artworkId]: {
        ...(current[artworkId] ?? defaultArtworkActionState()),
        ...next,
      },
    }));
  }

  function ensureConnectedSellerWallet(artworkId: string) {
    if (!walletAddress) {
      updateArtworkState(artworkId, {
        pending: false,
        message: "Add a Solana devnet wallet to your seller profile before signing.",
      });
      return false;
    }

    if (!connectedWalletAddress) {
      updateArtworkState(artworkId, {
        pending: false,
        message: "Connect your Solana thirdweb wallet before signing Seller Hub transactions.",
      });
      return false;
    }

    if (!profileWalletMatchesConnected) {
      updateArtworkState(artworkId, {
        pending: false,
        message: "Connect the same Solana wallet that is saved on your seller profile before signing.",
      });
      return false;
    }

    return true;
  }

  function handleEvidenceChange(items: EvidenceItem[]) {
    setProvenance((prev) => ({
      ...prev,
      evidence: items,
      evidenceHashes: items.map((item) => item.hash),
    }));
  }

  async function createArtworkDraft() {
    if (!title || !description || !imageUrl || !actionWalletAddress) {
      setDraftState({
        pending: false,
        message: "Add a title, description, image URL, and linked seller wallet first.",
      });
      return;
    }

    setDraftState({ pending: true, message: null });

    try {
      const response = await fetch("/api/mint", {
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
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Unable to create artwork draft.");
      }

      setTitle("");
      setDescription("");
      setImageUrl("");
      setMedium("digital painting");
      setPriceLamports(1_000_000_000);
      setProvenance(defaultProvenance());
      setDraftState({ pending: false, message: "Artwork draft created in Seller Hub." });
      window.location.reload();
    } catch (error) {
      setDraftState({
        pending: false,
        message: error instanceof Error ? error.message : "Unable to create artwork draft.",
      });
    }
  }

  async function prepareArtwork(artworkId: string) {
    if (!ensureConnectedSellerWallet(artworkId) || !connectedWalletAddress || !walletAddress) {
      return;
    }

    updateArtworkState(artworkId, {
      pending: true,
      stage: "idle",
      message: "Requesting a Solana devnet mint transaction...",
      txInspection: null,
      txSignature: null,
    });

    try {
      const response = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artworkId,
          sellerWallet: connectedWalletAddress,
        }),
      });
      const payload = (await response.json()) as PreparedMintPayload & { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to prepare artwork.");
      }
      if (!payload.ok || payload.blockingErrors.length || !payload.unsignedTxBase64 || !payload.recentBlockhash || payload.lastValidBlockHeight === null) {
        throw new Error(payload.blockingErrors[0] || "Unable to prepare Solana mint transaction.");
      }
      if (!payload.mintAddress || !payload.metadataAddress || !payload.tokenAccountAddress) {
        throw new Error("Mint preparation returned incomplete Solana account metadata.");
      }

      updateArtworkState(artworkId, {
        pending: true,
        stage: "mint_ready_to_sign",
        message: "Transaction prepared. Waiting for your wallet signature...",
        txInspection: payload.txInspection,
      });

      const execution = await executePreparedSolanaTransaction({
        walletId: activeWallet?.id,
        expectedAddress: walletAddress,
        unsignedTxBase64: payload.unsignedTxBase64,
        rpcUrl: getRpcUrl(),
        recentBlockhash: payload.recentBlockhash,
        lastValidBlockHeight: payload.lastValidBlockHeight,
      });

      updateArtworkState(artworkId, {
        pending: true,
        stage: "mint_submitted",
        message: `Mint submitted on devnet. Signature: ${execution.signature}`,
        txSignature: execution.signature,
      });

      const finalizeResponse = await fetch("/api/mint/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artworkId,
          sellerWallet: connectedWalletAddress,
          txSignature: execution.signature,
          mintAddress: payload.mintAddress,
          metadataAddress: payload.metadataAddress,
          tokenAccountAddress: payload.tokenAccountAddress,
          recentBlockhash: payload.recentBlockhash,
          lastValidBlockHeight: payload.lastValidBlockHeight,
        }),
      });
      const finalizePayload = await finalizeResponse.json();
      if (!finalizeResponse.ok) {
        throw new Error(finalizePayload.message || "Unable to finalize Solana mint.");
      }

      updateArtworkState(artworkId, {
        pending: false,
        stage: "prepared",
        message: "Artwork minted on Solana devnet and finalized in Seller Hub.",
      });
      window.location.reload();
    } catch (error) {
      updateArtworkState(artworkId, {
        pending: false,
        message: error instanceof Error ? error.message : "Unable to prepare artwork.",
      });
    }
  }

  async function launchAuction(artworkId: string) {
    if (!ensureConnectedSellerWallet(artworkId) || !connectedWalletAddress || !walletAddress) {
      return;
    }

    const startsAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const startPriceLamports = solToLamports("1");
    const minIncrementLamports = solToLamports("0.1");

    updateArtworkState(artworkId, {
      pending: true,
      stage: "idle",
      message: "Requesting a Solana Auction House listing transaction...",
      txInspection: null,
      txSignature: null,
    });

    try {
      const response = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artworkId,
          sellerWallet: connectedWalletAddress,
          startsAt,
          endsAt,
          startPriceLamports,
          minIncrementLamports,
        }),
      });
      const payload = (await response.json()) as PreparedListingPayload & { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to launch auction.");
      }
      if (!payload.ok || payload.blockingErrors.length || !payload.unsignedTxBase64 || !payload.recentBlockhash || payload.lastValidBlockHeight === null) {
        throw new Error(payload.blockingErrors[0] || "Unable to prepare Solana listing transaction.");
      }
      if (!payload.listingAddress || !payload.mintAddress) {
        throw new Error("Auction preparation returned incomplete Solana listing metadata.");
      }

      updateArtworkState(artworkId, {
        pending: true,
        stage: "listing_ready_to_sign",
        message: "Listing transaction prepared. Waiting for your wallet signature...",
        txInspection: payload.txInspection,
      });

      const execution = await executePreparedSolanaTransaction({
        walletId: activeWallet?.id,
        expectedAddress: walletAddress,
        unsignedTxBase64: payload.unsignedTxBase64,
        rpcUrl: getRpcUrl(),
        recentBlockhash: payload.recentBlockhash,
        lastValidBlockHeight: payload.lastValidBlockHeight,
      });

      updateArtworkState(artworkId, {
        pending: true,
        stage: "listing_submitted",
        message: `Listing submitted on devnet. Signature: ${execution.signature}`,
        txSignature: execution.signature,
      });

      const finalizeResponse = await fetch("/api/auctions/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artworkId,
          sellerWallet: connectedWalletAddress,
          startsAt,
          endsAt,
          startPriceLamports,
          minIncrementLamports,
          txSignature: execution.signature,
          listingAddress: payload.listingAddress,
          mintAddress: payload.mintAddress,
          recentBlockhash: payload.recentBlockhash,
          lastValidBlockHeight: payload.lastValidBlockHeight,
        }),
      });
      const finalizePayload = await finalizeResponse.json();
      if (!finalizeResponse.ok) {
        throw new Error(finalizePayload.message || "Unable to finalize auction.");
      }

      updateArtworkState(artworkId, {
        pending: false,
        stage: "in_auction",
        message: "Auction House listing confirmed and the local auction is now live.",
      });
      window.location.reload();
    } catch (error) {
      updateArtworkState(artworkId, {
        pending: false,
        message: error instanceof Error ? error.message : "Unable to launch auction.",
      });
    }
  }

  return (
    <main className="pb-20 pt-28">
      <section className="section-shell space-y-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <p className="eyebrow">Seller hub</p>
            <h1 className="text-5xl leading-tight sm:text-6xl">Start the listing here, then launch from the same hub.</h1>
            <p className="max-w-3xl text-lg leading-8 text-white/68">
              Seller Hub now handles the full flow: create the draft, verify the work, mint the asset on Solana devnet, and only then launch the auction.
            </p>
          </div>

          <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">Seller status</p>
            <dl className="mt-4 space-y-3 text-sm text-white/75">
              <div className="flex justify-between gap-4">
                <dt>Account</dt>
                <dd>{email ?? "Not signed in"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Linked wallet</dt>
                <dd className="text-right">{actionWalletAddress ?? "Add Solana devnet wallet"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Prepared artworks</dt>
                <dd>{preparedCount}</dd>
              </div>
            </dl>
            {connectedWalletAddress ? (
              <p className="mt-4 text-xs text-white/55">
                Seller Hub actions are using the currently connected thirdweb wallet.
              </p>
            ) : null}
            {!profileWalletMatchesConnected ? (
              <p className="mt-4 text-xs text-[#f3b664]">
                The connected thirdweb wallet does not match the wallet saved on your seller profile. Prepare and launch actions are blocked until they match.
              </p>
            ) : null}
            <p className="mt-4 text-xs text-white/45">
              Draft creation uses the wallet saved on your seller profile. Connect the same wallet in thirdweb before preparing or launching.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <div className="mb-8 space-y-3">
              <p className="eyebrow">New listing</p>
              <h2 className="text-3xl sm:text-4xl">List a new artwork</h2>
              <p className="max-w-2xl text-sm leading-7 text-white/65">
                Keep the listing flow in Seller Hub so your inventory, provenance, and auction actions stay together.
              </p>
            </div>

            <div className="space-y-5">
              <div>
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

              <div>
                <label htmlFor="description" className="field-label">Description *</label>
                <textarea
                  id="description"
                  className="field-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the piece, materials, story, or context"
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
                  placeholder="https://example.com/artwork.jpg"
                  required
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
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
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="reserve" className="field-label">Reserve (lamports)</label>
                  <input
                    id="reserve"
                    type="number"
                    className="field-input"
                    value={priceLamports}
                    onChange={(e) => setPriceLamports(Number(e.target.value))}
                    placeholder="1000000000"
                  />
                </div>

                <div>
                  <label htmlFor="wallet" className="field-label">Active seller wallet</label>
                  <input
                    id="wallet"
                    className="field-input"
                    value={actionWalletAddress ?? ""}
                    placeholder="Link a Solana devnet wallet in your seller profile"
                    readOnly
                  />
                  <p className="mt-2 text-xs text-white/45">
                    {connectedWalletAddress
                      ? "Using the currently connected thirdweb Solana wallet."
                      : "Using the Solana devnet wallet saved on your seller profile."}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={createArtworkDraft}
                disabled={draftState.pending || !actionWalletAddress}
                className="button-primary disabled:cursor-wait disabled:opacity-70"
              >
                {draftState.pending ? "Saving..." : "Create listing draft"}
              </button>
            </div>

            {draftState.message ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">
                {draftState.message}
              </div>
            ) : null}
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

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Inventory</p>
              <h2 className="text-3xl">Your artworks</h2>
            </div>
          </div>

          {artworks.length ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {artworks.map((artwork) => {
                const state = launchState[artwork.id] ?? defaultArtworkActionState();
                const linkedAuctionHref = artwork.linked_auction_id
                  ? `/auctions/${artwork.linked_auction_id}`
                  : artwork.thirdweb_listing_id
                    ? `/auctions?focus=${artwork.thirdweb_listing_id}`
                    : null;
                const displayStatus = state.stage !== "idle" ? state.stage : artwork.seller_flow_status ?? "draft";

                return (
                  <article key={artwork.id} className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5">
                    <div
                      className="aspect-[4/3] rounded-[1.3rem] border border-white/10 bg-cover bg-center"
                      style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.45)), url(${artwork.image_url ?? ""})` }}
                    />
                    <div className="mt-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-2xl">{artwork.title}</h3>
                        <span className="status-pill">{displayStatus}</span>
                      </div>
                      <p className="line-clamp-3 text-sm leading-6 text-white/65">{artwork.description}</p>
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/55">
                        Sync status: {artwork.sync_status ?? "pending"}
                      </div>
                      {state.txInspection ? (
                        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/70">
                          <p className="font-semibold uppercase tracking-[0.18em] text-white/45">Transaction preview</p>
                          <p className="mt-2 leading-6">{state.txInspection.summary}</p>
                          <div className="mt-3 space-y-1">
                            {state.txInspection.accounts.map((account) => (
                              <p key={`${artwork.id}-${account.label}`}>
                                {account.label}: <span className="font-mono text-[11px]">{account.address}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <div className="grid gap-3">
                        <button
                          type="button"
                          onClick={() => prepareArtwork(artwork.id)}
                          disabled={state.pending || !connectedWalletAddress || !profileWalletMatchesConnected}
                          className="button-secondary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {state.pending && state.stage.startsWith("mint") ? "Minting..." : "Prepare and mint on devnet"}
                        </button>
                        <button
                          type="button"
                          onClick={() => launchAuction(artwork.id)}
                          disabled={
                            state.pending ||
                            !connectedWalletAddress ||
                            !profileWalletMatchesConnected ||
                            artwork.seller_flow_status !== "prepared"
                          }
                          className="button-primary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {state.pending && state.stage.startsWith("listing") ? "Launching..." : "Launch auction"}
                        </button>
                        {state.txSignature ? (
                          <a
                            href={`https://explorer.solana.com/tx/${state.txSignature}?cluster=devnet`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-[#e8c547] underline underline-offset-4"
                          >
                            View submitted devnet transaction
                          </a>
                        ) : null}
                        {linkedAuctionHref ? (
                          <Link href={linkedAuctionHref} className="text-sm text-[#e8c547] underline underline-offset-4">
                            View linked auction
                          </Link>
                        ) : null}
                        {state.message ? (
                          <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">{state.message}</p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.8rem] border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
              <h3 className="text-2xl">No artworks yet</h3>
              <p className="mt-3 text-sm text-white/60">Start your first listing above, then mint it and launch the auction from this hub.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
