import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAllAuctions, getAllValidListings, getAuction, getListing } from "thirdweb/extensions/marketplace";
import { isMarketplaceConfigured, parseListingRouteId } from "@/lib/thirdweb-config";
import { getMarketplaceDetail, listMarketplaceEntries } from "@/lib/marketplace";

vi.mock("thirdweb/extensions/marketplace", () => ({
  getAllAuctions: vi.fn(),
  getAllValidListings: vi.fn(),
  getAuction: vi.fn(),
  getListing: vi.fn(),
}));

vi.mock("@/lib/thirdweb-config", () => ({
  getListingRouteId: (type: "auction" | "direct", id: bigint | string) => `${type}-${id.toString()}`,
  getMarketplaceChainLabel: vi.fn(() => "Base Sepolia"),
  getMarketplaceContract: vi.fn(() => ({ address: "0x1234567890abcdef1234567890abcdef12345678" })),
  getMarketplaceContractAddress: vi.fn(() => "0x1234567890abcdef1234567890abcdef12345678"),
  getMarketplaceExplorerUrl: vi.fn((path: "address" | "tx", value: string) => `https://sepolia.basescan.org/${path}/${value}`),
  isMarketplaceConfigured: vi.fn(() => true),
  parseListingRouteId: vi.fn(),
}));

const mockGetAllAuctions = vi.mocked(getAllAuctions);
const mockGetAllValidListings = vi.mocked(getAllValidListings);
const mockGetAuction = vi.mocked(getAuction);
const mockGetListing = vi.mocked(getListing);
const mockIsMarketplaceConfigured = vi.mocked(isMarketplaceConfigured);
const mockParseListingRouteId = vi.mocked(parseListingRouteId);

