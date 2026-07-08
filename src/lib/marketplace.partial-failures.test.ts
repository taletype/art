import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAllAuctions, getAllValidListings } from "thirdweb/extensions/marketplace";
import { listMarketplaceEntries } from "@/lib/marketplace";
import { isMarketplaceConfigured } from "@/lib/thirdweb-config";

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
const mockIsMarketplaceConfigured = vi.mocked(isMarketplaceConfigured);

describe("listMarketplaceEntries partial failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMarketplaceConfigured.mockReturnValue(true);
  });

  it("keeps auction entries when direct listing reads fail", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const rpcError = new Error("Direct listing RPC unavailable");

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
    mockGetAllValidListings.mockRejectedValue(rpcError);

    await expect(listMarketplaceEntries(12)).resolves.toEqual([
      expect.objectContaining({
        id: "auction-7",
        type: "auction",
        title: "Auction Work",
      }),
    ]);
    expect(warn).toHaveBeenCalledWith("Unable to load marketplace entries.", rpcError);

    warn.mockRestore();
  });
});
