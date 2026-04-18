import { createHash } from "node:crypto";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  type VersionedTransactionResponse,
} from "@solana/web3.js";
import { z } from "zod";
import {
  createBuyInstruction,
  createExecuteSaleInstruction,
  createSellInstruction,
  PROGRAM_ID as AUCTION_HOUSE_PROGRAM_ID,
} from "@metaplex-foundation/mpl-auction-house";
import type {
  ListRequest,
  PurchaseConfirmRequest,
  PurchasePrepareRequest,
  PurchaseState,
} from "../types/art";
import { normalizeAuctionHouseMintAssetId } from "./assetIdentity";
import type { BlockingIssue } from "./devnetErrors";
import { issuesToMessages, missingEnvIssue, rpcIssue } from "./devnetErrors";
import { getPurchaseStateStore, type PurchaseStateRecord } from "./purchaseStateStore";
import { getRpcUrl, getSolanaConnection } from "./solana";

const treasuryMintSchema = z.string().min(12);
const NATIVE_SOL_MINT = "So11111111111111111111111111111111111111112";
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ATA_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export interface TxInspection {
  network: string;
  payer: string;
  programIds: string[];
  accounts: Record<string, string>;
  notes: string[];
}

export interface ListingPreparation {
  listingId: string;
  sellerWallet: string;
  assetId: string;
  treasuryMint: string;
  priceLamports: number;
  auctionHouseAddress: string;
  unsignedListingPayload?: string;
  txInspection: TxInspection;
  blockingErrors: string[];
  blockingIssueDetails: BlockingIssue[];
  warnings: string[];
  nextActions: string[];
}

export interface PurchasePreparation {
  idempotencyKey: string;
  status: PurchaseState;
  missingConfig?: string[];
  reason?: string;
  unsignedTxBase64?: string;
  txInspection: TxInspection;
  blockingErrors: string[];
  blockingIssueDetails: BlockingIssue[];
  warnings: string[];
  txContext?: {
    listingId: string;
    assetId: string;
    buyerWallet: string;
    sellerWallet: string;
    treasuryMint: string;
    priceLamports: number;
    expectedAuctionHouse: string;
    expectedMintOrAsset: string;
    expiresAt: string;
  };
}

export interface PurchaseChainInspection {
  txSignature: string;
  status: PurchaseState;
  confirmationStatus: string;
  slot?: number;
  error?: string;
  accounts?: string[];
  inspection: TxInspection;
}

function collectMissingAuctionHouseConfigIssues(): BlockingIssue[] {
  const required = [
    "SOLANA_AUCTION_HOUSE_ADDRESS",
    "SOLANA_AUCTION_HOUSE_AUTHORITY",
    "SOLANA_AUCTION_HOUSE_FEE_ACCOUNT",
    "SOLANA_AUCTION_HOUSE_TREASURY_ACCOUNT",
  ] as const;

  return required
    .filter((key) => !process.env[key])
    .map((key) => missingEnvIssue(key, "Auction House transaction preparation"));
}

function readRequiredPubkeys() {
  return {
    auctionHouse: new PublicKey(process.env.SOLANA_AUCTION_HOUSE_ADDRESS ?? "11111111111111111111111111111111"),
    authority: new PublicKey(process.env.SOLANA_AUCTION_HOUSE_AUTHORITY ?? "11111111111111111111111111111111"),
    feeAccount: new PublicKey(process.env.SOLANA_AUCTION_HOUSE_FEE_ACCOUNT ?? "11111111111111111111111111111111"),
    treasuryAccount: new PublicKey(
      process.env.SOLANA_AUCTION_HOUSE_TREASURY_ACCOUNT ?? "11111111111111111111111111111111",
    ),
  };
}

function encodeU64(value: bigint) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(value);
  return buffer;
}

function deriveMetadataPda(mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METADATA_PROGRAM_ID,
  )[0];
}

function deriveAta(owner: PublicKey, mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ATA_PROGRAM_ID,
  )[0];
}

function deriveProgramAsSigner() {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("auction_house"), Buffer.from("signer")],
    AUCTION_HOUSE_PROGRAM_ID,
  );
  return { pda, bump };
}