describe("listMarketplaceEntries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMarketplaceConfigured.mockReturnValue(true);
    mockGetAllAuctions.mockResolvedValue([]);
    mockGetAllValidListings.mockResolvedValue([]);
  });

  it("returns no entries without querying Thirdweb when marketplace env is missing", async () => {
    mockIsMarketplaceConfigured.mockReturnValue(false);

    await expect(listMarketplaceEntries()).resolves.toEqual([]);
    expect(mockGetAllAuctions).not.toHaveBeenCalled();
    expect(mockGetAllValidListings).not.toHaveBeenCalled();
  });

  it("maps auction and direct listings into marketplace entries", async () => {
    mockGetAllAuctions.mockResolvedValue([
      {
        id: 7n,
        asset: {
          metadata: {
            name: "Auction Work",
            description: "Auction description",
            image: "ipfs://auction-image",
          },
        },
        creatorAddress: "0xauctioncreator",
        status: "ACTIVE",
        minimumBidAmount: 1_500_000_000_000_000_000n,
        buyoutBidAmount: 3_000_000_000_000_000_000n,
        startTimeInSeconds: 1_700_000_000n,
        endTimeInSeconds: 1_700_003_600n,
      },
    ] as Awaited<ReturnType<typeof getAllAuctions>>);
    mockGetAllValidListings.mockResolvedValue([
      {
        id: 11n,
        asset: {
          metadata: {
            name: "Direct Work",
            description: "Direct description",
            image: "ipfs://direct-image",
          },
        },
        creatorAddress: "0xdirectcreator",
        status: "ACTIVE",
        pricePerToken: 2_000_000_000_000_000_000n,
        startTimeInSeconds: 1_700_000_300n,
        endTimeInSeconds: 1_700_004_000n,
      },
    ] as Awaited<ReturnType<typeof getAllValidListings>>);

    await expect(listMarketplaceEntries(12)).resolves.toEqual([
      {
        id: "direct-11",
        numericId: 11n,
        type: "direct",
        title: "Direct Work",
        description: "Direct description",
        assetUrl: "https://ipfs.io/ipfs/direct-image",
        sellerWallet: "0xdirectcreator",
        status: "ACTIVE",
        startPriceEth: 2,
        highestBidEth: null,
        buyoutPriceEth: 2,
        minimumBidEth: null,
        bidCount: null,
        endsAt: "2023-11-14T23:20:00.000Z",
        startsAt: "2023-11-14T22:18:20.000Z",
        marketplaceAddress: "0x1234567890abcdef1234567890abcdef12345678",
        chainLabel: "Base Sepolia",
      },
      {
        id: "auction-7",
        numericId: 7n,
        type: "auction",
        title: "Auction Work",
        description: "Auction description",
        assetUrl: "https://ipfs.io/ipfs/auction-image",
        sellerWallet: "0xauctioncreator",
        status: "ACTIVE",
        startPriceEth: 1.5,
        highestBidEth: null,
        buyoutPriceEth: 3,
        minimumBidEth: 1.5,
        bidCount: null,
        endsAt: "2023-11-14T23:13:20.000Z",
        startsAt: "2023-11-14T22:13:20.000Z",
        marketplaceAddress: "0x1234567890abcdef1234567890abcdef12345678",
        chainLabel: "Base Sepolia",
      },
    ]);
    expect(mockGetAllAuctions).toHaveBeenCalledWith(
      expect.objectContaining({
        start: 0,
        count: 12n,
        contract: expect.objectContaining({ address: "0x1234567890abcdef1234567890abcdef12345678" }),
      }),
    );
    expect(mockGetAllValidListings).toHaveBeenCalledWith(
      expect.objectContaining({
        start: 0,
        count: 12n,
        contract: expect.objectContaining({ address: "0x1234567890abcdef1234567890abcdef12345678" }),
      }),
    );
  });

  it("applies the overall limit after combining and sorting marketplace entries", async () => {
    mockGetAllAuctions.mockResolvedValue([
      {
        id: 1n,
        asset: { metadata: { name: "Earlier Auction" } },
        creatorAddress: "0xauctionone",
        status: "ACTIVE",
        minimumBidAmount: 1_000_000_000_000_000_000n,
        buyoutBidAmount: 2_000_000_000_000_000_000n,
        startTimeInSeconds: 1_700_000_000n,
        endTimeInSeconds: 1_700_002_000n,
      },
      {
        id: 2n,
        asset: { metadata: { name: "Latest Auction" } },
        creatorAddress: "0xauctiontwo",
        status: "ACTIVE",
        minimumBidAmount: 1_000_000_000_000_000_000n,
        buyoutBidAmount: 2_000_000_000_000_000_000n,
        startTimeInSeconds: 1_700_000_000n,
        endTimeInSeconds: 1_700_005_000n,
      },
    ] as Awaited<ReturnType<typeof getAllAuctions>>);
    mockGetAllValidListings.mockResolvedValue([
      {
        id: 3n,
        asset: { metadata: { name: "Middle Direct" } },
        creatorAddress: "0xdirectone",
        status: "ACTIVE",
        pricePerToken: 1_500_000_000_000_000_000n,
        startTimeInSeconds: 1_700_000_000n,
        endTimeInSeconds: 1_700_004_000n,
      },
      {
        id: 4n,
        asset: { metadata: { name: "Older Direct" } },
        creatorAddress: "0xdirecttwo",
        status: "ACTIVE",
        pricePerToken: 1_500_000_000_000_000_000n,
        startTimeInSeconds: 1_700_000_000n,
        endTimeInSeconds: 1_700_003_000n,
      },
    ] as Awaited<ReturnType<typeof getAllValidListings>>);

    const entries = await listMarketplaceEntries(2);

    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.id)).toEqual(["auction-2", "direct-3"]);
  });

  it("falls back to an empty list when Thirdweb listing reads fail", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockGetAllAuctions.mockRejectedValue(new Error("RPC unavailable"));

    await expect(listMarketplaceEntries()).resolves.toEqual([]);
    expect(warn).toHaveBeenCalledWith("Unable to load marketplace entries.", expect.any(Error));

    warn.mockRestore();
  });
});

