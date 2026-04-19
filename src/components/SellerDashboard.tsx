"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton, useActiveAccount, useSendAndConfirmTransaction } from "thirdweb/react";
import { getAllAuctions, getAllListings, createAuction, createListing } from "thirdweb/extensions/marketplace";
import { mintTo, nextTokenIdToMint, setApprovalForAll } from "thirdweb/extensions/erc721";
import { EvidenceUploader } from "@/components/EvidenceUploader";
import { ReviewPanel } from "@/components/ReviewPanel";
import { isValidEvmAddress } from "@/lib/evmAddress";
import { validateProvenance } from "@/lib/provenance";
import {
  getListingRouteId,
  getMarketplaceChain,
  getMarketplaceChainLabel,
  getMarketplaceContract,
  getMarketplaceContractAddress,
  getNftCollectionAddress,
  getNftCollectionContract,
  isMarketplaceConfigured,
  isNftCollectionConfigured,
} from "@/lib/thirdweb-config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { getThirdwebWalletOptions } from "@/lib/thirdwebWallets";
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
  thirdweb_token_id?: string | null;
  thirdweb_contract_address?: string | null;
  price_sol?: number | null;
};

type SellerDashboardProps = {
  email: string | null;
  walletAddress: string | null;
  artworks: SellerArtwork[];
};

type ArtworkActionState = {
  pending: boolean;
  stage: "idle" | "minting" | "minted" | "approving" | "listing" | "listed";
  message: string | null;
};

function defaultProvenance(): Provenance {
  return {
    category: "visual",
    medium: "digital painting",
    creationMethod: "HUMAN_ORIGINAL",
    attestation: {
      text: "I certify this artwork is human-created, not AI-generated or AI-assisted.",
      signerWallet: "0x0000000000000000000000000000000000000000",
      timestamp: new Date().toISOString(),
      signatureRef: "sig-ref-base",
    },
    evidence: [
      { kind: "source_file", hash: "a".repeat(64), label: "Source file" },
      { kind: "wip_image", hash: "b".repeat(64), label: "WIP screenshot" },
    ],
    evidenceHashes: ["a".repeat(64), "b".repeat(64)],
    verificationStatus: "PENDING_REVIEW",
  };
}

function defaultArtworkActionState(): ArtworkActionState {
  return {
    pending: false,
    stage: "idle",
    message: null,
  };
}

function toEthValue(value: number | null | undefined) {
  return value && Number.isFinite(value) ? value : 0.05;
}

