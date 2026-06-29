import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAllAuctions, getAllValidListings } from "thirdweb/extensions/marketplace";
import { isMarketplaceConfigured } from "@/lib/thirdweb-config";
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
  getMarketplaceExplorerUrl: vi.fn((path: "address" | "tx", value: string) => `https://sepolia.basescan.org/${path}/${value}`),
  isMarketplaceConfigured: vi.fn(() => true),
  parseListingRouteId: vi.fn(),
}));

const mockGetAllAuctions = vi.mocked(getAllAuctions);
const mockGetAllValidListings = vi.mocked(getAllValidListings);
const mockIsMarketplaceConfigured = vi.mocked(isMarketplaceConfigured);

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

  it("falls back to an empty list when Thirdweb listing reads fail", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockGetAllAuctions.mockRejectedValue(new Error("RPC unavailable"));

    await expect(listMarketplaceEntries()).resolves.toEqual([]);
    expect(warn).toHaveBeenCalledWith("Unable to load marketplace entries.", expect.any(Error));

    warn.mockRestore();
  });
});
