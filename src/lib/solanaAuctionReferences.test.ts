import { afterEach, describe, expect, it } from "vitest";
import {
  prepareSolanaArtworkReference,
  prepareSolanaAuctionReference,
} from "@/lib/solanaAuctionReferences";

const ORIGINAL_ENV = { ...process.env };
const VALID_WALLET = "So11111111111111111111111111111111111111112";
const VALID_PROGRAM = "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d";

describe("solanaAuctionReferences", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns an honest mint reference without fabricating an asset id", async () => {
    process.env.SOLANA_METAPLEX_CORE_PROGRAM_ID = VALID_PROGRAM;

    const reference = await prepareSolanaArtworkReference({
      sellerWallet: VALID_WALLET,
    });

    expect(reference).toEqual({
      provider: "solana",
      chain: "devnet",
      programAddress: VALID_PROGRAM,
      assetAddress: null,
      externalUrl: `https://explorer.solana.com/address/${VALID_PROGRAM}?cluster=devnet`,
      syncStatus: "mint_ready",
    });
  });

  it("reports missing auction env instead of inventing a listing id", async () => {
    delete process.env.SOLANA_AUCTION_HOUSE_ADDRESS;
    delete process.env.SOLANA_AUCTION_HOUSE_AUTHORITY;
    delete process.env.SOLANA_AUCTION_HOUSE_FEE_ACCOUNT;
    delete process.env.SOLANA_AUCTION_HOUSE_TREASURY_ACCOUNT;

    const reference = await prepareSolanaAuctionReference({
      sellerWallet: VALID_WALLET,
    });

    expect(reference).toEqual({
      provider: "solana",
      chain: "devnet",
      auctionSource: "solana-devnet",
      programAddress: null,
      listingAddress: null,
      externalUrl: null,
      syncStatus: "auction_env_missing",
    });
  });

  it("returns a real auction house explorer url when devnet auction env is configured", async () => {
    process.env.SOLANA_AUCTION_HOUSE_ADDRESS = VALID_WALLET;
    process.env.SOLANA_AUCTION_HOUSE_AUTHORITY = VALID_WALLET;
    process.env.SOLANA_AUCTION_HOUSE_FEE_ACCOUNT = VALID_WALLET;
    process.env.SOLANA_AUCTION_HOUSE_TREASURY_ACCOUNT = VALID_WALLET;

    const reference = await prepareSolanaAuctionReference({
      sellerWallet: VALID_WALLET,
    });

    expect(reference).toEqual({
      provider: "solana",
      chain: "devnet",
      auctionSource: "solana-devnet",
      programAddress: VALID_WALLET,
      listingAddress: null,
      externalUrl: `https://explorer.solana.com/address/${VALID_WALLET}?cluster=devnet`,
      syncStatus: "auction_ready",
    });
  });
});
