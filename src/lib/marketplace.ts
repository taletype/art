import { getAllAuctions, getAllValidListings, getAuction, getListing } from "thirdweb/extensions/marketplace";
import {
  getListingRouteId,
  getMarketplaceChainLabel,
  getMarketplaceContract,
  getMarketplaceContractAddress,
  getMarketplaceExplorerUrl as getConfiguredMarketplaceExplorerUrl,
  isMarketplaceConfigured,
  parseListingRouteId,
} from "@/lib/thirdweb-config";

export type MarketplaceEntry = {
  id: string;
  numericId: bigint;
  type: "auction" | "direct";
  title: string;
  description: string;
  assetUrl: string;
  sellerWallet: string;
  status: string;
  startPriceEth: number | null;
  highestBidEth: number | null;
  buyoutPriceEth: number | null;
  minimumBidEth: number | null;
  bidCount: number | null;
  endsAt: string;
  startsAt: string;
  marketplaceAddress: string | null;
  chainLabel: string;
};

export type MarketplaceDetail = MarketplaceEntry & {
  assetContractAddress: string;
  tokenId: string;
  currencyContractAddress: string;
};

const DEFAULT_MARKETPLACE_ENTRY_LIMIT = 24;
const MAX_MARKETPLACE_ENTRY_LIMIT = 100;
const DEFAULT_ASSET_DESCRIPTION = "Catalog notes are being prepared for this marketplace listing.";

function normalizeMarketplaceEntryLimit(limit: number) {
  if (!Number.isFinite(limit)) {
    return DEFAULT_MARKETPLACE_ENTRY_LIMIT;
  }

  const normalizedLimit = Math.floor(limit);
  if (normalizedLimit <= 0) {
    return 0;
  }

  return Math.min(normalizedLimit, MAX_MARKETPLACE_ENTRY_LIMIT);
}

function fromWei(value: bigint | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value) / 1_000_000_000_000_000_000;
}

