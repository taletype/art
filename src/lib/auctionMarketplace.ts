import { PublicKey } from "@solana/web3.js";
import type { AuctionBidPrepareRequest, AuctionBidState } from "@/types/art";
import type { BlockingIssue } from "./devnetErrors";
import { issuesToMessages, missingEnvIssue } from "./devnetErrors";
import { getAuctionLotById, getAuctionSaleById } from "./site-data";
import { getRpcUrl } from "./solana";

export interface AuctionBidPreparation {
  idempotencyKey: string;
  saleId: string;
  lotId: string;
  status: AuctionBidState;
  bidLamports: number;
  buyerPremiumLamports: number;
  totalLamports: number;
  txInspection: {
    network: string;
    payer: string;
    programIds: string[];
    accounts: Record<string, string>;
    notes: string[];
  };
  blockingErrors: string[];
  blockingIssueDetails: BlockingIssue[];
  warnings: string[];
  nextActions: string[];
}

const LAMPORTS_PER_SOL = 1_000_000_000;
const NATIVE_SOL_MINT = "So11111111111111111111111111111111111111112";

function collectMissingEnglishAuctionConfigIssues(): BlockingIssue[] {
  const required = [
    "SOLANA_ENGLISH_AUCTION_PROGRAM_ID",
    "SOLANA_AUCTION_ESCROW_AUTHORITY",
    "SOLANA_AUCTION_PLATFORM_FEE_ACCOUNT",
  ] as const;

  return required
    .filter((key) => !process.env[key])
    .map((key) => missingEnvIssue(key, "Solana-native English auction bid preparation"));
}

function isAuctionOpen(opensAt: string, closesAt: string) {
  const now = Date.now();
  return now >= new Date(opensAt).getTime() && now < new Date(closesAt).getTime();
}

function validatePublicKey(value: string, label: string): BlockingIssue | null {
  try {
    new PublicKey(value);
    return null;
  } catch {
    return {
      code: "INVALID_PUBLIC_KEY",
      message: `${label} is not a valid Solana public key.`,
      action: `Use a wallet-standard Solana address for ${label}.`,
      details: { value, label },
    };
  }
}

export function solToLamports(sol: number) {
  return Math.round(sol * LAMPORTS_PER_SOL);
}

export async function prepareAuctionBid(input: AuctionBidPrepareRequest): Promise<AuctionBidPreparation> {
  const sale = getAuctionSaleById(input.saleId);
  const lot = getAuctionLotById(input.lotId);
  const blockingIssueDetails: BlockingIssue[] = collectMissingEnglishAuctionConfigIssues();
  const warnings: string[] = [];
  const buyerPremiumLamports = Math.ceil((input.bidLamports * input.buyerPremiumBps) / 10_000);
  const totalLamports = input.bidLamports + buyerPremiumLamports;
  let status: AuctionBidState = "TX_PREPARED";

  if (!input.collector) {
    status = "REGISTRATION_REQUIRED";
    blockingIssueDetails.push({
      code: "BID_RULE_FAILED",
      message: "Collector registration is required before bidding.",
      action: "Collect email, display name, and wallet before preparing a bid transaction.",
      details: { lotId: input.lotId },
    });
  }

  const bidderKeyIssue = validatePublicKey(input.bidderWallet, "bidderWallet");
  if (bidderKeyIssue) {
    status = "FAILED";
    blockingIssueDetails.push(bidderKeyIssue);
  }

  if (!sale || !lot || lot.saleId !== input.saleId) {
    status = "FAILED";
    blockingIssueDetails.push({
      code: "BID_RULE_FAILED",
      message: "Auction sale or lot could not be found.",
      action: "Use a valid saleId and lotId from the curated catalog.",
      details: { saleId: input.saleId, lotId: input.lotId },
    });
  }

  if (sale && !isAuctionOpen(sale.opensAt, sale.closesAt)) {
    status = "AUCTION_NOT_OPEN";
    blockingIssueDetails.push({
      code: "AUCTION_NOT_OPEN",
      message: `Auction ${sale.title} is not currently accepting bids.`,
      action: "Wait until the sale opens or inspect the sale calendar before bidding.",
      details: { opensAt: sale.opensAt, closesAt: sale.closesAt },
    });
  }

  if (lot && input.bidLamports < solToLamports(lot.minimumNextBidSol)) {
    status = "BID_TOO_LOW";
    blockingIssueDetails.push({
      code: "BID_RULE_FAILED",
      message: `Bid is below the minimum next bid of ${lot.minimumNextBidSol} SOL.`,
      action: "Increase bidLamports to meet or exceed the lot minimum next bid.",
      details: {
        bidLamports: String(input.bidLamports),
        minimumNextBidLamports: String(solToLamports(lot.minimumNextBidSol)),
      },
    });
  }

  if (process.env.SOLANA_CLUSTER && process.env.SOLANA_CLUSTER !== "devnet") {
    warnings.push("This auction house is configured for a non-devnet cluster. Mainnet bidding should wait for audit approval.");
  }

  const programId = process.env.SOLANA_ENGLISH_AUCTION_PROGRAM_ID ?? "MISSING_SOLANA_ENGLISH_AUCTION_PROGRAM_ID";
  const platformFeeAccount = process.env.SOLANA_AUCTION_PLATFORM_FEE_ACCOUNT ?? "MISSING_SOLANA_AUCTION_PLATFORM_FEE_ACCOUNT";
  const escrowAuthority = process.env.SOLANA_AUCTION_ESCROW_AUTHORITY ?? "MISSING_SOLANA_AUCTION_ESCROW_AUTHORITY";
  const finalStatus = blockingIssueDetails.length > 0 ? status === "TX_PREPARED" ? "FAILED" : status : status;

  return {
    idempotencyKey: input.idempotencyKey,
    saleId: input.saleId,
    lotId: input.lotId,
    status: finalStatus,
    bidLamports: input.bidLamports,
    buyerPremiumLamports,
    totalLamports,
    txInspection: {
      network: getRpcUrl(),
      payer: input.bidderWallet,
      programIds: [programId],
      accounts: {
        bidder: input.bidderWallet,
        sale: input.saleId,
        lot: input.lotId,
        artistWallet: lot?.artistWallet ?? "unknown",
        treasuryMint: NATIVE_SOL_MINT,
        escrowAuthority,
        platformFeeAccount,
      },
      notes: [
        "No private keys are requested or stored.",
        "A production bid transaction must be signed by the bidder wallet after simulation.",
        "Supabase may cache bid state, but Solana remains the settlement source of truth.",
      ],
    },
    blockingErrors: issuesToMessages(blockingIssueDetails),
    blockingIssueDetails,
    warnings,
    nextActions:
      blockingIssueDetails.length > 0
        ? ["Resolve blockingErrors before emitting an unsigned bid transaction."]
        : ["Simulate the bid transaction.", "Ask the connected bidder wallet to sign.", "Confirm escrowed bid state on Solana."],
  };
}
