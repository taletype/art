import { describe, expect, it } from "vitest";
import { normalizeAuctionHouseMintAssetId } from "../assetIdentity";

describe("asset identity normalization", () => {
  it("normalizes valid mint pubkey", () => {
    const mint = "So11111111111111111111111111111111111111112";
    const parsed = normalizeAuctionHouseMintAssetId(mint);
    expect(parsed.issues).toHaveLength(0);
    expect(parsed.normalizedMint).toBe(mint);
  });

  it("returns typed error for non-mint shape", () => {
    const parsed = normalizeAuctionHouseMintAssetId("art-123");
    expect(parsed.issues[0]?.code).toBe("INVALID_ASSET_ID");
  });
});
