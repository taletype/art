import { Connection } from "@solana/web3.js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuctionBidInput, AuctionCloseInput, AuctionCreateInput, AuctionSettlementInput } from "@/lib/validators";
import { AuctionBid, AuctionDetail, AuctionStatus, AuctionSummary, SettlementRecord } from "@/types/auction-v1";

type AuthenticatedAuctionUser = {
  id: string;
  email: string | null;
  walletAddress: string | null;
};

type AuctionRow = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  asset_url: string;
  start_at: string;
  end_at: string;
  start_price: number | string;
  min_increment: number | string;
  status: AuctionStatus;
  winner_bid_id: string | null;
  created_at: string;
  users?: { wallet_address: string | null } | Array<{ wallet_address: string | null }> | null;
  bids?: Array<{
    id: string;
    auction_id: string;
    bidder_id: string;
    amount: number | string;
    created_at: string;
    is_winning: boolean;
    users?: { wallet_address: string | null } | Array<{ wallet_address: string | null }> | null;
  }> | null;
};

type SettlementRow = {
  id: string;
  auction_id: string;
  winner_user_id: string;
  final_amount: number | string;
  payment_tx_hash: string | null;
  status: SettlementRecord["status"];
  created_at: string;
};

function numberValue(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }
  return value ? Number(value) : 0;
}

function mapBid(row: NonNullable<AuctionRow["bids"]>[number]): AuctionBid {
  const bidderRelation = Array.isArray(row.users) ? row.users[0] : row.users;
  return {
    id: row.id,
    auctionId: row.auction_id,
    bidderId: row.bidder_id,
    amount: numberValue(row.amount),
    createdAt: row.created_at,
    isWinning: row.is_winning,
    bidderWalletAddress: bidderRelation?.wallet_address ?? null,
  };
}

function mapAuctionSummary(row: AuctionRow): AuctionSummary {
  const sellerRelation = Array.isArray(row.users) ? row.users[0] : row.users;
  const bids = (row.bids ?? []).map(mapBid);
  const highestBid = bids.reduce<number | null>((max, bid) => {
    if (max === null || bid.amount > max) {
      return bid.amount;
    }
    return max;
  }, null);

  return {
    id: row.id,
    sellerId: row.seller_id,
    sellerWalletAddress: sellerRelation?.wallet_address ?? null,
    title: row.title,
    description: row.description,
    assetUrl: row.asset_url,
    startAt: row.start_at,
    endAt: row.end_at,
    startPrice: numberValue(row.start_price),
    minIncrement: numberValue(row.min_increment),
    status: row.status,
    winnerBidId: row.winner_bid_id,
    createdAt: row.created_at,
    highestBid,
    bidCount: bids.length,
  };
}

function mapAuctionDetail(row: AuctionRow): AuctionDetail {
  const summary = mapAuctionSummary(row);
  return {
    ...summary,
    bids: (row.bids ?? []).map(mapBid),
  };
}

function mapSettlement(row: SettlementRow): SettlementRecord {
  return {
    id: row.id,
    auctionId: row.auction_id,
    winnerUserId: row.winner_user_id,
    finalAmount: numberValue(row.final_amount),
    paymentTxHash: row.payment_tx_hash,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function getAuthenticatedAuctionUserFromRequest(request: Request): Promise<AuthenticatedAuctionUser> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new Error("Missing Supabase bearer token.");
  }

  const accessToken = header.slice("Bearer ".length).trim();
  if (!accessToken) {
    throw new Error("Missing Supabase bearer token.");
  }

  const supabase = createSupabaseServerClient(accessToken);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Supabase session is invalid or expired.");
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    walletAddress: typeof data.user.user_metadata?.wallet_address === "string"
      ? data.user.user_metadata.wallet_address
      : null,
  };
}

