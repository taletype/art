import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeOffchainAuction, placeOffchainBid } from "./offchainAuctions";
import {
  createBid,
  getAuctionById,
  listBidsForAuction,
  updateAuction,
  updateBid,
} from "@/lib/supabase-db";

vi.mock("@/lib/supabase-db", () => ({
  listAuctions: vi.fn(),
  getAuctionById: vi.fn(),
  createAuction: vi.fn(),
  updateAuction: vi.fn(),
  listBidsForAuction: vi.fn(),
  createBid: vi.fn(),
  updateBid: vi.fn(),
}));

const mockedGetAuctionById = vi.mocked(getAuctionById);
const mockedListBidsForAuction = vi.mocked(listBidsForAuction);
const mockedCreateBid = vi.mocked(createBid);
const mockedUpdateBid = vi.mocked(updateBid);
const mockedUpdateAuction = vi.mocked(updateAuction);

const now = new Date("2026-04-18T10:00:00.000Z");

const liveAuction = {
  id: "auction-1",
  seller_wallet: "Seller1111111111111111111111111111111111111",
  title: "Harbor Study",
  description: "Auction test fixture",
  asset_url: "https://example.com/artwork.jpg",
  starts_at: "2026-04-18T09:00:00.000Z",
  ends_at: "2026-04-18T11:00:00.000Z",
  start_price_lamports: 1_000_000_000,
  min_increment_lamports: 100_000_000,
  status: "live",
  winner_bid_id: null,
  created_at: "2026-04-17T09:00:00.000Z",
  updated_at: "2026-04-17T09:00:00.000Z",
};

describe("placeOffchainBid", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts the opening bid when it meets the auction start price", async () => {
    mockedGetAuctionById.mockResolvedValue(liveAuction);
    mockedListBidsForAuction.mockResolvedValue([]);
    mockedCreateBid.mockResolvedValue({
      id: "bid-1",
      auction_id: liveAuction.id,
      bidder_wallet: "Bidder1111111111111111111111111111111111111",
      amount_lamports: 1_000_000_000,
      is_winning: true,
      created_at: now.toISOString(),
    });

    const result = await placeOffchainBid(liveAuction.id, {
      bidderWallet: "Bidder1111111111111111111111111111111111111",
      amountLamports: 1_000_000_000,
    });

    expect(result).toEqual({
      auctionId: liveAuction.id,
      bidId: "bid-1",
      amountLamports: 1_000_000_000,
    });
    expect(mockedUpdateBid).not.toHaveBeenCalled();
    expect(mockedCreateBid).toHaveBeenCalledWith({
      auction_id: liveAuction.id,
      bidder_wallet: "Bidder1111111111111111111111111111111111111",
      amount_lamports: 1_000_000_000,
      is_winning: true,
    });
  });

  it("rejects bids below the current high bid plus increment", async () => {
    mockedGetAuctionById.mockResolvedValue(liveAuction);
    mockedListBidsForAuction.mockResolvedValue([
      {
        id: "bid-0",
        auction_id: liveAuction.id,
        bidder_wallet: "Bidder2222222222222222222222222222222222222",
        amount_lamports: 1_250_000_000,
        is_winning: true,
        created_at: "2026-04-18T09:30:00.000Z",
      },
    ]);

    await expect(
      placeOffchainBid(liveAuction.id, {
        bidderWallet: "Bidder1111111111111111111111111111111111111",
        amountLamports: 1_300_000_000,
      }),
    ).rejects.toThrow("Bid too low. Minimum is 1350000000 lamports.");

    expect(mockedUpdateBid).not.toHaveBeenCalled();
    expect(mockedCreateBid).not.toHaveBeenCalled();
  });

  it("marks the previous winner as outbid before creating a higher bid", async () => {
    mockedGetAuctionById.mockResolvedValue(liveAuction);
    mockedListBidsForAuction.mockResolvedValue([
      {
        id: "bid-0",
        auction_id: liveAuction.id,
        bidder_wallet: "Bidder2222222222222222222222222222222222222",
        amount_lamports: 1_250_000_000,
        is_winning: true,
        created_at: "2026-04-18T09:30:00.000Z",
      },
    ]);
    mockedUpdateBid.mockResolvedValue({
      id: "bid-0",
      is_winning: false,
    });
    mockedCreateBid.mockResolvedValue({
      id: "bid-2",
      auction_id: liveAuction.id,
      bidder_wallet: "Bidder1111111111111111111111111111111111111",
      amount_lamports: 1_350_000_000,
      is_winning: true,
      created_at: now.toISOString(),
    });

    const result = await placeOffchainBid(liveAuction.id, {
      bidderWallet: "Bidder1111111111111111111111111111111111111",
      amountLamports: 1_350_000_000,
    });

    expect(mockedUpdateBid).toHaveBeenCalledWith("bid-0", { is_winning: false });
    expect(mockedCreateBid).toHaveBeenCalledWith({
      auction_id: liveAuction.id,
      bidder_wallet: "Bidder1111111111111111111111111111111111111",
      amount_lamports: 1_350_000_000,
      is_winning: true,
    });
    expect(result.bidId).toBe("bid-2");
  });

  it("rejects bids when the auction is outside the live window", async () => {
    mockedGetAuctionById.mockResolvedValue({
      ...liveAuction,
      starts_at: "2026-04-18T11:00:00.000Z",
      ends_at: "2026-04-18T12:00:00.000Z",
    });

    await expect(
      placeOffchainBid(liveAuction.id, {
        bidderWallet: "Bidder1111111111111111111111111111111111111",
        amountLamports: 1_000_000_000,
      }),
    ).rejects.toThrow("Auction is outside active bidding window");
  });
});

describe("closeOffchainAuction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects closing requests from wallets that do not own the auction", async () => {
    mockedGetAuctionById.mockResolvedValue(liveAuction);

    await expect(closeOffchainAuction(liveAuction.id, "NotTheSeller1111111111111111111111111111111")).rejects.toThrow(
      "Only seller can close this auction",
    );
  });

  it("ends the auction and persists the winning bid id", async () => {
    mockedGetAuctionById.mockResolvedValue(liveAuction);
    mockedListBidsForAuction.mockResolvedValue([
      {
        id: "bid-5",
        auction_id: liveAuction.id,
        bidder_wallet: "Bidder3333333333333333333333333333333333333",
        amount_lamports: 1_500_000_000,
        is_winning: true,
        created_at: "2026-04-18T09:45:00.000Z",
      },
    ]);
    mockedUpdateAuction.mockResolvedValue({
      ...liveAuction,
      status: "ended",
      winner_bid_id: "bid-5",
    });

    const result = await closeOffchainAuction(liveAuction.id, liveAuction.seller_wallet);

    expect(mockedUpdateAuction).toHaveBeenCalledWith(liveAuction.id, {
      status: "ended",
      winner_bid_id: "bid-5",
    });
    expect(result.winningBid?.id).toBe("bid-5");
    expect(result.auction.winner_bid_id).toBe("bid-5");
  });
});
