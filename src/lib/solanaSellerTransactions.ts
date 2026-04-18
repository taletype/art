import { createNft, findMetadataPda, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { toWeb3JsTransaction } from "@metaplex-foundation/umi-web3js-adapters";
import { createNoopSigner, generateSigner, percentAmount, publicKey, signerIdentity, signTransaction as signUmiTransaction } from "@metaplex-foundation/umi";
import { createSellInstruction, AuctionHouse } from "@metaplex-foundation/mpl-auction-house";
import { getAssociatedTokenAddressSync, NATIVE_MINT } from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { isValidSolanaAddress } from "@/lib/solanaAddress";

export type SellerTransactionIssue = {
  code: string;
  message: string;
  field?: string;
};

export type SellerTxInspection = {
  operation: "mint_prepare" | "listing_prepare";
  cluster: "devnet";
  summary: string;
  explorerUrls: string[];
  accounts: Array<{ label: string; address: string }>;
};

export type SellerPreparedTransaction = {
  ok: boolean;
  unsignedTxBase64: string | null;
  recentBlockhash: string | null;
  lastValidBlockHeight: number | null;
  blockingErrors: string[];
  blockingIssueDetails: SellerTransactionIssue[];
  txInspection: SellerTxInspection | null;
};

export type PreparedMintTransaction = SellerPreparedTransaction & {
  mintAddress: string | null;
  metadataAddress: string | null;
  tokenAccountAddress: string | null;
};

export type PreparedListingTransaction = SellerPreparedTransaction & {
  listingAddress: string | null;
  freeListingAddress: string | null;
  mintAddress: string | null;
  tokenAccountAddress: string | null;
  metadataAddress: string | null;
  auctionHouseAddress: string | null;
};

type MintTxInput = {
  sellerWallet: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  artworkId: string;
};

type ListingTxInput = {
  sellerWallet: string;
  mintAddress: string;
  startPriceLamports: number;
};

type FinalizeConfirmationInput = {
  signature: string;
  recentBlockhash?: string | null;
  lastValidBlockHeight?: number | null;
};

const DEVNET_CLUSTER = "devnet" as const;
const AUCTION_HOUSE_PROGRAM_ID = new PublicKey("hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk");
const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const MAX_U64 = 18_446_744_073_709_551_615n;

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function explorerAddressUrl(address: string) {
  return `https://explorer.solana.com/address/${address}?cluster=${DEVNET_CLUSTER}`;
}

function explorerTxUrl(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=${DEVNET_CLUSTER}`;
}

function getSolanaRpcUrl() {
  return (
    readEnv("SOLANA_RPC_URL") ||
    readEnv("NEXT_PUBLIC_SOLANA_RPC_URL") ||
    "https://api.devnet.solana.com"
  );
}

function getConnection() {
  return new Connection(getSolanaRpcUrl(), "confirmed");
}

function validAddressOrNull(value: string) {
  return isValidSolanaAddress(value) ? value : null;
}

function createBlockingResponse(
  operation: "mint_prepare" | "listing_prepare",
  issues: SellerTransactionIssue[],
): PreparedMintTransaction | PreparedListingTransaction {
  const base = {
    ok: false,
    unsignedTxBase64: null,
    recentBlockhash: null,
    lastValidBlockHeight: null,
    blockingErrors: issues.map((issue) => issue.message),
    blockingIssueDetails: issues,
    txInspection: {
      operation,
      cluster: DEVNET_CLUSTER,
      summary: "Resolve the blocking issues before requesting a Solana devnet transaction.",
      explorerUrls: [],
      accounts: [],
    },
  };

  if (operation === "mint_prepare") {
    return {
      ...base,
      mintAddress: null,
      metadataAddress: null,
      tokenAccountAddress: null,
    };
  }

  return {
    ...base,
    listingAddress: null,
    freeListingAddress: null,
    mintAddress: null,
    tokenAccountAddress: null,
    metadataAddress: null,
    auctionHouseAddress: null,
  };
}

function assertValidSellerWallet(wallet: string) {
  if (!isValidSolanaAddress(wallet)) {
    throw new Error("A valid Solana wallet address is required.");
  }
}

function toU64Bytes(value: bigint) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(value);
  return buffer;
}

function findProgramAsSignerAddress() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("auction_house"), Buffer.from("signer")],
    AUCTION_HOUSE_PROGRAM_ID,
  );
}

function findTradeStateAddress(args: {
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
      args.wallet.toBuffer(),
      args.auctionHouse.toBuffer(),
      args.tokenAccount.toBuffer(),
      args.treasuryMint.toBuffer(),
      args.tokenMint.toBuffer(),
      toU64Bytes(args.buyerPrice),
      toU64Bytes(args.tokenSize),
    ],
    AUCTION_HOUSE_PROGRAM_ID,
  );
}

function getAuctionHouseAddress() {
  const address = validAddressOrNull(readEnv("SOLANA_AUCTION_HOUSE_ADDRESS"));
  const authority = validAddressOrNull(readEnv("SOLANA_AUCTION_HOUSE_AUTHORITY"));
  const feeAccount = validAddressOrNull(readEnv("SOLANA_AUCTION_HOUSE_FEE_ACCOUNT"));
  const treasuryAccount = validAddressOrNull(readEnv("SOLANA_AUCTION_HOUSE_TREASURY_ACCOUNT"));
  const treasuryMint = validAddressOrNull(readEnv("SOLANA_AUCTION_HOUSE_TREASURY_MINT")) ?? NATIVE_MINT.toBase58();

  return {
    address,
    authority,
    feeAccount,
    treasuryAccount,
    treasuryMint,
  };
}

function buildMintUri(input: MintTxInput) {
  if (input.imageUrl?.trim()) {
    return input.imageUrl.trim();
  }

  return `https://example.invalid/artwork/${input.artworkId}`;
}

export async function prepareSolanaMintTransaction(input: MintTxInput): Promise<PreparedMintTransaction> {
  try {
    assertValidSellerWallet(input.sellerWallet);
  } catch (error) {
    return createBlockingResponse("mint_prepare", [
      {
        code: "invalid_seller_wallet",
        field: "sellerWallet",
        message: error instanceof Error ? error.message : "A valid Solana wallet address is required.",
      },
    ]) as PreparedMintTransaction;
  }

  const sellerPublicKey = new PublicKey(input.sellerWallet);
  const connection = getConnection();

  const umi = createUmi(getSolanaRpcUrl()).use(mplTokenMetadata());
  const sellerSigner = createNoopSigner(publicKey(input.sellerWallet));
  umi.use(signerIdentity(sellerSigner, true));

  const mintSigner = generateSigner(umi);
  const builder = createNft(umi, {
    mint: mintSigner,
    authority: sellerSigner,
    payer: sellerSigner,
    updateAuthority: sellerSigner,
    name: input.title.slice(0, 32),
    uri: buildMintUri(input),
    symbol: "ART",
    sellerFeeBasisPoints: percentAmount(0),
    isMutable: true,
    creators: null,
    collection: null,
    collectionDetails: null,
    decimals: null,
    printSupply: null,
  });

  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  const umiTransaction = builder.setBlockhash(latestBlockhash).useV0().build(umi);
  const partiallySigned = await signUmiTransaction(umiTransaction, [mintSigner]);
  const web3Tx = toWeb3JsTransaction(partiallySigned);
  const mintAddress = mintSigner.publicKey.toString();
  const metadataAddress = findMetadataPda(umi, { mint: mintSigner.publicKey })[0].toString();
  const tokenAccountAddress = getAssociatedTokenAddressSync(new PublicKey(mintAddress), sellerPublicKey).toBase58();

  return {
    ok: true,
    unsignedTxBase64: Buffer.from(web3Tx.serialize()).toString("base64"),
    recentBlockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    blockingErrors: [],
    blockingIssueDetails: [],
    mintAddress,
    metadataAddress,
    tokenAccountAddress,
    txInspection: {
      operation: "mint_prepare",
      cluster: DEVNET_CLUSTER,
      summary: "Mint a devnet NFT to the connected seller wallet before the off-chain auction is published.",
      explorerUrls: [explorerAddressUrl(mintAddress), explorerAddressUrl(metadataAddress)],
      accounts: [
        { label: "Seller wallet", address: input.sellerWallet },
        { label: "Mint", address: mintAddress },
        { label: "Metadata", address: metadataAddress },
        { label: "Seller token account", address: tokenAccountAddress },
      ],
    },
  };
}

export async function prepareSolanaListingTransaction(input: ListingTxInput): Promise<PreparedListingTransaction> {
  const issues: SellerTransactionIssue[] = [];

  if (!isValidSolanaAddress(input.sellerWallet)) {
    issues.push({
      code: "invalid_seller_wallet",
      field: "sellerWallet",
      message: "A valid Solana wallet address is required.",
    });
  }

  if (!isValidSolanaAddress(input.mintAddress)) {
    issues.push({
      code: "invalid_mint_address",
      field: "mintAddress",
      message: "A valid minted NFT address is required before listing.",
    });
  }

  if (!Number.isInteger(input.startPriceLamports) || input.startPriceLamports <= 0) {
    issues.push({
      code: "invalid_start_price",
      field: "startPriceLamports",
      message: "Start price must be a positive lamport amount.",
    });
  }

  const auctionHouse = getAuctionHouseAddress();
  if (!auctionHouse.address || !auctionHouse.authority || !auctionHouse.feeAccount || !auctionHouse.treasuryAccount) {
    issues.push({
      code: "auction_house_env_missing",
      message:
        "Solana Auction House is not fully configured. Set SOLANA_AUCTION_HOUSE_ADDRESS, SOLANA_AUCTION_HOUSE_AUTHORITY, SOLANA_AUCTION_HOUSE_FEE_ACCOUNT, and SOLANA_AUCTION_HOUSE_TREASURY_ACCOUNT.",
    });
  }

  if (issues.length > 0) {
    return createBlockingResponse("listing_prepare", issues) as PreparedListingTransaction;
  }

  const connection = getConnection();
  const auctionHouseAccount = await AuctionHouse.fromAccountAddress(connection, new PublicKey(auctionHouse.address!));
  const sellerPublicKey = new PublicKey(input.sellerWallet);
  const mintPublicKey = new PublicKey(input.mintAddress);
  const tokenAccount = getAssociatedTokenAddressSync(mintPublicKey, sellerPublicKey);
  const metadata = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mintPublicKey.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID,
  )[0];
  const [programAsSigner, programAsSignerBump] = findProgramAsSignerAddress();
  const [sellerTradeState, tradeStateBump] = findTradeStateAddress({
    wallet: sellerPublicKey,
    auctionHouse: new PublicKey(auctionHouse.address!),
    tokenAccount,
    treasuryMint: auctionHouseAccount.treasuryMint,
    tokenMint: mintPublicKey,
    buyerPrice: BigInt(input.startPriceLamports),
    tokenSize: 1n,
  });
  const [freeSellerTradeState, freeTradeStateBump] = findTradeStateAddress({
    wallet: sellerPublicKey,
    auctionHouse: new PublicKey(auctionHouse.address!),
    tokenAccount,
    treasuryMint: auctionHouseAccount.treasuryMint,
    tokenMint: mintPublicKey,
    buyerPrice: MAX_U64,
    tokenSize: 1n,
  });

  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  const instruction = createSellInstruction(
    {
      wallet: sellerPublicKey,
      tokenAccount,
      metadata,
      authority: auctionHouseAccount.authority,
      auctionHouse: new PublicKey(auctionHouse.address!),
      auctionHouseFeeAccount: new PublicKey(auctionHouse.feeAccount!),
      sellerTradeState,
      freeSellerTradeState,
      programAsSigner,
    },
    {
      tradeStateBump,
      freeTradeStateBump,
      programAsSignerBump,
      buyerPrice: BigInt(input.startPriceLamports),
      tokenSize: 1n,
    },
  );

  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: sellerPublicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [instruction],
    }).compileToV0Message(),
  );

  return {
    ok: true,
    unsignedTxBase64: Buffer.from(tx.serialize()).toString("base64"),
    recentBlockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    blockingErrors: [],
    blockingIssueDetails: [],
    listingAddress: sellerTradeState.toBase58(),
    freeListingAddress: freeSellerTradeState.toBase58(),
    mintAddress: mintPublicKey.toBase58(),
    tokenAccountAddress: tokenAccount.toBase58(),
    metadataAddress: metadata.toBase58(),
    auctionHouseAddress: auctionHouse.address!,
    txInspection: {
      operation: "listing_prepare",
      cluster: DEVNET_CLUSTER,
      summary: "Create a real Auction House sell order on Solana devnet before the local auction row goes live.",
      explorerUrls: [
        explorerAddressUrl(auctionHouse.address!),
        explorerAddressUrl(sellerTradeState.toBase58()),
        explorerAddressUrl(mintPublicKey.toBase58()),
      ],
      accounts: [
        { label: "Seller wallet", address: input.sellerWallet },
        { label: "Auction House", address: auctionHouse.address! },
        { label: "Mint", address: mintPublicKey.toBase58() },
        { label: "Seller token account", address: tokenAccount.toBase58() },
        { label: "Metadata", address: metadata.toBase58() },
        { label: "Seller trade state", address: sellerTradeState.toBase58() },
      ],
    },
  };
}

