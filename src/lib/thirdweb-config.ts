import { getContract } from "thirdweb";
import { base, baseSepolia } from "thirdweb/chains";
import { getThirdwebClient, isThirdwebClientConfigured } from "@/lib/thirdweb";
import { isValidEvmAddress } from "@/lib/evmAddress";

type ListingRouteKind = "auction" | "direct";

type ParsedListingRouteId = {
  kind: ListingRouteKind;
  id: bigint;
};

const supportedMarketplaceChainKeys = new Set([
  "base",
  "base-mainnet",
  "8453",
  "base-sepolia",
  "base-sepolia-testnet",
  "84532",
]);
const supportedMarketplaceChainDescription =
  "base, base-mainnet, 8453, base-sepolia, base-sepolia-testnet, or 84532";

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function readAddress(name: string) {
  const value = readEnv(name);
  return value && isValidEvmAddress(value) ? value : null;
}

function readMarketplaceChainKey() {
  return readEnv("NEXT_PUBLIC_THIRDWEB_CHAIN").toLowerCase();
}

export function isMarketplaceChainConfigured() {
  const key = readMarketplaceChainKey();
  return !key || supportedMarketplaceChainKeys.has(key);
}

function assertMarketplaceChainConfigured() {
  if (!isMarketplaceChainConfigured()) {
    throw new Error(`NEXT_PUBLIC_THIRDWEB_CHAIN must be ${supportedMarketplaceChainDescription}.`);
  }
}

export function getMarketplaceChain() {
  const key = readMarketplaceChainKey();

  if (key === "base" || key === "base-mainnet" || key === "8453") {
    return base;
  }

  if (!key || key === "base-sepolia" || key === "base-sepolia-testnet" || key === "84532") {
    return baseSepolia;
  }

  return baseSepolia;
}

export function getMarketplaceChainLabel() {
  return getMarketplaceChain().id === base.id ? "Base" : "Base Sepolia";
}

export function getMarketplaceChainConfigLabel() {
  const value = readEnv("NEXT_PUBLIC_THIRDWEB_CHAIN");
  return value || `${getMarketplaceChainLabel()} (default)`;
}

export function getMarketplaceExplorerUrl(path: "address" | "tx", value: string) {
  const baseUrl = getMarketplaceChain().id === base.id ? "https://basescan.org" : "https://sepolia.basescan.org";
  return `${baseUrl}/${path}/${value}`;
}

export function getMarketplaceContractAddress() {
  return readAddress("NEXT_PUBLIC_THIRDWEB_MARKETPLACE_CONTRACT");
}

export function getNftCollectionAddress() {
  return readAddress("NEXT_PUBLIC_THIRDWEB_NFT_COLLECTION_CONTRACT");
}

export function isMarketplaceConfigured() {
  return Boolean(
    getMarketplaceContractAddress() && isThirdwebClientConfigured() && isMarketplaceChainConfigured(),
  );
}

export function isNftCollectionConfigured() {
  return Boolean(
    getNftCollectionAddress() && isThirdwebClientConfigured() && isMarketplaceChainConfigured(),
  );
}

export function getMarketplaceContract() {
  const address = getMarketplaceContractAddress();
  if (!address) {
    throw new Error("NEXT_PUBLIC_THIRDWEB_MARKETPLACE_CONTRACT is required.");
  }
  assertMarketplaceChainConfigured();

  return getContract({
    client: getThirdwebClient(),
    chain: getMarketplaceChain(),
    address,
  });
}

export function getNftCollectionContract() {
  const address = getNftCollectionAddress();
  if (!address) {
    throw new Error("NEXT_PUBLIC_THIRDWEB_NFT_COLLECTION_CONTRACT is required.");
  }
  assertMarketplaceChainConfigured();

  return getContract({
    client: getThirdwebClient(),
    chain: getMarketplaceChain(),
    address,
  });
}

export function getListingRouteId(type: ListingRouteKind, id: bigint | string) {
  return `${type}-${id.toString()}`;
}

export function parseListingRouteId(value: string): ParsedListingRouteId | null {
  const match = /^(auction|direct)-(\d+)$/.exec(value);
  if (!match) {
    return null;
  }

  const [, kind, rawId] = match;

  return {
    kind: kind as ListingRouteKind,
    id: BigInt(rawId),
  };
}