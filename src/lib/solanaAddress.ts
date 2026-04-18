import { PublicKey } from "@solana/web3.js";

export function isValidSolanaAddress(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("0x")) {
    return false;
  }

  try {
    new PublicKey(trimmed);
    return true;
  } catch {
    return false;
  }
}