async function ensureAuctionUser(user: AuthenticatedAuctionUser, walletAddress?: string | null) {
  const admin = createSupabaseAdminClient();
  const nextWallet = walletAddress?.trim() || user.walletAddress || null;

  const { error } = await admin.from("users").upsert(
    {
      id: user.id,
      wallet_address: nextWallet,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(`Unable to sync auction user profile: ${error.message}`);
  }
}

export async function listAuctions(options?: { status?: AuctionStatus | "all" }) {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("auctions")
    .select(
      `
        id,
        seller_id,
        title,
        description,
        asset_url,
        start_at,
        end_at,
        start_price,
        min_increment,
        status,
        winner_bid_id,
        created_at,
        users:seller_id(wallet_address),
        bids(
          id,
          auction_id,
          bidder_id,
          amount,
          created_at,
          is_winning,
          users:bidder_id(wallet_address)
        )
      `,
    )
    .order("end_at", { ascending: true });

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Unable to load auctions: ${error.message}`);
  }

  return ((data ?? []) as unknown as AuctionRow[]).map(mapAuctionSummary);
}

export async function getAuctionById(auctionId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("auctions")
    .select(
      `
        id,
        seller_id,
        title,
        description,
        asset_url,
        start_at,
        end_at,
        start_price,
        min_increment,
        status,
        winner_bid_id,
        created_at,
        users:seller_id(wallet_address),
        bids(
          id,
          auction_id,
          bidder_id,
          amount,
          created_at,
          is_winning,
          users:bidder_id(wallet_address)
        )
      `,
    )
    .eq("id", auctionId)
    .single();

  if (error || !data) {
    return null;
  }

  const detail = mapAuctionDetail(data as unknown as AuctionRow);
  detail.bids.sort((left, right) => right.amount - left.amount || right.createdAt.localeCompare(left.createdAt));
  return detail;
}

export async function createAuctionForUser(user: AuthenticatedAuctionUser, input: AuctionCreateInput) {
  await ensureAuctionUser(user, input.walletAddress);

  const admin = createSupabaseAdminClient();
  const now = Date.now();
  const start = new Date(input.startAt).getTime();
  const end = new Date(input.endAt).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new Error("Auction start and end time must be valid ISO timestamps.");
  }

  let status: AuctionStatus = "draft";
  if (start <= now && end > now) {
    status = "live";
  }

  const { data, error } = await admin
    .from("auctions")
    .insert({
      seller_id: user.id,
      title: input.title,
      description: input.description,
      asset_url: input.assetUrl,
      start_at: input.startAt,
      end_at: input.endAt,
      start_price: input.startPrice,
      min_increment: input.minIncrement,
      status,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Unable to create auction: ${error?.message ?? "Unknown error"}`);
  }

  return getAuctionById(data.id);
}

