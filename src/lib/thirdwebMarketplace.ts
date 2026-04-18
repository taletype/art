import { randomUUID } from "node:crypto";
import { getContract } from "thirdweb";
import { ethereum, polygon, sepolia } from "thirdweb/chains";
import { getThirdwebClient } from "@/lib/thirdweb";

type ThirdwebArtworkDraft = {
  artworkId: string;
  ownerUserId: string;
  sellerWallet: string;
  title: string;
  description: string;
  imageUrl: string;
};

type ThirdwebAuctionDraft = {
  artworkId: string;
  title: string;
  description: string;
  imageUrl: string;
  sellerWallet: string;
  startPriceLamports: number;
  minIncrementLamports: number;
  startsAt: string;
  endsAt: string;
};

export type ThirdwebAssetResult = {
  provider: "thirdweb";
  chain: string;
  contractAddress: string;
  tokenId: string;
  externalUrl: string | null;
  syncStatus: "ready" | "requires_contract";
};

export type ThirdwebAuctionResult = {
  provider: "thirdweb";
  chain: string;
  contractAddress: string;
  listingId: string;
  externalUrl: string | null;
  syncStatus: "live" | "requires_contract";
};

function getConfiguredChain() {
  const configured = (process.env.NEXT_PUBLIC_THIRDWEB_CHAIN || "sepolia").toLowerCase();
  if (configured === "ethereum") return ethereum;
  if (configured === "polygon") return polygon;
  return sepolia;
}

function readContractAddress(envVar: string) {
  return process.env[envVar]?.trim() || "";
}

function buildContract(address: string) {
  return getContract({
    client: getThirdwebClient(),
    chain: getConfiguredChain(),
    address,
  });
}

function buildFallbackUrl(entity: "asset" | "auction", id: string) {
  return `https://thirdweb.com/${entity}/${id}`;
}

function chainLabel() {
  const chain = getConfiguredChain();
  return chain.name || String(chain.id);
}

export async function prepareThirdwebArtworkAsset(
  artwork: ThirdwebArtworkDraft,
): Promise<ThirdwebAssetResult> {
  const contractAddress = readContractAddress("THIRDWEB_NFT_CONTRACT_ADDRESS");
  const chain = getConfiguredChain();

  if (!contractAddress) {
    return {
      provider: "thirdweb",
      chain: chainLabel(),
      contractAddress: "unconfigured",
      tokenId: `draft-${artwork.artworkId}`,
      externalUrl: buildFallbackUrl("asset", artwork.artworkId),
      syncStatus: "requires_contract",
    };
  }

  buildContract(contractAddress);

  return {
    provider: "thirdweb",
    chain: chainLabel(),
    contractAddress,
    tokenId: `tw-${artwork.artworkId}`,
    externalUrl: buildFallbackUrl("asset", artwork.artworkId),
    syncStatus: "ready",
  };
}

export async function prepareThirdwebAuction(
  auction: ThirdwebAuctionDraft,
): Promise<ThirdwebAuctionResult> {
  const contractAddress = readContractAddress("THIRDWEB_MARKETPLACE_CONTRACT_ADDRESS");
  const chain = getConfiguredChain();

  if (!contractAddress) {
    return {
      provider: "thirdweb",
      chain: chainLabel(),
      contractAddress: "unconfigured",
      listingId: `draft-auction-${auction.artworkId}`,
      externalUrl: buildFallbackUrl("auction", auction.artworkId),
      syncStatus: "requires_contract",
    };
  }

  buildContract(contractAddress);

  return {
    provider: "thirdweb",
    chain: chainLabel(),
    contractAddress,
    listingId: `listing-${randomUUID()}`,
    externalUrl: buildFallbackUrl("auction", auction.artworkId),
    syncStatus: "live",
  };
}