describe("getMarketplaceDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMarketplaceConfigured.mockReturnValue(true);
    mockParseListingRouteId.mockReturnValue(null);
  });

  it("returns null without parsing or querying Thirdweb when marketplace env is missing", async () => {
    mockIsMarketplaceConfigured.mockReturnValue(false);

    await expect(getMarketplaceDetail("auction-7")).resolves.toBeNull();
    expect(mockParseListingRouteId).not.toHaveBeenCalled();
    expect(mockGetAuction).not.toHaveBeenCalled();
    expect(mockGetListing).not.toHaveBeenCalled();
  });

  it("returns null for malformed route ids without querying Thirdweb", async () => {
    await expect(getMarketplaceDetail("bad-value")).resolves.toBeNull();
    expect(mockParseListingRouteId).toHaveBeenCalledWith("bad-value");
    expect(mockGetAuction).not.toHaveBeenCalled();
    expect(mockGetListing).not.toHaveBeenCalled();
  });

  it("maps auction detail reads into marketplace details", async () => {
    mockParseListingRouteId.mockReturnValue({ kind: "auction", id: 7n });
    mockGetAuction.mockResolvedValue({
      id: 7n,
      asset: {
        metadata: {
          name: "Auction Work",
          description: "Auction description",
          image: "ipfs://auction-image",
        },
      },
      creatorAddress: "0xauctioncreator",
      status: "ACTIVE",
      minimumBidAmount: 1_500_000_000_000_000_000n,
      buyoutBidAmount: 3_000_000_000_000_000_000n,
      startTimeInSeconds: 1_700_000_000n,
      endTimeInSeconds: 1_700_003_600n,
      assetContractAddress: "0xassetcontract",
      tokenId: 123n,
      currencyContractAddress: "0xcurrency",
    } as Awaited<ReturnType<typeof getAuction>>);

    await expect(getMarketplaceDetail("auction-7")).resolves.toEqual({
      id: "auction-7",
      numericId: 7n,
      type: "auction",
      title: "Auction Work",
      description: "Auction description",
      assetUrl: "https://ipfs.io/ipfs/auction-image",
      sellerWallet: "0xauctioncreator",
      status: "ACTIVE",
      startPriceEth: 1.5,
      highestBidEth: null,
      buyoutPriceEth: 3,
      minimumBidEth: 1.5,
      bidCount: null,
      endsAt: "2023-11-14T23:13:20.000Z",
      startsAt: "2023-11-14T22:13:20.000Z",
      marketplaceAddress: "0x1234567890abcdef1234567890abcdef12345678",
      chainLabel: "Base Sepolia",
      assetContractAddress: "0xassetcontract",
      tokenId: "123",
      currencyContractAddress: "0xcurrency",
    });
    expect(mockGetAuction).toHaveBeenCalledWith(
      expect.objectContaining({
        auctionId: 7n,
        contract: expect.objectContaining({ address: "0x1234567890abcdef1234567890abcdef12345678" }),
      }),
    );
  });

  it("maps direct listing detail reads into marketplace details", async () => {
    mockParseListingRouteId.mockReturnValue({ kind: "direct", id: 11n });
    mockGetListing.mockResolvedValue({
      id: 11n,
      asset: {
        metadata: {
          name: "Direct Work",
          description: "Direct description",
          image: "ipfs://direct-image",
        },
      },
      creatorAddress: "0xdirectcreator",
      status: "ACTIVE",
      pricePerToken: 2_000_000_000_000_000_000n,
      startTimeInSeconds: 1_700_000_300n,
      endTimeInSeconds: 1_700_004_000n,
      assetContractAddress: "0xassetcontract",
      tokenId: 456n,
      currencyContractAddress: "0xcurrency",
    } as Awaited<ReturnType<typeof getListing>>);

    await expect(getMarketplaceDetail("direct-11")).resolves.toEqual({
      id: "direct-11",
      numericId: 11n,
      type: "direct",
      title: "Direct Work",
      description: "Direct description",
      assetUrl: "https://ipfs.io/ipfs/direct-image",
      sellerWallet: "0xdirectcreator",
      status: "ACTIVE",
      startPriceEth: 2,
      highestBidEth: null,
      buyoutPriceEth: 2,
      minimumBidEth: null,
      bidCount: null,
      endsAt: "2023-11-14T23:20:00.000Z",
      startsAt: "2023-11-14T22:18:20.000Z",
      marketplaceAddress: "0x1234567890abcdef1234567890abcdef12345678",
      chainLabel: "Base Sepolia",
      assetContractAddress: "0xassetcontract",
      tokenId: "456",
      currencyContractAddress: "0xcurrency",
    });
    expect(mockGetListing).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: 11n,
        contract: expect.objectContaining({ address: "0x1234567890abcdef1234567890abcdef12345678" }),
      }),
    );
  });

  it("returns null when Thirdweb detail reads fail", async () => {
    mockParseListingRouteId.mockReturnValue({ kind: "auction", id: 7n });
    mockGetAuction.mockRejectedValue(new Error("RPC unavailable"));

    await expect(getMarketplaceDetail("auction-7")).resolves.toBeNull();
  });
});