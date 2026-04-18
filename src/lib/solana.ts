import { Connection, type Commitment } from "@solana/web3.js";

export function getRpcUrl() {
  return (
    process.env.SOLANA_RPC_URL ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    "https://api.devnet.solana.com"
  );
}

export function getSolanaConnection(commitment: Commitment = "confirmed") {
  return new Connection(getRpcUrl(), commitment);
}
