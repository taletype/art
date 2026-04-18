import { z } from "zod";
import { provenanceSchema, verificationStatusSchema } from "./provenance";

export const mintRequestSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().min(10).max(4000),
  sellerWallet: z.string().min(32),
  imageUrl: z.string().url(),
  attributes: z.array(z.object({ trait_type: z.string(), value: z.string() })).default([]),
  provenance: provenanceSchema,
});

export const listRequestSchema = z.object({
  sellerWallet: z.string().min(32),
  assetId: z.string().min(12),
  treasuryMint: z.string().min(12),
  priceLamports: z.number().int().positive(),
  provenanceStatus: verificationStatusSchema,
});

export const purchasePrepareRequestSchema = z.object({
  listingId: z.string().min(8),
  buyerWallet: z.string().min(32),
  sellerWallet: z.string().min(32),
  assetId: z.string().min(12),
  treasuryMint: z.string().min(12),
  priceLamports: z.number().int().positive(),
  buyerBalanceLamports: z.number().int().nonnegative().optional(),
  idempotencyKey: z.string().min(8),
});

export const purchaseConfirmRequestSchema = z.object({
  idempotencyKey: z.string().min(8),
  txSignature: z.string().min(32),
});

export type MintRequest = z.infer<typeof mintRequestSchema>;
export type ListRequest = z.infer<typeof listRequestSchema>;
export type PurchasePrepareRequest = z.infer<typeof purchasePrepareRequestSchema>;
export type PurchaseConfirmRequest = z.infer<typeof purchaseConfirmRequestSchema>;

export type PurchaseState =
  | "NEEDS_FUNDING"
  | "READY_TO_PURCHASE"
  | "TX_PREPARED"
  | "TX_CONFIRMED"
  | "FAILED";
