import { describe, expect, it } from "vitest";
import { prepareListingPayload } from "../auctionHouse";
import { prepareMintIntent } from "../metaplexCore";

const originalEnv = { ...process.env };

describe("SDK blocker shaping", () => {
  it("returns explicit AH env blockers when config is missing", async () => {
    delete process.env.SOLANA_AUCTION_HOUSE_ADDRESS;
    delete process.env.SOLANA_AUCTION_HOUSE_AUTHORITY;
    delete process.env.SOLANA_AUCTION_HOUSE_FEE_ACCOUNT;
    delete process.env.SOLANA_AUCTION_HOUSE_TREASURY_ACCOUNT;

    const result = await prepareListingPayload({
      sellerWallet: "SellerWallet1111111111111111111111111111111",
      assetId: "So11111111111111111111111111111111111111112",
      treasuryMint: "So11111111111111111111111111111111111111112",
      priceLamports: 1_000_000_000,
      provenanceStatus: "VERIFIED_HUMAN",
    });

    expect(result.blockingErrors.length).toBeGreaterThan(0);
    expect(result.blockingIssueDetails.some((issue) => issue.code === "MISSING_ENV")).toBe(true);
    expect(result.unsignedListingPayload).toBeUndefined();
  });

  it("returns unsupported treasury branch blocker", async () => {
    process.env.SOLANA_AUCTION_HOUSE_ADDRESS = "HausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk";
    process.env.SOLANA_AUCTION_HOUSE_AUTHORITY = "11111111111111111111111111111111";
    process.env.SOLANA_AUCTION_HOUSE_FEE_ACCOUNT = "11111111111111111111111111111111";
    process.env.SOLANA_AUCTION_HOUSE_TREASURY_ACCOUNT = "11111111111111111111111111111111";

    const result = await prepareListingPayload({
      sellerWallet: "SellerWallet1111111111111111111111111111111",
      assetId: "So11111111111111111111111111111111111111112",
      treasuryMint: "Es9vMFrzaCERmJfrF4H2tQeMgsQUK91t6bp1KUKf5Wn", // USDT example
      priceLamports: 1_000_000_000,
      provenanceStatus: "VERIFIED_HUMAN",
    });

    expect(result.blockingIssueDetails.some((issue) => issue.code === "UNSUPPORTED_BRANCH")).toBe(true);
    expect(result.unsignedListingPayload).toBeUndefined();
  });

  it("returns explicit core blockers when core env is missing", async () => {
    delete process.env.SOLANA_METAPLEX_CORE_PROGRAM_ID;

    const result = await prepareMintIntent({
      title: "HUMAN test",
      description: "A human-made test artwork for blocker shaping.",
      sellerWallet: "SellerWallet1111111111111111111111111111111",
      imageUrl: "https://example.com/art.png",
      attributes: [],
      provenance: {
        category: "visual",
        medium: "ink",
        creationMethod: "HUMAN_ORIGINAL",
        attestation: {
          text: "I certify this is human-created and follows policy.",
          signerWallet: "SellerWallet1111111111111111111111111111111",
          timestamp: new Date().toISOString(),
          signatureRef: "sig-ref-123456",
        },
        evidence: [
          { kind: "source_file", hash: "a".repeat(64), label: "source" },
          { kind: "wip_image", hash: "b".repeat(64), label: "wip" },
        ],
        evidenceHashes: ["a".repeat(64), "b".repeat(64)],
        verificationStatus: "PENDING_REVIEW",
      },
    });

    expect(result.blockingIssueDetails.some((issue) => issue.code === "MISSING_ENV")).toBe(true);
    expect(result.unsignedTxBase64).toBeUndefined();
  });
});

process.env = originalEnv;
