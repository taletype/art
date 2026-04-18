import { isValidSolanaAddress } from "@/lib/solanaAddress";

type SolanaArtworkReferenceInput = {
  sellerWallet: string;
};

type SolanaAuctionReferenceInput = {
  sellerWallet: string;
};

export type SolanaArtworkReference = {
  provider: "solana";
  chain: "devnet";
  programAddress: string | null;
  assetAddress: string | null;
  externalUrl: string | null;
  syncStatus: "mint_ready" | "mint_env_missing";
};

export type SolanaAuctionReference = {
  provider: "solana";
  chain: "devnet";
  auctionSource: "solana-devnet";
  programAddress: string | null;
  listingAddress: string | null;
  externalUrl: string | null;
  syncStatus: "auction_ready" | "auction_env_missing";
};

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function readDevnetAddressEnv(name: string) {
  const value = readEnv(name);
  return value && isValidSolanaAddress(value) ? value : null;
}

function buildExplorerAddressUrl(address: string | null) {
  if (!address) {
    return null;
  }

  return `https://explorer.solana.com/address/${address}?cluster=devnet`;
}

function assertSellerWallet(wallet: string) {
  if (!isValidSolanaAddress(wallet)) {
    throw new Error("A valid Solana wallet address is required.");
  }
}

export async function prepareSolanaArtworkReference(
  input: SolanaArtworkReferenceInput,
): Promise<SolanaArtworkReference> {
  assertSellerWallet(input.sellerWallet);

  const programAddress = readDevnetAddressEnv("SOLANA_METAPLEX_CORE_PROGRAM_ID");

  return {
    provider: "solana",
    chain: "devnet",
    programAddress,
    assetAddress: null,
    externalUrl: buildExplorerAddressUrl(programAddress),
    syncStatus: programAddress ? "mint_ready" : "mint_env_missing",
  };
}

export async function prepareSolanaAuctionReference(
  input: SolanaAuctionReferenceInput,
): Promise<SolanaAuctionReference> {
  assertSellerWallet(input.sellerWallet);

  const auctionHouseAddress = readDevnetAddressEnv("SOLANA_AUCTION_HOUSE_ADDRESS");
  const auctionHouseAuthority = readDevnetAddressEnv("SOLANA_AUCTION_HOUSE_AUTHORITY");
  const auctionHouseFeeAccount = readDevnetAddressEnv("SOLANA_AUCTION_HOUSE_FEE_ACCOUNT");
  const auctionHouseTreasuryAccount = readDevnetAddressEnv("SOLANA_AUCTION_HOUSE_TREASURY_ACCOUNT");

  const ready =
    Boolean(auctionHouseAddress) &&
    Boolean(auctionHouseAuthority) &&
    Boolean(auctionHouseFeeAccount) &&
    Boolean(auctionHouseTreasuryAccount);

  return {
    provider: "solana",
    chain: "devnet",
    auctionSource: "solana-devnet",
    programAddress: auctionHouseAddress,
    listingAddress: null,
    externalUrl: buildExplorerAddressUrl(auctionHouseAddress),
    syncStatus: ready ? "auction_ready" : "auction_env_missing",
  };
}