function deriveEscrowPayment(auctionHouse: PublicKey, buyer: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("auction_house"), auctionHouse.toBuffer(), buyer.toBuffer()],
    AUCTION_HOUSE_PROGRAM_ID,
  );
}

function deriveTradeState(params: {
  wallet: PublicKey;
  auctionHouse: PublicKey;
  tokenAccount: PublicKey;
  treasuryMint: PublicKey;
  tokenMint: PublicKey;
  buyerPrice: bigint;
  tokenSize: bigint;
}) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("auction_house"),
      params.wallet.toBuffer(),
      params.auctionHouse.toBuffer(),
      params.tokenAccount.toBuffer(),
      params.treasuryMint.toBuffer(),
      params.tokenMint.toBuffer(),
      encodeU64(params.buyerPrice),
      encodeU64(params.tokenSize),
    ],
    AUCTION_HOUSE_PROGRAM_ID,
  );
}

function serializeUnsignedTransaction(tx: Transaction) {
  return tx.serialize({ verifySignatures: false, requireAllSignatures: false }).toString("base64");
}

function defaultInspection(payer: string): TxInspection {
  return { network: getRpcUrl(), payer, programIds: [], accounts: {}, notes: [] };
}

function mapStoreRecord(record: PurchaseStateRecord): PurchasePreparation {
  return {
    idempotencyKey: record.idempotencyKey,
    status: record.status,
    reason: record.error,
    txContext: record.txContext,
    txInspection: {
      network: getRpcUrl(),
      payer: record.txContext?.buyerWallet ?? "unknown",
      programIds: [AUCTION_HOUSE_PROGRAM_ID.toBase58()],
      accounts: {
        buyer: record.txContext?.buyerWallet ?? "unknown",
        seller: record.txContext?.sellerWallet ?? "unknown",
        assetId: record.txContext?.assetId ?? "unknown",
      },
      notes: [],
    },
    blockingErrors: [],
    blockingIssueDetails: [],
    warnings: [],
  };
}

