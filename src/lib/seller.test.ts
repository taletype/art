import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listSellerArtworks, listSellerArtworksByWallet } from "./seller";

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

const mockCreateSupabaseAdminClient = vi.mocked(createSupabaseAdminClient);

describe("seller artwork queries", () => {
  const from = vi.fn();
  const select = vi.fn();
  const eq = vi.fn();
  const ilike = vi.fn();
  const order = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    const query = { select, eq, ilike, order };
    from.mockReturnValue(query);
    select.mockReturnValue(query);
    eq.mockReturnValue(query);
    ilike.mockReturnValue(query);
    order.mockResolvedValue({
      data: [
        { id: "listed-artwork", thirdweb_listing_id: "auction-7" },
        { id: "draft-artwork", thirdweb_listing_id: null },
      ],
      error: null,
    });

    mockCreateSupabaseAdminClient.mockReturnValue({
      from,
    } as unknown as ReturnType<typeof createSupabaseAdminClient>);
  });

  it("uses owner user filters and maps linked listing ids", async () => {
    const artworks = await listSellerArtworks("user-1");

    expect(from).toHaveBeenCalledWith("artworks");
    expect(select).toHaveBeenCalledWith("*");
    expect(eq).toHaveBeenCalledWith("owner_user_id", "user-1");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(artworks).toEqual([
      { id: "listed-artwork", thirdweb_listing_id: "auction-7", linked_auction_id: "auction-7" },
      { id: "draft-artwork", thirdweb_listing_id: null, linked_auction_id: null },
    ]);
  });

  it("uses case-insensitive seller wallet filters and maps linked listing ids", async () => {
    const sellerWallet = "0x1234567890ABCDEF1234567890aBcDeF12345678";

    const artworks = await listSellerArtworksByWallet(sellerWallet);

    expect(from).toHaveBeenCalledWith("artworks");
    expect(select).toHaveBeenCalledWith("*");
    expect(ilike).toHaveBeenCalledWith("seller_wallet", sellerWallet);
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(artworks).toEqual([
      { id: "listed-artwork", thirdweb_listing_id: "auction-7", linked_auction_id: "auction-7" },
      { id: "draft-artwork", thirdweb_listing_id: null, linked_auction_id: null },
    ]);
  });
});
