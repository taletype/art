import { z } from "zod";
import { isValidEvmAddress } from "@/lib/evmAddress";

function requireAuctionEndsAfterStart(
  value: { startsAt: string; endsAt: string },
  ctx: z.RefinementCtx,
) {
  if (Date.parse(value.endsAt) <= Date.parse(value.startsAt)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Auction end time must be after the start time.",
      path: ["endsAt"],
    });
  }
}

export const createSellerArtworkSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().min(10).max(4000),
  imageUrl: z.string().url(),
  medium: z.string().max(120).optional(),
  category: z.string().max(120).optional(),
  provenanceText: z.string().max(4000).optional(),
  priceEth: z.number().nonnegative().optional(),
  sellerWallet: z.string().trim().refine(isValidEvmAddress, {
    message: "Enter a valid wallet address.",
  }).optional(),
});

export const prepareArtworkSchema = z.object({
  artworkId: z.string().uuid(),
  sellerWallet: z.string().trim().refine(isValidEvmAddress, {
    message: "Enter a valid wallet address.",
  }).optional(),
});

const sellerAuctionFields = z.object({
  artworkId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  startPriceEth: z.number().positive(),
  minBidEth: z.number().positive(),
  sellerWallet: z.string().trim().refine(isValidEvmAddress, {
    message: "Enter a valid wallet address.",
  }).optional(),
});

export const createSellerAuctionSchema = sellerAuctionFields.superRefine(requireAuctionEndsAfterStart);

export const finalizeArtworkMintSchema = z.object({
  artworkId: z.string().uuid(),
  txSignature: z.string().min(32),
  mintAddress: z.string().trim().refine(isValidEvmAddress, {
    message: "Mint contract must be a valid EVM address.",
  }),
  recentBlockhash: z.string().trim().min(20),
  lastValidBlockHeight: z.number().int().positive(),
  sellerWallet: z.string().trim().refine(isValidEvmAddress, {
    message: "Enter a valid wallet address.",
  }).optional(),
});

export const finalizeSellerAuctionSchema = sellerAuctionFields.extend({
  txSignature: z.string().min(32),
  listingAddress: z.string().trim().refine(isValidEvmAddress, {
    message: "Listing contract must be a valid EVM address.",
  }),
  mintAddress: z.string().trim().refine(isValidEvmAddress, {
    message: "NFT contract must be a valid EVM address.",
  }),
  recentBlockhash: z.string().trim().min(20),
  lastValidBlockHeight: z.number().int().positive(),
}).superRefine(requireAuctionEndsAfterStart);

export type CreateSellerArtworkRequest = z.infer<typeof createSellerArtworkSchema>;
export type PrepareArtworkRequest = z.infer<typeof prepareArtworkSchema>;
export type CreateSellerAuctionRequest = z.infer<typeof createSellerAuctionSchema>;
export type FinalizeArtworkMintRequest = z.infer<typeof finalizeArtworkMintSchema>;
export type FinalizeSellerAuctionRequest = z.infer<typeof finalizeSellerAuctionSchema>;