export async function prepareListingPayload(input: ListRequest): Promise<ListingPreparation> {
  const listingId = `listing-${input.assetId}-${Date.now()}`;
  const treasuryMint = treasuryMintSchema.parse(input.treasuryMint);
  const warnings: string[] = [];
  const blockingIssueDetails: BlockingIssue[] = collectMissingAuctionHouseConfigIssues();

  if (input.provenanceStatus !== "VERIFIED_HUMAN") {
    blockingIssueDetails.push({
      code: "INVALID_ASSET_ID",
      message: "Listing blocked: provenance status is not VERIFIED_HUMAN.",
      action: "Complete review and set verificationStatus to VERIFIED_HUMAN.",
    });
  }

  const normalized = normalizeAuctionHouseMintAssetId(input.assetId);
  blockingIssueDetails.push(...normalized.issues);

  if (treasuryMint !== NATIVE_SOL_MINT) {
    blockingIssueDetails.push({
      code: "UNSUPPORTED_BRANCH",
      message: `Treasury mint ${treasuryMint} is unsupported in this MVP. Supported treasury mint: ${NATIVE_SOL_MINT}.`,
      action:
        "To support SPL treasury mints, add token account/payment receipt account handling in src/lib/auctionHouse.ts around instruction account mapping.",
      details: { requestedTreasuryMint: treasuryMint, supported: NATIVE_SOL_MINT },
    });
  }

  const inspection = defaultInspection(input.sellerWallet);
  inspection.programIds.push(AUCTION_HOUSE_PROGRAM_ID.toBase58());

  if (blockingIssueDetails.length > 0 || !normalized.mintPublicKey) {
    return {
      listingId,
      sellerWallet: input.sellerWallet,
      assetId: input.assetId,
      treasuryMint,
      priceLamports: input.priceLamports,
      auctionHouseAddress: process.env.SOLANA_AUCTION_HOUSE_ADDRESS ?? "MISSING_CONFIG",
      txInspection: {
        ...inspection,
        accounts: {
          seller: input.sellerWallet,
          auctionHouse: process.env.SOLANA_AUCTION_HOUSE_ADDRESS ?? "missing",
          expectedAssetId: "mint public key",
        },
        notes: ["Listing tx not built due to blocking errors."],
      },
      blockingErrors: issuesToMessages(blockingIssueDetails),
      blockingIssueDetails,
      warnings,
      nextActions: ["Fix blockingErrors and retry listing preparation."],
    };
  }

  const config = readRequiredPubkeys();
  const seller = new PublicKey(input.sellerWallet);
  const mint = normalized.mintPublicKey;

  const tokenAccount = deriveAta(seller, mint);
  const metadata = deriveMetadataPda(mint);
  const tokenSize = 1n;

  const [sellerTradeState, tradeStateBump] = deriveTradeState({
    wallet: seller,
    auctionHouse: config.auctionHouse,
    tokenAccount,
    treasuryMint: new PublicKey(treasuryMint),
    tokenMint: mint,
    buyerPrice: BigInt(input.priceLamports),
    tokenSize,
  });
  const [freeSellerTradeState, freeTradeStateBump] = deriveTradeState({
    wallet: seller,
    auctionHouse: config.auctionHouse,
    tokenAccount,
    treasuryMint: new PublicKey(treasuryMint),
    tokenMint: mint,
    buyerPrice: 0n,
    tokenSize,
  });
  const { pda: programAsSigner, bump: programAsSignerBump } = deriveProgramAsSigner();

  const ix = createSellInstruction(
    {
      wallet: seller,
      tokenAccount,
      metadata,
      authority: config.authority,
      auctionHouse: config.auctionHouse,
      auctionHouseFeeAccount: config.feeAccount,
      sellerTradeState,
      freeSellerTradeState,
      programAsSigner,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    },
    {
      tradeStateBump,
      freeTradeStateBump,
      programAsSignerBump,
      buyerPrice: BigInt(input.priceLamports),
      tokenSize,
    },
  );

  const tx = new Transaction().add(ix);
  tx.feePayer = seller;
  try {
    const latest = await getSolanaConnection("confirmed").getLatestBlockhash("confirmed");
    tx.recentBlockhash = latest.blockhash;
  } catch (error) {
    blockingIssueDetails.push(
      rpcIssue("fetching recent blockhash for listing prepare", error instanceof Error ? error.message : "unknown"),
    );
  }

  return {
    listingId,
    sellerWallet: input.sellerWallet,
    assetId: input.assetId,
    treasuryMint,
    priceLamports: input.priceLamports,
    auctionHouseAddress: config.auctionHouse.toBase58(),
    unsignedListingPayload: blockingIssueDetails.length === 0 ? serializeUnsignedTransaction(tx) : undefined,
    txInspection: {
      ...inspection,
      payer: seller.toBase58(),
      programIds: [AUCTION_HOUSE_PROGRAM_ID.toBase58(), TOKEN_PROGRAM_ID.toBase58()],
      accounts: {
        seller: seller.toBase58(),
        mint: mint.toBase58(),
        tokenAccount: tokenAccount.toBase58(),
        metadata: metadata.toBase58(),
        sellerTradeState: sellerTradeState.toBase58(),
        freeSellerTradeState: freeSellerTradeState.toBase58(),
        auctionHouse: config.auctionHouse.toBase58(),
        authority: config.authority.toBase58(),
        feeAccount: config.feeAccount.toBase58(),
        treasuryAccount: config.treasuryAccount.toBase58(),
        treasuryMint,
      },
      notes: ["Unsigned sell tx must be signed and broadcast by seller wallet."],
    },
    blockingErrors: issuesToMessages(blockingIssueDetails),
    blockingIssueDetails,
    warnings,
    nextActions: ["Seller signs and sends sell transaction.", "Wait for on-chain confirmation before showing listing live."],
  };
}

