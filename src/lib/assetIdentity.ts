import { PublicKey } from "@solana/web3.js";
import type { BlockingIssue } from "./devnetErrors";

export interface NormalizedAssetIdentity {
  originalAssetId: string;
  mintPublicKey?: PublicKey;
  normalizedMint?: string;
  issues: BlockingIssue[];
}

export function normalizeAuctionHouseMintAssetId(assetId: string): NormalizedAssetIdentity {
  const issues: BlockingIssue[] = [];

  if (!assetId || assetId.trim().length < 32) {
    issues.push({
      code: "INVALID_ASSET_ID",
      message:
        "assetId must be a base58 Solana mint public key for Auction House flows (list/purchase).",
      action: "Pass the mint address (not collection id, listing id, or internal slug).",
      details: { assetId },
    });

    return { originalAssetId: assetId, issues };
  }

  try {
    const mintPublicKey = new PublicKey(assetId);
    return {
      originalAssetId: assetId,
      mintPublicKey,
      normalizedMint: mintPublicKey.toBase58(),
      issues,
    };
  } catch {
    issues.push({
      code: "INVALID_PUBLIC_KEY",
      message: "assetId is not a valid Solana public key.",
      action: "Use a valid mint address from Devnet explorer/wallet.",
      details: { assetId },
    });

    return { originalAssetId: assetId, issues };
  }
}
