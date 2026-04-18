import { rm } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";

describe("purchase state store", () => {
  it("persists and updates by idempotency key", async () => {
    process.env.PURCHASE_STATE_BACKEND = "file";
    process.env.PURCHASE_STATE_FILE = `.data/purchase-state-test-${Date.now()}.json`;
    vi.resetModules();

    const key = `test-${Date.now()}`;
    const { getPurchaseStateStore } = await import("../purchaseStateStore");
    const store = getPurchaseStateStore();

    await store.upsert({
      idempotencyKey: key,
      status: "TX_PREPARED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      txContext: {
        listingId: "listing-1",
        assetId: "asset-1",
        buyerWallet: "BuyerWallet11111111111111111111111111111111",
        sellerWallet: "SellerWallet1111111111111111111111111111111",
        treasuryMint: "So11111111111111111111111111111111111111112",
        priceLamports: 1_000_000,
        expectedAuctionHouse: "AH1111111111111111111111111111111111111111",
        expectedMintOrAsset: "asset-1",
        expiresAt: new Date(Date.now() + 1000).toISOString(),
      },
    });

    const stored = await store.get(key);
    expect(stored?.status).toBe("TX_PREPARED");

    const updated = await store.update(key, { status: "TX_CONFIRMED", txSignature: "sig-123" });
    expect(updated?.status).toBe("TX_CONFIRMED");
    expect(updated?.txSignature).toBe("sig-123");

    await rm(process.env.PURCHASE_STATE_FILE!, { force: true });
  });
});
