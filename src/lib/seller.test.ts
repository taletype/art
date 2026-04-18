import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  finalizeArtworkMintForSolanaDevnet,
  finalizeSellerAuction,
} from "@/lib/seller";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  assertListingExists,
  assertMintedNftOwnedBySeller,
  confirmSolanaTransaction,
} from "@/lib/solanaSellerTransactions";

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/solanaSellerTransactions", () => ({
  prepareSolanaMintTransaction: vi.fn(),
  prepareSolanaListingTransaction: vi.fn(),
  confirmSolanaTransaction: vi.fn(),
  assertMintedNftOwnedBySeller: vi.fn(),
  assertListingExists: vi.fn(),
}));

const mockedCreateSupabaseAdminClient = vi.mocked(createSupabaseAdminClient);
const mockedConfirmSolanaTransaction = vi.mocked(confirmSolanaTransaction);
const mockedAssertMintedNftOwnedBySeller = vi.mocked(assertMintedNftOwnedBySeller);
const mockedAssertListingExists = vi.mocked(assertListingExists);

function createSupabaseMock() {
  const artwork = {
    id: "artwork-1",
    owner_user_id: "user-1",
    seller_flow_status: "draft",
    seller_wallet: "So11111111111111111111111111111111111111112",
    artist_wallet: "So11111111111111111111111111111111111111112",
    title: "Harbor Study",
    description: "Oil on canvas",
    image_url: "https://example.com/harbor.jpg",
    thirdweb_token_id: null,
    thirdweb_contract_address: null,
  };

  const updateArtworkSingle = vi.fn().mockResolvedValue({
    data: { ...artwork, seller_flow_status: "prepared", sync_status: "mint_confirmed" },
    error: null,
  });
  const insertAuctionSingle = vi.fn().mockResolvedValue({
    data: { id: "auction-1", artwork_id: artwork.id, thirdweb_listing_id: "listing-1" },
    error: null,
  });

  return {
    from(table: string) {
      if (table === "artworks") {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      single: vi.fn().mockResolvedValue({ data: artwork, error: null }),
                    };
                  },
                };
              },
            };
          },
          update() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      select() {
                        return {
                          single: updateArtworkSingle,
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (table === "offchain_auctions") {
        return {
          select() {
            return {
              eq() {
                return {
                  in: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                };
              },
            };
          },
          insert() {
            return {
              select() {
                return {
                  single: insertAuctionSingle,
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
    spies: {
      updateArtworkSingle,
      insertAuctionSingle,
    },
  };
}

describe("seller finalize flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the artwork only after a confirmed mint transaction", async () => {
    const supabase = createSupabaseMock();
    mockedCreateSupabaseAdminClient.mockReturnValue(supabase as never);
    mockedConfirmSolanaTransaction.mockResolvedValue({ explorerUrl: "https://explorer.solana.com/tx/abc?cluster=devnet" });
    mockedAssertMintedNftOwnedBySeller.mockResolvedValue({
      assetUrl: "https://explorer.solana.com/address/mint?cluster=devnet",
    });

    const result = await finalizeArtworkMintForSolanaDevnet({
      artworkId: "artwork-1",
      ownerUserId: "user-1",
      sellerWallet: "So11111111111111111111111111111111111111112",
      txSignature: "signature-12345678901234567890123456789012",
      mintAddress: "So11111111111111111111111111111111111111112",
      metadataAddress: "4Nd1m9J2Y5cP4Zcfq8sWz6HXe1gFjvNt2WwNPs3mE4Fn",
      tokenAccountAddress: "6QWeT6FpJrm8AF1btu6WH2k2Xhq6t5vbheKVfQavmeoZ",
      recentBlockhash: "blockhash-12345678901234567890",
      lastValidBlockHeight: 88,
    });

    expect(mockedConfirmSolanaTransaction).toHaveBeenCalled();
    expect(mockedAssertMintedNftOwnedBySeller).toHaveBeenCalled();
    expect(supabase.spies.updateArtworkSingle).toHaveBeenCalled();
    expect(result.seller_flow_status).toBe("prepared");
  });

  it("does not create an auction row when the listing confirmation fails", async () => {
    const supabase = createSupabaseMock();
    mockedCreateSupabaseAdminClient.mockReturnValue(supabase as never);
    mockedConfirmSolanaTransaction.mockRejectedValue(new Error("Solana transaction failed on devnet."));

    await expect(
      finalizeSellerAuction({
        artworkId: "artwork-1",
        ownerUserId: "user-1",
        sellerWallet: "So11111111111111111111111111111111111111112",
        startsAt: "2026-04-18T10:00:00.000Z",
        endsAt: "2026-04-19T10:00:00.000Z",
        startPriceLamports: 1_000_000_000,
        minIncrementLamports: 100_000_000,
        txSignature: "signature-12345678901234567890123456789012",
        listingAddress: "4Nd1m9J2Y5cP4Zcfq8sWz6HXe1gFjvNt2WwNPs3mE4Fn",
        mintAddress: "So11111111111111111111111111111111111111112",
        recentBlockhash: "blockhash-12345678901234567890",
        lastValidBlockHeight: 88,
      }),
    ).rejects.toThrow("Solana transaction failed on devnet.");

    expect(mockedAssertListingExists).not.toHaveBeenCalled();
    expect(supabase.spies.insertAuctionSingle).not.toHaveBeenCalled();
  });
});