export async function preparePurchaseTransaction(input: PurchasePrepareRequest): Promise<PurchasePreparation> {
  const store = getPurchaseStateStore();
  const existing = await store.get(input.idempotencyKey);
  if (existing) return mapStoreRecord(existing);

  const warnings: string[] = [];
  const blockingIssueDetails: BlockingIssue[] = collectMissingAuctionHouseConfigIssues();

  if (typeof input.buyerBalanceLamports === "number" && input.buyerBalanceLamports < input.priceLamports) {
    const record: PurchaseStateRecord = {
      idempotencyKey: input.idempotencyKey,
      status: "NEEDS_FUNDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: "Insufficient buyer balance for listing price",
    };
    await store.upsert(record);
    return {
      ...mapStoreRecord(record),
      blockingErrors: issuesToMessages(blockingIssueDetails),
      blockingIssueDetails,
      warnings,
    };
  }

  const normalized = normalizeAuctionHouseMintAssetId(input.assetId);
  blockingIssueDetails.push(...normalized.issues);

  if (input.treasuryMint !== NATIVE_SOL_MINT) {
    blockingIssueDetails.push({
      code: "UNSUPPORTED_BRANCH",
      message: `Treasury mint ${input.treasuryMint} is unsupported in purchase prepare. Only ${NATIVE_SOL_MINT} is currently wired.`,
      action:
        "Implement SPL treasury flow by adding SPL payment accounts and token receipt handling around buy/executeSale account mapping in src/lib/auctionHouse.ts.",
      details: { requestedTreasuryMint: input.treasuryMint, supported: NATIVE_SOL_MINT },
    });
  }

  const txContext = {
    listingId: input.listingId,
    assetId: input.assetId,
    buyerWallet: input.buyerWallet,
    sellerWallet: input.sellerWallet,
    treasuryMint: input.treasuryMint,
    priceLamports: input.priceLamports,
    expectedAuctionHouse: process.env.SOLANA_AUCTION_HOUSE_ADDRESS ?? "MISSING_CONFIG",
    expectedMintOrAsset: input.assetId,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };

  if (blockingIssueDetails.length > 0 || !normalized.mintPublicKey) {
    const record: PurchaseStateRecord = {
      idempotencyKey: input.idempotencyKey,
      status: "FAILED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: issuesToMessages(blockingIssueDetails).join(" | "),
      txContext,
    };
    await store.upsert(record);

    return {
      ...mapStoreRecord(record),
      missingConfig: issuesToMessages(blockingIssueDetails),
      blockingErrors: issuesToMessages(blockingIssueDetails),
      blockingIssueDetails,
      warnings,
    };
  }

  const config = readRequiredPubkeys();
  const buyer = new PublicKey(input.buyerWallet);
  const seller = new PublicKey(input.sellerWallet);
  const mint = normalized.mintPublicKey;
  const treasuryMint = new PublicKey(input.treasuryMint);

  const tokenAccount = deriveAta(seller, mint);
  const buyerReceiptTokenAccount = deriveAta(buyer, mint);
  const metadata = deriveMetadataPda(mint);
  const tokenSize = 1n;

  const [escrowPaymentAccount, escrowPaymentBump] = deriveEscrowPayment(config.auctionHouse, buyer);
  const [buyerTradeState, buyerTradeStateBump] = deriveTradeState({
    wallet: buyer,
    auctionHouse: config.auctionHouse,
    tokenAccount,
    treasuryMint,
    tokenMint: mint,
    buyerPrice: BigInt(input.priceLamports),
    tokenSize,
  });
  const [sellerTradeState] = deriveTradeState({
    wallet: seller,
    auctionHouse: config.auctionHouse,
    tokenAccount,
    treasuryMint,
    tokenMint: mint,
    buyerPrice: BigInt(input.priceLamports),
    tokenSize,
  });
  const [freeTradeState, freeTradeStateBump] = deriveTradeState({
    wallet: seller,
    auctionHouse: config.auctionHouse,
    tokenAccount,
    treasuryMint,
    tokenMint: mint,
    buyerPrice: 0n,
    tokenSize,
  });
  const { pda: programAsSigner, bump: programAsSignerBump } = deriveProgramAsSigner();

  const buyIx = createBuyInstruction(
    {
      wallet: buyer,
      paymentAccount: buyer,
      transferAuthority: buyer,
      treasuryMint,
      tokenAccount,
      metadata,
      escrowPaymentAccount,
      authority: config.authority,
      auctionHouse: config.auctionHouse,
      auctionHouseFeeAccount: config.feeAccount,
      buyerTradeState,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    },
    {
      tradeStateBump: buyerTradeStateBump,
      escrowPaymentBump,
      buyerPrice: BigInt(input.priceLamports),
      tokenSize,
    },
  );

  const executeSaleIx = createExecuteSaleInstruction(
    {
      buyer,
      seller,
      tokenAccount,
      tokenMint: mint,
      metadata,
      treasuryMint,
      escrowPaymentAccount,
      sellerPaymentReceiptAccount: seller,
      buyerReceiptTokenAccount,
      authority: config.authority,
      auctionHouse: config.auctionHouse,
      auctionHouseFeeAccount: config.feeAccount,
      auctionHouseTreasury: config.treasuryAccount,
      buyerTradeState,
      sellerTradeState,
      freeTradeState,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      ataProgram: ATA_PROGRAM_ID,
      programAsSigner,
      rent: SYSVAR_RENT_PUBKEY,
    },
    {
      escrowPaymentBump,
      freeTradeStateBump,
      programAsSignerBump,
      buyerPrice: BigInt(input.priceLamports),
      tokenSize,
    },
  );

  const tx = new Transaction().add(buyIx, executeSaleIx);
  tx.feePayer = buyer;
  try {
    const latest = await getSolanaConnection("confirmed").getLatestBlockhash("confirmed");
    tx.recentBlockhash = latest.blockhash;
  } catch (error) {
    blockingIssueDetails.push(
      rpcIssue("fetching recent blockhash for purchase prepare", error instanceof Error ? error.message : "unknown"),
    );
  }

  const record: PurchaseStateRecord = {
    idempotencyKey: input.idempotencyKey,
    status: blockingIssueDetails.length === 0 ? "TX_PREPARED" : "FAILED",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    txContext,
    error: blockingIssueDetails.length ? issuesToMessages(blockingIssueDetails).join(" | ") : undefined,
  };
  await store.upsert(record);

  return {
    ...mapStoreRecord(record),
    status: record.status,
    unsignedTxBase64: blockingIssueDetails.length === 0 ? serializeUnsignedTransaction(tx) : undefined,
    txContext,
    blockingErrors: issuesToMessages(blockingIssueDetails),
    blockingIssueDetails,
    warnings,
    txInspection: {
      network: getRpcUrl(),
      payer: buyer.toBase58(),
      programIds: [AUCTION_HOUSE_PROGRAM_ID.toBase58(), TOKEN_PROGRAM_ID.toBase58(), ATA_PROGRAM_ID.toBase58()],
      accounts: {
        buyer: buyer.toBase58(),
        seller: seller.toBase58(),
        mint: mint.toBase58(),
        tokenAccount: tokenAccount.toBase58(),
        buyerReceiptTokenAccount: buyerReceiptTokenAccount.toBase58(),
        metadata: metadata.toBase58(),
        escrowPaymentAccount: escrowPaymentAccount.toBase58(),
        buyerTradeState: buyerTradeState.toBase58(),
        sellerTradeState: sellerTradeState.toBase58(),
        freeTradeState: freeTradeState.toBase58(),
        auctionHouse: config.auctionHouse.toBase58(),
        authority: config.authority.toBase58(),
        treasuryAccount: config.treasuryAccount.toBase58(),
        feeAccount: config.feeAccount.toBase58(),
        treasuryMint: treasuryMint.toBase58(),
      },
      notes: ["Unsigned tx includes buy+executeSale and must be signed/sent by buyer wallet."],
    },
  };
}

