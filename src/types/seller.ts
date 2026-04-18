import { z } from "zod";
import { isValidSolanaAddress } from "@/lib/solanaAddress";

export const createSellerArtworkSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().min(10).max(4000),
  imageUrl: z.string().url(),
  medium: z.string().max(120).optional(),
  category: z.string().max(120).optional(),
  provenanceText: z.string().max(4000).optional(),
  reservePriceLamports: z.number().int().nonnegative().optional(),
});

export const prepareArtworkSchema = z.object({
  artworkId: z.string().uuid(),
  sellerWallet: z.string().trim().refine(isValidSolanaAddress, {
    message: "Enter a valid Solana wallet address.",
  }).optional(),
});

export const createSellerAuctionSchema = z.object({
  artworkId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  startPriceLamports: z.number().int().positive(),
  minIncrementLamports: z.number().int().positive(),
  sellerWallet: z.string().trim().refine(isValidSolanaAddress, {
    message: "Enter a valid Solana wallet address.",
  }).optional(),
});

export const finalizeArtworkMintSchema = z.object({
  artworkId: z.string().uuid(),
  txSignature: z.string().min(32),
  mintAddress: z.string().trim().refine(isValidSolanaAddress, {
    message: "Mint address must be a valid Solana address.",
  }),
  metadataAddress: z.string().trim().refine(isValidSolanaAddress, {
    message: "Metadata address must be a valid Solana address.",
  }),
  tokenAccountAddress: z.string().trim().refine(isValidSolanaAddress, {
    message: "Token account address must be a valid Solana address.",
  }),
  recentBlockhash: z.string().trim().min(20),
  lastValidBlockHeight: z.number().int().positive(),
  sellerWallet: z.string().trim().refine(isValidSolanaAddress, {
    message: "Enter a valid Solana wallet address.",
  }).optional(),
});

export const finalizeSellerAuctionSchema = createSellerAuctionSchema.extend({
  txSignature: z.string().min(32),
  listingAddress: z.string().trim().refine(isValidSolanaAddress, {
    message: "Listing address must be a valid Solana address.",
  }),
  mintAddress: z.string().trim().refine(isValidSolanaAddress, {
    message: "Mint address must be a valid Solana address.",
  }),
  recentBlockhash: z.string().trim().min(20),
  lastValidBlockHeight: z.number().int().positive(),
});

export type CreateSellerArtworkRequest = z.infer<typeof createSellerArtworkSchema>;
export type PrepareArtworkRequest = z.infer<typeof prepareArtworkSchema>;
export type CreateSellerAuctionRequest = z.infer<typeof createSellerAuctionSchema>;
export type FinalizeArtworkMintRequest = z.infer<typeof finalizeArtworkMintSchema>;
export type FinalizeSellerAuctionRequest = z.infer<typeof finalizeSellerAuctionSchema>;