export async function placeBidForUser(auctionId: string, user: AuthenticatedAuctionUser, input: AuctionBidInput) {
  await ensureAuctionUser(user, input.walletAddress);

  const admin = createSupabaseAdminClient();
  const auction = await getAuctionById(auctionId);
  if (!auction) {
    throw new Error("Auction not found.");
  }

  const now = Date.now();
  if (auction.status === "draft" && new Date(auction.startAt).getTime() <= now && new Date(auction.endAt).getTime() > now) {
    await admin.from("auctions").update({ status: "live" }).eq("id", auctionId);
    auction.status = "live";
  }

  if (auction.status !== "live") {
    throw new Error("Bids are only accepted while an auction is live.");
  }

  if (new Date(auction.endAt).getTime() <= now) {
    throw new Error("Auction already ended.");
  }

  const minimum = Math.max(
    auction.startPrice,
    (auction.highestBid ?? auction.startPrice) + auction.minIncrement,
  );

  if (input.amount < minimum) {
    throw new Error(`Bid must be at least ${minimum.toFixed(2)} SOL.`);
  }

  const currentWinningBid = auction.bids.find((bid) => bid.isWinning) ?? auction.bids[0] ?? null;
  if (currentWinningBid) {
    const { error: winningError } = await admin.from("bids").update({ is_winning: false }).eq("id", currentWinningBid.id);
    if (winningError) {
      throw new Error(`Unable to update previous winning bid: ${winningError.message}`);
    }
  }

  const { data, error } = await admin
    .from("bids")
    .insert({
      auction_id: auctionId,
      bidder_id: user.id,
      amount: input.amount,
      is_winning: true,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Unable to record bid: ${error?.message ?? "Unknown error"}`);
  }

  return getAuctionById(auctionId);
}

export async function closeAuctionForUser(auctionId: string, user: AuthenticatedAuctionUser, input?: AuctionCloseInput) {
  const admin = createSupabaseAdminClient();
  const auction = await getAuctionById(auctionId);
  if (!auction) {
    throw new Error("Auction not found.");
  }

  if (auction.sellerId !== user.id) {
    throw new Error("Only the seller can close this auction.");
  }

  const now = Date.now();
  if (!input?.force && new Date(auction.endAt).getTime() > now) {
    throw new Error("Auction cannot close before end time unless force=true.");
  }

  const winningBid = [...auction.bids].sort((left, right) => right.amount - left.amount || left.createdAt.localeCompare(right.createdAt))[0] ?? null;
  const nextStatus: AuctionStatus = winningBid ? "ended" : "cancelled";

  const { error } = await admin
    .from("auctions")
    .update({
      status: nextStatus,
      winner_bid_id: winningBid?.id ?? null,
    })
    .eq("id", auctionId);

  if (error) {
    throw new Error(`Unable to close auction: ${error.message}`);
  }

  return getAuctionById(auctionId);
}

async function verifySolanaPaymentTx(paymentTxHash: string) {
  const rpcUrl = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (!rpcUrl) {
    throw new Error("SOLANA_RPC_URL is required to verify settlement transactions.");
  }

  const connection = new Connection(rpcUrl, "confirmed");
  const status = await connection.getSignatureStatuses([paymentTxHash], { searchTransactionHistory: true });
  const signature = status.value[0];
  if (!signature || signature.err) {
    throw new Error("Payment transaction could not be verified on Solana.");
  }

  return signature.confirmationStatus === "confirmed" || signature.confirmationStatus === "finalized";
}

export async function settleAuctionForUser(user: AuthenticatedAuctionUser, input: AuctionSettlementInput) {
  const admin = createSupabaseAdminClient();
  const auction = await getAuctionById(input.auctionId);
  if (!auction) {
    throw new Error("Auction not found.");
  }

  if (auction.sellerId !== user.id) {
    throw new Error("Only the seller can settle this auction.");
  }

  if (auction.status !== "ended") {
    throw new Error("Only ended auctions can be settled.");
  }

  const winningBid = auction.bids.find((bid) => bid.id === auction.winnerBidId) ?? auction.bids[0] ?? null;
  if (!winningBid) {
    throw new Error("Auction has no winning bid.");
  }

  const verified = await verifySolanaPaymentTx(input.paymentTxHash);
  if (!verified) {
    throw new Error("Payment transaction is not yet confirmed.");
  }

  const existingSettlement = await getSettlementByAuctionId(input.auctionId);
  if (existingSettlement) {
    const { error } = await admin
      .from("settlements")
      .update({
        payment_tx_hash: input.paymentTxHash,
        status: "paid",
      })
      .eq("id", existingSettlement.id);

    if (error) {
      throw new Error(`Unable to update settlement: ${error.message}`);
    }
  } else {
    const { error } = await admin.from("settlements").insert({
      auction_id: input.auctionId,
      winner_user_id: winningBid.bidderId,
      final_amount: winningBid.amount,
      payment_tx_hash: input.paymentTxHash,
      status: "paid",
    });

    if (error) {
      throw new Error(`Unable to create settlement: ${error.message}`);
    }
  }

  const { error: auctionError } = await admin
    .from("auctions")
    .update({ status: "settled" })
    .eq("id", input.auctionId);

  if (auctionError) {
    throw new Error(`Unable to mark auction settled: ${auctionError.message}`);
  }

  const settlement = await getSettlementByAuctionId(input.auctionId);
  if (!settlement) {
    throw new Error("Settlement was saved but could not be reloaded.");
  }

  return settlement;
}

export async function getSettlementByAuctionId(auctionId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("settlements")
    .select("id, auction_id, winner_user_id, final_amount, payment_tx_hash, status, created_at")
    .eq("auction_id", auctionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapSettlement(data as SettlementRow);
}
