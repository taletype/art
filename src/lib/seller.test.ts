import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSellerArtwork, listSellerArtworks, listSellerArtworksByWallet } from "./seller";

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

const mockCreateSupabaseAdminClient = vi.mocked(createSupabaseAdminClient);

describe("seller artwork queries", () => {
  const from = vi.fn();
  const select = vi.fn();
  const eq = vi.fn();
  const ilike = vi.fn();
  const insert = vi.fn();
  const order = vi.fn();
  const single = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    const query = { select, eq, ilike, insert, order, single };
    from.mockReturnValue(query);
    select.mockReturnValue(query);
    eq.mockReturnValue(query);
    ilike.mockReturnValue(query);
    insert.mockReturnValue(query);
    order.mockResolvedValue({
      data: [
        { id: "listed-artwork", thirdweb_listing_id: "auction-7" },
        { id: "draft-artwork", thirdweb_listing_id: null },
      ],
      error: null,
    });
    single.mockResolvedValue({ data: { id: "created-artwork" }, error: null });

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

  it("creates seller artwork drafts with the expected insert payload", async () => {
    const artwork = await createSellerArtwork({
      ownerUserId: "user-1",
      sellerWallet: "0x1234567890abcdef1234567890abcdef12345678",
      title: "Test Artwork",
      description: "Human-made test artwork",
      imageUrl: "https://example.test/artwork.jpg",
      medium: "Oil",
      category: "Painting",
      provenanceText: "Studio records",
      priceEth: 1.25,
    });

    expect(from).toHaveBeenCalledWith("artworks");
    expect(insert).toHaveBeenCalledWith({
      title: "Test Artwork",
      description: "Human-made test artwork",
      artist_name: "0x1234567890abcdef1234567890abcdef12345678",
      artist_wallet: "0x1234567890abcdef1234567890abcdef12345678",
      owner_user_id: "user-1",
      seller_wallet: "0x1234567890abcdef1234567890abcdef12345678",
      image_url: "https://example.test/artwork.jpg",
      medium: "Oil",
      category: "Painting",
      provenance_text: "Studio records",
      reserve_price_lamports: null,
      price_sol: 1.25,
      status: "draft",
      seller_flow_status: "draft",
    });
    expect(select).toHaveBeenCalledWith("*");
    expect(single).toHaveBeenCalledOnce();
    expect(artwork).toEqual({ id: "created-artwork" });
  });

  it("uses draft defaults and surfaces Supabase insert errors when artwork creation fails", async () => {
    const error = new Error("insert failed");
    single.mockResolvedValueOnce({ data: null, error });

    await expect(
      createSellerArtwork({
        ownerUserId: null,
        sellerWallet: "0x1234567890abcdef1234567890abcdef12345678",
        title: "Untitled",
        description: "Draft description",
        imageUrl: "https://example.test/draft.jpg",
      }),
    ).rejects.toThrow(error);

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_user_id: null,
        medium: null,
        category: null,
        provenance_text: null,
        price_sol: 0,
        status: "draft",
        seller_flow_status: "draft",
      }),
    );
  });
});