import { z } from "zod";

const walletAddressSchema = z
  .string()
  .trim()
  .min(32, "Wallet address looks too short.")
  .max(128, "Wallet address is too long.");

export const authCredentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  walletAddress: walletAddressSchema.optional(),
});

export type AuthCredentialsInput = z.infer<typeof authCredentialsSchema>;