export async function confirmSolanaTransaction(input: FinalizeConfirmationInput) {
  const connection = getConnection();

  let result;
  if (input.recentBlockhash && typeof input.lastValidBlockHeight === "number") {
    result = await connection.confirmTransaction(
      {
        signature: input.signature,
        blockhash: input.recentBlockhash,
        lastValidBlockHeight: input.lastValidBlockHeight,
      },
      "confirmed",
    );
  } else {
    result = await connection.confirmTransaction(input.signature, "confirmed");
  }

  if (result.value.err) {
    throw new Error("Solana transaction failed on devnet.");
  }

  return {
    explorerUrl: explorerTxUrl(input.signature),
  };
}

export async function assertMintedNftOwnedBySeller(input: {
  sellerWallet: string;
  mintAddress: string;
  metadataAddress: string;
  tokenAccountAddress: string;
}) {
  const connection = getConnection();
  const mintInfo = await connection.getAccountInfo(new PublicKey(input.mintAddress), "confirmed");
  const metadataInfo = await connection.getAccountInfo(new PublicKey(input.metadataAddress), "confirmed");
  const tokenInfo = await connection.getTokenAccountBalance(new PublicKey(input.tokenAccountAddress), "confirmed").catch(() => null);

  if (!mintInfo || !metadataInfo || !tokenInfo) {
    throw new Error("Minted NFT was not found on Solana devnet after confirmation.");
  }

  return {
    assetUrl: explorerAddressUrl(input.mintAddress),
  };
}

export async function assertListingExists(input: {
  listingAddress: string;
  mintAddress: string;
}) {
  const connection = getConnection();
  const [listingInfo, mintInfo] = await Promise.all([
    connection.getAccountInfo(new PublicKey(input.listingAddress), "confirmed"),
    connection.getAccountInfo(new PublicKey(input.mintAddress), "confirmed"),
  ]);

  if (!listingInfo || !mintInfo) {
    throw new Error("Auction House listing was not found on Solana devnet after confirmation.");
  }

  return {
    listingUrl: explorerAddressUrl(input.listingAddress),
  };
}
