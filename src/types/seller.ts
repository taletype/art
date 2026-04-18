import { z } from "zod";

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
});

export const createSellerAuctionSchema = z.object({
  artworkId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  startPriceLamports: z.number().int().positive(),
  minIncrementLamports: z.number().int().positive(),
});

export type CreateSellerArtworkRequest = z.infer<typeof createSellerArtworkSchema>;
export type PrepareArtworkRequest = z.infer<typeof prepareArtworkSchema>;
export type CreateSellerAuctionRequest = z.infer<typeof createSellerAuctionSchema>;
