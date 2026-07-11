import { z } from "zod";
import { isValidEvmAddress } from "@/lib/evmAddress";

function optionalTrimmedString(maxLength: number) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(maxLength).optional(),
  );
}

function optionalEvmAddress(message = "Enter a valid wallet address.") {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().refine(isValidEvmAddress, { message }).optional(),
  );
}

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
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(4000),
  imageUrl: z.string().trim().url(),
  medium: optionalTrimmedString(120),
  category: optionalTrimmedString(120),
  provenanceText: optionalTrimmedString(4000),
  priceEth: z.number().finite().nonnegative().optional(),
  sellerWallet: optionalEvmAddress(),
});

export const prepareArtworkSchema = z.object({
  artworkId: z.string().uuid(),
  sellerWallet: optionalEvmAddress(),
});

const sellerAuctionFields = z.object({
  artworkId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  startPriceEth: z.number().finite().positive(),
  minBidEth: z.number().finite().positive(),
  sellerWallet: optionalEvmAddress(),
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
  sellerWallet: optionalEvmAddress(),
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