function getAllAccountKeys(tx: VersionedTransactionResponse): string[] {
  const staticKeys = tx.transaction.message.getAccountKeys().staticAccountKeys.map((key) => key.toBase58());
  const loadedWritable = (tx.meta?.loadedAddresses?.writable ?? []).map((key) =>
    typeof key === "string" ? key : key.toBase58(),
  );
  const loadedReadonly = (tx.meta?.loadedAddresses?.readonly ?? []).map((key) =>
    typeof key === "string" ? key : key.toBase58(),
  );
  return [...staticKeys, ...loadedWritable, ...loadedReadonly];
}

function getAuctionHouseInstructionAccountSets(tx: VersionedTransactionResponse): string[][] {
  const resolvedKeys = getAllAccountKeys(tx);
  return tx.transaction.message.compiledInstructions
    .filter((instruction) => resolvedKeys[instruction.programIdIndex] === AUCTION_HOUSE_PROGRAM_ID.toBase58())
    .map((instruction) => instruction.accountKeyIndexes.map((index) => resolvedKeys[index]).filter(Boolean));
}

function includesAllAccounts(accounts: string[], expectedAccounts: string[]) {
  return expectedAccounts.every((account) => accounts.includes(account));
}

function isExpired(isoTimestamp: string) {
  return Date.now() > new Date(isoTimestamp).getTime();
}

