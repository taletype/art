import { describe, expect, it } from "vitest";
import { prepareAuctionBid, solToLamports } from "../auctionMarketplace";

const originalEnv = { ...process.env };

describe("auction bid preparation", () => {
  it("returns explicit blockers when Solana English auction config is missing", async () => {
    delete process.env.SOLANA_ENGLISH_AUCTION_PROGRAM_ID;
    delete process.env.SOLANA_AUCTION_ESCROW_AUTHORITY;
    delete process.env.SOLANA_AUCTION_PLATFORM_FEE_ACCOUNT;

    const result = await prepareAuctionBid({
      saleId: "contemporary-digital-asia",
      lotId: "ethereal-waves",
      bidderWallet: "So11111111111111111111111111111111111111112",
      bidLamports: solToLamports(4.4),
      buyerPremiumBps: 800,
      idempotencyKey: "bid-test-missing-config",
      collector: {
        wallet: "So11111111111111111111111111111111111111112",
        email: "collector@example.com",
        displayName: "Collector",
      },
    });

    expect(result.blockingIssueDetails.some((issue) => issue.code === "MISSING_ENV")).toBe(true);
    expect(result.status).toBe("FAILED");
  });

  it("enforces minimum next bid before preparing a bid", async () => {
    process.env.SOLANA_ENGLISH_AUCTION_PROGRAM_ID = "11111111111111111111111111111111";
    process.env.SOLANA_AUCTION_ESCROW_AUTHORITY = "11111111111111111111111111111111";
    process.env.SOLANA_AUCTION_PLATFORM_FEE_ACCOUNT = "11111111111111111111111111111111";

    const result = await prepareAuctionBid({
      saleId: "contemporary-digital-asia",
      lotId: "ethereal-waves",
      bidderWallet: "So11111111111111111111111111111111111111112",
      bidLamports: solToLamports(1),
      buyerPremiumBps: 800,
      idempotencyKey: "bid-test-too-low",
      collector: {
        wallet: "So11111111111111111111111111111111111111112",
        email: "collector@example.com",
        displayName: "Collector",
      },
    });

    expect(result.blockingIssueDetails.some((issue) => issue.code === "BID_RULE_FAILED")).toBe(true);
    expect(result.status).toBe("BID_TOO_LOW");
  });
});

process.env = originalEnv;
