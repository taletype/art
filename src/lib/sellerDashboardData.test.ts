import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthenticatedAppUser } from "@/lib/auth";
import { listSellerArtworks, listSellerArtworksByWallet } from "@/lib/seller";
import { getSellerDashboardData } from "@/lib/sellerDashboardData";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedAppUser: vi.fn(),
}));

vi.mock("@/lib/seller", () => ({
  listSellerArtworks: vi.fn(),
  listSellerArtworksByWallet: vi.fn(),
}));

const mockGetAuthenticatedAppUser = vi.mocked(getAuthenticatedAppUser);
const mockListSellerArtworks = vi.mocked(listSellerArtworks);
const mockListSellerArtworksByWallet = vi.mocked(listSellerArtworksByWallet);

describe("getSellerDashboardData", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty anonymous dashboard when no user is signed in", async () => {
    mockGetAuthenticatedAppUser.mockResolvedValue(null);

    await expect(getSellerDashboardData()).resolves.toEqual({
      email: null,
      walletAddress: null,
      artworks: [],
    });

    expect(mockListSellerArtworks).not.toHaveBeenCalled();
    expect(mockListSellerArtworksByWallet).not.toHaveBeenCalled();
  });

  it("combines owner and wallet artwork without duplicating shared records", async () => {
    const walletAddress = "0x1234567890abcdef1234567890abcdef12345678";
    const ownerArtwork = { id: "owner-artwork", title: "Owner artwork" };
    const sharedArtwork = { id: "shared-artwork", title: "Shared artwork" };
    const walletArtwork = { id: "wallet-artwork", title: "Wallet artwork" };

    mockGetAuthenticatedAppUser.mockResolvedValue({
      id: "user-1",
      email: "artist@example.test",
      walletAddress,
    });
    mockListSellerArtworks.mockResolvedValue([ownerArtwork, sharedArtwork]);
    mockListSellerArtworksByWallet.mockResolvedValue([sharedArtwork, walletArtwork]);

    await expect(getSellerDashboardData()).resolves.toEqual({
      email: "artist@example.test",
      walletAddress,
      artworks: [ownerArtwork, sharedArtwork, walletArtwork],
    });

    expect(mockListSellerArtworks).toHaveBeenCalledWith("user-1");
    expect(mockListSellerArtworksByWallet).toHaveBeenCalledWith(walletAddress);
  });
});
