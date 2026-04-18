import { z } from "zod";

const walletAddressSchema = z
  .string()
  .trim()
  .min(32, "Wallet address must look like a Solana public key.")
  .max(64, "Wallet address is too long.");

export const authCredentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  walletAddress: walletAddressSchema.optional(),
});

export const auctionCreateSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(20).max(4000),
  assetUrl: z.string().trim().url(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  startPrice: z.coerce.number().nonnegative(),
  minIncrement: z.coerce.number().positive(),
  walletAddress: walletAddressSchema.optional(),
});

export const auctionBidSchema = z.object({
  amount: z.coerce.number().positive(),
  walletAddress: walletAddressSchema.optional(),
});

export const auctionCloseSchema = z.object({
  force: z.boolean().optional().default(false),
});

export const auctionSettlementSchema = z.object({
  auctionId: z.string().uuid(),
  paymentTxHash: z.string().trim().min(32).max(120),
});

export type AuthCredentialsInput = z.infer<typeof authCredentialsSchema>;
export type AuctionCreateInput = z.infer<typeof auctionCreateSchema>;
export type AuctionBidInput = z.infer<typeof auctionBidSchema>;
export type AuctionCloseInput = z.infer<typeof auctionCloseSchema>;
export type AuctionSettlementInput = z.infer<typeof auctionSettlementSchema>;
