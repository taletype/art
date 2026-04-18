import { z } from "zod";

export const auctionStatusSchema = z.enum(["draft", "live", "ended", "settled", "cancelled"]);

export const createAuctionRequestSchema = z.object({
  sellerWallet: z.string().min(32),
  title: z.string().min(2).max(120),
  description: z.string().min(10).max(4000),
  assetUrl: z.string().url(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  startPriceLamports: z.number().int().positive(),
  minIncrementLamports: z.number().int().positive(),
});

export const listAuctionsQuerySchema = z.object({
  status: auctionStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const placeBidRequestSchema = z.object({
  bidderWallet: z.string().min(32),
  amountLamports: z.number().int().positive(),
});

export const closeAuctionRequestSchema = z.object({
  closedBy: z.string().min(32),
});

export type CreateAuctionRequest = z.infer<typeof createAuctionRequestSchema>;
export type ListAuctionsQuery = z.infer<typeof listAuctionsQuerySchema>;
export type PlaceBidRequest = z.infer<typeof placeBidRequestSchema>;
export type CloseAuctionRequest = z.infer<typeof closeAuctionRequestSchema>;

export type OffchainAuctionStatus = z.infer<typeof auctionStatusSchema>;

export type OffchainBid = {
  id: string;
  auctionId: string;
  bidderWallet: string;
  amountLamports: number;
  amountSol: number;
  isWinning: boolean;
  createdAt: string;
};

export type OffchainAuctionSummary = {
  id: string;
  sellerWallet: string;
  title: string;
  description: string;
  assetUrl: string;
  startsAt: string;
  endsAt: string;
  startPriceLamports: number;
  startPriceSol: number;
  minIncrementLamports: number;
  minIncrementSol: number;
  status: OffchainAuctionStatus;
  winnerBidId: string | null;
  createdAt: string;
  updatedAt: string;
  highestBidLamports: number | null;
  highestBidSol: number | null;
  bidCount: number;
};

export type OffchainAuctionDetail = OffchainAuctionSummary & {
  bids: OffchainBid[];
};
