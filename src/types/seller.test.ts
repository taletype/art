import { describe, expect, it } from "vitest";
import {
  createSellerArtworkSchema,
  createSellerAuctionSchema,
  finalizeSellerAuctionSchema,
} from "@/types/seller";

const sellerWallet = "0x1234567890abcdef1234567890abcdef12345678";

const validCreateArtworkPayload = {
  title: "Verified studio work",
  description: "A handmade work with provenance notes ready for review.",
  imageUrl: "https://example.test/artwork.png",
  medium: "digital painting",
  category: "visual",
  provenanceText: "Process notes and source artifact hashes.",
  priceEth: 0.05,
  sellerWallet,
};

const validCreateAuctionPayload = {
  artworkId: "11111111-1111-4111-8111-111111111111",
  startsAt: "2026-01-01T10:00:00.000Z",
  endsAt: "2026-01-02T10:00:00.000Z",
  startPriceEth: 0.1,
  minBidEth: 0.1,
};

const validFinalizeAuctionPayload = {
  ...validCreateAuctionPayload,
  txSignature: "0x" + "a".repeat(64),
  listingAddress: "0x0000000000000000000000000000000000000001",
  mintAddress: "0x0000000000000000000000000000000000000002",
  recentBlockhash: "base-sepolia-blockhash",
  lastValidBlockHeight: 1,
};

describe("seller artwork schemas", () => {
  it("rejects non-finite artwork prices", () => {
    expect(
      createSellerArtworkSchema.safeParse({
        ...validCreateArtworkPayload,
        priceEth: Number.POSITIVE_INFINITY,
      }).success,
    ).toBe(false);
  });
});

describe("seller auction schemas", () => {
  it("accepts auction windows with an end time after the start time", () => {
    expect(createSellerAuctionSchema.safeParse(validCreateAuctionPayload).success).toBe(true);
    expect(finalizeSellerAuctionSchema.safeParse(validFinalizeAuctionPayload).success).toBe(true);
  });

  it("rejects auction windows that do not end after they start", () => {
    const invalidCreatePayload = {
      ...validCreateAuctionPayload,
      endsAt: validCreateAuctionPayload.startsAt,
    };
    const invalidFinalizePayload = {
      ...validFinalizeAuctionPayload,
      endsAt: "2026-01-01T09:59:59.000Z",
    };

    const createResult = createSellerAuctionSchema.safeParse(invalidCreatePayload);
    const finalizeResult = finalizeSellerAuctionSchema.safeParse(invalidFinalizePayload);

    expect(createResult.success).toBe(false);
    expect(finalizeResult.success).toBe(false);

    if (!createResult.success) {
      expect(createResult.error.issues.map((issue) => issue.path.join("."))).toContain("endsAt");
    }
    if (!finalizeResult.success) {
      expect(finalizeResult.error.issues.map((issue) => issue.path.join("."))).toContain("endsAt");
    }
  });

  it("rejects non-finite auction prices", () => {
    expect(
      createSellerAuctionSchema.safeParse({
        ...validCreateAuctionPayload,
        startPriceEth: Number.POSITIVE_INFINITY,
      }).success,
    ).toBe(false);

    expect(
      createSellerAuctionSchema.safeParse({
        ...validCreateAuctionPayload,
        minBidEth: Number.POSITIVE_INFINITY,
      }).success,
    ).toBe(false);
  });
});
