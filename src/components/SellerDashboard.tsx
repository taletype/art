"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton, useActiveAccount, useSendAndConfirmTransaction } from "thirdweb/react";
import { getAllAuctions, getAllListings, createAuction, createListing } from "thirdweb/extensions/marketplace";
import { mintTo, nextTokenIdToMint, setApprovalForAll } from "thirdweb/extensions/erc721";
import { EvidenceUploader } from "@/components/EvidenceUploader";
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

function shortAddress(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function flowLabel(value: string | null | undefined) {
  return value ? value.replace(/_/g, " ") : "draft";
}

function flowTone(value: string | null | undefined) {
  if (value === "in_auction" || value === "listing_confirmed") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }

  if (value === "prepared" || value === "mint_confirmed") {
    return "border-[#d4af37]/35 bg-[#d4af37]/12 text-[#f0d46e]";
  }

  return "border-white/10 bg-white/5 text-white/65";
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
  const marketplaceAddress = getMarketplaceContractAddress();
  const collectionAddress = getNftCollectionAddress();
  const draftReady = Boolean(title && description && imageUrl && actionWalletAddress);
  const mintedCount = sellerArtworks.filter((artwork) => Boolean(artwork.thirdweb_token_id)).length;
  const listedCount = sellerArtworks.filter((artwork) => Boolean(artwork.thirdweb_listing_id)).length;
  const contractReady = Boolean(marketplaceAddress && collectionAddress);
  const workflowSteps = [
    { label: "Wallet", value: connectedWalletAddress ? "Connected" : "Connect", ready: Boolean(connectedWalletAddress) },
    { label: "Contracts", value: contractReady ? "Ready" : "Missing", ready: contractReady },
    { label: "Draft", value: sellerArtworks.length ? `${sellerArtworks.length} saved` : "New", ready: sellerArtworks.length > 0 },
    { label: "Listed", value: listedCount ? `${listedCount} live` : "Pending", ready: listedCount > 0 },
  ];

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

  const loadWalletArtworks = useCallback(async (wallet: string) => {
    const response = await fetch(`/api/artworks?sellerWallet=${encodeURIComponent(wallet)}&limit=50`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Unable to load wallet inventory.");
    }
    setSellerArtworks(payload);
  }, []);

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
  }, [connectedWalletAddress, loadWalletArtworks, walletAddress]);

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
    <main className="pb-16 sm:pb-24 pt-20 sm:pt-24">
      <section className="section-shell">
        <div className="relative overflow-hidden rounded-[2rem] border border-[#d4af37]/25 bg-[#070708]">
          <div
            className="absolute inset-0 opacity-35"
            style={{
              backgroundImage:
                "linear-gradient(120deg, rgba(212,175,55,0.22), transparent 36%), linear-gradient(180deg, rgba(255,255,255,0.08), transparent 44%)",
            }}
          />
          <div className="relative grid gap-6 sm:gap-8 p-5 sm:p-6 lg:p-8 lg:grid-cols-[1.35fr_0.75fr]">
            <div className="space-y-5 sm:space-y-7">
              <div className="space-y-3 sm:space-y-4">
                <p className="eyebrow text-[#f0d46e]">Seller Hub</p>
                <h1 className="max-w-4xl text-3xl leading-tight sm:text-4xl lg:text-5xl xl:text-6xl">
                  Mint, list, and manage auctions on {getMarketplaceChainLabel()}.
                </h1>
                <p className="max-w-2xl text-sm leading-6 sm:text-base sm:leading-8 text-white/70">
                  A focused workspace for turning a verified artwork record into a live Thirdweb auction or direct listing.
                </p>
              </div>

              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                {workflowSteps.map((step, index) => (
                  <div key={step.label} className="border-l border-white/12 pl-3 sm:pl-4">
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-white/42">
                      {String(index + 1).padStart(2, "0")} {step.label}
                    </p>
                    <p className={step.ready ? "mt-1 sm:mt-2 text-base sm:text-lg font-semibold text-white" : "mt-1 sm:mt-2 text-base sm:text-lg font-semibold text-white/48"}>
                      {step.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <a href="#seller-draft" className="button-primary text-sm sm:text-base px-5 sm:px-6 py-3 active:scale-[0.98]">
                  Create draft
                </a>
                <a href="#seller-inventory" className="button-secondary text-sm sm:text-base px-5 sm:px-6 py-3 active:scale-[0.98]">
                  Manage inventory
                </a>
              </div>
            </div>

            <aside className="space-y-4 sm:space-y-5 rounded-[1.5rem] border border-white/10 bg-black/35 p-4 sm:p-5 backdrop-blur">
              <ConnectButton
                client={getThirdwebClient()}
                wallets={getThirdwebWalletOptions()}
                chain={getMarketplaceChain()}
                connectButton={{
                  label: connectedWalletAddress ? "Wallet connected" : "Connect seller wallet",
                  className: "!w-full !rounded-full !bg-white !px-4 sm:!px-5 !py-3 !font-semibold !text-black text-sm sm:text-base",
                }}
              />

              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between gap-3 sm:gap-4">
                  <span className="text-xs sm:text-sm text-white/45">Seller</span>
                  <span className="text-right text-xs sm:text-sm font-semibold text-white truncate max-w-[120px] sm:max-w-none">{sellerIdentityLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-3 sm:gap-4">
                  <span className="text-xs sm:text-sm text-white/45">Wallet</span>
                  <span className="text-right text-xs sm:text-sm font-semibold text-white">{shortAddress(actionWalletAddress)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 sm:gap-4">
                  <span className="text-xs sm:text-sm text-white/45">Marketplace</span>
                  <span className="text-right text-xs sm:text-sm font-semibold text-white">{shortAddress(marketplaceAddress)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 sm:gap-4">
                  <span className="text-xs sm:text-sm text-white/45">Collection</span>
                  <span className="text-right text-xs sm:text-sm font-semibold text-white">{shortAddress(collectionAddress)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 border-t border-white/10 pt-3 sm:pt-4">
                <div>
                  <p className="text-[10px] sm:text-xs text-white/42">Drafts</p>
                  <p className="mt-1 text-xl sm:text-2xl font-semibold text-white">{sellerArtworks.length}</p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-white/42">Minted</p>
                  <p className="mt-1 text-xl sm:text-2xl font-semibold text-white">{mintedCount}</p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-white/42">Ready</p>
                  <p className="mt-1 text-xl sm:text-2xl font-semibold text-white">{preparedCount}</p>
                </div>
              </div>

              {!profileWalletMatchesConnected ? (
                <p className="rounded-[1rem] border border-amber-300/20 bg-amber-300/10 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-amber-50">
                  Connect the same wallet saved on your seller profile before listing.
                </p>
              ) : null}
              {!email && connectedWalletAddress ? (
                <p className="rounded-[1rem] border border-[#d4af37]/20 bg-[#d4af37]/10 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-[#f0d46e]">
                  Wallet mode active. Drafts, mints, and listings attach to this Thirdweb wallet.
                </p>
              ) : null}
            </aside>
          </div>
        </div>
      </section>

      <section id="seller-draft" className="section-shell mt-8 sm:mt-10 grid gap-6 sm:gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5 sm:space-y-6 rounded-[2rem] border border-[#d4af37]/20 bg-white/[0.035] p-4 sm:p-6 lg:p-8">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_220px]">
            <div className="space-y-2">
              <p className="eyebrow">New listing</p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl">Artwork draft</h2>
              <p className="text-xs sm:text-sm leading-6 sm:leading-7 text-white/65">
                Prepare the catalog metadata, authorship packet, and launch price before minting.
              </p>
            </div>
            <div className="aspect-square w-full max-w-[180px] sm:max-w-[220px] mx-auto lg:mx-0 overflow-hidden rounded-[1.4rem] border border-white/10 bg-black/30">
              {imageUrl ? (
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${imageUrl})` }}
                  aria-label="Artwork image preview"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-4 sm:px-6 text-center text-xs sm:text-sm text-white/42">
                  Image preview appears here
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="title" className="field-label">Title</label>
              <input id="title" value={title} onChange={(event) => setTitle(event.target.value)} className="field-input py-3" placeholder="Artwork title" />
            </div>
            <div>
              <label htmlFor="medium" className="field-label">Medium</label>
              <input id="medium" value={medium} onChange={(event) => setMedium(event.target.value)} className="field-input py-3" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="description" className="field-label">Description</label>
              <textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} className="field-input min-h-24 sm:min-h-32 py-3" placeholder="Collector-facing context, process notes, and provenance summary" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="image-url" className="field-label">Image URL</label>
              <input id="image-url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} className="field-input py-3" placeholder="https://..." />
            </div>
            <div>
              <label htmlFor="price-eth" className="field-label">Starting price (ETH)</label>
              <input id="price-eth" type="number" min="0" step="0.0001" value={priceEth} onChange={(event) => setPriceEth(event.target.value)} className="field-input py-3" />
            </div>
            <div>
              <label htmlFor="wallet" className="field-label">Active seller wallet</label>
              <input id="wallet" value={actionWalletAddress ?? ""} className="field-input py-3" readOnly placeholder="Connect an EVM wallet" />
            </div>
          </div>

          <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {categoryOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setProvenance((prev) => ({ ...prev, category: option }))}
                className={`min-h-10 sm:min-h-12 rounded-full border px-3 sm:px-4 py-2 text-[10px] sm:text-sm capitalize transition ${
                  provenance.category === option
                    ? "border-[#d4af37]/45 bg-[#d4af37]/12 text-[#f0d46e]"
                    : "border-white/10 bg-black/20 text-white/70 hover:border-white/20"
                }`}
              >
                {option.replace("_", " ")}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={createArtworkDraft}
            disabled={draftState.pending || !draftReady}
            className="button-primary w-full text-sm sm:text-base py-3 disabled:cursor-not-allowed disabled:opacity-45 active:scale-[0.98]"
          >
            {draftState.pending ? "Saving draft..." : "Create listing draft"}
          </button>

          {draftState.message ? (
            <p className="rounded-[1.2rem] border border-white/10 bg-black/20 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-white/80">{draftState.message}</p>
          ) : null}
        </div>

        <div className="space-y-8">
          <EvidenceUploader value={provenance.evidence} onChange={handleEvidenceChange} />
        </div>
      </section>

      <section id="seller-inventory" className="section-shell mt-8 sm:mt-12 space-y-4 sm:space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="eyebrow">Inventory</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl">Drafts and live listings</h2>
          </div>
          <p className="max-w-xl text-xs sm:text-sm leading-6 sm:leading-7 text-white/55">
            Mint drafts into the configured collection, then launch auctions or direct listings through the marketplace contract.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-5 xl:grid-cols-2">
          {sellerArtworks.map((artwork) => {
            const state = launchState[artwork.id] ?? defaultArtworkActionState();
            const listingType = listingKindByArtworkId[artwork.id] ?? "auction";
            const listingHref = artwork.thirdweb_listing_id ? `/auctions/${artwork.thirdweb_listing_id}` : null;

            return (
              <article key={artwork.id} className="group grid overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.03] transition hover:border-[#d4af37]/35 sm:grid-cols-[170px_1fr]">
                <div className="min-h-40 sm:min-h-52 bg-black/35 sm:min-h-full">
                  {artwork.image_url ? (
                    <div
                      className="h-full min-h-40 sm:min-h-52 bg-cover bg-center transition duration-500 group-hover:scale-[1.03]"
                      style={{ backgroundImage: `url(${artwork.image_url})` }}
                    />
                  ) : (
                    <div className="flex h-full min-h-40 sm:min-h-52 items-center justify-center px-4 sm:px-6 text-center text-xs sm:text-sm text-white/35">
                      No image
                    </div>
                  )}
                </div>

                <div className="space-y-4 sm:space-y-5 p-4 sm:p-5">
                  <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="eyebrow text-[10px] sm:text-xs">Artwork</p>
                      <h3 className="mt-1 sm:mt-2 text-lg sm:text-2xl leading-tight">{artwork.title}</h3>
                      <p className="mt-1 sm:mt-2 line-clamp-2 text-xs sm:text-sm leading-5 sm:leading-6 text-white/60">{artwork.description ?? "No description yet."}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <span className={`status-pill text-[10px] sm:text-xs ${flowTone(artwork.seller_flow_status)}`}>
                        {flowLabel(artwork.seller_flow_status)}
                      </span>
                      {artwork.thirdweb_token_id ? <span className="status-pill text-[10px] sm:text-xs">token #{artwork.thirdweb_token_id}</span> : null}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="inline-flex rounded-full border border-white/10 bg-black/25 p-1">
                      <button
                        type="button"
                        onClick={() => setListingKindByArtworkId((current) => ({ ...current, [artwork.id]: "auction" }))}
                        className={`min-w-20 sm:min-w-24 rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm transition ${listingType === "auction" ? "bg-white text-black" : "text-white/65 hover:text-white"}`}
                      >
                        Auction
                      </button>
                      <button
                        type="button"
                        onClick={() => setListingKindByArtworkId((current) => ({ ...current, [artwork.id]: "direct" }))}
                        className={`min-w-20 sm:min-w-24 rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm transition ${listingType === "direct" ? "bg-white text-black" : "text-white/65 hover:text-white"}`}
                      >
                        Direct
                      </button>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] sm:text-xs text-white/42">Price</p>
                      <p className="text-base sm:text-lg font-semibold text-white">{toEthValue(artwork.price_sol).toFixed(4)} ETH</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => void mintArtwork(artwork)}
                      disabled={state.pending || Boolean(artwork.thirdweb_token_id)}
                      className="button-secondary text-xs sm:text-sm px-4 sm:px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                    >
                      {artwork.thirdweb_token_id ? "Minted" : state.pending && state.stage === "minting" ? "Minting..." : "Mint to collection"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void launchListing(artwork)}
                      disabled={state.pending || !artwork.thirdweb_token_id}
                      className="button-primary text-xs sm:text-sm px-4 sm:px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                    >
                      {state.pending && (state.stage === "approving" || state.stage === "listing")
                        ? "Listing..."
                        : listingType === "auction"
                          ? "Launch auction"
                          : "Create direct listing"}
                    </button>
                    {listingHref ? (
                      <Link href={listingHref} className="button-secondary text-xs sm:text-sm px-4 sm:px-5 py-2.5 active:scale-[0.98]">
                        View listing
                      </Link>
                    ) : null}
                  </div>

                  {state.message ? (
                    <p className="rounded-[1rem] border border-white/10 bg-black/20 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-white/80">
                      {state.message}
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        {!sellerArtworks.length ? (
          <div className="rounded-[1.8rem] border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
            <h3 className="text-3xl">No drafts yet</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-white/60">
              Create the first artwork draft above. Once it appears here, mint it into your collection and launch the auction.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