function buildExpectedPurchaseInstructionAccountSets(txContext: NonNullable<PurchaseStateRecord["txContext"]>) {
  const config = readRequiredPubkeys();
  const buyer = new PublicKey(txContext.buyerWallet);
  const seller = new PublicKey(txContext.sellerWallet);
  const treasuryMint = new PublicKey(txContext.treasuryMint);

  const normalized = normalizeAuctionHouseMintAssetId(txContext.assetId);
  if (!normalized.mintPublicKey) {
    throw new Error("Unable to derive mint public key from purchase assetId");
  }

  const mint = normalized.mintPublicKey;
  const tokenAccount = deriveAta(seller, mint);
  const buyerReceiptTokenAccount = deriveAta(buyer, mint);
  const metadata = deriveMetadataPda(mint);
  const tokenSize = 1n;

  const [escrowPaymentAccount] = deriveEscrowPayment(config.auctionHouse, buyer);
  const [buyerTradeState] = deriveTradeState({
    wallet: buyer,
    auctionHouse: config.auctionHouse,
    tokenAccount,
    treasuryMint,
    tokenMint: mint,
    buyerPrice: BigInt(txContext.priceLamports),
    tokenSize,
  });
  const [sellerTradeState] = deriveTradeState({
    wallet: seller,
    auctionHouse: config.auctionHouse,
    tokenAccount,
    treasuryMint,
    tokenMint: mint,
    buyerPrice: BigInt(txContext.priceLamports),
    tokenSize,
  });
  const [freeTradeState] = deriveTradeState({
    wallet: seller,
    auctionHouse: config.auctionHouse,
    tokenAccount,
    treasuryMint,
    tokenMint: mint,
    buyerPrice: 0n,
    tokenSize,
  });
  const { pda: programAsSigner } = deriveProgramAsSigner();

  const buyAccounts = [
    buyer.toBase58(),
    buyer.toBase58(),
    buyer.toBase58(),
    treasuryMint.toBase58(),
    tokenAccount.toBase58(),
    metadata.toBase58(),
    escrowPaymentAccount.toBase58(),
    config.authority.toBase58(),
    config.auctionHouse.toBase58(),
    config.feeAccount.toBase58(),
    buyerTradeState.toBase58(),
    TOKEN_PROGRAM_ID.toBase58(),
    SystemProgram.programId.toBase58(),
    SYSVAR_RENT_PUBKEY.toBase58(),
  ];

  const executeSaleAccounts = [
    buyer.toBase58(),
    seller.toBase58(),
    tokenAccount.toBase58(),
    mint.toBase58(),
    metadata.toBase58(),
    treasuryMint.toBase58(),
    escrowPaymentAccount.toBase58(),
    seller.toBase58(),
    buyerReceiptTokenAccount.toBase58(),
    config.authority.toBase58(),
    config.auctionHouse.toBase58(),
    config.feeAccount.toBase58(),
    config.treasuryAccount.toBase58(),
    buyerTradeState.toBase58(),
    sellerTradeState.toBase58(),
    freeTradeState.toBase58(),
    TOKEN_PROGRAM_ID.toBase58(),
    SystemProgram.programId.toBase58(),
    ATA_PROGRAM_ID.toBase58(),
    programAsSigner.toBase58(),
    SYSVAR_RENT_PUBKEY.toBase58(),
  ];

  return { buyAccounts, executeSaleAccounts, normalizedMint: mint.toBase58() };
}

