import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadEnvFile(path.join(projectRoot, ".env.local"));

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const sellerSeeds = [
  {
    email: "mock.seller.1@human-arts.test",
    wallet: "SellerWallet1111111111111111111111111111111",
  },
  {
    email: "mock.seller.2@human-arts.test",
    wallet: "SellerWallet2222222222222222222222222222222",
  },
];

const bidderSeeds = [
  {
    email: "mock.bidder.1@human-arts.test",
    wallet: "BidderWallet1111111111111111111111111111111",
  },
  {
    email: "mock.bidder.2@human-arts.test",
    wallet: "BidderWallet2222222222222222222222222222222",
  },
  {
    email: "mock.bidder.3@human-arts.test",
    wallet: "BidderWallet3333333333333333333333333333333",
  },
];

const sellerIdByEmail = new Map();
const bidderIdByEmail = new Map();

async function main() {
  const auctions = buildAuctionSeeds();
  const hasLegacySchema = await schemaAvailable(["users", "auctions", "bids", "settlements"]);
  const hasOffchainSchema = await schemaAvailable(["offchain_auctions", "offchain_bids"]);

  if (!hasLegacySchema && !hasOffchainSchema) {
    throw new Error("Neither the legacy auction tables nor the off-chain auction tables are available in this Supabase project.");
  }

  if (hasLegacySchema) {
    try {
      const allUserSeeds = [...sellerSeeds, ...bidderSeeds];

      for (const user of allUserSeeds) {
        const authUser = await ensureAuthUser(user.email, user.wallet);
        await syncPublicUser(authUser.id, user.wallet);
        if (user.email.startsWith("mock.seller")) {
          sellerIdByEmail.set(user.email, authUser.id);
        } else {
          bidderIdByEmail.set(user.email, authUser.id);
        }
      }

      const sellerIds = [...sellerIdByEmail.values()];
      await deleteExistingMockAuctions(sellerIds);

      for (const auction of auctions) {
        await insertAuctionSeed(auction);
      }
    } catch (error) {
      if (!isMissingTableError(error)) {
        throw error;
      }

      console.warn("Skipping legacy auction seed because the legacy tables are not available in this Supabase project.");
    }
  }

  if (hasOffchainSchema) {
    await deleteExistingOffchainMockAuctions(sellerSeeds.map((seller) => seller.wallet));
    for (const auction of auctions) {
      await insertOffchainAuctionSeed(auction);
    }
  }

  const seededTargets = [
    hasLegacySchema ? "legacy auction tables" : null,
    hasOffchainSchema ? "off-chain auction tables" : null,
  ].filter(Boolean);

  console.log(`Seeded ${auctions.length} mock auctions into ${seededTargets.join(" and ")}.`);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    const value = stripQuotes(line.slice(separatorIndex + 1).trim());
    process.env[key] = value;
  }
}

function stripQuotes(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function isMissingTableError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("schema cache") || message.includes("Could not find the table") || message.includes("relation");
}

async function ensureAuthUser(email, wallet) {
  const existing = await findAuthUserByEmail(email);
  if (existing) {
    return existing;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      wallet_address: wallet,
      mock_seed: true,
    },
  });

  if (error || !data.user) {
    throw new Error(`Unable to create auth user ${email}: ${error?.message ?? "Unknown error"}`);
  }

  return data.user;
}

async function findAuthUserByEmail(email) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw new Error(`Unable to list auth users: ${error.message}`);
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) {
      return match;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }
}

