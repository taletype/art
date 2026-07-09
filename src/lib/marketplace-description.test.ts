import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAllAuctions, getAllValidListings, getAuction } from "thirdweb/extensions/marketplace";
import { parseListingRouteId } from "@/lib/thirdweb-config";
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
const mockParseListingRouteId = vi.mocked(parseListingRouteId);

describe("marketplace description fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllValidListings.mockResolvedValue([]);
  });

  it("uses prepared catalog copy when listing metadata has no description", async () => {
    mockGetAllAuctions.mockResolvedValue([
      {
        id: 7n,
        asset: {
          metadata: {
            name: "Untitled Marketplace Work",
          },
        },
        creatorAddress: "0xauctioncreator",
        status: "ACTIVE",
        minimumBidAmount: 1_000_000_000_000_000_000n,
        buyoutBidAmount: 2_000_000_000_000_000_000n,
        startTimeInSeconds: 1_700_000_000n,
        endTimeInSeconds: 1_700_003_600n,
      },
    ] as Awaited<ReturnType<typeof getAllAuctions>>);

    await expect(listMarketplaceEntries(1)).resolves.toEqual([
      expect.objectContaining({
        id: "auction-7",
        description: "Catalog notes are being prepared for this marketplace listing.",
      }),
    ]);
  });

  it("trims marketplace metadata descriptions before rendering", async () => {
    mockGetAllAuctions.mockResolvedValue([
      {
        id: 8n,
        asset: {
          metadata: {
            name: "Cataloged Marketplace Work",
            description: "  A concise marketplace note.  ",
          },
        },
        creatorAddress: "0xauctioncreator",
        status: "ACTIVE",
        minimumBidAmount: 1_000_000_000_000_000_000n,
        buyoutBidAmount: 2_000_000_000_000_000_000n,
        startTimeInSeconds: 1_700_000_000n,
        endTimeInSeconds: 1_700_003_600n,
      },
    ] as Awaited<ReturnType<typeof getAllAuctions>>);

    await expect(listMarketplaceEntries(1)).resolves.toEqual([
      expect.objectContaining({
        id: "auction-8",
        description: "A concise marketplace note.",
      }),
    ]);
  });

  it("uses prepared catalog copy when detail metadata has no description", async () => {
    mockParseListingRouteId.mockReturnValue({ kind: "auction", id: 9n });
    mockGetAuction.mockResolvedValue({
      id: 9n,
      asset: {
        metadata: {
          name: "Detail Marketplace Work",
        },
      },
      creatorAddress: "0xauctioncreator",
      status: "ACTIVE",
      minimumBidAmount: 1_000_000_000_000_000_000n,
      buyoutBidAmount: 2_000_000_000_000_000_000n,
      startTimeInSeconds: 1_700_000_000n,
      endTimeInSeconds: 1_700_003_600n,
      assetContractAddress: "0xassetcontract",
      tokenId: 9n,
      currencyContractAddress: "0xcurrency",
    } as Awaited<ReturnType<typeof getAuction>>);

    await expect(getMarketplaceDetail("auction-9")).resolves.toEqual(
      expect.objectContaining({
        id: "auction-9",
        description: "Catalog notes are being prepared for this marketplace listing.",
      }),
    );
  });
});
