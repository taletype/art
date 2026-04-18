import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Connection } from "@solana/web3.js";
import { AuctionHouse } from "@metaplex-foundation/mpl-auction-house";
import { prepareSolanaListingTransaction, prepareSolanaMintTransaction } from "@/lib/solanaSellerTransactions";

const ORIGINAL_ENV = { ...process.env };
const VALID_WALLET = "So11111111111111111111111111111111111111112";
const VALID_AH = "HZaTsZuhN1aazM6FmoVoeAQMtkP8dwF5EYici3QnqTPG";
const VALID_FEE = "5J6jBDF7nB3YxRcbGaVbLruM3aMcMBXNte1qQEbfXDnL";
const VALID_TREASURY = "8opHzTAnfzRpPEx21XtnrVTX28YQuCpAjcn1PczScKh";

describe("solanaSellerTransactions", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("rejects invalid seller wallets before mint preparation", async () => {
    const prepared = await prepareSolanaMintTransaction({
      artworkId: "artwork-1",
      sellerWallet: "not-a-wallet",
      title: "Harbor Study",
      description: "Oil on canvas",
      imageUrl: "https://example.com/harbor.jpg",
    });

    expect(prepared.ok).toBe(false);
    expect(prepared.blockingErrors[0]).toContain("valid Solana wallet address");
    expect(prepared.unsignedTxBase64).toBeNull();
  });

  it("returns an unsigned mint transaction and inspection metadata", async () => {
    vi.spyOn(Connection.prototype, "getLatestBlockhash").mockResolvedValue({
      blockhash: "9fV8g8hhgXX8VojxzxUAEG2GvMrgc8Gf8m4mNRMhSxK8",
      lastValidBlockHeight: 123,
    });

    const prepared = await prepareSolanaMintTransaction({
      artworkId: "artwork-1",
      sellerWallet: VALID_WALLET,
      title: "Harbor Study",
      description: "Oil on canvas",
      imageUrl: "https://example.com/harbor.jpg",
    });

    expect(prepared.ok).toBe(true);
    expect(prepared.unsignedTxBase64).toBeTruthy();
    expect(prepared.recentBlockhash).toBe("9fV8g8hhgXX8VojxzxUAEG2GvMrgc8Gf8m4mNRMhSxK8");
    expect(prepared.lastValidBlockHeight).toBe(123);
    expect(prepared.mintAddress).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    expect(prepared.txInspection?.operation).toBe("mint_prepare");
    expect(prepared.txInspection?.accounts.some((account) => account.label === "Mint")).toBe(true);
  });

  it("returns structured blocking errors when auction house env is missing", async () => {
    delete process.env.SOLANA_AUCTION_HOUSE_ADDRESS;
    delete process.env.SOLANA_AUCTION_HOUSE_AUTHORITY;
    delete process.env.SOLANA_AUCTION_HOUSE_FEE_ACCOUNT;
    delete process.env.SOLANA_AUCTION_HOUSE_TREASURY_ACCOUNT;

    const prepared = await prepareSolanaListingTransaction({
      sellerWallet: VALID_WALLET,
      mintAddress: VALID_WALLET,
      startPriceLamports: 1_000_000_000,
    });

    expect(prepared.ok).toBe(false);
    expect(prepared.blockingErrors[0]).toContain("Auction House");
    expect(prepared.unsignedTxBase64).toBeNull();
  });

  it("returns an unsigned listing transaction with derived trade state metadata", async () => {
    process.env.SOLANA_AUCTION_HOUSE_ADDRESS = VALID_AH;
    process.env.SOLANA_AUCTION_HOUSE_AUTHORITY = VALID_WALLET;
    process.env.SOLANA_AUCTION_HOUSE_FEE_ACCOUNT = VALID_FEE;
    process.env.SOLANA_AUCTION_HOUSE_TREASURY_ACCOUNT = VALID_TREASURY;

    vi.spyOn(Connection.prototype, "getLatestBlockhash").mockResolvedValue({
      blockhash: "4Y8nKY6v8vJ4fDT4a7vVXJQbT6PvxBUw9u5VnXN6dYxi",
      lastValidBlockHeight: 456,
    });
    vi.spyOn(AuctionHouse, "fromAccountAddress").mockResolvedValue({
      authority: { toBase58: () => VALID_WALLET, toBuffer: () => Buffer.alloc(32, 1) },
      treasuryMint: { toBase58: () => VALID_WALLET, toBuffer: () => Buffer.alloc(32, 2) },
    } as never);

    const prepared = await prepareSolanaListingTransaction({
      sellerWallet: VALID_WALLET,
      mintAddress: VALID_WALLET,
      startPriceLamports: 1_500_000_000,
    });

    expect(prepared.ok).toBe(true);
    expect(prepared.unsignedTxBase64).toBeTruthy();
    expect(prepared.listingAddress).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    expect(prepared.txInspection?.operation).toBe("listing_prepare");
    expect(prepared.txInspection?.accounts.some((account) => account.label === "Seller trade state")).toBe(true);
  });
});
