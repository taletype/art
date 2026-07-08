import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAllAuctions, getAllValidListings } from "thirdweb/extensions/marketplace";
import { listMarketplaceEntries } from "@/lib/marketplace";

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
  isMarketplaceConfigured: vi.fn(() => true),
  parseListingRouteId: vi.fn(),
}));

const mockGetAllAuctions = vi.mocked(getAllAuctions);
const mockGetAllValidListings = vi.mocked(getAllValidListings);

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
});