async function syncPublicUser(id, wallet) {
  const { error } = await supabase.from("users").upsert(
    {
      id,
      wallet_address: wallet,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(`Unable to upsert public user ${id}: ${error.message}`);
  }
}

async function schemaAvailable(tableNames) {
  for (const tableName of tableNames) {
    const { error } = await supabase.from(tableName).select("*", { head: true, count: "exact" }).limit(1);
    if (error) {
      return false;
    }
  }

  return true;
}

async function deleteExistingMockAuctions(sellerIds) {
  if (!sellerIds.length) {
    return;
  }

  const { error } = await supabase.from("auctions").delete().in("seller_id", sellerIds);
  if (error) {
    throw new Error(`Unable to clear previous mock auctions: ${error.message}`);
  }
}

async function deleteExistingOffchainMockAuctions(sellerWallets) {
  if (!sellerWallets.length) {
    return;
  }

  const { error } = await supabase.from("offchain_auctions").delete().in("seller_wallet", sellerWallets);
  if (error) {
    throw new Error(`Unable to clear previous mock off-chain auctions: ${error.message}`);
  }
}

function buildAuctionSeeds() {
  const now = Date.now();
  const hour = 60 * 60 * 1000;

  return [
    {
      sellerWallet: sellerSeeds[0].wallet,
      title: "Nocturne for Harbour Light",
      description:
        "A moody waterfront study seeded as a live lot for local marketplace testing, bid ladder rendering, and settlement handoff previews.",
      assetUrl:
        "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=1200&q=80",
      startAt: iso(now - 6 * hour),
      endAt: iso(now + 18 * hour),
      startPrice: 1.8,
      minIncrement: 0.15,
      status: "live",
      bids: [
        { bidderWallet: bidderSeeds[0].wallet, amount: 2.1, hoursAgo: 5, isWinning: false },
        { bidderWallet: bidderSeeds[1].wallet, amount: 2.4, hoursAgo: 2, isWinning: true },
      ],
    },
    {
      sellerWallet: sellerSeeds[0].wallet,
      title: "Threads of the New Market",
      description:
        "An upcoming textile-inspired piece parked in draft status so the storefront shows queued inventory before the bidding window opens.",
      assetUrl:
        "https://images.unsplash.com/photo-1577083552431-6e5fd75fcfb1?auto=format&fit=crop&w=1200&q=80",
      startAt: iso(now + 12 * hour),
      endAt: iso(now + 60 * hour),
      startPrice: 1.2,
      minIncrement: 0.1,
      status: "draft",
      bids: [],
    },
    {
      sellerWallet: sellerSeeds[1].wallet,
      title: "Portrait of a Quiet Interval",
      description:
        "A closed sale with a winning bid recorded, useful for exercising the ended-auction branch without requiring a live Solana payment hash.",
      assetUrl:
        "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80",
      startAt: iso(now - 72 * hour),
      endAt: iso(now - 6 * hour),
      startPrice: 3.5,
      minIncrement: 0.25,
      status: "ended",
      bids: [
        { bidderWallet: bidderSeeds[2].wallet, amount: 3.75, hoursAgo: 30, isWinning: false },
        { bidderWallet: bidderSeeds[1].wallet, amount: 4.25, hoursAgo: 8, isWinning: true },
      ],
    },
    {
      sellerWallet: sellerSeeds[1].wallet,
      title: "After Rain, Kowloon Study",
      description:
        "A fully settled mock lot to populate the completed state and verify settlement messaging on the auction detail page.",
      assetUrl:
        "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?auto=format&fit=crop&w=1200&q=80",
      startAt: iso(now - 120 * hour),
      endAt: iso(now - 48 * hour),
      startPrice: 2.9,
      minIncrement: 0.2,
      status: "settled",
      bids: [
        { bidderWallet: bidderSeeds[0].wallet, amount: 3.2, hoursAgo: 70, isWinning: false },
        { bidderWallet: bidderSeeds[2].wallet, amount: 3.8, hoursAgo: 50, isWinning: true },
      ],
      settlement: {
        bidderWallet: bidderSeeds[2].wallet,
        finalAmount: 3.8,
        paymentTxHash: "mock-settlement-tx-kowloon-study",
        status: "paid",
      },
    },
  ];
}

async function insertAuctionSeed(seed) {
  const sellerId = lookupUserIdByWallet(seed.sellerWallet);
  if (!sellerId) {
    throw new Error(`Auction ${seed.title} has no matching seller user.`);
  }

  const { data: auction, error: auctionError } = await supabase
    .from("auctions")
    .insert({
      seller_id: sellerId,
      title: seed.title,
      description: seed.description,
      asset_url: seed.assetUrl,
      start_at: seed.startAt,
      end_at: seed.endAt,
      start_price: seed.startPrice,
      min_increment: seed.minIncrement,
      status: seed.status,
    })
    .select("id")
    .single();

  if (auctionError || !auction) {
    throw new Error(`Unable to insert auction ${seed.title}: ${auctionError?.message ?? "Unknown error"}`);
  }

  let winnerBidId = null;

  for (const bid of seed.bids) {
    const bidderId = lookupUserIdByWallet(bid.bidderWallet);
    if (!bidderId) {
      throw new Error(`Auction ${seed.title} has a bid missing a bidder user.`);
    }

    const createdAt = iso(Date.now() - bid.hoursAgo * 60 * 60 * 1000);
    const { data, error } = await supabase
      .from("bids")
      .insert({
        auction_id: auction.id,
        bidder_id: bidderId,
        amount: bid.amount,
        is_winning: bid.isWinning,
        created_at: createdAt,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`Unable to insert bid for auction ${seed.title}: ${error?.message ?? "Unknown error"}`);
    }

    if (bid.isWinning) {
      winnerBidId = data.id;
    }
  }

  if (winnerBidId) {
    const { error } = await supabase
      .from("auctions")
      .update({ winner_bid_id: winnerBidId })
      .eq("id", auction.id);

    if (error) {
      throw new Error(`Unable to attach winning bid for ${seed.title}: ${error.message}`);
    }
  }

  if (seed.settlement) {
    const winnerUserId = lookupUserIdByWallet(seed.settlement.bidderWallet);
    if (!winnerUserId) {
      throw new Error(`Settlement winner missing for auction ${seed.title}.`);
    }

    const { error } = await supabase.from("settlements").insert({
      auction_id: auction.id,
      winner_user_id: winnerUserId,
      final_amount: seed.settlement.finalAmount,
      payment_tx_hash: seed.settlement.paymentTxHash,
      status: seed.settlement.status,
    });

    if (error) {
      throw new Error(`Unable to insert settlement for ${seed.title}: ${error.message}`);
    }
  }
}

async function insertOffchainAuctionSeed(seed) {
  const { data: auction, error: auctionError } = await supabase
    .from("offchain_auctions")
    .insert({
      seller_wallet: seed.sellerWallet,
      title: seed.title,
      description: seed.description,
      asset_url: seed.assetUrl,
      starts_at: seed.startAt,
      ends_at: seed.endAt,
      start_price_lamports: solToLamports(seed.startPrice),
      min_increment_lamports: solToLamports(seed.minIncrement),
      status: seed.status,
    })
    .select("id")
    .single();

  if (auctionError || !auction) {
    throw new Error(`Unable to insert off-chain auction ${seed.title}: ${auctionError?.message ?? "Unknown error"}`);
  }

  let winnerBidId = null;

  for (const bid of seed.bids) {
    const { data, error } = await supabase
      .from("offchain_bids")
      .insert({
        auction_id: auction.id,
        bidder_wallet: bid.bidderWallet,
        amount_lamports: solToLamports(bid.amount),
        is_winning: bid.isWinning,
        created_at: iso(Date.now() - bid.hoursAgo * 60 * 60 * 1000),
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`Unable to insert off-chain bid for auction ${seed.title}: ${error?.message ?? "Unknown error"}`);
    }

    if (bid.isWinning) {
      winnerBidId = data.id;
    }
  }

  if (winnerBidId) {
    const { error } = await supabase
      .from("offchain_auctions")
      .update({ winner_bid_id: winnerBidId })
      .eq("id", auction.id);

    if (error) {
      throw new Error(`Unable to attach off-chain winning bid for ${seed.title}: ${error.message}`);
    }
  }
}

function lookupUserIdByWallet(wallet) {
  const seller = sellerSeeds.find((seed) => seed.wallet === wallet);
  if (seller) {
    return sellerIdByEmail.get(seller.email) ?? null;
  }

  const bidder = bidderSeeds.find((seed) => seed.wallet === wallet);
  if (bidder) {
    return bidderIdByEmail.get(bidder.email) ?? null;
  }

  return null;
}

function solToLamports(value) {
  return Math.round(value * 1_000_000_000);
}

function iso(timestamp) {
  return new Date(timestamp).toISOString();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
