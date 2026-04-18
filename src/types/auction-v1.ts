export type AuctionStatus = "draft" | "live" | "ended" | "settled" | "cancelled";

export type SettlementStatus = "pending" | "paid" | "failed";

export type AuctionUser = {
  id: string;
  walletAddress: string | null;
  createdAt: string;
};

export type AuctionBid = {
  id: string;
  auctionId: string;
  bidderId: string;
  amount: number;
  createdAt: string;
  isWinning: boolean;
  bidderWalletAddress: string | null;
};

export type AuctionSummary = {
  id: string;
  sellerId: string;
  sellerWalletAddress: string | null;
  title: string;
  description: string;
  assetUrl: string;
  startAt: string;
  endAt: string;
  startPrice: number;
  minIncrement: number;
  status: AuctionStatus;
  winnerBidId: string | null;
  createdAt: string;
  highestBid: number | null;
  bidCount: number;
};

export type AuctionDetail = AuctionSummary & {
  bids: AuctionBid[];
};

export type SettlementRecord = {
  id: string;
  auctionId: string;
  winnerUserId: string;
  finalAmount: number;
  paymentTxHash: string | null;
  status: SettlementStatus;
  createdAt: string;
};
