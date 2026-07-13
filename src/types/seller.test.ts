import { describe, expect, it } from "vitest";
import {
  createSellerArtworkSchema,
  createSellerAuctionSchema,
  finalizeArtworkMintSchema,
  finalizeSellerAuctionSchema,
  prepareArtworkSchema,
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

const validFinalizeMintPayload = {
  artworkId: validCreateAuctionPayload.artworkId,
  txSignature: "0x" + "b".repeat(64),
  mintAddress: "0x0000000000000000000000000000000000000002",
  recentBlockhash: "base-sepolia-blockhash",
  lastValidBlockHeight: 1,
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
  it("trims artwork text and URL fields before validating", () => {
    const result = createSellerArtworkSchema.safeParse({
      ...validCreateArtworkPayload,
      title: "  Verified studio work  ",
      description: "  A handmade work with provenance notes ready for review.  ",
      imageUrl: "  https://example.test/artwork.png  ",
      medium: "  digital painting  ",
      category: "  visual  ",
      provenanceText: "  Process notes and source artifact hashes.  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe(validCreateArtworkPayload.title);
      expect(result.data.description).toBe(validCreateArtworkPayload.description);
      expect(result.data.imageUrl).toBe(validCreateArtworkPayload.imageUrl);
      expect(result.data.medium).toBe(validCreateArtworkPayload.medium);
      expect(result.data.category).toBe(validCreateArtworkPayload.category);
      expect(result.data.provenanceText).toBe(validCreateArtworkPayload.provenanceText);
    }
  });

  it("normalizes blank optional artwork metadata fields", () => {
    const result = createSellerArtworkSchema.safeParse({
      ...validCreateArtworkPayload,
      medium: "   ",
      category: "\t",
      provenanceText: "\n",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.medium).toBeUndefined();
      expect(result.data.category).toBeUndefined();
      expect(result.data.provenanceText).toBeUndefined();
    }
  });

  it("normalizes blank optional seller wallets across seller workflows", () => {
    const createArtwork = createSellerArtworkSchema.safeParse({
      ...validCreateArtworkPayload,
      sellerWallet: "   ",
    });
    const prepareArtwork = prepareArtworkSchema.safeParse({
      artworkId: validCreateAuctionPayload.artworkId,
      sellerWallet: "\t",
    });
    const createAuction = createSellerAuctionSchema.safeParse({
      ...validCreateAuctionPayload,
      sellerWallet: "\n",
    });
    const finalizeMint = finalizeArtworkMintSchema.safeParse({
      ...validFinalizeMintPayload,
      sellerWallet: "   ",
    });
    const finalizeAuction = finalizeSellerAuctionSchema.safeParse({
      ...validFinalizeAuctionPayload,
      sellerWallet: "   ",
    });

    expect(createArtwork.success).toBe(true);
    expect(prepareArtwork.success).toBe(true);
    expect(createAuction.success).toBe(true);
    expect(finalizeMint.success).toBe(true);
    expect(finalizeAuction.success).toBe(true);

    if (createArtwork.success) {
      expect(createArtwork.data.sellerWallet).toBeUndefined();
    }
    if (prepareArtwork.success) {
      expect(prepareArtwork.data.sellerWallet).toBeUndefined();
    }
    if (createAuction.success) {
      expect(createAuction.data.sellerWallet).toBeUndefined();
    }
    if (finalizeMint.success) {
      expect(finalizeMint.data.sellerWallet).toBeUndefined();
    }
    if (finalizeAuction.success) {
      expect(finalizeAuction.data.sellerWallet).toBeUndefined();
    }
  });

  it("rejects blank-looking artwork titles and descriptions", () => {
    expect(
      createSellerArtworkSchema.safeParse({
        ...validCreateArtworkPayload,
        title: "  ",
      }).success,
    ).toBe(false);

    expect(
      createSellerArtworkSchema.safeParse({
        ...validCreateArtworkPayload,
        description: "          ",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid artwork prices", () => {
    expect(
      createSellerArtworkSchema.safeParse({
        ...validCreateArtworkPayload,
        priceEth: Number.POSITIVE_INFINITY,
      }).success,
    ).toBe(false);

    expect(
      createSellerArtworkSchema.safeParse({
        ...validCreateArtworkPayload,
        priceEth: -0.01,
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
