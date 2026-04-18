import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CreateAuctionRequest, PlaceBidRequest } from "@/types/offchainAuction";

type AuctionRow = {
  id: string;
  seller_wallet: string;
  title: string;
  description: string;
  asset_url: string;
  starts_at: string;
  ends_at: string;
  start_price_lamports: number;
  min_increment_lamports: number;
  status: "draft" | "live" | "ended" | "settled" | "cancelled";
  winner_bid_id: string | null;
  created_at: string;
  updated_at: string;
};

type BidRow = {
  id: string;
  auction_id: string;
  bidder_wallet: string;
  amount_lamports: number;
  is_winning: boolean;
  created_at: string;
};

export async function createOffchainAuction(input: CreateAuctionRequest) {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    throw new Error("Invalid auction schedule. endsAt must be after startsAt.");
  }

  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("offchain_auctions")
    .insert({
      seller_wallet: input.sellerWallet,
      title: input.title,
      description: input.description,
      asset_url: input.assetUrl,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      start_price_lamports: input.startPriceLamports,
      min_increment_lamports: input.minIncrementLamports,
      status: "live",
    })
    .select("*")
    .single<AuctionRow>();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create auction");
  }

  return data;
}

export async function listOffchainAuctions(status?: AuctionRow["status"], limit = 20) {
  const db = createSupabaseAdminClient();
  let query = db
    .from("offchain_auctions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.returns<AuctionRow[]>();

  if (error) {
    throw new Error(error.message || "Failed to list auctions");
  }

  return data ?? [];
}

export async function placeOffchainBid(auctionId: string, input: PlaceBidRequest) {
  const db = createSupabaseAdminClient();
  const { data: auction, error: auctionError } = await db
    .from("offchain_auctions")
    .select("*")
    .eq("id", auctionId)
    .single<AuctionRow>();

  if (auctionError || !auction) {
    throw new Error("Auction not found");
  }

  if (auction.status !== "live") {
    throw new Error("Auction is not open for bids");
  }

  const now = Date.now();
  const startsAt = new Date(auction.starts_at).getTime();
  const endsAt = new Date(auction.ends_at).getTime();
  if (now < startsAt || now >= endsAt) {
    throw new Error("Auction is outside active bidding window");
  }

  const { data: highestBid, error: highestBidError } = await db
    .from("offchain_bids")
    .select("*")
    .eq("auction_id", auctionId)
    .order("amount_lamports", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<BidRow>();

  if (highestBidError) {
    throw new Error(highestBidError.message || "Failed to evaluate highest bid");
  }

  const minimumAllowed = highestBid
    ? highestBid.amount_lamports + auction.min_increment_lamports
    : auction.start_price_lamports;

  if (input.amountLamports < minimumAllowed) {
    throw new Error(`Bid too low. Minimum is ${minimumAllowed} lamports.`);
  }

  if (highestBid) {
    const { error: demoteError } = await db
      .from("offchain_bids")
      .update({ is_winning: false })
      .eq("id", highestBid.id);

    if (demoteError) {
      throw new Error(demoteError.message || "Failed to update existing winner");
    }
  }

  const { data: bid, error: bidError } = await db
    .from("offchain_bids")
    .insert({
      auction_id: auctionId,
      bidder_wallet: input.bidderWallet,
      amount_lamports: input.amountLamports,
      is_winning: true,
    })
    .select("*")
    .single<BidRow>();

  if (bidError || !bid) {
    throw new Error(bidError?.message || "Failed to place bid");
  }

  return { auctionId, bidId: bid.id, amountLamports: bid.amount_lamports };
}

export async function closeOffchainAuction(auctionId: string, closedByWallet: string) {
  const db = createSupabaseAdminClient();
  const { data: auction, error: auctionError } = await db
    .from("offchain_auctions")
    .select("*")
    .eq("id", auctionId)
    .single<AuctionRow>();

  if (auctionError || !auction) {
    throw new Error("Auction not found");
  }

  if (auction.seller_wallet !== closedByWallet) {
    throw new Error("Only seller can close this auction");
  }

  if (auction.status !== "live") {
    throw new Error(`Auction cannot be closed from status ${auction.status}`);
  }

  const { data: winningBid, error: bidError } = await db
    .from("offchain_bids")
    .select("*")
    .eq("auction_id", auctionId)
    .eq("is_winning", true)
    .order("amount_lamports", { ascending: false })
    .limit(1)
    .maybeSingle<BidRow>();

  if (bidError) {
    throw new Error(bidError.message || "Failed to fetch winning bid");
  }

  const { data: updatedAuction, error: updateError } = await db
    .from("offchain_auctions")
    .update({
      status: "ended",
      winner_bid_id: winningBid?.id ?? null,
    })
    .eq("id", auctionId)
    .select("*")
    .single<AuctionRow>();

  if (updateError || !updatedAuction) {
    throw new Error(updateError?.message || "Failed to close auction");
  }

  return {
    auction: updatedAuction,
    winningBid,
  };
}
