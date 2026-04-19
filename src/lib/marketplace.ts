import { getAllAuctions, getAllValidListings, getAuction, getListing } from "thirdweb/extensions/marketplace";
import {
  getListingRouteId,
  getMarketplaceChain,
  getMarketplaceChainLabel,
  getMarketplaceContract,
  getMarketplaceContractAddress,
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

function fromWei(value: bigint | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value) / 1_000_000_000_000_000_000;
}

function readAssetImage(asset: { metadata?: { image?: string | null } } | undefined) {
  return asset?.metadata?.image || "";
}

function readAssetDescription(asset: { metadata?: { description?: string | null } } | undefined) {
  return asset?.metadata?.description || "";
}

export async function listMarketplaceEntries(limit = 24): Promise<MarketplaceEntry[]> {
  if (!isMarketplaceConfigured()) {
    return [];
  }

  const contract = getMarketplaceContract();
  const [auctions, listings] = await Promise.all([
    getAllAuctions({ contract, start: 0, count: BigInt(limit) }),
    getAllValidListings({ contract, start: 0, count: BigInt(limit) }),
  ]);

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

  return [...auctionEntries, ...directEntries].sort(
    (left, right) => new Date(right.endsAt).getTime() - new Date(left.endsAt).getTime(),
  );
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
  const chain = getMarketplaceChain();
  const suffix = chain.id === 8453 ? "" : "?network=base-sepolia";
  return `https://basescan.org/${path}/${value}${suffix}`;
}