export default function SellerDashboard({ email, walletAddress, artworks }: SellerDashboardProps) {
  const router = useRouter();
  const activeAccount = useActiveAccount();
  const sendTransaction = useSendAndConfirmTransaction();
  const [sellerArtworks, setSellerArtworks] = useState<SellerArtwork[]>(artworks);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [medium, setMedium] = useState("digital painting");
  const [priceEth, setPriceEth] = useState("0.05");
  const [listingKindByArtworkId, setListingKindByArtworkId] = useState<Record<string, "auction" | "direct">>({});
  const [provenance, setProvenance] = useState<Provenance>(defaultProvenance);
  const [draftState, setDraftState] = useState<{ pending: boolean; message: string | null }>({
    pending: false,
    message: null,
  });
  const [launchState, setLaunchState] = useState<Record<string, ArtworkActionState>>({});
  const connectedWalletAddress =
    activeAccount?.address && isValidEvmAddress(activeAccount.address) ? activeAccount.address : null;
  const actionWalletAddress = connectedWalletAddress ?? walletAddress;
  const profileWalletMatchesConnected =
    !connectedWalletAddress || !walletAddress || connectedWalletAddress.toLowerCase() === walletAddress.toLowerCase();
  const sellerIdentityLabel = email ?? (connectedWalletAddress ? "Thirdweb wallet" : "Connect wallet");
  const categoryOptions: ArtCategory[] = ["visual", "audio", "video", "writing", "mixed_media"];

  const preparedCount = useMemo(
    () => sellerArtworks.filter((artwork) => artwork.seller_flow_status === "prepared").length,
    [sellerArtworks],
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

  useEffect(() => {
    setSellerArtworks(artworks);
  }, [artworks]);

  async function loadWalletArtworks(wallet: string) {
    const response = await fetch(`/api/artworks?sellerWallet=${encodeURIComponent(wallet)}&limit=50`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Unable to load wallet inventory.");
    }
    setSellerArtworks(payload);
  }

  useEffect(() => {
    if (!connectedWalletAddress || walletAddress) {
      return;
    }

    void loadWalletArtworks(connectedWalletAddress).catch((error) => {
      setDraftState((current) => ({
        ...current,
        message: error instanceof Error ? error.message : "Unable to load wallet inventory.",
      }));
    });
  }, [connectedWalletAddress, walletAddress]);

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
    if (!connectedWalletAddress) {
      updateArtworkState(artworkId, {
        pending: false,
        message: "Connect your Base wallet before signing Seller Hub transactions.",
      });
      return false;
    }

    if (!profileWalletMatchesConnected) {
      updateArtworkState(artworkId, {
        pending: false,
        message: "Connect the same wallet that is saved on your seller profile before continuing.",
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
        message: "Add a title, description, image URL, and linked wallet first.",
      });
      return;
    }

    setDraftState({ pending: true, message: null });

    try {
      const response = await fetch("/api/artworks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          imageUrl,
          medium,
          category: sanitizedProvenance.category,
          provenanceText: JSON.stringify({ ...sanitizedProvenance, medium }),
          priceEth: Number(priceEth),
          sellerWallet: actionWalletAddress,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Unable to create artwork draft.");
      }

      setTitle("");
      setDescription("");
      setImageUrl("");
      setMedium("digital painting");
      setPriceEth("0.05");
      setProvenance(defaultProvenance());
      setDraftState({ pending: false, message: "Artwork draft created in Seller Hub." });
      if (connectedWalletAddress && !walletAddress) {
        await loadWalletArtworks(connectedWalletAddress);
      } else {
        router.refresh();
      }
    } catch (error) {
      setDraftState({
        pending: false,
        message: error instanceof Error ? error.message : "Unable to create artwork draft.",
      });
    }
  }

  async function mintArtwork(artwork: SellerArtwork) {
    if (!ensureConnectedSellerWallet(artwork.id) || !connectedWalletAddress) {
      return;
    }

    if (!isNftCollectionConfigured()) {
      updateArtworkState(artwork.id, {
        pending: false,
        message: "Set NEXT_PUBLIC_THIRDWEB_NFT_COLLECTION_CONTRACT before minting.",
      });
      return;
    }

    updateArtworkState(artwork.id, {
      pending: true,
      stage: "minting",
      message: "Minting the artwork into your Base Sepolia collection...",
    });

    try {
      const collectionContract = getNftCollectionContract();
      const nextTokenId = await nextTokenIdToMint({ contract: collectionContract });
      const mintTx = mintTo({
        contract: collectionContract,
        to: connectedWalletAddress,
        nft: {
          name: artwork.title,
          description: artwork.description ?? "",
          image: artwork.image_url ?? "",
        },
      });

      await sendTransaction.mutateAsync(mintTx);

      const patchResponse = await fetch("/api/artworks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: artwork.id,
          sellerWallet: connectedWalletAddress,
          seller_wallet: connectedWalletAddress,
          artist_wallet: connectedWalletAddress,
          thirdweb_provider: "thirdweb",
          thirdweb_chain: "base-sepolia",
          thirdweb_contract_address: getNftCollectionAddress(),
          thirdweb_token_id: nextTokenId.toString(),
          thirdweb_asset_url: artwork.image_url,
          sync_status: "mint_confirmed",
          seller_flow_status: "prepared",
        }),
      });

      if (!patchResponse.ok) {
        const payload = await patchResponse.json();
        throw new Error(payload.error || "Unable to save minted artwork state.");
      }

      updateArtworkState(artwork.id, {
        pending: false,
        stage: "minted",
        message: "Artwork minted on Base Sepolia and linked to this draft.",
      });
      if (connectedWalletAddress && !walletAddress) {
        await loadWalletArtworks(connectedWalletAddress);
      } else {
        router.refresh();
      }
    } catch (error) {
      updateArtworkState(artwork.id, {
        pending: false,
        message: error instanceof Error ? error.message : "Unable to mint artwork.",
      });
    }
  }

  async function launchListing(artwork: SellerArtwork) {
    if (!ensureConnectedSellerWallet(artwork.id) || !connectedWalletAddress) {
      return;
    }

    if (!isMarketplaceConfigured()) {
      updateArtworkState(artwork.id, {
        pending: false,
        message: "Set NEXT_PUBLIC_THIRDWEB_MARKETPLACE_CONTRACT before listing.",
      });
      return;
    }

    const tokenId = artwork.thirdweb_token_id;
    if (!tokenId) {
      updateArtworkState(artwork.id, {
        pending: false,
        message: "Mint this artwork before creating a listing.",
      });
      return;
    }

    try {
      const marketplaceContract = getMarketplaceContract();
      const collectionContract = getNftCollectionContract();
      const marketplaceAddress = getMarketplaceContractAddress();
      const listingType = listingKindByArtworkId[artwork.id] ?? "auction";
      const priceValue = toEthValue(artwork.price_sol);

      updateArtworkState(artwork.id, {
        pending: true,
        stage: "approving",
        message: "Approving the marketplace contract to transfer your NFT...",
      });

      await sendTransaction.mutateAsync(
        setApprovalForAll({
          contract: collectionContract,
          operator: marketplaceAddress as `0x${string}`,
          approved: true,
        }),
      );

      updateArtworkState(artwork.id, {
        pending: true,
        stage: "listing",
        message: listingType === "auction" ? "Creating onchain auction..." : "Creating direct listing...",
      });

      if (listingType === "auction") {
        await sendTransaction.mutateAsync(
          createAuction({
            contract: marketplaceContract,
            assetContractAddress: getNftCollectionAddress() as `0x${string}`,
            tokenId: BigInt(tokenId),
            minimumBidAmount: priceValue.toFixed(4),
            buyoutBidAmount: (priceValue * 1.4).toFixed(4),
            endTimestamp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          }),
        );
      } else {
        await sendTransaction.mutateAsync(
          createListing({
            contract: marketplaceContract,
            assetContractAddress: getNftCollectionAddress() as `0x${string}`,
            tokenId: BigInt(tokenId),
            pricePerToken: priceValue.toFixed(4),
            endTimestamp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          }),
        );
      }

      const [auctions, listings] = await Promise.all([
        getAllAuctions({ contract: marketplaceContract, start: 0, count: 100n }),
        getAllListings({ contract: marketplaceContract, start: 0, count: 100n }),
      ]);

      const matched =
        listingType === "auction"
          ? auctions
              .filter((entry) => entry.creatorAddress.toLowerCase() === connectedWalletAddress.toLowerCase() && entry.tokenId.toString() === tokenId)
              .sort((left, right) => Number(right.id - left.id))[0]
          : listings
              .filter((entry) => entry.creatorAddress.toLowerCase() === connectedWalletAddress.toLowerCase() && entry.tokenId.toString() === tokenId)
              .sort((left, right) => Number(right.id - left.id))[0];

      if (!matched) {
        throw new Error("Listing transaction confirmed but the marketplace listing could not be located yet.");
      }

      const routeId = getListingRouteId(listingType, matched.id);
      const patchResponse = await fetch("/api/artworks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: artwork.id,
          sellerWallet: connectedWalletAddress,
          seller_wallet: connectedWalletAddress,
          artist_wallet: connectedWalletAddress,
          thirdweb_provider: "thirdweb",
          thirdweb_chain: "base-sepolia",
          thirdweb_contract_address: getNftCollectionAddress(),
          thirdweb_token_id: tokenId,
          thirdweb_listing_id: routeId,
          thirdweb_listing_url: `/auctions/${routeId}`,
          sync_status: "listing_confirmed",
          seller_flow_status: "in_auction",
          status: "live",
        }),
      });

      if (!patchResponse.ok) {
        const payload = await patchResponse.json();
        throw new Error(payload.error || "Unable to save listing state.");
      }

      updateArtworkState(artwork.id, {
        pending: false,
        stage: "listed",
        message: `${listingType === "auction" ? "Auction" : "Direct listing"} confirmed on ${getMarketplaceChainLabel()}.`,
      });
      if (connectedWalletAddress && !walletAddress) {
        await loadWalletArtworks(connectedWalletAddress);
      } else {
        router.refresh();
      }
    } catch (error) {
      updateArtworkState(artwork.id, {
        pending: false,
        message: error instanceof Error ? error.message : "Unable to launch listing.",
      });
    }
  }

  return (
    <main className="section-shell pb-24 pt-28">
      <div className="space-y-10">
        <section className="grid gap-8 rounded-[2rem] border border-[#d4af37]/20 bg-white/[0.03] p-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <p className="eyebrow">Seller Hub</p>
            <h1 className="text-5xl leading-tight sm:text-6xl">Create the draft here, then mint and list it on {getMarketplaceChainLabel()}.</h1>
            <p className="max-w-3xl text-lg leading-8 text-white/68">
              Seller Hub now handles the Base Sepolia flow: create the draft, verify the work, mint it into your NFT collection, then push either an auction or a direct listing to your Thirdweb marketplace.
            </p>

            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                <dt className="text-sm text-white/45">Seller identity</dt>
                <dd className="mt-2 text-lg font-semibold text-white">{sellerIdentityLabel}</dd>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                <dt className="text-sm text-white/45">Linked wallet</dt>
                <dd className="mt-2 break-all text-sm font-semibold text-white">{actionWalletAddress ?? "Add Base wallet"}</dd>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                <dt className="text-sm text-white/45">Ready to list</dt>
                <dd className="mt-2 text-lg font-semibold text-white">{preparedCount}</dd>
              </div>
            </dl>

            {!profileWalletMatchesConnected ? (
              <p className="rounded-[1.2rem] border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
                The connected wallet does not match the wallet saved on your seller profile. Listing actions stay blocked until they match.
              </p>
            ) : null}
            {!email && connectedWalletAddress ? (
              <p className="rounded-[1.2rem] border border-[#d4af37]/20 bg-[#d4af37]/10 px-4 py-3 text-sm text-[#f0d46e]">
                Wallet mode active. You can create drafts, mint, and list with this Thirdweb wallet without Supabase login.
              </p>
            ) : null}
          </div>

          <div className="space-y-3 rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
            <ConnectButton
              client={getThirdwebClient()}
              wallets={getThirdwebWalletOptions()}
              chain={getMarketplaceChain()}
              connectButton={{
                label: connectedWalletAddress ? "Wallet connected" : "Connect seller wallet",
                className: "!w-full !rounded-full !bg-white !px-5 !py-3 !font-semibold !text-black",
              }}
            />
            <p className="eyebrow">Contract config</p>
            <p className="text-sm text-white/65">
              The live marketplace flow depends on your Thirdweb contract env vars.
            </p>
            <p className="text-sm text-white/78">
              Marketplace:
              {" "}
              {getMarketplaceContractAddress() ?? "Missing NEXT_PUBLIC_THIRDWEB_MARKETPLACE_CONTRACT"}
            </p>
            <p className="text-sm text-white/78">
              NFT collection:
              {" "}
              {getNftCollectionAddress() ?? "Missing NEXT_PUBLIC_THIRDWEB_NFT_COLLECTION_CONTRACT"}
            </p>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6 rounded-[2rem] border border-[#d4af37]/20 bg-white/[0.03] p-8">
            <div className="space-y-2">
              <p className="eyebrow">New listing</p>
              <h2 className="text-3xl">Create artwork draft</h2>
              <p className="text-sm leading-7 text-white/65">
                Draft the artwork record first so your provenance, image, and marketplace metadata stay together.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="title" className="field-label">Title</label>
                <input id="title" value={title} onChange={(event) => setTitle(event.target.value)} className="field-input" />
              </div>
              <div>
                <label htmlFor="medium" className="field-label">Medium</label>
                <input id="medium" value={medium} onChange={(event) => setMedium(event.target.value)} className="field-input" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="description" className="field-label">Description</label>
                <textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} className="field-input min-h-28" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="image-url" className="field-label">Image URL</label>
                <input id="image-url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} className="field-input" />
              </div>
              <div>
                <label htmlFor="price-eth" className="field-label">Starting price (ETH)</label>
                <input id="price-eth" type="number" min="0" step="0.0001" value={priceEth} onChange={(event) => setPriceEth(event.target.value)} className="field-input" />
              </div>
              <div>
                <label htmlFor="wallet" className="field-label">Active seller wallet</label>
                <input id="wallet" value={actionWalletAddress ?? ""} className="field-input" readOnly placeholder="Link an EVM wallet in your seller profile" />
              </div>
            </div>

            <EvidenceUploader value={provenance.evidence} onChange={handleEvidenceChange} />

            <div className="grid gap-4 md:grid-cols-3">
              {categoryOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setProvenance((prev) => ({ ...prev, category: option }))}
                  className={`rounded-2xl border px-4 py-3 text-sm capitalize transition ${provenance.category === option ? "border-[#d4af37]/40 bg-[#d4af37]/10 text-[#f0d46e]" : "border-white/10 bg-black/20 text-white/70"}`}
                >
                  {option.replace("_", " ")}
                </button>
              ))}
            </div>

            <button type="button" onClick={createArtworkDraft} disabled={draftState.pending} className="button-primary w-full disabled:cursor-wait disabled:opacity-60">
              {draftState.pending ? "Saving..." : "Create listing draft"}
            </button>

            {draftState.message ? (
              <p className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">{draftState.message}</p>
            ) : null}
          </div>

          <ReviewPanel
            provenance={sanitizedProvenance}
            onUpdate={setProvenance}
            reviewerWallet={process.env.NEXT_PUBLIC_ADMIN_REVIEWER_WALLET ?? "0x0000000000000000000000000000000000000000"}
            enabled={process.env.NEXT_PUBLIC_ENABLE_MOCK_REVIEW === "true"}
          />
        </section>

        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="eyebrow">Inventory</p>
              <h2 className="text-3xl">Drafts and live listings</h2>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {sellerArtworks.map((artwork) => {
              const state = launchState[artwork.id] ?? defaultArtworkActionState();
              const listingType = listingKindByArtworkId[artwork.id] ?? "auction";
              const listingHref = artwork.thirdweb_listing_id ? `/auctions/${artwork.thirdweb_listing_id}` : null;

              return (
                <article key={artwork.id} className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow">Artwork</p>
                      <h3 className="mt-2 text-2xl">{artwork.title}</h3>
                      <p className="mt-2 text-sm text-white/60">{artwork.description ?? "No description yet."}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {artwork.seller_flow_status ? <span className="status-pill">{artwork.seller_flow_status}</span> : null}
                      {artwork.thirdweb_token_id ? <span className="status-pill">token #{artwork.thirdweb_token_id}</span> : null}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.2rem] border border-white/10 bg-black/20 p-4">
                      <p className="text-sm text-white/45">List type</p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setListingKindByArtworkId((current) => ({ ...current, [artwork.id]: "auction" }))}
                          className={`rounded-full px-4 py-2 text-sm ${listingType === "auction" ? "bg-white text-black" : "bg-white/5 text-white/70"}`}
                        >
                          Auction
                        </button>
                        <button
                          type="button"
                          onClick={() => setListingKindByArtworkId((current) => ({ ...current, [artwork.id]: "direct" }))}
                          className={`rounded-full px-4 py-2 text-sm ${listingType === "direct" ? "bg-white text-black" : "bg-white/5 text-white/70"}`}
                        >
                          Direct
                        </button>
                      </div>
                    </div>
                    <div className="rounded-[1.2rem] border border-white/10 bg-black/20 p-4">
                      <p className="text-sm text-white/45">Price</p>
                      <p className="mt-3 text-xl font-semibold text-white">{toEthValue(artwork.price_sol).toFixed(4)} ETH</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void mintArtwork(artwork)}
                      disabled={state.pending || Boolean(artwork.thirdweb_token_id)}
                      className="button-secondary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {artwork.thirdweb_token_id ? "Minted" : state.pending && state.stage === "minting" ? "Minting..." : "Mint to collection"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void launchListing(artwork)}
                      disabled={state.pending || !artwork.thirdweb_token_id}
                      className="button-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {state.pending && (state.stage === "approving" || state.stage === "listing")
                        ? "Listing..."
                        : listingType === "auction"
                          ? "Launch auction"
                          : "Create direct listing"}
                    </button>
                    {listingHref ? (
                      <Link href={listingHref} className="button-secondary">
                        View live listing
                      </Link>
                    ) : null}
                  </div>

                  {state.message ? (
                    <p className="mt-4 rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">
                      {state.message}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>

          {!sellerArtworks.length ? (
            <div className="rounded-[1.8rem] border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
              <h3 className="text-2xl">No drafts yet</h3>
              <p className="mt-3 text-sm text-white/60">Start your first listing above, then mint it and push it to the marketplace from this hub.</p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