export async function confirmPreparedPurchase(input: PurchaseConfirmRequest): Promise<PurchaseStateRecord> {
  const store = getPurchaseStateStore();
  const existing = await store.get(input.idempotencyKey);
  if (!existing) {
    return {
      idempotencyKey: input.idempotencyKey,
      status: "FAILED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: "Unknown idempotency key",
    };
  }

  if (existing.status !== "TX_PREPARED" && existing.status !== "READY_TO_PURCHASE") {
    return existing;
  }

  if (existing.txContext?.expiresAt && isExpired(existing.txContext.expiresAt)) {
    return (await store.update(existing.idempotencyKey, {
      status: "FAILED",
      error: "Prepared purchase expired before confirmation completed",
      txSignature: input.txSignature,
    })) as PurchaseStateRecord;
  }

  await store.update(existing.idempotencyKey, { status: "READY_TO_PURCHASE", txSignature: input.txSignature });

  const connection = getSolanaConnection("confirmed");
  const statusResponse = await connection.getSignatureStatuses([input.txSignature], { searchTransactionHistory: true });
  const signatureStatus = statusResponse.value[0];

  if (!signatureStatus) {
    return (await store.update(existing.idempotencyKey, {
      status: "READY_TO_PURCHASE",
      error: "Signature not found yet on RPC",
    })) as PurchaseStateRecord;
  }

  if (signatureStatus.err) {
    return (await store.update(existing.idempotencyKey, {
      status: "FAILED",
      error: `RPC status error: ${JSON.stringify(signatureStatus.err)}`,
    })) as PurchaseStateRecord;
  }

  if (!["confirmed", "finalized"].includes(signatureStatus.confirmationStatus ?? "")) {
    return (await store.update(existing.idempotencyKey, {
      status: "READY_TO_PURCHASE",
      error: `Signature status is ${signatureStatus.confirmationStatus ?? "unknown"}`,
    })) as PurchaseStateRecord;
  }

  const tx = await connection.getTransaction(input.txSignature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) {
    return (await store.update(existing.idempotencyKey, {
      status: "READY_TO_PURCHASE",
      error: "Confirmed signature but transaction details are not available from RPC yet",
    })) as PurchaseStateRecord;
  }

  if (tx.meta?.err) {
    return (await store.update(existing.idempotencyKey, {
      status: "FAILED",
      error: `Transaction meta error: ${JSON.stringify(tx.meta.err)}`,
    })) as PurchaseStateRecord;
  }

  if (existing.txContext) {
    let expectedInstructionAccounts: ReturnType<typeof buildExpectedPurchaseInstructionAccountSets>;
    try {
      expectedInstructionAccounts = buildExpectedPurchaseInstructionAccountSets(existing.txContext);
    } catch (error) {
      return (await store.update(existing.idempotencyKey, {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Failed to derive expected purchase accounts",
      })) as PurchaseStateRecord;
    }

    const accountKeys = getAllAccountKeys(tx);
    const missingKey = [
      existing.txContext.buyerWallet,
      existing.txContext.sellerWallet,
      expectedInstructionAccounts.normalizedMint,
      existing.txContext.expectedAuctionHouse,
      existing.txContext.treasuryMint,
    ].find((expected) => !accountKeys.includes(expected));

    if (missingKey) {
      return (await store.update(existing.idempotencyKey, {
        status: "FAILED",
        error: `Confirmed tx missing expected account/key: ${missingKey}`,
      })) as PurchaseStateRecord;
    }

    const payer = tx.transaction.message.getAccountKeys().staticAccountKeys[0]?.toBase58();
    if (payer && payer !== existing.txContext.buyerWallet) {
      return (await store.update(existing.idempotencyKey, {
        status: "FAILED",
        error: `Unexpected transaction payer: ${payer}`,
      })) as PurchaseStateRecord;
    }

    const instructionAccountSets = getAuctionHouseInstructionAccountSets(tx);
    const hasExpectedBuyInstruction = instructionAccountSets.some((accounts) =>
      includesAllAccounts(accounts, expectedInstructionAccounts.buyAccounts),
    );
    const hasExpectedExecuteSaleInstruction = instructionAccountSets.some((accounts) =>
      includesAllAccounts(accounts, expectedInstructionAccounts.executeSaleAccounts),
    );

    if (!hasExpectedBuyInstruction || !hasExpectedExecuteSaleInstruction) {
      return (await store.update(existing.idempotencyKey, {
        status: "FAILED",
        error: "Confirmed transaction does not match the expected Auction House buy/executeSale accounts",
      })) as PurchaseStateRecord;
    }

    if (tx.blockTime && tx.blockTime * 1000 > new Date(existing.txContext.expiresAt).getTime()) {
      return (await store.update(existing.idempotencyKey, {
        status: "FAILED",
        error: "Transaction confirmed after prepared purchase expiration",
      })) as PurchaseStateRecord;
    }
  }

  return (await store.update(existing.idempotencyKey, {
    status: "TX_CONFIRMED",
    txSignature: input.txSignature,
    error: undefined,
  })) as PurchaseStateRecord;
}

