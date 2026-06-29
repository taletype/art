import { getContract } from "thirdweb";
import { base, baseSepolia } from "thirdweb/chains";
import { getThirdwebClient, isThirdwebClientConfigured } from "@/lib/thirdweb";
import { isValidEvmAddress } from "@/lib/evmAddress";

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function readAddress(name: string) {
  const value = readEnv(name);
  return value && isValidEvmAddress(value) ? value : null;
}

export function getMarketplaceChain() {
  const key = readEnv("NEXT_PUBLIC_THIRDWEB_CHAIN").toLowerCase();

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
  return Boolean(getMarketplaceContractAddress() && isThirdwebClientConfigured());
}

export function isNftCollectionConfigured() {
  return Boolean(getNftCollectionAddress());
}

export function getMarketplaceContract() {
  const address = getMarketplaceContractAddress();
  if (!address) {
    throw new Error("NEXT_PUBLIC_THIRDWEB_MARKETPLACE_CONTRACT is required.");
  }

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

  return getContract({
    client: getThirdwebClient(),
    chain: getMarketplaceChain(),
    address,
  });
}

export function getListingRouteId(type: "auction" | "direct", id: bigint | string) {
  return `${type}-${id.toString()}`;
}

export function parseListingRouteId(value: string) {
  if (!/^(auction|direct)-\d+$/.test(value)) {
    return null;
  }

  const [kind, rawId] = value.split("-");

  return {
    kind,
    id: BigInt(rawId),
  } as const;
}