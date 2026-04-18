import {
  listAuctions,
  getAuctionById,
  createAuction,
  updateAuction,
  listBidsForAuction,
  createBid,
  updateBid,
} from "@/lib/supabase-db";
import type {
  CreateAuctionRequest,
  OffchainAuctionDetail,
  OffchainAuctionStatus,
  OffchainAuctionSummary,
  OffchainBid,
  PlaceBidRequest,
} from "@/types/offchainAuction";

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
  status: OffchainAuctionStatus;
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

const LAMPORTS_PER_SOL = 1_000_000_000;

function lamportsToSol(value: number) {
  return value / LAMPORTS_PER_SOL;
}

function mapBid(row: BidRow): OffchainBid {
  return {
    id: row.id,
    auctionId: row.auction_id,
    bidderWallet: row.bidder_wallet,
    amountLamports: row.amount_lamports,
    amountSol: lamportsToSol(row.amount_lamports),
    isWinning: row.is_winning,
    createdAt: row.created_at,
  };
}

function mapAuctionSummary(row: AuctionRow, bids: BidRow[] = []): OffchainAuctionSummary {
  const highestBidLamports = bids.reduce<number | null>((max, bid) => {
    if (max === null || bid.amount_lamports > max) {
      return bid.amount_lamports;
    }
    return max;
  }, null);

  return {
    id: row.id,
    sellerWallet: row.seller_wallet,
    title: row.title,
    description: row.description,
    assetUrl: row.asset_url,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    startPriceLamports: row.start_price_lamports,
    startPriceSol: lamportsToSol(row.start_price_lamports),
    minIncrementLamports: row.min_increment_lamports,
    minIncrementSol: lamportsToSol(row.min_increment_lamports),
    status: row.status,
    winnerBidId: row.winner_bid_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    highestBidLamports,
    highestBidSol: highestBidLamports === null ? null : lamportsToSol(highestBidLamports),
    bidCount: bids.length,
  };
}

async function getBidsForAuction(auctionId: string): Promise<BidRow[]> {
  const bids = await listBidsForAuction(auctionId);
  return bids.map(bid => ({
    id: bid.id,
    auction_id: bid.auction_id,
    bidder_wallet: bid.bidder_wallet,
    amount_lamports: bid.amount_lamports,
    is_winning: bid.is_winning,
    created_at: bid.created_at,
  }));
}

export async function createOffchainAuction(input: CreateAuctionRequest) {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    throw new Error("Invalid auction schedule. endsAt must be after startsAt.");
  }

  const data = await createAuction({
    seller_wallet: input.sellerWallet,
    title: input.title,
    description: input.description,
    asset_url: input.assetUrl,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    start_price_lamports: input.startPriceLamports,
    min_increment_lamports: input.minIncrementLamports,
    status: "live",
  });

  return data as AuctionRow;
}

export async function listOffchainAuctions(status?: AuctionRow["status"], limit = 20) {
  const auctions = await listAuctions(status, limit);
  return auctions.map(a => ({
    id: a.id,
    seller_wallet: a.seller_wallet,
    title: a.title,
    description: a.description,
    asset_url: a.asset_url,
    starts_at: a.starts_at,
    ends_at: a.ends_at,
    start_price_lamports: a.start_price_lamports,
    min_increment_lamports: a.min_increment_lamports,
    status: a.status,
    winner_bid_id: a.winner_bid_id,
    created_at: a.created_at,
    updated_at: a.updated_at,
  })) as AuctionRow[];
}

export async function listOffchainAuctionSummaries(status?: AuctionRow["status"], limit = 20) {
  const auctions = await listAuctions(status, limit);
  const summaries = await Promise.all(
    auctions.map(async (auction) => {
      const bids = await getBidsForAuction(auction.id);
      return mapAuctionSummary(auction as AuctionRow, bids);
    }),
  );

  return summaries;
}

export async function getOffchainAuctionById(auctionId: string): Promise<OffchainAuctionDetail | null> {
  const data = await getAuctionById(auctionId);
  if (!data) return null;

  const bids = await getBidsForAuction(auctionId);
  return {
    ...mapAuctionSummary(data as AuctionRow, bids),
    bids: bids.map(mapBid),
  };
}

export async function placeOffchainBid(auctionId: string, input: PlaceBidRequest) {
  const auction = await getAuctionById(auctionId);
  if (!auction) {
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

  const bids = await getBidsForAuction(auctionId);
  const highestBid = bids.length > 0 ? bids[0] : null;

  const minimumAllowed = highestBid
    ? highestBid.amount_lamports + auction.min_increment_lamports
    : auction.start_price_lamports;

  if (input.amountLamports < minimumAllowed) {
    throw new Error(`Bid too low. Minimum is ${minimumAllowed} lamports.`);
  }

  if (highestBid) {
    await updateBid(highestBid.id, { is_winning: false });
  }

  const bid = await createBid({
    auction_id: auctionId,
    bidder_wallet: input.bidderWallet,
    amount_lamports: input.amountLamports,
    is_winning: true,
  });

  return { auctionId, bidId: bid.id, amountLamports: bid.amount_lamports };
}

export async function closeOffchainAuction(auctionId: string, closedByWallet: string) {
  const auction = await getAuctionById(auctionId);
  if (!auction) {
    throw new Error("Auction not found");
  }

  if (auction.seller_wallet !== closedByWallet) {
    throw new Error("Only seller can close this auction");
  }

  if (auction.status !== "live") {
    throw new Error(`Auction cannot be closed from status ${auction.status}`);
  }

  const bids = await getBidsForAuction(auctionId);
  const winningBid = bids.find(b => b.is_winning) ?? null;

  const updatedAuction = await updateAuction(auctionId, {
    status: "ended",
    winner_bid_id: winningBid?.id ?? null,
  });

  return {
    auction: updatedAuction as AuctionRow,
    winningBid,
  };
}