export async function inspectPurchaseSignature(txSignature: string): Promise<PurchaseChainInspection> {
  const connection = getSolanaConnection("confirmed");
  const inspection: TxInspection = {
    network: getRpcUrl(),
    payer: "unknown",
    programIds: [AUCTION_HOUSE_PROGRAM_ID.toBase58()],
    accounts: {},
    notes: ["Recovered from RPC because local purchase state may be unavailable."],
  };

  const statusResponse = await connection.getSignatureStatuses([txSignature], { searchTransactionHistory: true });
  const signatureStatus = statusResponse.value[0];

  if (!signatureStatus) {
    return {
      txSignature,
      status: "READY_TO_PURCHASE",
      confirmationStatus: "not_found",
      error: "Signature not found yet on RPC",
      inspection,
    };
  }

  if (signatureStatus.err) {
    return {
      txSignature,
      status: "FAILED",
      confirmationStatus: signatureStatus.confirmationStatus ?? "processed",
      slot: signatureStatus.slot,
      error: `RPC status error: ${JSON.stringify(signatureStatus.err)}`,
      inspection,
    };
  }

  const tx = await connection.getTransaction(txSignature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) {
    return {
      txSignature,
      status: ["confirmed", "finalized"].includes(signatureStatus.confirmationStatus ?? "")
        ? "TX_CONFIRMED"
        : "READY_TO_PURCHASE",
      confirmationStatus: signatureStatus.confirmationStatus ?? "processed",
      slot: signatureStatus.slot,
      error: ["confirmed", "finalized"].includes(signatureStatus.confirmationStatus ?? "")
        ? undefined
        : "Transaction details unavailable yet",
      inspection,
    };
  }

  const accountKeys = getAllAccountKeys(tx);
  return {
    txSignature,
    status: tx.meta?.err ? "FAILED" : ["confirmed", "finalized"].includes(signatureStatus.confirmationStatus ?? "") ? "TX_CONFIRMED" : "READY_TO_PURCHASE",
    confirmationStatus: signatureStatus.confirmationStatus ?? "processed",
    slot: tx.slot,
    error: tx.meta?.err ? `Transaction meta error: ${JSON.stringify(tx.meta.err)}` : undefined,
    accounts: accountKeys,
    inspection: {
      ...inspection,
      payer: accountKeys[0] ?? "unknown",
      accounts: {
        signer0: accountKeys[0] ?? "unknown",
        signer1: accountKeys[1] ?? "unknown",
        signer2: accountKeys[2] ?? "unknown",
      },
      notes: [
        "Recovered from RPC because local purchase state may be unavailable.",
        "Use this for no-DB polling fallback after client stores txSignature.",
      ],
    },
  };
}

export async function getPurchaseState(idempotencyKey: string): Promise<PurchaseStateRecord | null> {
  return getPurchaseStateStore().get(idempotencyKey);
}

export function buildDeterministicIdempotencyKey(input: {
  listingId: string;
  buyerWallet: string;
  clientNonce: string;
}) {
  return createHash("sha256")
    .update(`${input.listingId}:${input.buyerWallet}:${input.clientNonce}`)
    .digest("hex");
}