function normalizeAssetUrl(value: string | null | undefined) {
  const assetUrl = value?.trim() || "";
  if (!assetUrl.startsWith("ipfs://")) {
    return assetUrl;
  }

  const ipfsPath = assetUrl.slice("ipfs://".length).replace(/^ipfs\//, "");
  return ipfsPath ? `https://ipfs.io/ipfs/${ipfsPath}` : "";
}

function readAssetImage(asset: { metadata?: { image?: string | null } } | undefined) {
  return normalizeAssetUrl(asset?.metadata?.image);
}

function readAssetDescription(asset: { metadata?: { description?: string | null } } | undefined) {
  return asset?.metadata?.description?.trim() || DEFAULT_ASSET_DESCRIPTION;
}

export async function listMarketplaceEntries(limit = DEFAULT_MARKETPLACE_ENTRY_LIMIT): Promise<MarketplaceEntry[]> {
  const normalizedLimit = normalizeMarketplaceEntryLimit(limit);
  if (normalizedLimit === 0 || !isMarketplaceConfigured()) {
    return [];
  }

  const contract = getMarketplaceContract();
  const [auctionResult, listingResult] = await Promise.allSettled([
    getAllAuctions({ contract, start: 0, count: BigInt(normalizedLimit) }),
    getAllValidListings({ contract, start: 0, count: BigInt(normalizedLimit) }),
  ]);

  if (auctionResult.status === "rejected") {
    console.warn("Unable to load marketplace entries.", auctionResult.reason);
  }
  if (listingResult.status === "rejected") {
    console.warn("Unable to load marketplace entries.", listingResult.reason);
  }

  const auctions: Awaited<ReturnType<typeof getAllAuctions>> =
    auctionResult.status === "fulfilled" ? auctionResult.value : [];
  const listings: Awaited<ReturnType<typeof getAllValidListings>> =
    listingResult.status === "fulfilled" ? listingResult.value : [];

  const auctionEntries: MarketplaceEntry[] = auctions.map((auction) => ({
    id: getListingRouteId("auction", auction.id),
    numericId: auction.id,
    type: "auction",
    title: auction.asset.metadata?.name || `Auction #${auction.id.toString()}`,
    description: readAssetDescription(auction.asset),
    assetUrl: readAssetImage(auction.asset),
    sellerWallet: auction.creatorAddress,
    status: auction.status,
    startPriceEth: fromWei(auction.minimumBidAmount),
    highestBidEth: null,
    buyoutPriceEth: fromWei(auction.buyoutBidAmount),
    minimumBidEth: fromWei(auction.minimumBidAmount),
    bidCount: null,
    endsAt: new Date(Number(auction.endTimeInSeconds) * 1000).toISOString(),
    startsAt: new Date(Number(auction.startTimeInSeconds) * 1000).toISOString(),
    marketplaceAddress: getMarketplaceContractAddress(),
    chainLabel: getMarketplaceChainLabel(),
  }));

  const directEntries: MarketplaceEntry[] = listings.map((listing) => ({
    id: getListingRouteId("direct", listing.id),
    numericId: listing.id,
    type: "direct",
    title: listing.asset.metadata?.name || `Listing #${listing.id.toString()}`,
    description: readAssetDescription(listing.asset),
    assetUrl: readAssetImage(listing.asset),
    sellerWallet: listing.creatorAddress,
    status: listing.status,
    startPriceEth: fromWei(listing.pricePerToken),
    highestBidEth: null,
    buyoutPriceEth: fromWei(listing.pricePerToken),
    minimumBidEth: null,
    bidCount: null,
    endsAt: new Date(Number(listing.endTimeInSeconds) * 1000).toISOString(),
    startsAt: new Date(Number(listing.startTimeInSeconds) * 1000).toISOString(),
    marketplaceAddress: getMarketplaceContractAddress(),
    chainLabel: getMarketplaceChainLabel(),
  }));

  return [...auctionEntries, ...directEntries]
    .sort((left, right) => new Date(right.endsAt).getTime() - new Date(left.endsAt).getTime())
    .slice(0, normalizedLimit);
}

export async function getMarketplaceDetail(routeId: string): Promise<MarketplaceDetail | null> {
  if (!isMarketplaceConfigured()) {
    return null;
  }

  const parsed = parseListingRouteId(routeId);
  if (!parsed) {
    return null;
  }

  const contract = getMarketplaceContract();

  try {
    if (parsed.kind === "auction") {
      const auction = await getAuction({ contract, auctionId: parsed.id });

      return {
        id: routeId,
        numericId: auction.id,
        type: "auction",
        title: auction.asset.metadata?.name || `Auction #${auction.id.toString()}`,
        description: readAssetDescription(auction.asset),
        assetUrl: readAssetImage(auction.asset),
        sellerWallet: auction.creatorAddress,
        status: auction.status,
        startPriceEth: fromWei(auction.minimumBidAmount),
        highestBidEth: null,
        buyoutPriceEth: fromWei(auction.buyoutBidAmount),
        minimumBidEth: fromWei(auction.minimumBidAmount),
        bidCount: null,
        endsAt: new Date(Number(auction.endTimeInSeconds) * 1000).toISOString(),
        startsAt: new Date(Number(auction.startTimeInSeconds) * 1000).toISOString(),
        marketplaceAddress: getMarketplaceContractAddress(),
        chainLabel: getMarketplaceChainLabel(),
        assetContractAddress: auction.assetContractAddress,
        tokenId: auction.tokenId.toString(),
        currencyContractAddress: auction.currencyContractAddress,
      };
    }

    const listing = await getListing({ contract, listingId: parsed.id });

    return {
      id: routeId,
      numericId: listing.id,
      type: "direct",
      title: listing.asset.metadata?.name || `Listing #${listing.id.toString()}`,
      description: readAssetDescription(listing.asset),
      assetUrl: readAssetImage(listing.asset),
      sellerWallet: listing.creatorAddress,
      status: listing.status,
      startPriceEth: fromWei(listing.pricePerToken),
      highestBidEth: null,
      buyoutPriceEth: fromWei(listing.pricePerToken),
      minimumBidEth: null,
      bidCount: null,
      endsAt: new Date(Number(listing.endTimeInSeconds) * 1000).toISOString(),
      startsAt: new Date(Number(listing.startTimeInSeconds) * 1000).toISOString(),
      marketplaceAddress: getMarketplaceContractAddress(),
      chainLabel: getMarketplaceChainLabel(),
      assetContractAddress: listing.assetContractAddress,
      tokenId: listing.tokenId.toString(),
      currencyContractAddress: listing.currencyContractAddress,
    };
  } catch {
    return null;
  }
}

export function getMarketplaceExplorerUrl(path: "address" | "tx", value: string) {
  return getConfiguredMarketplaceExplorerUrl(path, value);
}
